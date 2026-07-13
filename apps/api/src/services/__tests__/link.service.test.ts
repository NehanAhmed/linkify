import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb, mockBcryptCompare, resolveFn } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'set', 'values']

  for (const m of chainable) {
    qb[m] = vi.fn(() => qb)
  }

  const resolveFn = vi.fn()
  resolveFn.mockResolvedValue([])

  qb.returning = vi.fn().mockResolvedValue([])
  qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)

  const db = {
    select: vi.fn(() => qb),
    insert: vi.fn(() => qb),
    update: vi.fn(() => qb),
    delete: vi.fn(() => qb),
  }

  function reset() {
    resolveFn.mockReset()
    resolveFn.mockResolvedValue([])
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }

  const mockBcryptCompare = vi.fn().mockResolvedValue(true)

  return { mockQb: qb, mockDb: db, resetQb: reset, mockBcryptCompare, resolveFn }
})

vi.mock('../../db', () => ({ db: mockDb }))

vi.mock('../../services/cache', () => ({
  cacheDel: vi.fn().mockResolvedValue(undefined),
  buildCacheKeyForUrl: vi.fn((code: string) => `url:${code}`),
}))

vi.mock('../../services/subscription.service', () => ({
  getUserPlan: vi.fn().mockResolvedValue({
    planCode: 'pro',
    planName: 'Pro',
    maxLinks: 10000,
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

vi.mock('../../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
    compare: mockBcryptCompare,
  },
  hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: mockBcryptCompare,
}))

import { setPassword, removePassword, verifyPasswordReturnToken, updateLinkSettings, resolveChain } from '../link.service'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('setPassword', () => {
  it('sets a password on owned URL', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'user-1' }])

    await setPassword('abc', 'user-1', 'my-password')

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws if URL not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(setPassword('abc', 'user-1', 'pwd')).rejects.toThrow('URL not found')
  })

  it('throws if user does not own the URL', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'other-user' }])

    await expect(setPassword('abc', 'user-1', 'pwd')).rejects.toThrow('URL not found')
  })
})

describe('removePassword', () => {
  it('removes password from owned URL', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'user-1' }])

    await removePassword('abc', 'user-1')

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws if URL not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(removePassword('abc', 'user-1')).rejects.toThrow('URL not found')
  })

  it('throws if user does not own the URL', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'other-user' }])

    await expect(removePassword('abc', 'user-1')).rejects.toThrow('URL not found')
  })
})

describe('verifyPasswordReturnToken', () => {
  it('returns a JWT token for correct password', async () => {
    resolveFn.mockResolvedValueOnce([{ passwordHash: '$2b$12$hash' }])

    const token = await verifyPasswordReturnToken('abc', 'correct-password')

    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
  })

  it('throws if URL not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(verifyPasswordReturnToken('abc', 'pwd')).rejects.toThrow('URL not found')
  })

  it('throws if no password is set', async () => {
    resolveFn.mockResolvedValueOnce([{ passwordHash: null }])

    await expect(verifyPasswordReturnToken('abc', 'pwd')).rejects.toThrow('No password set')
  })

  it('throws for incorrect password', async () => {
    mockBcryptCompare.mockResolvedValueOnce(false)
    resolveFn.mockResolvedValueOnce([{ passwordHash: '$2b$12$hash' }])

    await expect(verifyPasswordReturnToken('abc', 'wrong-password')).rejects.toThrow('Incorrect password')
  })
})

describe('updateLinkSettings', () => {
  it('updates settings on owned URL', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'user-1' }])

    await updateLinkSettings('abc', 'user-1', { blockBots: true })

    expect(mockQb.set).toHaveBeenCalled()
  })

  it('throws if URL not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(updateLinkSettings('abc', 'user-1', { blockBots: true })).rejects.toThrow('URL not found')
  })

  it('throws if user does not own the URL', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'other-user' }])

    await expect(updateLinkSettings('abc', 'user-1', { blockBots: true })).rejects.toThrow('URL not found')
  })

  it('skips update when no fields provided', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'user-1' }])

    await updateLinkSettings('abc', 'user-1', {})

    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it('hashes password when provided in settings', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'user-1' }])

    await updateLinkSettings('abc', 'user-1', { password: 'new-password' })

    expect(mockQb.set).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: '$2b$12$hashedpassword' }),
    )
  })
})

describe('resolveChain', () => {
  it('returns the same URL if it is not a short link', async () => {
    const result = await resolveChain('https://example.com/xy')
    expect(result).toBe('https://example.com/xy')
  })

  it('throws when chain is too deep', async () => {
    await expect(resolveChain('https://example.com/abc', 5)).rejects.toThrow('Link chain too deep')
  })

  it('throws on circular chain', async () => {
    resolveFn.mockResolvedValueOnce([{ url: 'https://example.com/abc', deletedAt: null, expiresAt: null, activeAt: null }])

    await expect(resolveChain('https://example.com/abc', 0, new Set(['abc']))).rejects.toThrow('Circular link chain detected')
  })

  it('throws if chained URL is not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(resolveChain('https://example.com/abc')).rejects.toThrow('Chained URL not found')
  })

  it('resolves a single chain hop', async () => {
    resolveFn.mockResolvedValueOnce([{ url: 'https://final.com', deletedAt: null, expiresAt: null, activeAt: null }])

    const result = await resolveChain('https://example.com/abc')
    expect(result).toBe('https://final.com')
  })

  it('resolves multiple chain hops', async () => {
    resolveFn.mockResolvedValueOnce([{ url: 'https://example.com/def', deletedAt: null, expiresAt: null, activeAt: null }])
    resolveFn.mockResolvedValueOnce([{ url: 'https://final.com', deletedAt: null, expiresAt: null, activeAt: null }])

    const result = await resolveChain('https://example.com/abc')
    expect(result).toBe('https://final.com')
  })

  it('throws if chained link has expired', async () => {
    resolveFn.mockResolvedValueOnce([{ url: 'https://example.com/target', deletedAt: null, expiresAt: new Date('2020-01-01'), activeAt: null }])

    await expect(resolveChain('https://example.com/abc')).rejects.toThrow('Chained link has expired')
  })
})
