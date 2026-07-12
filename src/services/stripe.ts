import Stripe from 'stripe'
import { env } from '../utils/env'
import { logger } from '../utils/logger'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripeInstance = new Stripe(env.STRIPE_SECRET_KEY, {
      typescript: true,
    })
  }
  return stripeInstance
}

export function getStripeWebhookSecret(): string {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.warn('STRIPE_WEBHOOK_SECRET is not configured — webhook verification disabled')
    return ''
  }
  return env.STRIPE_WEBHOOK_SECRET
}

export function isStripeConfigured(): boolean {
  return !!env.STRIPE_SECRET_KEY
}

export function getPriceId(planCode: string): string | undefined {
  switch (planCode) {
    case 'free':
      return env.STRIPE_PRICE_FREE || undefined
    case 'pro':
      return env.STRIPE_PRICE_PRO
    case 'enterprise':
      return env.STRIPE_PRICE_ENTERPRISE || undefined
    default:
      return undefined
  }
}
