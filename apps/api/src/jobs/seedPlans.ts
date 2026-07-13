import { db } from '../db'
import { plans } from '../db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '../utils/logger'

const PLAN_DEFINITIONS = [
  {
    name: 'Free',
    code: 'free',
    description: 'Essential link management for individuals. 100 links, basic stats.',
    maxLinks: 100,
    maxCustomDomains: 0,
    apiRateLimit: 100,
    features: ['advancedStats', 'customDomains', 'passwordProtection', 'bulkOperations', 'apiAccess', 'affiliateLinks', 'prioritySupport'].reduce(
      (acc, key) => ({ ...acc, [key]: key === 'passwordProtection' || key === 'apiAccess' }),
      {} as Record<string, boolean>,
    ),
    priceMonthly: 0,
    priceYearly: 0,
    sortOrder: 0,
  },
  {
    name: 'Pro',
    code: 'pro',
    description: 'For professionals and small teams. 10k links, full analytics, custom domains.',
    maxLinks: 10_000,
    maxCustomDomains: 5,
    apiRateLimit: 10_000,
    features: ['advancedStats', 'customDomains', 'passwordProtection', 'bulkOperations', 'apiAccess', 'affiliateLinks', 'prioritySupport'].reduce(
      (acc, key) => ({ ...acc, [key]: key !== 'prioritySupport' }),
      {} as Record<string, boolean>,
    ),
    priceMonthly: 2_999,
    priceYearly: 29_990,
    sortOrder: 1,
  },
  {
    name: 'Enterprise',
    code: 'enterprise',
    description: 'For organizations needing unlimited everything, SSO, and SLA.',
    maxLinks: 1_000_000,
    maxCustomDomains: 50,
    apiRateLimit: 100_000,
    features: ['advancedStats', 'customDomains', 'passwordProtection', 'bulkOperations', 'apiAccess', 'affiliateLinks', 'prioritySupport'].reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<string, boolean>,
    ),
    priceMonthly: 9_999,
    priceYearly: 99_990,
    sortOrder: 2,
  },
]

export async function seedPlans() {
  for (const plan of PLAN_DEFINITIONS) {
    const existing = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.code, plan.code))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(plans)
        .set({ ...plan, updatedAt: new Date() })
        .where(eq(plans.code, plan.code))
      logger.info({ code: plan.code }, 'Plan updated')
    } else {
      await db.insert(plans).values(plan)
      logger.info({ code: plan.code }, 'Plan created')
    }
  }
}

if (require.main === module) {
  seedPlans()
    .then(() => {
      logger.info('Plans seeded successfully')
      process.exit(0)
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to seed plans')
      process.exit(1)
    })
}
