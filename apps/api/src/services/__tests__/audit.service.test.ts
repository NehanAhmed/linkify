import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb } = vi.hoisted(() => {
  const qb: Record<string, any> = {}

  const chainable = ['from', 'where', 'limit', 'orderBy', 'offset', 'values']
  for (const m of chainable) {
    qb[m] = vi.fn(() => qb)
  }

  qb.returning = vi.fn().mockResolvedValue([])
  qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)

  const db = {
    select: vi.fn(() => qb),
    insert: vi.fn(() => qb),
  }

  function reset() {
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }

  return { mockQb: qb, mockDb: db, resetQb: reset }
})

vi.mock('../../db', () => ({ db: mockDb }))

import { logAction } from '../audit.service'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('logAction', () => {
  it('logs an action to the audit log', async () => {
    await logAction('user-1', 'url.created', 'url', 'abc123', { tags: ['important'] }, '1.2.3.4')

    expect(mockDb.insert).toHaveBeenCalledOnce()
  })

  it('logs action without optional fields', async () => {
    await logAction('user-1', 'url.deleted', 'url', 'abc123')

    expect(mockDb.insert).toHaveBeenCalledOnce()
  })
})
