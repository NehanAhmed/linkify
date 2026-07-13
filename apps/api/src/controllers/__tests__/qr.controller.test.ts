import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../../services/qr.service', () => ({
  generateQrCode: vi.fn(),
}))

vi.mock('../../services/url.services', () => ({
  resolveUrl: vi.fn(),
}))

import * as qrController from '../qr.controller'

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: 'user-1', role: 'user' } as any,
    params: {},
    query: {},
    ...overrides,
  } as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateQr', () => {
  it('generates PNG QR code', async () => {
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'png' } })
    const res = mockRes()
    const next = vi.fn()

    const { resolveUrl } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(resolveUrl).mockResolvedValueOnce({ url: 'https://example.com' } as any)
    vi.mocked(generateQrCode).mockResolvedValueOnce(Buffer.from('png-data'))

    await qrController.generateQr(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png')
    expect(res.send).toHaveBeenCalledWith(Buffer.from('png-data'))
  })

  it('generates SVG QR code', async () => {
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'svg' } })
    const res = mockRes()
    const next = vi.fn()

    const { resolveUrl } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(resolveUrl).mockResolvedValueOnce({ url: 'https://example.com' } as any)
    vi.mocked(generateQrCode).mockResolvedValueOnce('<svg>...</svg>')

    await qrController.generateQr(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/svg+xml')
    expect(res.send).toHaveBeenCalledWith('<svg>...</svg>')
  })

  it('generates QR with logo', async () => {
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'png', logo: 'https://example.com/logo.png' } })
    const res = mockRes()
    const next = vi.fn()

    const { resolveUrl } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(resolveUrl).mockResolvedValueOnce({ url: 'https://example.com' } as any)
    vi.mocked(generateQrCode).mockResolvedValueOnce(Buffer.from('png-with-logo'))

    await qrController.generateQr(req, res, next)

    expect(generateQrCode).toHaveBeenCalledWith('https://example.com', 'png', 'https://example.com/logo.png')
    expect(res.send).toHaveBeenCalledWith(Buffer.from('png-with-logo'))
  })

  it('defaults to PNG format', async () => {
    const req = mockReq({ params: { code: 'abc' }, query: {} })
    const res = mockRes()
    const next = vi.fn()

    const { resolveUrl } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(resolveUrl).mockResolvedValueOnce({ url: 'https://example.com' } as any)
    vi.mocked(generateQrCode).mockResolvedValueOnce(Buffer.from('png-data'))

    await qrController.generateQr(req, res, next)

    expect(generateQrCode).toHaveBeenCalledWith('https://example.com', 'png', undefined)
  })

  it('passes errors to next', async () => {
    const req = mockReq({ params: { code: 'abc' }, query: {} })
    const res = mockRes()
    const next = vi.fn()

    const { resolveUrl } = await import('../../services/url.services')
    vi.mocked(resolveUrl).mockRejectedValueOnce(new Error('not found'))

    await qrController.generateQr(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
