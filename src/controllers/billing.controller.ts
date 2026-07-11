import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  getPlans,
  createCheckoutSession,
  getUserSubscription,
  cancelSubscription,
  getUserPlan,
} from '../services/subscription.service'
import { getStripe, isStripeConfigured } from '../services/stripe'
import { AppError } from '../utils/AppError'
import { db } from '../db'
import { urls, visits } from '../db/schema'
import { count, sql, eq, and } from 'drizzle-orm'

const checkoutSchema = z.object({
  planCode: z.enum(['free', 'pro', 'enterprise']),
})

const cancelSchema = z.object({
  subscriptionId: z.coerce.number().int().positive(),
})

export async function listPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getPlans()
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function createCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    const { planCode } = checkoutSchema.parse(req.body)
    const result = await createCheckoutSession(req.user!.id, planCode)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function getPortalLink(_req: Request, res: Response, next: NextFunction) {
  try {
    if (!isStripeConfigured()) {
      throw new AppError('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED')
    }

    const stripe = getStripe()
    const sub = await getUserSubscription(_req.user!.id)

    if (!sub?.stripeCustomerId) {
      throw new AppError('No active billing customer found', 404, 'NO_CUSTOMER')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: process.env.BILLING_RETURN_URL || 'http://localhost:3000',
    })

    res.json({ success: true, data: { url: session.url } })
  } catch (err) {
    next(err)
  }
}

export async function getSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await getUserPlan(req.user!.id)
    const sub = await getUserSubscription(req.user!.id)
    res.json({
      success: true,
      data: {
        plan,
        subscription: sub
          ? {
              id: sub.id,
              status: sub.status,
              currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
              currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
              trialEnd: sub.trialEnd?.toISOString() ?? null,
            }
          : null,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function cancelUserSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { subscriptionId } = cancelSchema.parse(req.body)
    await cancelSubscription(req.user!.id, subscriptionId)
    res.json({ success: true, message: 'Subscription will be cancelled at period end' })
  } catch (err) {
    next(err)
  }
}

export async function getUsageStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const yearMonth = new Date().toISOString().slice(0, 7)

    const [linkCount] = await db
      .select({ total: count() })
      .from(urls)
      .where(and(eq(urls.userId, userId), sql`${urls.deletedAt} IS NULL`))

    const [visitResult] = await db
      .select({ total: count() })
      .from(visits)
      .innerJoin(urls, eq(visits.code, urls.code))
      .where(eq(urls.userId, userId))

    const plan = await getUserPlan(userId)

    res.json({
      success: true,
      data: {
        totalLinks: linkCount?.total ?? 0,
        totalVisits: visitResult?.total ?? 0,
        plan,
        quotaMonth: yearMonth,
      },
    })
  } catch (err) {
    next(err)
  }
}
