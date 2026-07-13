import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '../../utils/AppError'

const { mockQb, mockDb, resetQb } = vi.hoisted(() => {
  const qb: Record<string, any> = {}

  const chainable = ['from', 'where', 'limit', 'set', 'values', 'delete']
  for (const m of chainable) {
    qb[m] = vi.fn(() => qb)
  }

  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)

  const db = {
    select: vi.fn(() => qb),
    insert: vi.fn(() => qb),
    update: vi.fn(() => qb),
    delete: vi.fn(() => qb),
  }

  function reset() {
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }

  return { mockQb: qb, mockDb: db, resetQb: reset }
})

vi.mock('../../db', () => ({ db: mockDb }))

vi.mock('../../services/tags.service', () => ({
  bulkTagUrls: vi.fn().mockResolvedValue([{ code: 'abc', success: true }, { code: 'def', success: true }]),
}))

vi.mock('../../services/collections.service', () => ({
  addUrlToCollection: vi.fn().mockResolvedValue({ urlCode: 'abc', collectionId: 1 }),
}))

vi.mock('../../services/url.services', () => ({
  createShortUrl: vi.fn().mockResolvedValue({ code: 'abc', shortUrl: 'https://short.com/abc' }),
}))

vi.mock('../../utils/codeGenerator', () => ({
  generateShortCode: vi.fn(() => 'abc1234'),
}))

vi.mock('../../services/urlSafety', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/linkPreview', () => ({
  fetchLinkPreview: vi.fn().mockResolvedValue({}),
}))

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hash'),
  },
  hash: vi.fn().mockResolvedValue('$2b$12$hash'),
}))

import { executeBulkOperation, importCsv } from '../bulk.service'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('executeBulkOperation', () => {
  it('executes tag operation', async () => {
    const results = await executeBulkOperation('user-1', {
      operation: 'tag',
      codes: ['abc', 'def'],
      tagIds: [1, 2],
    })

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.success)).toBe(true)
  })

  it('executes move operation', async () => {
    const { addUrlToCollection } = await import('../../services/collections.service')
    vi.mocked(addUrlToCollection).mockResolvedValue({ urlCode: 'abc', collectionId: 1 })

    const results = await executeBulkOperation('user-1', {
      operation: 'move',
      codes: ['abc', 'def'],
      collectionId: 1,
    })

    expect(results).toHaveLength(2)
  })

  it('executes extend operation', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ expiresAt: null, userId: 'user-1' }]).then(onfulfilled)

    const results = await executeBulkOperation('user-1', {
      operation: 'extend',
      codes: ['abc', 'def'],
      extendDays: 30,
    })

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.success)).toBe(true)
  })

  it('executes delete operation', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ userId: 'user-1', deletedAt: null }]).then(onfulfilled)

    const results = await executeBulkOperation('user-1', {
      operation: 'delete',
      codes: ['abc', 'def'],
    })

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.success)).toBe(true)
  })

  it('throws on invalid operation', async () => {
    await expect(executeBulkOperation('user-1', {
      operation: 'invalid' as any,
      codes: ['abc'],
    })).rejects.toThrow('Invalid operation')
  })

  it('handles extend failure when URL not found', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)

    const results = await executeBulkOperation('user-1', {
      operation: 'extend',
      codes: ['nonexistent'],
      extendDays: 7,
    })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toBe('URL not found')
  })

  it('handles delete failure when URL not found', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)

    const results = await executeBulkOperation('user-1', {
      operation: 'delete',
      codes: ['nonexistent'],
    })

    expect(results[0].success).toBe(false)
    expect(results[0].error).toBe('URL not found')
  })
})

describe('importCsv', () => {
  it('imports URLs from CSV', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)

    const results = await importCsv({
      csv: 'url,title\nhttps://example.com,Test\nhttps://test.com,Test2',
    }, 'user-1')

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
  })

  it('rejects empty CSV', async () => {
    await expect(importCsv({ csv: 'url,title' }, 'user-1')).rejects.toThrow('CSV file is empty')
  })

  it('rejects CSV with more than 500 rows', async () => {
    const rows = Array.from({ length: 501 }, (_, i) => `https://example${i}.com,title${i}`)
    const csv = 'url,title\n' + rows.join('\n')

    await expect(importCsv({ csv }, 'user-1')).rejects.toThrow('CSV import is limited to 500 URLs')
  })

  it('reports missing URL column per row', async () => {
    const results = await importCsv({ csv: 'url,title\n,Hello' }, 'user-1')

    expect(results[0].success).toBe(false)
    expect(results[0].error).toContain('Missing url column')
  })
})
