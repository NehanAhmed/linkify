import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb, resolveFn } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'orderBy', 'offset', 'values', 'set', 'delete']

  for (const m of chainable) {
    qb[m] = vi.fn(() => qb)
  }

  const resolveFn = vi.fn()
  resolveFn.mockResolvedValue([])

  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
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
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }

  return { mockQb: qb, mockDb: db, resetQb: reset, resolveFn }
})

vi.mock('../../db', () => ({ db: mockDb }))

import {
  createTag,
  listTags,
  updateTag,
  deleteTag,
  tagUrl,
  untagUrl,
  bulkTagUrls,
  getUrlsByTag,
} from '../tags.service'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('createTag', () => {
  it('creates a tag', async () => {
    resolveFn.mockResolvedValueOnce([])

    mockQb.returning.mockResolvedValueOnce([{ id: 1, name: 'important', color: '#6366f1', userId: 'user-1' }])

    const result = await createTag('user-1', { name: 'important', color: '#6366f1' })

    expect(result.id).toBe(1)
    expect(result.name).toBe('important')
  })

  it('throws if tag name already exists', async () => {
    resolveFn.mockResolvedValueOnce([{ name: 'x' }])

    const result = await createTag('user-1', { name: 'x', color: '#6366f1' }).catch((e: any) => e)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toMatch(/already exists/)
  })
})

describe('listTags', () => {
  it('lists all tags for a user', async () => {
    resolveFn.mockResolvedValueOnce([])
    resolveFn.mockResolvedValueOnce([{ total: 0 }])

    const result = await listTags('user-1')

    expect(result).toHaveLength(0)
  })
})

describe('updateTag', () => {
  it('updates tag name', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([])

    mockQb.returning.mockResolvedValueOnce([{ id: 1, name: 'renamed' }])

    const result = await updateTag(1, 'user-1', { name: 'renamed' })

    expect(result.name).toBe('renamed')
  })

  it('throws if tag not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(updateTag(999, 'user-1', { name: 'x' })).rejects.toThrow('Tag not found')
  })

  it('throws on duplicate name', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([{ id: 2, name: 'existing' }])

    const result = await updateTag(1, 'user-1', { name: 'existing' }).catch((e: any) => e)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toMatch(/already exists/)
  })
})

describe('deleteTag', () => {
  it('deletes an owned tag', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])

    await deleteTag(1, 'user-1')

    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('throws if tag not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(deleteTag(999, 'user-1')).rejects.toThrow('Tag not found')
  })
})

describe('tagUrl', () => {
  it('tags a URL with valid tags', async () => {
    resolveFn.mockResolvedValueOnce([{ code: 'abc', userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])

    const result = await tagUrl('abc', [1, 2], 'user-1')

    expect(result.urlCode).toBe('abc')
    expect(result.tagIds).toEqual([1, 2])
  })

  it('throws if URL not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(tagUrl('abc', [1], 'user-1')).rejects.toThrow('URL not found')
  })

  it('throws if URL belongs to another user', async () => {
    resolveFn.mockResolvedValueOnce([{ code: 'abc', userId: 'other' }])

    await expect(tagUrl('abc', [1], 'user-1')).rejects.toThrow('URL not found')
  })

  it('throws if no valid tags found', async () => {
    resolveFn.mockResolvedValueOnce([{ code: 'abc', userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([])

    await expect(tagUrl('abc', [1], 'user-1')).rejects.toThrow('No valid tags found')
  })
})

describe('untagUrl', () => {
  it('removes tags from a URL', async () => {
    resolveFn.mockResolvedValueOnce([{ code: 'abc', userId: 'user-1' }])

    await untagUrl('abc', [1, 2], 'user-1')

    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('throws if URL not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(untagUrl('abc', [1], 'user-1')).rejects.toThrow('URL not found')
  })
})

describe('bulkTagUrls', () => {
  it('tags multiple URLs', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1 }])
    resolveFn.mockResolvedValueOnce([{ code: 'abc', userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([{ code: 'def', userId: 'user-1' }])

    const results = await bulkTagUrls(['abc', 'def'], [1], 'user-1')

    expect(results).toHaveLength(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
  })

  it('handles partial failures', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1 }])
    resolveFn.mockResolvedValueOnce([{ code: 'abc', userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([])

    const results = await bulkTagUrls(['abc', 'missing'], [1], 'user-1')

    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(false)
  })
})

describe('getUrlsByTag', () => {
  it('returns URLs for a tag', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([{ total: 2 }])
    resolveFn.mockResolvedValueOnce([{ urlCode: 'abc' }, { urlCode: 'def' }])

    const result = await getUrlsByTag(1, 'user-1', 1, 10)

    expect(result.urlCodes).toEqual(['abc', 'def'])
  })

  it('throws if tag not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(getUrlsByTag(999, 'user-1', 1, 10)).rejects.toThrow('Tag not found')
  })
})
