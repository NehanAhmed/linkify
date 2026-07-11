import { Router } from 'express'
import { AppError } from '../utils/AppError'
import type { Request, Response, NextFunction } from 'express'
import { db } from '../db'
import { users, urls, visits, subscriptions, plans } from '../db/schema'
import { getAuditLog } from '../services/audit.service'
import { count, sql, eq, inArray } from 'drizzle-orm'

const router = Router()

router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .orderBy(users.createdAt)

    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
})

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [userCount] = await db.select({ total: count() }).from(users)
    const [urlCount] = await db.select({ total: count() }).from(urls)
    const [visitCount] = await db.select({ total: count() }).from(visits)

    res.json({
      success: true,
      data: {
        users: userCount?.total ?? 0,
        urls: urlCount?.total ?? 0,
        visits: visitCount?.total ?? 0,
      },
    })
  } catch (err) {
    next(err)
  }
})

router.get('/audit-log', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const action = req.query.action as string | undefined
    const userId = req.query.userId as string | undefined

    const result = await getAuditLog({ page, limit, action, userId })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

router.get('/billing/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [userCount] = await db.select({ total: count() }).from(users)
    const [urlCount] = await db.select({ total: count() }).from(urls)
    const [visitCount] = await db.select({ total: count() }).from(visits)

    const [activeSubs] = await db
      .select({ total: count() })
      .from(subscriptions)
      .where(inArray(subscriptions.status, ['active', 'trialing', 'past_due']))

    const [mrrResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${plans.priceMonthly}), 0)` })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(inArray(subscriptions.status, ['active', 'trialing']))

    const yearMonth = new Date().toISOString().slice(0, 7)

    res.json({
      success: true,
      data: {
        totalUsers: userCount?.total ?? 0,
        totalLinks: urlCount?.total ?? 0,
        totalVisits: visitCount?.total ?? 0,
        activeSubscriptions: activeSubs?.total ?? 0,
        mrr: mrrResult?.total ?? 0,
        quotaMonth: yearMonth,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
