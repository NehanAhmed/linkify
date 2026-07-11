import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '../../utils/AppError'

const { mockQb, mockDb, resetQb, resolveFn } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'orderBy', 'offset', 'groupBy', 'set', 'values']

  for (const m of chainable) {
    qb[m] = vi.fn(() => qb)
  }

  const resolveFn = vi.fn()
  resolveFn.mockResolvedValue([])

  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)

  const db = {
    select: vi.fn(() => qb),
    insert: vi.fn(() => qb),
    update: vi.fn(() => qb),
    delete: vi.fn(() => qb),
    transaction: vi.fn((cb: (tx: any) => any) => cb(db)),
  }

  function reset() {
    resolveFn.mockReset()
    resolveFn.mockResolvedValue([])
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }

  return { mockQb: qb, mockDb: db, resetQb: reset, resolveFn }
})

vi.mock('../../db', () => ({ db: mockDb, dbReplica: mockDb }))

vi.mock('../../services/urlSafety', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/linkPreview', () => ({
  fetchLinkPreview: vi.fn().mockResolvedValue({ title: null, description: null, image: null }),
}))

vi.mock('../../services/cache', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheDel: vi.fn().mockResolvedValue(undefined),
  buildCacheKeyForUrl: vi.fn((code: string) => `url:${code}`),
}))

vi.mock('../../utils/codeGenerator', () => ({
  generateShortCode: vi.fn(() => 'abc1234'),
  generateCustomCode: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
}))

vi.mock('../../services/subscription.service', () => ({
  getUserPlan: vi.fn().mockResolvedValue({
    planCode: 'pro',
    planName: 'Pro',
    maxLinks: 10000,
    maxCustomDomains: 5,
    apiRateLimit: 10000,
    features: {
      advancedStats: true,
      customDomains: true,
      passwordProtection: true,
      bulkOperations: true,
      apiAccess: true,
      affiliateLinks: true,
      prioritySupport: false,
    },
    status: 'active',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  }),
}))

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../utils/encryption', () => ({
  encrypt: vi.fn((s: string) => `enc:${s}`),
  decrypt: vi.fn((s: string) => s.replace('enc:', '')),
}))

