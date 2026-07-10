import { Router } from 'express'
import { AppError } from '../utils/AppError'
import type { Request, Response, NextFunction } from 'express'
import { db } from '../db'
import { users, urls, visits } from '../db/schema'
import { count, sql } from 'drizzle-orm'

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

export default router
