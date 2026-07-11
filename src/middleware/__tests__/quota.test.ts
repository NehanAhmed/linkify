import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const { mockQb, mockDb, resetQb } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'values', 'set', 'delete', 'orderBy']
  for (const m of chainable) qb[m] = vi.fn(() => qb)
  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  const db = { select: vi.fn(() => qb), insert: vi.fn(() => qb), update: vi.fn(() => qb), delete: vi.fn(() => qb) }
  function reset() {
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }
  return { mockQb: qb, mockDb: db, resetQb: reset }
})

vi.mock('../../db', () => ({ db: mockDb }))

vi.mock('../../services/subscription.service', () => ({
  getUserPlan: vi.fn(),
}))

import { checkQuota } from '../quota'
import { getUserPlan } from '../../services/subscription.service'

function mockReq(overrides: Partial<Request> = {}): Request {
  return { user: { id: 'user-1', role: 'user' }, ...overrides } as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('checkQuota', () => {
  it('passes through when no user', async () => {
    const req = {} as Request
    const res = mockRes()
    const next = vi.fn()

    await checkQuota(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('passes through when under quota', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      planCode: 'pro',
      apiRateLimit: 10000,
    } as any)
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ count: 5 }]).then(onfulfilled)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await checkQuota(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('returns 429 when quota exhausted', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      planCode: 'free',
      apiRateLimit: 100,
    } as any)
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ count: 100 }]).then(onfulfilled)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await checkQuota(req, res, next)

    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0]
    expect(err.statusCode).toBe(429)
    expect(err.code).toBe('QUOTA_EXHAUSTED')
  })

  it('handles missing quota row (first request)', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      planCode: 'free',
      apiRateLimit: 100,
    } as any)

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await checkQuota(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(mockDb.insert).toHaveBeenCalled()
  })
})