import { createShortUrl, resolveUrl, recordVisit, listUrls, deleteUrl, purgeUrl, purgeExpiredUrls, createShortUrlBulk, visitToCsvRow } from '../url.services'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('createShortUrl', () => {
  const validInput = { url: 'https://example.com' }
  const userId = 'user-1'

  it('creates a short URL with generated code', async () => {
    resolveFn.mockResolvedValueOnce([])

    const result = await createShortUrl(validInput, userId)

    expect(result.code).toBe('abc1234')
    expect(result.shortUrl).toContain('abc1234')
    expect(result.url).toBe('https://example.com')
  })

  it('uses custom code when provided', async () => {
    resolveFn.mockResolvedValueOnce([])

    const result = await createShortUrl({ ...validInput, customCode: 'my-link' }, userId)

    expect(result.code).toBe('my-link')
  })

  it('rejects reserved codes', async () => {
    await expect(createShortUrl({ ...validInput, customCode: 'api' }, userId))
      .rejects.toThrow(AppError)
    await expect(createShortUrl({ ...validInput, customCode: 'admin' }, userId))
      .rejects.toThrow(AppError)
  })

  it('rejects duplicate codes', async () => {
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([{ code: 'abc1234' }])

    await expect(createShortUrl(validInput, userId))
      .rejects.toThrow('Code already taken')
  })

  it('stores password hash when password is provided', async () => {
    resolveFn.mockResolvedValueOnce([])

    await createShortUrl({ ...validInput, password: 'secret123' }, userId)

    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('sets expiresAt when ttlDays is provided', async () => {
    resolveFn.mockResolvedValueOnce([])

    await createShortUrl({ ...validInput, ttlDays: 30 }, userId)

    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('sets activeAt when provided', async () => {
    resolveFn.mockResolvedValueOnce([])

    await createShortUrl({ ...validInput, activeAt: '2025-06-01T00:00:00.000Z' }, userId)

    expect(mockDb.insert).toHaveBeenCalled()
  })
})

describe('resolveUrl', () => {
  it('returns a cached URL', async () => {
    const { cacheGet } = await import('../../services/cache')
    vi.mocked(cacheGet).mockResolvedValueOnce({ code: 'abc', url: 'https://cached.com', expiresAt: null, activeAt: null } as any)

    const result = await resolveUrl('abc')

    expect(result.url).toBe('https://cached.com')
  })

  it('returns a URL from the database', async () => {
    const dbRow = { code: 'abc', url: 'https://example.com', deletedAt: null, expiresAt: null, activeAt: null }
    resolveFn.mockResolvedValueOnce([dbRow])

    const result = await resolveUrl('abc')

    expect(result.url).toBe('https://example.com')
  })

  it('throws when URL is not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(resolveUrl('nonexistent')).rejects.toThrow('URL not found')
  })

  it('throws when URL has expired', async () => {
    const expired = new Date(Date.now() - 100000)
    resolveFn.mockResolvedValueOnce([{ code: 'abc', url: 'https://example.com', deletedAt: null, expiresAt: expired, activeAt: null }])

    await expect(resolveUrl('abc')).rejects.toThrow('This link has expired')
  })

  it('throws when URL is not yet active', async () => {
    const future = new Date(Date.now() + 100000)
    resolveFn.mockResolvedValueOnce([{ code: 'abc', url: 'https://example.com', deletedAt: null, expiresAt: null, activeAt: future }])

    await expect(resolveUrl('abc')).rejects.toThrow('This link is not yet active')
  })
})

describe('recordVisit', () => {
  it('records a visit with parsed metadata', async () => {
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])

    await recordVisit('abc', {
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      referer: 'https://google.com',
    })

    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('increments unique visit counter for new fingerprint', async () => {
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])

    await recordVisit('abc', { ipAddress: '1.2.3.4', userAgent: 'curl/7.0' })

    expect(mockDb.update).toHaveBeenCalledTimes(2)
  })

  it('skips unique visit increment for existing fingerprint', async () => {
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([{ id: 1 }])

    await recordVisit('abc', { ipAddress: '1.2.3.4', userAgent: 'curl/7.0' })

    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it('handles missing IP address', async () => {
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])

    await recordVisit('abc', {})

    expect(mockDb.insert).toHaveBeenCalled()
  })
})

describe('listUrls', () => {
  const baseQuery = { page: 1, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const }

  it('returns paginated URLs', async () => {
    resolveFn.mockResolvedValueOnce([{ total: 0 }])
    resolveFn.mockResolvedValueOnce([])

    const result = await listUrls(baseQuery, 'user-1')

    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(10)
    expect(result.urls).toEqual([])
  })

  it('filters by search query', async () => {
    resolveFn.mockResolvedValueOnce([{ total: 0 }])
    resolveFn.mockResolvedValueOnce([])

    await listUrls({ ...baseQuery, q: 'example' }, 'user-1')

    expect(mockQb.where).toHaveBeenCalled()
  })

  it('filters by password status', async () => {
    resolveFn.mockResolvedValueOnce([{ total: 0 }])
    resolveFn.mockResolvedValueOnce([])

    await listUrls({ ...baseQuery, hasPassword: true }, 'user-1')
  })

  it('filters by active status', async () => {
    resolveFn.mockResolvedValueOnce([{ total: 0 }])
    resolveFn.mockResolvedValueOnce([])

    await listUrls({ ...baseQuery, isActive: true }, 'user-1')
  })

  it('filters by date range', async () => {
    resolveFn.mockResolvedValueOnce([{ total: 0 }])
    resolveFn.mockResolvedValueOnce([])

    await listUrls({ ...baseQuery, createdAfter: '2024-01-01', createdBefore: '2024-12-31' }, 'user-1')
  })

  it('filters by minimum visits', async () => {
    resolveFn.mockResolvedValueOnce([{ total: 0 }])
    resolveFn.mockResolvedValueOnce([])

    await listUrls({ ...baseQuery, minVisits: 5 }, 'user-1')
  })
})

describe('deleteUrl', () => {
  it('soft deletes an owned URL', async () => {
    resolveFn.mockResolvedValueOnce([{ deletedAt: null, userId: 'user-1' }])

    await deleteUrl('abc', 'user-1')

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws if URL not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(deleteUrl('abc', 'user-1')).rejects.toThrow('URL not found')
  })

  it('throws if user does not own the URL', async () => {
    resolveFn.mockResolvedValueOnce([{ deletedAt: null, userId: 'other-user' }])

    await expect(deleteUrl('abc', 'user-1')).rejects.toThrow('URL not found')
  })

  it('allows admin to delete any URL', async () => {
    resolveFn.mockResolvedValueOnce([{ deletedAt: null, userId: 'other-user' }])

    await deleteUrl('abc', 'admin-1', true)

    expect(mockDb.update).toHaveBeenCalled()
  })
})

describe('purgeUrl', () => {
  it('hard deletes an owned URL', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'user-1' }])
    mockQb.returning.mockResolvedValueOnce([{ code: 'abc' }])

    await purgeUrl('abc', 'user-1')

    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('throws if URL not found', async () => {
    resolveFn.mockResolvedValueOnce([])
    mockQb.returning.mockResolvedValue([])

    await expect(purgeUrl('abc', 'user-1')).rejects.toThrow('URL not found')
  })
})

describe('purgeExpiredUrls', () => {
  it('deletes expired soft-deleted URLs', async () => {
    mockQb.returning.mockResolvedValueOnce([{ code: 'abc' }, { code: 'def' }])

    const result = await purgeExpiredUrls(30)

    expect(result).toEqual(['abc', 'def'])
    expect(mockDb.delete).toHaveBeenCalled()
  })
})

describe('createShortUrlBulk', () => {
  it('returns results for each URL', async () => {
    resolveFn.mockResolvedValueOnce([])

    const results = await createShortUrlBulk({
      urls: [{ url: 'https://example.com' }, { url: 'https://test.com' }],
    }, 'user-1')

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
  })

  it('handles partial failures', async () => {
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([{ code: 'abc1234' }])

    const results = await createShortUrlBulk({
      urls: [{ url: 'https://example.com' }, { url: 'https://test.com', customCode: 'abc1234' }],
    }, 'user-1')

    expect(results).toHaveLength(2)
    expect(results[1].success).toBe(false)
  })
})

describe('visitToCsvRow', () => {
  it('formats a visit as CSV', () => {
    const visit = {
      id: 1,
      code: 'abc',
      ipAddress: null,
      userAgent: 'curl/7.0',
      referer: null,
      country: 'US',
      city: null,
      isp: null,
      deviceType: 'desktop',
      os: 'Linux',
      browser: 'curl',
      browserVersion: '7.0',
      referrerCategory: 'direct',
      isBot: false,
      visitedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as any

    const row = visitToCsvRow(visit)
    expect(row).toContain('1')
    expect(row).toContain('abc')
  })

  it('escapes fields containing commas', () => {
    const visit = {
      id: 2,
      code: 'def',
      ipAddress: null,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)',
      referer: null,
      country: null,
      city: null,
      isp: null,
      deviceType: null,
      os: null,
      browser: null,
      browserVersion: null,
      referrerCategory: null,
      isBot: false,
      visitedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as any

    const row = visitToCsvRow(visit)
    expect(row).toContain('"')
  })
})
