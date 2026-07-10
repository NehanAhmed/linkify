import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { errorHandler, notFoundHandler } from '../errorHandler'
import { AppError } from '../../utils/AppError'

function mockReq(overrides?: Partial<Request>): Request {
  return { id: 'test-req-id', ...overrides } as unknown as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('errorHandler', () => {
  it('handles AppError with status code and message', () => {
    const req = mockReq()
    const res = mockRes()
    const err = new AppError('Not found', 404, 'URL_NOT_FOUND')

    errorHandler(err, req, res, {} as NextFunction)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not found', code: 'URL_NOT_FOUND' }),
    )
  })

  it('handles AppError without code', () => {
    const req = mockReq()
    const res = mockRes()
    const err = new AppError('Server error', 500)

    errorHandler(err, req, res, {} as NextFunction)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'APP_ERROR' }),
    )
  })

  it('handles ZodError', () => {
    const req = mockReq()
    const res = mockRes()
    try {
      z.object({ name: z.string() }).parse({ name: 123 })
    } catch (err) {
      errorHandler(err as Error, req, res, {} as NextFunction)
    }

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR', details: expect.any(Array) }),
    )
  })

  it('handles unhandled errors', () => {
    const req = mockReq()
    const res = mockRes()
    const err = new Error('Something broke')

    errorHandler(err, req, res, {} as NextFunction)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INTERNAL_ERROR' }),
    )
  })
})

describe('notFoundHandler', () => {
  it('returns 404', () => {
    const req = mockReq()
    const res = mockRes()

    notFoundHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Route not found' })
  })
})
