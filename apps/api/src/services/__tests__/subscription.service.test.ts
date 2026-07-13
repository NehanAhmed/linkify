import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb } = vi.hoisted(() => {
  const qb: Record<string, any> = {}

  const chainable = ['from', 'where', 'limit', 'orderBy', 'values', 'set', 'delete', 'innerJoin']
  for (const m of chainable) {
    qb[m] = vi.fn(() => qb)
  }

  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)

  const db = {
    select: vi.fn(() => qb),
    insert: vi.fn(() => qb),
    update: vi.fn(() => qb),
    delete: vi.fn(() => qb),
  }

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

const mockStripe = vi.hoisted(() => ({
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  subscriptions: {
    update: vi.fn(),
    retrieve: vi.fn(),
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
}))

vi.mock('../../services/stripe', () => ({
  getStripe: vi.fn(() => mockStripe),
  isStripeConfigured: vi.fn(),
  getPriceId: vi.fn(),
}))

vi.mock('../../utils/env', () => ({
  env: {
    BILLING_SUCCESS_URL: 'http://localhost:3000/billing/success',
    BILLING_CANCEL_URL: 'http://localhost:3000/billing/cancel',
  },
}))

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  getPlans,
  getUserPlan,
  createCheckoutSession,
  syncSubscription,
  cancelSubscription,
  getUserSubscription,
} from '../subscription.service'
import { isStripeConfigured, getPriceId } from '../stripe'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('getPlans', () => {
  it('returns all active plans ordered by sortOrder', async () => {
    const plansData = [
      { id: 1, name: 'Free', code: 'free', description: 'Free plan', maxLinks: 100, maxCustomDomains: 0, apiRateLimit: 100, features: { apiAccess: true }, priceMonthly: 0, priceYearly: 0, sortOrder: 0, active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'Pro', code: 'pro', description: 'Pro plan', maxLinks: 10000, maxCustomDomains: 5, apiRateLimit: 10000, features: { apiAccess: true }, priceMonthly: 2999, priceYearly: 29990, sortOrder: 1, active: true, createdAt: new Date(), updatedAt: new Date() },
    ]
    mockQb.then = (onfulfilled: any) => Promise.resolve(plansData).then(onfulfilled)

    const result = await getPlans()

    expect(result).toHaveLength(2)
    expect(result[0].code).toBe('free')
    expect(result[1].code).toBe('pro')
    expect(result[0].priceMonthly).toBe(0)
    expect(result[1].priceYearly).toBe(29990)
  })

  it('returns empty array when no plans', async () => {
    const result = await getPlans()

    expect(result).toHaveLength(0)
  })
})

describe('getUserPlan', () => {
  it('returns the default free plan when user has no subscription', async () => {
    const plan = await getUserPlan('user-1')

    expect(plan.planCode).toBe('free')
    expect(plan.planName).toBe('Free')
    expect(plan.maxLinks).toBe(100)
    expect(plan.apiRateLimit).toBe(100)
    expect(plan.status).toBe('active')
    expect(plan.cancelAtPeriodEnd).toBe(false)
  })

  it('returns plan when user has an active subscription', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      {
        planId: 2,
        status: 'active',
        currentPeriodEnd: new Date('2026-08-01'),
        cancelAtPeriodEnd: false,
        planName: 'Pro',
        planCode: 'pro',
        maxLinks: 10000,
        maxCustomDomains: 5,
        apiRateLimit: 10000,
        features: { apiAccess: true, customDomains: true },
      },
    ]).then(onfulfilled)

    const plan = await getUserPlan('user-1')

    expect(plan.planCode).toBe('pro')
    expect(plan.planName).toBe('Pro')
    expect(plan.maxLinks).toBe(10000)
    expect(plan.status).toBe('active')
    expect(plan.currentPeriodEnd).toBeTruthy()
  })

  it('uses correct query with innerJoin and where conditions', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { planId: 1, status: 'active', planCode: 'free', planName: 'Free', features: {}, maxLinks: 100, maxCustomDomains: 0, apiRateLimit: 100, currentPeriodEnd: null, cancelAtPeriodEnd: false },
    ]).then(onfulfilled)

    await getUserPlan('user-1')

    expect(mockDb.select).toHaveBeenCalled()
    expect(mockQb.from).toHaveBeenCalled()
    expect(mockQb.innerJoin).toHaveBeenCalled()
    expect(mockQb.where).toHaveBeenCalled()
    expect(mockQb.limit).toHaveBeenCalledWith(1)
  })
})

