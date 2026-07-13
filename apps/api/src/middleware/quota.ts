import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { db } from '../db'
import { usageQuota } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getUserPlan } from '../services/subscription.service'

export async function checkQuota(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      next()
      return
    }

    const userId = req.user.id
    const yearMonth = new Date().toISOString().slice(0, 7)
    const plan = await getUserPlan(userId)
    const limit = plan.apiRateLimit

    const [row] = await db
      .select({ count: usageQuota.requestsCount })
      .from(usageQuota)
      .where(and(eq(usageQuota.userId, userId), eq(usageQuota.yearMonth, yearMonth)))
      .limit(1)

    const current = row?.count ?? 0

    if (current >= limit) {
      throw new AppError(
        `API quota exhausted (${limit}/${limit}). Upgrade your plan for more.`,
        429,
        'QUOTA_EXHAUSTED',
      )
    }

    await db
      .insert(usageQuota)
      .values({ userId, yearMonth, requestsCount: 1 })
      .onConflictDoUpdate({
        target: [usageQuota.userId, usageQuota.yearMonth],
        set: { requestsCount: sql`${usageQuota.requestsCount} + 1`, updatedAt: new Date() },
      })

    next()
  } catch (err) {
    if (err instanceof AppError) {
      next(err)
      return
    }
    next(err)
  }
}
