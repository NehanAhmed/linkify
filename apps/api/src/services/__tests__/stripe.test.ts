import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockEnv = vi.hoisted(() => ({
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  STRIPE_PRICE_FREE: '',
  STRIPE_PRICE_PRO: 'price_pro',
  STRIPE_PRICE_ENTERPRISE: 'price_enterprise',
}))

vi.mock('../../utils/env', () => ({ env: mockEnv }))

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { isStripeConfigured, getPriceId, getStripeWebhookSecret } from '../stripe'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isStripeConfigured', () => {
  it('returns false when STRIPE_SECRET_KEY is empty', () => {
    mockEnv.STRIPE_SECRET_KEY = ''
    expect(isStripeConfigured()).toBe(false)
  })

  it('returns true when STRIPE_SECRET_KEY is set', () => {
    mockEnv.STRIPE_SECRET_KEY = 'sk_test_xyz'
    expect(isStripeConfigured()).toBe(true)
  })
})

describe('getPriceId', () => {
  it('returns pro price id for pro plan', () => {
    expect(getPriceId('pro')).toBe('price_pro')
  })

  it('returns enterprise price id for enterprise plan', () => {
    expect(getPriceId('enterprise')).toBe('price_enterprise')
  })

  it('returns undefined for free plan when no free price configured', () => {
    expect(getPriceId('free')).toBeUndefined()
  })

  it('returns undefined for unknown plan', () => {
    expect(getPriceId('nonexistent')).toBeUndefined()
  })
})

describe('getStripeWebhookSecret', () => {
  it('returns empty string when not configured', () => {
    mockEnv.STRIPE_WEBHOOK_SECRET = ''
    expect(getStripeWebhookSecret()).toBe('')
  })

  it('returns the webhook secret when configured', () => {
    mockEnv.STRIPE_WEBHOOK_SECRET = 'whsec_xyz'
    expect(getStripeWebhookSecret()).toBe('whsec_xyz')
  })
})
