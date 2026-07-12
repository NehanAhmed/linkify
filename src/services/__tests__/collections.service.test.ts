import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '../../utils/AppError'

const { mockQb, mockTxQb, mockTx, mockDb, resetQb, resolveFn, txResolveFn } = vi.hoisted(() => {
  function makeQb(): { qb: Record<string, any>; rfn: any } {
    const qb: Record<string, any> = {}
    const chainable = ['from', 'where', 'limit', 'orderBy', 'offset', 'values', 'set', 'delete', 'update', 'innerJoin', 'groupBy']

    const rfn = vi.fn()
    rfn.mockResolvedValue([])

    for (const m of chainable) {
      qb[m] = vi.fn(() => qb)
    }
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => rfn().then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
    return { qb, rfn }
  }

  const { qb, rfn: resolveFn } = makeQb()
  const { qb: txQb, rfn: txResolveFn } = makeQb()

  const tx = {
    select: vi.fn(() => txQb),
    insert: vi.fn(() => txQb),
    update: vi.fn(() => txQb),
    delete: vi.fn(() => txQb),
  }

  const db = {
    select: vi.fn(() => qb),
    insert: vi.fn(() => qb),
    update: vi.fn(() => qb),
    delete: vi.fn(() => qb),
    transaction: vi.fn((cb: (t: any) => any) => cb(tx)),
  }

  function reset() {
    const resetQbObj = (q: Record<string, any>, r: any) => {
      r.mockReset()
      r.mockResolvedValue([])
      for (const m of Object.keys(q)) {
        if (typeof q[m] === 'function' && q[m].mockReset) q[m].mockReset()
      }
      const chain = ['from', 'where', 'limit', 'orderBy', 'offset', 'values', 'set', 'delete', 'update']
      for (const m of chain) q[m] = vi.fn(() => q)
      q.returning = vi.fn().mockResolvedValue([])
      q.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
      q.then = (onfulfilled: any) => r().then(onfulfilled)
      q.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
    }
    resetQbObj(qb, resolveFn)
    resetQbObj(txQb, txResolveFn)
    tx.select = vi.fn(() => txQb)
    tx.insert = vi.fn(() => txQb)
    tx.update = vi.fn(() => txQb)
    tx.delete = vi.fn(() => txQb)
  }

  return { mockQb: qb, mockTxQb: txQb, mockTx: tx, mockDb: db, resetQb: reset, resolveFn, txResolveFn }
})

vi.mock('../../db', () => ({ db: mockDb }))

import {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addUrlToCollection,
  removeUrlFromCollection,
  getCollectionUrls,
  reorderCollections,
  shareCollection,
  revokeShare,
  getSharedCollection,
} from '../collections.service'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('createCollection', () => {
  it('creates a collection without parent', async () => {
    mockQb.returning.mockResolvedValueOnce([{ id: 1, name: 'My Collection', userId: 'user-1' }])

    const result = await createCollection('user-1', { name: 'My Collection' })

    expect(result.id).toBe(1)
    expect(result.name).toBe('My Collection')
  })

  it('creates a collection with valid parent', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'user-1' }])
    mockQb.returning.mockResolvedValueOnce([{ id: 2, name: 'Child', userId: 'user-1' }])

    const result = await createCollection('user-1', { name: 'Child', parentId: 1 })

    expect(result.id).toBe(2)
  })

  it('throws if parent collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(createCollection('user-1', { name: 'Child', parentId: 999 }))
      .rejects.toThrow('Parent collection not found')
  })

  it('throws if parent belongs to another user', async () => {
    resolveFn.mockResolvedValueOnce([{ userId: 'other-user' }])

    await expect(createCollection('user-1', { name: 'Child', parentId: 1 }))
      .rejects.toThrow('Parent collection not found')
  })
})

