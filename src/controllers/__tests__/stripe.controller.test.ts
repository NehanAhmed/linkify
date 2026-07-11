import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockStripeInstance = vi.hoisted(() => ({
  webhooks: { constructEvent: vi.fn() },
  subscriptions: { retrieve: vi.fn() },
}))

vi.mock('../../services/stripe', () => ({
  getStripe: vi.fn(() => mockStripeInstance),
  getStripeWebhookSecret: vi.fn(),
  isStripeConfigured: vi.fn(),
}))

const mockSyncSubscription = vi.hoisted(() => vi.fn())
vi.mock('../../services/subscription.service', () => ({
  syncSubscription: mockSyncSubscription,
}))

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { handleWebhook } from '../stripe.controller'
import { getStripe, getStripeWebhookSecret, isStripeConfigured } from '../../services/stripe'

function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, headers: {}, ...overrides } as Request
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

describe('handleWebhook', () => {
  it('returns 503 when billing not configured', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false)
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await handleWebhook(req, res, next)

    expect(next).toHaveBeenCalled()
    expect((next.mock.calls[0][0] as any).statusCode).toBe(503)
  })

  it('returns 400 when stripe-signature header missing', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await handleWebhook(req, res, next)

    expect(next).toHaveBeenCalled()
    expect((next.mock.calls[0][0] as any).statusCode).toBe(400)
  })

  it('returns 400 when signature verification fails', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    vi.mocked(getStripeWebhookSecret).mockReturnValue('whsec_test')
    mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const req = mockReq({ headers: { 'stripe-signature': 'bad_sig' } })
    const res = mockRes()
    const next = vi.fn()

    await handleWebhook(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid signature' })
  })

  it('handles checkout.session.completed event', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    vi.mocked(getStripeWebhookSecret).mockReturnValue('whsec_test')
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_123',
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_123',
        },
      },
    })
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({ id: 'sub_123', metadata: { userId: 'user-1' } })
    mockSyncSubscription.mockResolvedValue(undefined)

    const req = mockReq({ body: Buffer.from('{}'), headers: { 'stripe-signature': 'valid_sig' } })
    const res = mockRes()
    const next = vi.fn()

    await handleWebhook(req, res, next)

    expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_123')
    expect(mockSyncSubscription).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ received: true })
  })

  it('handles invoice.paid event', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    vi.mocked(getStripeWebhookSecret).mockReturnValue('whsec_test')
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.paid',
      id: 'evt_456',
      data: {
        object: {
          subscription: 'sub_123',
        },
      },
    })
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({ id: 'sub_123', metadata: { userId: 'user-1' } })

    const req = mockReq({ body: Buffer.from('{}'), headers: { 'stripe-signature': 'valid_sig' } })
    const res = mockRes()
    const next = vi.fn()

    await handleWebhook(req, res, next)

    expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_123')
    expect(mockSyncSubscription).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ received: true })
  })

  it('handles customer.subscription.updated event', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    vi.mocked(getStripeWebhookSecret).mockReturnValue('whsec_test')
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      id: 'evt_789',
      data: {
        object: { id: 'sub_123', metadata: { userId: 'user-1' } },
      },
    })

    const req = mockReq({ body: Buffer.from('{}'), headers: { 'stripe-signature': 'valid_sig' } })
    const res = mockRes()
    const next = vi.fn()

    await handleWebhook(req, res, next)

    expect(mockSyncSubscription).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ received: true })
  })

  it('handles customer.subscription.deleted event', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    vi.mocked(getStripeWebhookSecret).mockReturnValue('whsec_test')
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      id: 'evt_101',
      data: {
        object: { id: 'sub_123', metadata: { userId: 'user-1' } },
      },
    })

    const req = mockReq({ body: Buffer.from('{}'), headers: { 'stripe-signature': 'valid_sig' } })
    const res = mockRes()
    const next = vi.fn()

    await handleWebhook(req, res, next)

    expect(mockSyncSubscription).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ received: true })
  })

  it('logs unhandled event types', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    vi.mocked(getStripeWebhookSecret).mockReturnValue('whsec_test')
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'unknown.event',
      id: 'evt_999',
      data: { object: {} },
    })

    const req = mockReq({ body: Buffer.from('{}'), headers: { 'stripe-signature': 'valid_sig' } })
    const res = mockRes()
    const next = vi.fn()

    await handleWebhook(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ received: true })
  })
})
