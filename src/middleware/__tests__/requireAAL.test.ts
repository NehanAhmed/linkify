import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireAAL } from '../requireAAL'
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

describe('requireAAL', () => {
  it('allows access when user has AAL2', () => {
    const req = mockReq({ id: 'user-1', aal: 'aal2' })
    const res = mockRes()
    const next = vi.fn()

    requireAAL()(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('denies access when user has AAL1', () => {
    const req = mockReq({ id: 'user-1', aal: 'aal1' })
    const res = mockRes()
    const next = vi.fn()

    requireAAL()(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(403)
    expect(next.mock.calls[0][0].code).toBe('AAL2_REQUIRED')
  })

  it('denies access when user has no AAL', () => {
    const req = mockReq({ id: 'user-1' })
    const res = mockRes()
    const next = vi.fn()

    requireAAL()(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(403)
    expect(next.mock.calls[0][0].code).toBe('AAL2_REQUIRED')
  })

  it('denies access when user is not authenticated', () => {
    const req = mockReq(undefined)
    const res = mockRes()
    const next = vi.fn()

    requireAAL()(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(401)
    expect(next.mock.calls[0][0].code).toBe('AUTH_REQUIRED')
  })
})
