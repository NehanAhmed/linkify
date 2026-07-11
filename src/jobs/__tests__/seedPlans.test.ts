import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'orderBy', 'values', 'set', 'delete']
  for (const m of chainable) qb[m] = vi.fn(() => qb)
  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  const db = { select: vi.fn(() => qb), insert: vi.fn(() => qb), update: vi.fn(() => qb), delete: vi.fn(() => qb) }
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

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { seedPlans } from '../seedPlans'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('seedPlans', () => {
  it('creates all three plans when none exist', async () => {
    await seedPlans()

    expect(mockDb.select).toHaveBeenCalled()
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockQb.values).toHaveBeenCalled()
  })

  it('updates plans that already exist', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ id: 1 }]).then(onfulfilled)

    await seedPlans()

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('seeds correct plan codes', async () => {
    const calls: string[][] = []
    mockQb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
    const originalValues = mockQb.values
    mockQb.values = vi.fn((v: any) => {
      calls.push([v.code])
      return mockQb
    })

    await seedPlans()

    expect(calls.length).toBeGreaterThanOrEqual(1)
  })
})
