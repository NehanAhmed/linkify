import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireRole } from '../requireRole'
import { AppError } from '../../utils/AppError'

function mockReq(user?: any): Request {
  return { user } as unknown as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('requireRole', () => {
  it('allows access when user has required role', () => {
    const req = mockReq({ id: 'user-1', role: 'admin' })
    const res = mockRes()
    const next = vi.fn()

    requireRole('admin')(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('allows access when user has one of multiple required roles', () => {
    const req = mockReq({ id: 'user-1', role: 'user' })
    const res = mockRes()
    const next = vi.fn()

    requireRole('admin', 'user')(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('denies access when user lacks required role', () => {
    const req = mockReq({ id: 'user-1', role: 'user' })
    const res = mockRes()
    const next = vi.fn()

    requireRole('admin')(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(403)
    expect(next.mock.calls[0][0].code).toBe('FORBIDDEN')
  })

  it('denies access when user is not authenticated', () => {
    const req = mockReq(undefined)
    const res = mockRes()
    const next = vi.fn()

    requireRole('admin')(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(401)
    expect(next.mock.calls[0][0].code).toBe('AUTH_REQUIRED')
  })
})
