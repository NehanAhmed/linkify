import { db } from '../db'
import { plans, subscriptions } from '../db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { AppError } from '../utils/AppError'
import { logger } from '../utils/logger'
import { getStripe, isStripeConfigured, getPriceId } from './stripe'
import { env } from '../utils/env'
import type Stripe from 'stripe'

export interface PlanFeatures {
  advancedStats: boolean
  customDomains: boolean
  passwordProtection: boolean
  bulkOperations: boolean
  apiAccess: boolean
  affiliateLinks: boolean
  prioritySupport: boolean
  [key: string]: boolean
}

export interface UserPlan {
  planId: number
  planCode: string
  planName: string
  maxLinks: number
  maxCustomDomains: number
  apiRateLimit: number
  features: PlanFeatures
  status: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

const DEFAULT_FREE_PLAN: UserPlan = {
  planId: 0,
  planCode: 'free',
  planName: 'Free',
  maxLinks: 100,
  maxCustomDomains: 0,
  apiRateLimit: 100,
  features: {
    advancedStats: false,
    customDomains: false,
    passwordProtection: true,
    bulkOperations: false,
    apiAccess: true,
    affiliateLinks: false,
    prioritySupport: false,
  },
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

export async function getPlans() {
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.active, true))
    .orderBy(plans.sortOrder)

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description,
    maxLinks: p.maxLinks,
    maxCustomDomains: p.maxCustomDomains,
    apiRateLimit: p.apiRateLimit,
    features: p.features as PlanFeatures,
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
    sortOrder: p.sortOrder,
  }))
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const [sub] = await db
    .select({
      planId: subscriptions.planId,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      planName: plans.name,
      planCode: plans.code,
      maxLinks: plans.maxLinks,
      maxCustomDomains: plans.maxCustomDomains,
      apiRateLimit: plans.apiRateLimit,
      features: plans.features,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ['active', 'trialing', 'past_due']),
      ),
    )
    .limit(1)

  if (!sub) {
    return DEFAULT_FREE_PLAN
  }

  return {
    planId: sub.planId,
    planCode: sub.planCode,
    planName: sub.planName,
    maxLinks: sub.maxLinks,
    maxCustomDomains: sub.maxCustomDomains,
    apiRateLimit: sub.apiRateLimit,
    features: sub.features as PlanFeatures,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  }
}

export async function createCheckoutSession(userId: string, planCode: string) {
  if (!isStripeConfigured()) {
    throw new AppError('Billing is not configured', 503, 'BILLING_NOT_CONFIGURED')
  }

  const stripe = getStripe()
  const priceId = getPriceId(planCode)
  if (!priceId) {
    throw new AppError('Invalid plan code', 400, 'INVALID_PLAN_CODE')
  }

  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.code, planCode), eq(plans.active, true)))
    .limit(1)

  if (!plan) {
    throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND')
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    metadata: { planCode, planId: String(plan.id) },
    success_url: `${env.BILLING_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.BILLING_CANCEL_URL,
    subscription_data: {
      metadata: { userId, planCode, planId: String(plan.id) },
    },
  })

  return { url: session.url, sessionId: session.id }
}

export async function syncSubscription(stripeSub: Stripe.Subscription) {
  const metadata = stripeSub.metadata
  const userId = metadata.userId
  const planCode = metadata.planCode
  const planIdStr = metadata.planId

  if (!userId && !stripeSub.customer) {
    logger.warn({ stripeSubId: stripeSub.id }, 'Cannot sync subscription: no userId in metadata or customer')
    return
  }

  const resolvedUserId = userId ?? (typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id) ?? ''

  if (!planCode && !planIdStr) {
    const plan = await findPlanByPrice(stripeSub.items.data)
    if (!plan) {
      logger.warn({ stripeSubId: stripeSub.id }, 'Cannot sync subscription: no matching plan found')
      return
    }
    if (resolvedUserId) {
      await upsertSubscription(stripeSub, resolvedUserId, plan.id)
    }
    return
  }

  const resolvedPlanId = planIdStr
    ? parseInt(planIdStr, 10)
    : await getPlanIdByCode(planCode!)

  if (!resolvedPlanId || !resolvedUserId) {
    logger.warn({ stripeSubId: stripeSub.id }, 'Cannot sync subscription: invalid plan or missing userId')
    return
  }

  await upsertSubscription(stripeSub, resolvedUserId, resolvedPlanId)
}

async function findPlanByPrice(items: Stripe.SubscriptionItem[]): Promise<typeof plans.$inferSelect | null> {
  for (const item of items) {
    const priceId = item.price.id
    const allPlans = await db.select().from(plans).where(eq(plans.active, true))
    for (const plan of allPlans) {
      const planPriceId = getPriceId(plan.code)
      if (planPriceId === priceId) return plan
    }
  }
  return null
}

async function getPlanIdByCode(code: string): Promise<number | null> {
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.code, code))
    .limit(1)
  return plan?.id ?? null
}

async function upsertSubscription(stripeSub: Stripe.Subscription, userId: string, planId: number) {
  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id))
    .limit(1)

  const customer = stripeSub.customer
  const stripeCustomerId: string | null = typeof customer === 'string'
    ? customer
    : customer?.id ?? null

  // Stripe.Subscription TS type omits some fields present at runtime
  const sub = stripeSub as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
    trial_end?: number | null
  }

  const values = {
    userId,
    planId,
    stripeSubscriptionId: stripeSub.id,
    stripeCustomerId,
    status: stripeSub.status,
    currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    updatedAt: new Date(),
  }

  if (existing.length > 0) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing[0].id))
    logger.info({ subscriptionId: existing[0].id, status: values.status }, 'Subscription updated')
  } else {
    const [inserted] = await db.insert(subscriptions).values(values).returning({ id: subscriptions.id })
    logger.info({ subscriptionId: inserted.id, status: values.status }, 'Subscription created')
  }
}

export async function cancelSubscription(userId: string, subscriptionId: number) {
  const [sub] = await db
    .select({
      id: subscriptions.id,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      userId: subscriptions.userId,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)))
    .limit(1)

  if (!sub) {
    throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND')
  }

  if (sub.stripeSubscriptionId && isStripeConfigured()) {
    const stripe = getStripe()
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  }

  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id))
}

export async function getUserSubscription(userId: string) {
    const [sub] = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      stripeCustomerId: subscriptions.stripeCustomerId,
      status: subscriptions.status,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      trialEnd: subscriptions.trialEnd,
      createdAt: subscriptions.createdAt,
      plan: {
        id: plans.id,
        name: plans.name,
        code: plans.code,
        description: plans.description,
        maxLinks: plans.maxLinks,
        maxCustomDomains: plans.maxCustomDomains,
        apiRateLimit: plans.apiRateLimit,
        features: plans.features,
        priceMonthly: plans.priceMonthly,
        priceYearly: plans.priceYearly,
      },
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ['active', 'trialing', 'past_due', 'incomplete']),
      ),
    )
    .orderBy(desc(subscriptions.id))
    .limit(1)

  return sub ?? null
}
