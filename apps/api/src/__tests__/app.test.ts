import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'

vi.mock('../utils/env', () => ({
  env: {
    CORS_ORIGINS: 'http://localhost:3000',
    NODE_ENV: 'test',
    SENTRY_DSN: undefined,
    REDIS_URL: undefined,
    CSRF_SECRET: 'test-csrf-secret-32-characters!',
  },
}))

const mockPinoLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockPinoLogger),
}))

vi.mock('../utils/logger', () => ({
  logger: mockPinoLogger,
}))

vi.mock('pino-http', () => ({
  default: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}))

vi.mock('../middleware/csrf', () => ({
  csrfProtection: vi.fn((_req: any, _res: any, next: any) => next()),
}))

vi.mock('../middleware/errorHandler', () => ({
  errorHandler: vi.fn((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({ success: false, error: err.message })
  }),
  notFoundHandler: vi.fn((_req: any, res: any) => {
    res.status(404).json({ success: false, error: 'Route not found' })
  }),
}))

vi.mock('../routes', () => ({
  default: (() => {
    const r = express.Router()
    r.get('/api/health', (_req: any, res: any) => res.json({ success: true, data: { status: 'ok' } }))
    r.get('/test-route', (_req: any, res: any) => res.json({ ok: true }))
    return r
  })(),
}))

vi.mock('../routes/stripe.routes', () => ({
  default: (() => {
    const r = express.Router()
    r.post('/webhook', (_req: any, res: any) => res.json({ received: true }))
    return r
  })(),
}))

vi.mock('../controllers/url.controllers', () => ({
  rootRedirect: vi.fn((_req: any, res: any) => res.redirect(301, 'https://example.com')),
}))

describe('App', () => {
  it('loads the app module without errors', async () => {
    const app = await import('../app')
    expect(app.default).toBeDefined()
  }, 15000)

  it('sets up middleware and routing', async () => {
    const app = await import('../app')
    const supertest = (await import('supertest')).default
    const res = await supertest(app.default).get('/test-route')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('mounts stripe webhook', async () => {
    const app = await import('../app')
    const supertest = (await import('supertest')).default
    const res = await supertest(app.default).post('/api/stripe/webhook')
    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)
  })

  it('has health endpoint', async () => {
    const app = await import('../app')
    const supertest = (await import('supertest')).default
    const res = await supertest(app.default).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
  })

  it('returns 404 for unknown routes', async () => {
    const app = await import('../app')
    const supertest = (await import('supertest')).default
    const res = await supertest(app.default).get('/api/nonexistent')
    expect(res.status).toBe(404)
  })

  it('has error handler', async () => {
    const { errorHandler } = await import('../middleware/errorHandler')
    expect(errorHandler).toBeDefined()
  })

  it('has notFoundHandler', async () => {
    const { notFoundHandler } = await import('../middleware/errorHandler')
    expect(notFoundHandler).toBeDefined()
  })
})