describe('listCollections', () => {
  it('lists all collections for a user', async () => {
    resolveFn.mockResolvedValueOnce([
      { id: 1, name: 'A', parentId: null, sortOrder: 0, createdAt: new Date('2024-01-01') },
    ])
    resolveFn.mockResolvedValueOnce([{ total: 0 }])

    const result = await listCollections('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('A')
  })
})

describe('getCollection', () => {
  it('returns a collection by id', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, name: 'Test', userId: 'user-1' }])

    const result = await getCollection(1, 'user-1')

    expect(result.id).toBe(1)
    expect(result.name).toBe('Test')
  })

  it('throws if collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(getCollection(999, 'user-1')).rejects.toThrow('Collection not found')
  })

  it('throws if collection belongs to another user', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(getCollection(1, 'other-user')).rejects.toThrow('Collection not found')
  })
})

describe('updateCollection', () => {
  it('updates a collection name', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])
    mockQb.returning.mockResolvedValueOnce([{ id: 1, name: 'Updated' }])

    const result = await updateCollection(1, 'user-1', { name: 'Updated' })

    expect(result.name).toBe('Updated')
  })

  it('throws if collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(updateCollection(999, 'user-1', { name: 'X' })).rejects.toThrow('Collection not found')
  })

  it('rejects self-parenting', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])

    const result = await updateCollection(1, 'user-1', { parentId: 1 }).catch((e: any) => e)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toMatch(/cannot be its own parent/)
  })
})

describe('deleteCollection', () => {
  it('deletes an owned collection', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])

    await deleteCollection(1, 'user-1')

    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('throws if collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(deleteCollection(999, 'user-1')).rejects.toThrow('Collection not found')
  })
})

describe('addUrlToCollection', () => {
  it('adds a URL to a collection', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])

    const result = await addUrlToCollection('abc', 1, 'user-1')

    expect(result.urlCode).toBe('abc')
    expect(result.collectionId).toBe(1)
  })

  it('throws if collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(addUrlToCollection('abc', 999, 'user-1')).rejects.toThrow('Collection not found')
  })
})

describe('removeUrlFromCollection', () => {
  it('removes a URL from a collection', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])

    await removeUrlFromCollection('abc', 1, 'user-1')

    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('throws if collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(removeUrlFromCollection('abc', 999, 'user-1')).rejects.toThrow('Collection not found')
  })
})

describe('getCollectionUrls', () => {
  it('returns URLs in a collection', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])
    resolveFn.mockResolvedValueOnce([{ total: 2 }])
    resolveFn.mockResolvedValueOnce([{ urlCode: 'abc' }, { urlCode: 'def' }])

    const result = await getCollectionUrls(1, 'user-1', 1, 10)

    expect(result.urlCodes).toEqual(['abc', 'def'])
  })

  it('throws if collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(getCollectionUrls(999, 'user-1', 1, 10)).rejects.toThrow('Collection not found')
  })
})

describe('reorderCollections', () => {
  it('reorders collections in a transaction', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])

    await reorderCollections('user-1', [{ id: 1, sortOrder: 1 }, { id: 2, sortOrder: 0 }])

    expect(mockDb.transaction).toHaveBeenCalled()
  })

  it('throws if collection does not belong to user', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1 }])

    await expect(reorderCollections('user-1', [{ id: 999, sortOrder: 0 }])).rejects.toThrow('Collection 999 not found')
  })
})

describe('shareCollection', () => {
  it('generates a share token', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1', shareToken: null, sharedAt: null }])

    const result = await shareCollection(1, 'user-1')

    expect(result.shareToken).toBeTruthy()
  })

  it('reuses existing share token', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1', shareToken: 'existing-token', sharedAt: null }])

    const result = await shareCollection(1, 'user-1')

    expect(result.shareToken).toBe('existing-token')
  })

  it('throws if collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(shareCollection(999, 'user-1')).rejects.toThrow('Collection not found')
  })
})

describe('revokeShare', () => {
  it('removes share token', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, userId: 'user-1' }])

    await revokeShare(1, 'user-1')

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws if collection not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(revokeShare(999, 'user-1')).rejects.toThrow('Collection not found')
  })
})

describe('getSharedCollection', () => {
  it('returns shared collection URLs', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 1, name: 'Shared' }])
    resolveFn.mockResolvedValueOnce([])

    const result = await getSharedCollection('token')

    expect(result.collection.name).toBe('Shared')
  })

  it('throws if token not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(getSharedCollection('invalid')).rejects.toThrow('Shared collection not found')
  })
})
