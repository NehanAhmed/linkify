import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
}))

vi.mock('../../db', () => ({
  db: mockDb,
}))

vi.mock('../../utils/env', () => ({
  env: { BASE_URL: 'http://localhost:3000' },
}))

vi.mock('../../services/qr.service', () => ({
  generateQrCode: vi.fn(),
}))

vi.mock('../../services/url.services', () => ({
  getQrCache: vi.fn(),
  setQrCache: vi.fn(),
  deleteAllQrCaches: vi.fn(),
}))

import * as qrController from '../qr.controller'

function mockChain() {
  const chain: any = { limit: vi.fn() }
  chain.where = vi.fn().mockReturnValue(chain)
  chain.from = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockResolvedValue([])
  return chain
}

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
  function setupDbRow(overrides = {}) {
    const chain = mockChain()
    chain.limit.mockResolvedValue([{ qrExpiresAt: null, userId: 'user-1', ...overrides }])
    mockDb.select.mockReturnValue(chain)
    return chain
  }

  it('generates PNG QR code', async () => {
    setupDbRow()
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'png' } })
    const res = mockRes()
    const next = vi.fn()

    const { getQrCache } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(getQrCache).mockResolvedValue(null as any)
    vi.mocked(generateQrCode).mockResolvedValue(Buffer.from('png-data'))

    await qrController.generateQr(req, res, next)

    expect(generateQrCode).toHaveBeenCalledWith('http://localhost:3000/abc', 'png', undefined)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png')
    expect(res.send).toHaveBeenCalledWith(Buffer.from('png-data'))
  })

  it('generates SVG QR code', async () => {
    setupDbRow()
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'svg' } })
    const res = mockRes()
    const next = vi.fn()

    const { getQrCache } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(getQrCache).mockResolvedValue(null as any)
    vi.mocked(generateQrCode).mockResolvedValue('<svg>...</svg>')

    await qrController.generateQr(req, res, next)

    expect(generateQrCode).toHaveBeenCalledWith('http://localhost:3000/abc', 'svg', undefined)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/svg+xml')
    expect(res.send).toHaveBeenCalledWith('<svg>...</svg>')
  })

  it('generates QR with logo', async () => {
    setupDbRow()
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'png', logo: 'https://example.com/logo.png' } })
    const res = mockRes()
    const next = vi.fn()

    const { getQrCache } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(getQrCache).mockResolvedValue(null as any)
    vi.mocked(generateQrCode).mockResolvedValue(Buffer.from('png-with-logo'))

    await qrController.generateQr(req, res, next)

    expect(generateQrCode).toHaveBeenCalledWith('http://localhost:3000/abc', 'png', 'https://example.com/logo.png')
    expect(res.send).toHaveBeenCalledWith(Buffer.from('png-with-logo'))
  })

  it('defaults to PNG format', async () => {
    setupDbRow()
    const req = mockReq({ params: { code: 'abc' }, query: {} })
    const res = mockRes()
    const next = vi.fn()

    const { getQrCache } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(getQrCache).mockResolvedValue(null as any)
    vi.mocked(generateQrCode).mockResolvedValue(Buffer.from('png-data'))

    await qrController.generateQr(req, res, next)

    expect(generateQrCode).toHaveBeenCalledWith('http://localhost:3000/abc', 'png', undefined)
  })

  it('returns 410 when QR has expired', async () => {
    setupDbRow({ qrExpiresAt: new Date('2020-01-01') })
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'png' } })
    const res = mockRes()
    const next = vi.fn()

    await qrController.generateQr(req, res, next)

    expect(res.status).toHaveBeenCalledWith(410)
    expect(res.json).toHaveBeenCalledWith({
      error: 'QR_CODE_EXPIRED',
      message: expect.stringContaining('expired'),
      expiredAt: expect.any(String),
    })
  })

  it('returns cached QR without regenerating', async () => {
    setupDbRow()
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'png' } })
    const res = mockRes()
    const next = vi.fn()

    const { getQrCache } = await import('../../services/url.services')
    const { generateQrCode } = await import('../../services/qr.service')

    vi.mocked(getQrCache).mockResolvedValue({ data: Buffer.from('cached-qr').toString('base64'), createdAt: new Date() })

    await qrController.generateQr(req, res, next)

    expect(generateQrCode).not.toHaveBeenCalled()
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png')
    expect(res.send).toHaveBeenCalledWith(expect.any(Buffer))
  })

  it('returns 404 if code does not exist', async () => {
    const chain = mockChain()
    chain.limit.mockResolvedValue([])
    mockDb.select.mockReturnValue(chain)

    const req = mockReq({ params: { code: 'missing' }, query: { format: 'png' } })
    const res = mockRes()
    const next = vi.fn()

    await qrController.generateQr(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }))
  })

  it('returns 404 if user does not own the URL', async () => {
    setupDbRow({ userId: 'other-user' })
    const req = mockReq({ params: { code: 'abc' }, query: { format: 'png' } })
    const res = mockRes()
    const next = vi.fn()

    await qrController.generateQr(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }))
  })
})
