import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockJwtVerify = vi.hoisted(() => vi.fn())
const mockBcryptCompare = vi.hoisted(() => vi.fn())
const mockSyncUser = vi.hoisted(() => vi.fn())
const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  })),
}))

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify: mockJwtVerify,
}))

vi.mock('bcrypt', () => ({
  default: { compare: mockBcryptCompare },
  compare: mockBcryptCompare,
}))

vi.mock('../../services/auth.services', () => ({
  syncUser: mockSyncUser,
}))

vi.mock('../../db', () => ({ db: mockDb }))

vi.mock('../ipAllowlist', () => ({
  isIpAllowed: vi.fn(() => true),
}))

vi.mock('../../utils/env', () => ({
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
  },
}))

vi.mock('../../db/schema', () => ({
  apiKeys: {},
}))

import { requireAuth } from '../auth'
import { AppError } from '../../utils/AppError'

function mockReq(headers: Record<string, string | undefined>, ip?: string): Request {
  return { headers, ip, user: undefined } as unknown as Request
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

describe('requireAuth', () => {
  it('authenticates with valid JWT', async () => {
    const req = mockReq({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InVzZXJAdGVzdC5jb20iLCJhYWwiOiJhYWwxIn0.signature' })
    const res = mockRes()
    const next = vi.fn()

    mockJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'user-1', email: 'user@test.com', aal: 'aal1' },
    })
    mockSyncUser.mockResolvedValueOnce('user')

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledWith()
    expect((req as any).user).toEqual({
      id: 'user-1',
      email: 'user@test.com',
      role: 'user',
      aal: 'aal1',
    })
  })

  it('rejects missing Authorization header', async () => {
    const req = mockReq({})
    const res = mockRes()
    const next = vi.fn()

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(401)
    expect(next.mock.calls[0][0].code).toBe('AUTH_HEADER_MISSING')
  })

  it('rejects non-Bearer scheme', async () => {
    const req = mockReq({ authorization: 'Basic token123' })
    const res = mockRes()
    const next = vi.fn()

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(401)
    expect(next.mock.calls[0][0].code).toBe('AUTH_INVALID_FORMAT')
  })

  it('rejects invalid JWT', async () => {
    const req = mockReq({ authorization: 'Bearer invalid.token.here' })
    const res = mockRes()
    const next = vi.fn()

    mockJwtVerify.mockRejectedValueOnce(new Error('jwt expired'))

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(401)
    expect(next.mock.calls[0][0].code).toBe('AUTH_INVALID_TOKEN')
  })

  it('passes AppError through directly', async () => {
    const req = mockReq({ authorization: 'Bearer invalid.token.here' })
    const res = mockRes()
    const next = vi.fn()

    mockJwtVerify.mockRejectedValueOnce(new AppError('Custom error', 403, 'CUSTOM'))

    await requireAuth(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(403)
    expect(next.mock.calls[0][0].code).toBe('CUSTOM')
  })
})
