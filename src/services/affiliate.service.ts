import { db, dbReplica } from '../db'
import { urls, visits } from '../db/schema'
import { eq, and, sql, between, isNull, desc, count } from 'drizzle-orm'
import { AppError } from '../utils/AppError'
import { getUserPlan } from './subscription.service'

export async function assignAffiliate(code: string, userId: string, affiliateId: string, network?: string) {
  const plan = await getUserPlan(userId)
  if (!plan.features.affiliateLinks) {
    throw new AppError('Affiliate links are not available on your plan', 403, 'FEATURE_NOT_AVAILABLE')
  }

  const [existing] = await db
    .select({ userId: urls.userId })
    .from(urls)
    .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
    .limit(1)

  if (!existing) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (existing.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  await db
    .update(urls)
    .set({ affiliateId, affiliateNetwork: network ?? null })
    .where(eq(urls.code, code))
}

export async function removeAffiliate(code: string, userId: string) {
  const [existing] = await db
    .select({ userId: urls.userId })
    .from(urls)
    .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
    .limit(1)

  if (!existing) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (existing.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  await db
    .update(urls)
    .set({ affiliateId: null, affiliateNetwork: null })
    .where(eq(urls.code, code))
}

export async function getAffiliateReport(userId: string, fromDate: string, toDate: string) {
  const [existing] = await db
    .select({ planCode: sql<string>`'pro'` })
    .from(visits)
    .limit(1)

  const plan = await getUserPlan(userId)
  if (!plan.features.affiliateLinks) {
    throw new AppError('Affiliate links are not available on your plan', 403, 'FEATURE_NOT_AVAILABLE')
  }

  const from = new Date(fromDate)
  const to = new Date(toDate)

  const rows = await dbReplica
    .select({
      code: visits.code,
      url: urls.url,
      affiliateId: urls.affiliateId,
      affiliateNetwork: urls.affiliateNetwork,
      visitedAt: visits.visitedAt,
      country: visits.country,
      userAgent: visits.userAgent,
    })
    .from(visits)
    .innerJoin(urls, eq(visits.code, urls.code))
    .where(
      and(
        eq(urls.userId, userId),
        eq(visits.isAffiliateClick, true),
        sql`${urls.affiliateId} IS NOT NULL`,
        between(visits.visitedAt, from, to),
      ),
    )
    .orderBy(desc(visits.visitedAt))

  return rows
}
