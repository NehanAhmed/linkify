import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import supertest from 'supertest'
import { raw } from 'express'
import { rootRedirect } from '../controllers/url.controllers'
import { handleWebhook } from '../controllers/stripe.controller'

vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
  dbReplica: {
    select: vi.fn(),
  },
}))

const mockResolveUrl = vi.hoisted(() => vi.fn())
const mockRecordVisit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('../services/url.services', () => ({
  resolveUrl: mockResolveUrl,
  recordVisit: mockRecordVisit,
  verifyLinkAccessToken: vi.fn(),
  resolveChain: vi.fn((url: string) => Promise.resolve(url)),
}))

vi.mock('../services/urlSafety', () => ({
  validateUrlSafety: vi.fn().mockResolvedValue(undefined),
}))

const mockStripeConstructEvent = vi.hoisted(() => vi.fn())
const mockStripeRetrieveSubscription = vi.hoisted(() => vi.fn())
const mockSyncSubscription = vi.hoisted(() => vi.fn())

vi.mock('../services/stripe', () => ({
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent: mockStripeConstructEvent },
    subscriptions: { retrieve: mockStripeRetrieveSubscription },
  })),
  getStripeWebhookSecret: vi.fn(() => 'whsec_test'),
  isStripeConfigured: vi.fn(() => true),
}))

vi.mock('../services/subscription.service', () => ({
  syncSubscription: mockSyncSubscription,
}))

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

describe('Redirect flow integration', () => {
  function createApp() {
    const app = express()
    app.use(express.json())
    app.get('/:code', (req, res, next) => {
      ;(req.params as Record<string, string>)['0'] = req.params.code!
      rootRedirect(req, res, next)
    })
    app.use((_req: Request, res: Response) => {
      res.status(404).json({ success: false, error: 'Not found' })
    })
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err && typeof err === 'object' && 'statusCode' in err) {
        const e = err as { statusCode: number; message: string; code?: string }
        res.status(e.statusCode).json({ success: false, error: e.message, code: e.code ?? 'APP_ERROR' })
        return
      }
      res.status(500).json({ success: false, error: 'Internal server error' })
    })
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to the target URL for a valid short code', async () => {
    mockResolveUrl.mockResolvedValue({
      code: 'abc123',
      url: 'https://example.com',
      title: null,
      description: null,
      image: null,
      passwordHash: null,
      blockBots: false,
      expiresAt: null,
      activeAt: null,
      visits: 0,
      uniqueVisits: 0,
      createdAt: new Date(),
    })

    const res = await supertest(createApp())
      .get('/abc123')
      .set('User-Agent', 'Mozilla/5.0')
      .set('Accept-Language', 'en-US,en;q=0.9')
      .set('Referer', 'https://google.com')

    expect(res.status).toBe(301)
    expect(res.headers.location).toBe('https://example.com')
    expect(mockRecordVisit).toHaveBeenCalledWith('abc123', expect.objectContaining({
      userAgent: 'Mozilla/5.0',
      acceptLanguage: 'en-US,en;q=0.9',
      referer: 'https://google.com',
    }))
  })

  it('returns 404 for an unknown short code', async () => {
    mockResolveUrl.mockRejectedValue({
      statusCode: 404,
      message: 'URL not found',
      code: 'URL_NOT_FOUND',
    })

    const res = await supertest(createApp()).get('/unknown')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ success: false, error: 'URL not found', code: 'URL_NOT_FOUND' })
  })

  it('returns 401 for password-protected link without token', async () => {
    mockResolveUrl.mockResolvedValue({
      code: 'protected',
      url: 'https://example.com',
      passwordHash: '$2a$10$hashed',
      blockBots: false,
      expiresAt: null,
      activeAt: null,
      visits: 0,
      uniqueVisits: 0,
      title: null,
      description: null,
      image: null,
      createdAt: new Date(),
    })

    const res = await supertest(createApp()).get('/protected')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('LINK_PASSWORD_REQUIRED')
  })

  it('returns 410 for expired link', async () => {
    mockResolveUrl.mockRejectedValue({
      statusCode: 410,
      message: 'This link has expired',
      code: 'LINK_EXPIRED',
    })

    const res = await supertest(createApp()).get('/expired')

    expect(res.status).toBe(410)
    expect(res.body.code).toBe('LINK_EXPIRED')
  })
})

describe('Stripe webhook integration', () => {
  function createApp() {
    const app = express()
    app.use('/api/stripe/webhook', raw({ type: 'application/json' }), handleWebhook)
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err && typeof err === 'object' && 'status' in err) {
        const e = err as { status: number; message: string }
        res.status(e.status).json({ success: false, error: e.message })
        return
      }
      if (err && typeof err === 'object' && 'statusCode' in err) {
        const e = err as { statusCode: number; message: string; code?: string }
        res.status(e.statusCode).json({ success: false, error: e.message, code: e.code ?? 'APP_ERROR' })
        return
      }
      res.status(500).json({ success: false, error: 'Internal server error' })
    })
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles checkout.session.completed and syncs subscription', async () => {
    mockStripeConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_123',
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_123',
        },
      },
    })
    mockStripeRetrieveSubscription.mockResolvedValue({ id: 'sub_123', metadata: { userId: 'user-1' } })

    const res = await supertest(createApp())
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'valid_sig')
      .send({})

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true })
    expect(mockStripeRetrieveSubscription).toHaveBeenCalledWith('sub_123')
    expect(mockSyncSubscription).toHaveBeenCalled()
  })

  it('handles invoice.paid and syncs subscription', async () => {
    mockStripeConstructEvent.mockReturnValue({
      type: 'invoice.paid',
      id: 'evt_456',
      data: {
        object: {
          subscription: 'sub_123',
        },
      },
    })
    mockStripeRetrieveSubscription.mockResolvedValue({ id: 'sub_123', metadata: { userId: 'user-1' } })

    const res = await supertest(createApp())
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'valid_sig')
      .send({})

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true })
    expect(mockStripeRetrieveSubscription).toHaveBeenCalledWith('sub_123')
    expect(mockSyncSubscription).toHaveBeenCalled()
  })

  it('handles customer.subscription.updated', async () => {
    mockStripeConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      id: 'evt_789',
      data: {
        object: { id: 'sub_123', metadata: { userId: 'user-1' } },
      },
    })

    const res = await supertest(createApp())
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'valid_sig')
      .send({})

    expect(res.status).toBe(200)
    expect(mockSyncSubscription).toHaveBeenCalled()
  })

  it('returns 400 for invalid signature', async () => {
    mockStripeConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const res = await supertest(createApp())
      .post('/api/stripe/webhook')
      .set('stripe-signature', 'bad_sig')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid signature')
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await supertest(createApp())
      .post('/api/stripe/webhook')
      .send({})

    expect(res.status).toBe(400)
  })
})
