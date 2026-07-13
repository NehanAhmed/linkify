import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../../services/collections.service', () => ({
  getSharedCollection: vi.fn(),
}))

import { getShared } from '../public.controller'

function mockReq(overrides: Partial<Request> = {}): Request {
  return { params: {}, ...overrides } as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getShared', () => {
  it('returns shared collection data', async () => {
    const req = mockReq({ params: { token: '550e8400-e29b-41d4-a716-446655440000' } })
    const res = mockRes()
    const next = vi.fn()

    const { getSharedCollection } = await import('../../services/collections.service')
    vi.mocked(getSharedCollection).mockResolvedValueOnce({
      collection: { id: 1, name: 'Shared Collection', urlCount: 1 },
      urls: [{ code: 'abc', url: 'https://example.com', title: null, description: null, image: null, visits: 0 }],
    })

    await getShared(req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { collection: { id: 1, name: 'Shared Collection', urlCount: 1 }, urls: [{ code: 'abc', url: 'https://example.com', title: null, description: null, image: null, visits: 0 }] },
    })
  })

  it('rejects invalid UUID token', async () => {
    const req = mockReq({ params: { token: 'not-a-uuid' } })
    const res = mockRes()
    const next = vi.fn()

    await getShared(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('passes service errors to next', async () => {
    const req = mockReq({ params: { token: '550e8400-e29b-41d4-a716-446655440000' } })
    const res = mockRes()
    const next = vi.fn()

    const { getSharedCollection } = await import('../../services/collections.service')
    vi.mocked(getSharedCollection).mockRejectedValueOnce(new Error('not found'))

    await getShared(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
