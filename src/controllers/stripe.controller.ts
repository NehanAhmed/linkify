import type { Request, Response, NextFunction } from 'express'
import { getStripe, getStripeWebhookSecret, isStripeConfigured } from '../services/stripe'
import { syncSubscription } from '../services/subscription.service'
import { logger } from '../utils/logger'
import { AppError } from '../utils/AppError'

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isStripeConfigured()) {
      throw new AppError('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED')
    }

    const stripe = getStripe()
    const webhookSecret = getStripeWebhookSecret()
    const sig = req.headers['stripe-signature'] as string | undefined

    if (!sig) {
      throw new AppError('Missing stripe-signature header', 400, 'STRIPE_SIGNATURE_MISSING')
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
      logger.warn({ err }, 'Stripe webhook signature verification failed')
      res.status(400).json({ success: false, error: 'Invalid signature' })
      return
    }

    logger.info({ type: event.type, id: event.id }, 'Stripe webhook received')

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { mode?: string; subscription?: string | { id: string } }
        if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          const subscription = await stripe.subscriptions.retrieve(subId)
          await syncSubscription(subscription)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as { subscription?: string | { id: string } }
        if (invoice.subscription) {
          const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id
          const subscription = await stripe.subscriptions.retrieve(subId)
          await syncSubscription(subscription)
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Parameters<typeof syncSubscription>[0]
        await syncSubscription(subscription)
        break
      }

      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe webhook event type')
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
}
