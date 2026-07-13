import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../../services/healthCheckEndpoint', () => ({
  getHealthStatus: vi.fn(),
}))

import { check } from '../health.controller'

function mockReq(): Request {
  return {} as Request
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

describe('check', () => {
  it('returns 200 when healthy', async () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    const { getHealthStatus } = await import('../../services/healthCheckEndpoint')
    vi.mocked(getHealthStatus).mockResolvedValueOnce({
      status: 'ok',
      uptime: 100,
      timestamp: '2026-01-01T00:00:00Z',
      db: { connected: true },
      redis: { connected: true, configured: true },
      version: '1.0.0',
    })

    await check(req, res, next)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ status: 'ok' }),
    })
  })

  it('returns 503 when degraded', async () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    const { getHealthStatus } = await import('../../services/healthCheckEndpoint')
    vi.mocked(getHealthStatus).mockResolvedValueOnce({
      status: 'degraded',
      uptime: 100,
      timestamp: '2026-01-01T00:00:00Z',
      db: { connected: true },
      redis: { connected: false, configured: true },
      version: '1.0.0',
    })

    await check(req, res, next)

    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('returns 503 when down', async () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    const { getHealthStatus } = await import('../../services/healthCheckEndpoint')
    vi.mocked(getHealthStatus).mockResolvedValueOnce({
      status: 'down',
      uptime: 100,
      timestamp: '2026-01-01T00:00:00Z',
      db: { connected: false },
      redis: { connected: false, configured: false },
      version: '1.0.0',
    })

    await check(req, res, next)

    expect(res.status).toHaveBeenCalledWith(503)
  })
})
