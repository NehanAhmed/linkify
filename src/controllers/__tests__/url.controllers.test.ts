import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockUrlService = vi.hoisted(() => ({
  createShortUrl: vi.fn(),
  createShortUrlBulk: vi.fn(),
  resolveUrl: vi.fn(),
  getUrlVisits: vi.fn(),
  getUrlStats: vi.fn(),
  getUrlVisitsPage: vi.fn(),
  visitToCsvRow: vi.fn(),
  CSV_HEADERS: ['id', 'code'],
  listUrls: vi.fn(),
  deleteUrl: vi.fn(),
  purgeUrl: vi.fn(),
  recordVisit: vi.fn(),
}))

vi.mock('../../services/url.services', () => mockUrlService)

vi.mock('../../services/link.service', () => ({
  verifyLinkAccessToken: vi.fn(),
  resolveChain: vi.fn((url: string) => Promise.resolve(url)),
}))

vi.mock('../../services/audit.service', () => ({
  logActionFromReq: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../utils/botDetection', () => ({
  isBot: vi.fn(() => ({ isBot: false })),
}))

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
}))

vi.mock('../../db', () => ({ db: mockDb }))

import * as urlController from '../url.controllers'
import { AppError } from '../../utils/AppError'

function mockReq(overrides: Partial<Request> = {}): Request {
  const req: Partial<Request> = {
    user: { id: 'user-1', role: 'user' } as any,
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  }
  return req as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn().mockReturnValue(res)
  res.write = vi.fn().mockReturnValue(true)
  res.end = vi.fn().mockReturnValue(res)
  res.redirect = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createUrl', () => {
  it('creates a short URL and returns 201', async () => {
    const req = mockReq({ body: { url: 'https://example.com' } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.createShortUrl.mockResolvedValueOnce({
      code: 'abc123',
      shortUrl: 'http://localhost/abc123',
      url: 'https://example.com',
    })

    await urlController.createUrl(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { code: 'abc123', shortUrl: 'http://localhost/abc123', url: 'https://example.com' },
    })
  })

  it('passes errors to next', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.createShortUrl.mockRejectedValueOnce(new Error('validation failed'))

    await urlController.createUrl(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

describe('createUrlBulk', () => {
  it('creates multiple URLs and returns 201 when all succeed', async () => {
    const req = mockReq({ body: { urls: [{ url: 'https://a.com' }, { url: 'https://b.com' }] } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.createShortUrlBulk.mockResolvedValueOnce([
      { success: true, code: 'a' },
      { success: true, code: 'b' },
    ])

    await urlController.createUrlBulk(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('returns 207 when some fail', async () => {
    const req = mockReq({ body: { urls: [{ url: 'https://a.com' }] } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.createShortUrlBulk.mockResolvedValueOnce([
      { success: false, error: 'duplicate' },
    ])

    await urlController.createUrlBulk(req, res, next)

    expect(res.status).toHaveBeenCalledWith(207)
  })
})

describe('getUrlInfo', () => {
  it('returns URL info', async () => {
    const req = mockReq({ params: { code: 'abc' } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.resolveUrl.mockResolvedValueOnce({
      code: 'abc',
      url: 'https://example.com',
      title: null,
      description: null,
      image: null,
      visits: 10,
      uniqueVisits: 5,
      expiresAt: null,
      activeAt: null,
      passwordHash: null,
      blockBots: false,
      createdAt: new Date(),
    })

    await urlController.getUrlInfo(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})

describe('getVisits', () => {
  it('returns paginated visits', async () => {
    const req = mockReq({ params: { code: 'abc' }, query: { page: '1', limit: '20' } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.getUrlVisits.mockResolvedValueOnce({
      visits: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })

    await urlController.getVisits(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})

describe('getUrlStats', () => {
  it('returns URL stats', async () => {
    const req = mockReq({ params: { code: 'abc' } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.getUrlStats.mockResolvedValueOnce({
      totalVisits: 100,
      uniqueVisits: 50,
    })

    await urlController.getUrlStats(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})

describe('listUrls', () => {
  it('lists URLs for the authenticated user', async () => {
    const req = mockReq({ query: { page: '1', limit: '10' } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.listUrls.mockResolvedValueOnce({
      urls: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    })

    await urlController.listUrls(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})

describe('deleteUrl', () => {
  it('soft deletes a URL', async () => {
    const req = mockReq({ params: { code: 'abc' } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.deleteUrl.mockResolvedValueOnce(undefined)

    await urlController.deleteUrl(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})

describe('purgeUrl', () => {
  it('permanently deletes a URL', async () => {
    const req = mockReq({ params: { code: 'abc' } })
    const res = mockRes()
    const next = vi.fn()

    mockUrlService.purgeUrl.mockResolvedValueOnce(undefined)

    await urlController.purgeUrl(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
  })
})
