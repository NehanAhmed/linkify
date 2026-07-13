import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUrlController = vi.hoisted(() => ({
  createUrl: vi.fn(),
  createUrlBulk: vi.fn(),
  redirectUrl: vi.fn(),
  getUrlInfo: vi.fn(),
  getVisits: vi.fn(),
  getUrlStats: vi.fn(),
  exportVisits: vi.fn(),
  listUrls: vi.fn(),
  deleteUrl: vi.fn(),
  purgeUrl: vi.fn(),
  verifyPasswordRedirect: vi.fn(),
}))

const mockLinkController = vi.hoisted(() => ({
  setPassword: vi.fn(),
  removePassword: vi.fn(),
  verifyPassword: vi.fn(),
  updateLinkSettings: vi.fn(),
  executeBulkOperation: vi.fn(),
  importCsv: vi.fn(),
}))

const mockQrController = vi.hoisted(() => ({
  generateQr: vi.fn(),
}))

vi.mock('../../controllers/url.controllers', () => mockUrlController)
vi.mock('../../controllers/link.controller', () => mockLinkController)
vi.mock('../../controllers/qr.controller', () => mockQrController)

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn((_req, _res, next) => {
    ;(_req as any).user = { id: 'user-1', role: 'user' }
    next()
  }),
}))

vi.mock('../../middleware/requireAAL', () => ({
  requireAAL: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}))

vi.mock('../../middleware/rateLimiter', () => ({
  strictLimiter: vi.fn((_req, _res, next) => next()),
  bulkLimiter: vi.fn((_req, _res, next) => next()),
  passwordLimiter: vi.fn((_req, _res, next) => next()),
}))

import express from 'express'
import supertest from 'supertest'
import urlRoutes from '../url.routes'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', urlRoutes)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  })
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('URL Routes', () => {
  it('POST / — creates a short URL', async () => {
    mockUrlController.createUrl.mockImplementation((_req, res) => {
      res.status(201).json({ success: true, data: { code: 'abc' } })
    })
    const res = await supertest(createApp()).post('/').send({ url: 'https://example.com' })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })

  it('POST /bulk — creates bulk URLs', async () => {
    mockUrlController.createUrlBulk.mockImplementation((_req, res) => {
      res.status(201).json({ success: true, data: [{ success: true, code: 'abc' }] })
    })
    const res = await supertest(createApp()).post('/bulk').send({ urls: [{ url: 'https://example.com' }] })
    expect(res.status).toBe(201)
  })

  it('GET / — lists URLs', async () => {
    mockUrlController.listUrls.mockImplementation((_req, res) => {
      res.json({ success: true, data: { urls: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } })
    })
    const res = await supertest(createApp()).get('/')
    expect(res.status).toBe(200)
  })

  it('GET /:code — redirects', async () => {
    mockUrlController.redirectUrl.mockImplementation((_req, res) => {
      res.redirect(301, 'https://example.com')
    })
    const res = await supertest(createApp()).get('/abc')
    expect(res.status).toBe(301)
  })

  it('GET /:code/info — returns URL info', async () => {
    mockUrlController.getUrlInfo.mockImplementation((_req, res) => {
      res.json({ success: true, data: { code: 'abc', url: 'https://example.com' } })
    })
    const res = await supertest(createApp()).get('/abc/info')
    expect(res.status).toBe(200)
  })

  it('GET /:code/visits — returns visits', async () => {
    mockUrlController.getVisits.mockImplementation((_req, res) => {
      res.json({ success: true, data: { visits: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } })
    })
    const res = await supertest(createApp()).get('/abc/visits')
    expect(res.status).toBe(200)
  })

  it('GET /:code/stats — returns stats', async () => {
    mockUrlController.getUrlStats.mockImplementation((_req, res) => {
      res.json({ success: true, data: { totalVisits: 100, uniqueVisits: 50 } })
    })
    const res = await supertest(createApp()).get('/abc/stats')
    expect(res.status).toBe(200)
  })

  it('GET /:code/qr — generates QR code', async () => {
    mockQrController.generateQr.mockImplementation((_req, res) => {
      res.setHeader('Content-Type', 'image/png').send(Buffer.from('qr'))
    })
    const res = await supertest(createApp()).get('/abc/qr')
    expect(res.status).toBe(200)
  })

  it('POST /:code/verify-password — verifies password for redirect', async () => {
    mockUrlController.verifyPasswordRedirect.mockImplementation((_req, res) => {
      res.redirect(301, 'https://example.com')
    })
    const res = await supertest(createApp()).post('/abc/verify-password').query({ token: 'valid' })
    expect(res.status).toBe(301)
  })

  it('DELETE /:code — deletes a URL', async () => {
    mockUrlController.deleteUrl.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'URL soft deleted successfully' })
    })
    const res = await supertest(createApp()).delete('/abc')
    expect(res.status).toBe(200)
  })

  it('DELETE /:code/purge — purges a URL', async () => {
    mockUrlController.purgeUrl.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'URL permanently deleted' })
    })
    const res = await supertest(createApp()).delete('/abc/purge')
    expect(res.status).toBe(200)
  })

  it('PATCH /:code/settings — updates link settings', async () => {
    mockLinkController.updateLinkSettings.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'Settings updated successfully' })
    })
    const res = await supertest(createApp()).patch('/abc/settings').send({ title: 'New' })
    expect(res.status).toBe(200)
  })

  it('POST /:code/password — sets password', async () => {
    mockLinkController.setPassword.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'Password set successfully' })
    })
    const res = await supertest(createApp()).post('/abc/password').send({ password: 'secret' })
    expect(res.status).toBe(200)
  })

  it('DELETE /:code/password — removes password', async () => {
    mockLinkController.removePassword.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'Password removed successfully' })
    })
    const res = await supertest(createApp()).delete('/abc/password')
    expect(res.status).toBe(200)
  })

  it('POST /:code/verify-password-token — verifies password', async () => {
    mockLinkController.verifyPassword.mockImplementation((_req, res) => {
      res.json({ success: true, data: { token: 'access-token' } })
    })
    const res = await supertest(createApp()).post('/abc/verify-password-token').send({ password: 'secret' })
    expect(res.status).toBe(200)
  })

  it('POST /bulk-operations — executes bulk operation', async () => {
    mockLinkController.executeBulkOperation.mockImplementation((_req, res) => {
      res.json({ success: true, data: [{ success: true, code: 'abc' }] })
    })
    const res = await supertest(createApp()).post('/bulk-operations').send({ operation: 'delete', codes: ['abc'] })
    expect(res.status).toBe(200)
  })

  it('POST /import/csv — imports CSV', async () => {
    mockLinkController.importCsv.mockImplementation((_req, res) => {
      res.status(201).json({ success: true, data: [{ success: true, code: 'abc' }] })
    })
    const res = await supertest(createApp()).post('/import/csv').send({ urls: [{ url: 'https://example.com' }] })
    expect(res.status).toBe(201)
  })
})
