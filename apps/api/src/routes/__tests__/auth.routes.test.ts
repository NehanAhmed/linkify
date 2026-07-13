import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthController = vi.hoisted(() => ({
  getCsrfToken: vi.fn(),
  refreshToken: vi.fn(),
  resetPassword: vi.fn(),
  getUserProfile: vi.fn(),
  createApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  updateApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}))

vi.mock('../../controllers/auth.controller', () => mockAuthController)

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn((_req, _res, next) => {
    ;(_req as any).user = { id: 'user-1', role: 'user' }
    next()
  }),
}))

vi.mock('../../middleware/rateLimiter', () => ({
  authLimiter: vi.fn((_req, _res, next) => next()),
}))

import express from 'express'
import supertest from 'supertest'
import authRoutes from '../auth.routes'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', authRoutes)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  })
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Auth Routes', () => {
  it('GET /csrf-token — returns CSRF token', async () => {
    mockAuthController.getCsrfToken.mockImplementation((_req, res) => {
      res.cookie('csrf-token', 'signed').json({ success: true, data: { token: 'test' } })
    })
    const res = await supertest(createApp()).get('/csrf-token')
    expect(res.status).toBe(200)
    expect(res.body.data.token).toBe('test')
  })

  it('POST /refresh — refreshes token', async () => {
    mockAuthController.refreshToken.mockImplementation((_req, res) => {
      res.json({ success: true, data: { access_token: 'new' } })
    })
    const res = await supertest(createApp()).post('/refresh').send({ refresh_token: 'valid' })
    expect(res.status).toBe(200)
  })

  it('POST /reset-password — sends reset email', async () => {
    mockAuthController.resetPassword.mockImplementation((_req, res) => {
      res.json({ success: true, data: { message: 'Check your email' } })
    })
    const res = await supertest(createApp()).post('/reset-password').send({ email: 'user@test.com' })
    expect(res.status).toBe(200)
  })

  it('GET /me — returns user profile', async () => {
    mockAuthController.getUserProfile.mockImplementation((_req, res) => {
      res.json({ success: true, data: { id: 'user-1', email: 'user@test.com' } })
    })
    const res = await supertest(createApp()).get('/me')
    expect(res.status).toBe(200)
  })

  it('POST /api-keys — creates API key', async () => {
    mockAuthController.createApiKey.mockImplementation((_req, res) => {
      res.status(201).json({ success: true, data: { id: 1, name: 'My Key' } })
    })
    const res = await supertest(createApp()).post('/api-keys').send({ name: 'My Key' })
    expect(res.status).toBe(201)
  })

  it('GET /api-keys — lists API keys', async () => {
    mockAuthController.listApiKeys.mockImplementation((_req, res) => {
      res.json({ success: true, data: [{ id: 1, name: 'My Key' }] })
    })
    const res = await supertest(createApp()).get('/api-keys')
    expect(res.status).toBe(200)
  })

  it('PUT /api-keys/:id — updates API key', async () => {
    mockAuthController.updateApiKey.mockImplementation((_req, res) => {
      res.json({ success: true, data: { id: 1, name: 'Updated' } })
    })
    const res = await supertest(createApp()).put('/api-keys/1').send({ name: 'Updated' })
    expect(res.status).toBe(200)
  })

  it('DELETE /api-keys/:id — revokes API key', async () => {
    mockAuthController.revokeApiKey.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'API key revoked' })
    })
    const res = await supertest(createApp()).delete('/api-keys/1')
    expect(res.status).toBe(200)
  })
})
