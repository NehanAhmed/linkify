import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import supertest from 'supertest'

vi.mock('../../utils/env', () => ({
  env: {
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX: 100,
    AUTH_RATE_LIMIT_WINDOW_MS: 60000,
    AUTH_RATE_LIMIT_MAX: 3,
  },
}))

import { generalLimiter, strictLimiter, bulkLimiter, passwordLimiter, authLimiter } from '../rateLimiter'

function createApp(limiter: ReturnType<typeof generalLimiter>) {
  const app = express()
  app.use(limiter as any)
  app.get('/test', (_req, res) => res.json({ ok: true }))
  return app
}

describe('rate limiters', () => {
  it('all limiters are exported as middleware functions', () => {
    const limiters = [generalLimiter, strictLimiter, bulkLimiter, passwordLimiter, authLimiter]
    for (const limiter of limiters) {
      expect(typeof limiter).toBe('function')
    }
  })

  it('generalLimiter allows requests under limit', async () => {
    const app = createApp(generalLimiter)
    const res = await supertest(app).get('/test')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('strictLimiter allows requests under limit', async () => {
    const app = createApp(strictLimiter)
    const res = await supertest(app).get('/test')
    expect(res.status).toBe(200)
  })

  it('bulkLimiter allows requests under limit', async () => {
    const app = createApp(bulkLimiter)
    const res = await supertest(app).get('/test')
    expect(res.status).toBe(200)
  })

  it('passwordLimiter allows requests under limit', async () => {
    const app = createApp(passwordLimiter)
    const res = await supertest(app).get('/test')
    expect(res.status).toBe(200)
  })

  it('authLimiter allows requests under limit', async () => {
    const app = createApp(authLimiter)
    const res = await supertest(app).get('/test')
    expect(res.status).toBe(200)
  })

  it('all limiters set rate limit headers', async () => {
    const app = createApp(generalLimiter)
    const res = await supertest(app).get('/test')
    expect(res.headers['ratelimit-limit']).toBeDefined()
    expect(res.headers['ratelimit-remaining']).toBeDefined()
  })
})
