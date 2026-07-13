import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const { mockQb, mockDb, resetQb } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'orderBy', 'values', 'set', 'delete', 'innerJoin']
  for (const m of chainable) qb[m] = vi.fn(() => qb)
  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)

  const db = { select: vi.fn(() => qb), insert: vi.fn(() => qb), update: vi.fn(() => qb), delete: vi.fn(() => qb) }
  function reset() {
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }
  return { mockQb: qb, mockDb: db, resetQb: reset }
})

vi.mock('../../db', () => ({ db: mockDb }))

const mockSubscriptionService = vi.hoisted(() => ({
  getPlans: vi.fn(),
  createCheckoutSession: vi.fn(),
  getUserSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  getUserPlan: vi.fn(),
}))

vi.mock('../../services/subscription.service', () => mockSubscriptionService)

const mockStripeInstance = vi.hoisted(() => ({
  billingPortal: { sessions: { create: vi.fn() } },
}))

vi.mock('../../services/stripe', () => ({
  getStripe: vi.fn(() => mockStripeInstance),
  isStripeConfigured: vi.fn(),
}))

import {
  listPlans,
  createCheckout,
  getPortalLink,
  getSubscription,
  cancelUserSubscription,
  getUsageStats,
} from '../billing.controller'

function mockReq(overrides: Partial<Request> = {}): Request {
  return { user: { id: 'user-1', role: 'user' }, ...overrides } as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('listPlans', () => {
  it('returns plans from service', async () => {
    const plans = [{ id: 1, name: 'Free', code: 'free' }]
    mockSubscriptionService.getPlans.mockResolvedValue(plans)
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await listPlans(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ success: true, data: plans })
  })

  it('calls next on error', async () => {
    const error = new Error('DB error')
    mockSubscriptionService.getPlans.mockRejectedValue(error)
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await listPlans(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})

describe('createCheckout', () => {
  it('creates a checkout session', async () => {
    mockSubscriptionService.createCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_test_123',
    })
    const req = mockReq({ body: { planCode: 'pro' } })
    const res = mockRes()
    const next = vi.fn()

    await createCheckout(req, res, next)

    expect(mockSubscriptionService.createCheckoutSession).toHaveBeenCalledWith('user-1', 'pro')
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { url: 'https://checkout.stripe.com/test', sessionId: 'cs_test_123' },
    })
  })

  it('validates planCode is required', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    const next = vi.fn()

    await createCheckout(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(mockSubscriptionService.createCheckoutSession).not.toHaveBeenCalled()
  })
})

describe('getPortalLink', () => {
  it('returns portal URL when user has stripe customer', async () => {
    vi.mocked((await import('../../services/stripe')).isStripeConfigured).mockReturnValue(true)
    mockSubscriptionService.getUserSubscription.mockResolvedValue({
      stripeCustomerId: 'cus_123',
    })
    mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/portal/test',
    })
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getPortalLink(req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { url: 'https://billing.stripe.com/portal/test' },
    })
  })

  it('throws when no stripe customer exists', async () => {
    vi.mocked((await import('../../services/stripe')).isStripeConfigured).mockReturnValue(true)
    mockSubscriptionService.getUserSubscription.mockResolvedValue(null)
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getPortalLink(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

describe('getSubscription', () => {
  it('returns user plan and subscription', async () => {
    const plan = { planCode: 'free', planName: 'Free', maxLinks: 100 }
    const sub = { id: 1, status: 'active', currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, trialEnd: null }
    mockSubscriptionService.getUserPlan.mockResolvedValue(plan)
    mockSubscriptionService.getUserSubscription.mockResolvedValue(sub)
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getSubscription(req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { plan, subscription: sub },
    })
  })

  it('returns plan with null subscription when none exists', async () => {
    mockSubscriptionService.getUserPlan.mockResolvedValue({ planCode: 'free' })
    mockSubscriptionService.getUserSubscription.mockResolvedValue(null)
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getSubscription(req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { plan: { planCode: 'free' }, subscription: null },
    })
  })
})

describe('cancelUserSubscription', () => {
  it('cancels subscription', async () => {
    const req = mockReq({ body: { subscriptionId: 1 } })
    const res = mockRes()
    const next = vi.fn()

    await cancelUserSubscription(req, res, next)

    expect(mockSubscriptionService.cancelSubscription).toHaveBeenCalledWith('user-1', 1)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Subscription will be cancelled at period end',
    })
  })
})

describe('getUsageStats', () => {
  it('returns usage stats for the user', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ total: 5 }]).then(onfulfilled)
    mockSubscriptionService.getUserPlan.mockResolvedValue({ planCode: 'free', maxLinks: 100 })

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await getUsageStats(req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        totalLinks: 5,
        totalVisits: 5,
        plan: expect.objectContaining({ planCode: 'free' }),
      }),
    })
  })
})