describe('createCheckoutSession', () => {
  it('throws when billing not configured', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false)

    await expect(createCheckoutSession('user-1', 'pro')).rejects.toThrow('Billing is not configured')
  })

  it('throws when plan not found', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    vi.mocked(getPriceId).mockReturnValue('price_pro')

    await expect(createCheckoutSession('user-1', 'invalid')).rejects.toThrow('Plan not found')
  })

  it('creates a checkout session successfully', async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(true)
    vi.mocked(getPriceId).mockReturnValue('price_pro')
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 2, code: 'pro', name: 'Pro', active: true },
    ]).then(onfulfilled)
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/test',
      id: 'cs_test_123',
    })

    const result = await createCheckoutSession('user-1', 'pro')

    expect(result.url).toBe('https://checkout.stripe.com/test')
    expect(result.sessionId).toBe('cs_test_123')
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: 'user-1',
        metadata: { planCode: 'pro', planId: '2' },
      }),
    )
  })
})

describe('syncSubscription', () => {
  const stripeSub = {
    id: 'sub_123',
    metadata: { userId: 'user-1', planCode: 'pro', planId: '2' },
    customer: 'cus_123',
    status: 'active',
    current_period_start: 1750000000,
    current_period_end: 1760000000,
    cancel_at_period_end: false,
    trial_end: null,
    items: { data: [] },
  }

  it('creates a new subscription when none exists', async () => {
    mockQb.returning.mockResolvedValue([{ id: 1 }])

    await syncSubscription(stripeSub as any)

    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockQb.values).toHaveBeenCalled()
  })

  it('updates an existing subscription', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([{ id: 1 }]).then(onfulfilled)

    await syncSubscription(stripeSub as any)

    expect(mockDb.update).toHaveBeenCalled()
    expect(mockQb.set).toHaveBeenCalled()
    expect(mockQb.where).toHaveBeenCalled()
  })

  it('handles subscription without userId in metadata', async () => {
    const subWithoutUser = { ...stripeSub, metadata: {} }

    await syncSubscription(subWithoutUser as any)

    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})

describe('cancelSubscription', () => {
  it('cancels an existing subscription', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 1, stripeSubscriptionId: 'sub_123', userId: 'user-1' },
    ]).then(onfulfilled)

    await cancelSubscription('user-1', 1)

    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', { cancel_at_period_end: true })
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockQb.set).toHaveBeenCalledWith(expect.objectContaining({ cancelAtPeriodEnd: true }))
  })

  it('throws when subscription not found', async () => {
    await expect(cancelSubscription('user-1', 999)).rejects.toThrow('Subscription not found')
  })

  it('throws when subscription not found (different user is implicit via WHERE clause)', async () => {
    await expect(cancelSubscription('user-1', 1)).rejects.toThrow('Subscription not found')
  })
})

describe('getUserSubscription', () => {
  it('returns subscription with plan details when active', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      {
        id: 1,
        userId: 'user-1',
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
        status: 'active',
        currentPeriodStart: new Date('2026-07-01'),
        currentPeriodEnd: new Date('2026-08-01'),
        cancelAtPeriodEnd: false,
        trialEnd: null,
        createdAt: new Date(),
        plan: { id: 2, name: 'Pro', code: 'pro', description: 'Pro plan', maxLinks: 10000, maxCustomDomains: 5, apiRateLimit: 10000, features: { apiAccess: true }, priceMonthly: 2999, priceYearly: 29990 },
      },
    ]).then(onfulfilled)

    const result = await getUserSubscription('user-1')

    expect(result).not.toBeNull()
    expect(result!.status).toBe('active')
    expect(result!.plan.code).toBe('pro')
  })

  it('returns null when no active subscription', async () => {
    const result = await getUserSubscription('user-1')

    expect(result).toBeNull()
  })
})
