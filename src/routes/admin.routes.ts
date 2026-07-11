import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import {
  getDashboardStats,
  getUsers,
  getUserDetail,
  updateUserRole,
  suspendUser,
  unsuspendUser,
  getUserLinks,
  getAuditLogWithUsers,
  getSystemConfig,
  triggerPurgeExpired,
  triggerHealthCheck,
  getMaintenanceStatus,
} from '../services/admin.service'
import {
  adminPaginationSchema,
  updateUserRoleSchema,
  auditLogQuerySchema,
  dashboardQuerySchema,
  purgeExpiredSchema,
} from '../validators/admin.validators'
import { getAllFeatureFlags } from '../utils/featureFlags'

const router = Router()

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days } = dashboardQuerySchema.parse(req.query)
    const data = await getDashboardStats(days)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = adminPaginationSchema.parse(req.query)
    const data = await getUsers(page, limit)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getUserDetail(req.params.id as string)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.patch('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = updateUserRoleSchema.parse(req.body)
    await updateUserRole(req.params.id as string, role)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.post('/users/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await suspendUser(req.params.id as string)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.post('/users/:id/unsuspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await unsuspendUser(req.params.id as string)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.get('/users/:id/links', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = adminPaginationSchema.parse(req.query)
    const data = await getUserLinks(req.params.id as string, page, limit)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get('/audit-log', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, action, userId } = auditLogQuerySchema.parse(req.query)
    const data = await getAuditLogWithUsers(page, limit, action, userId)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get('/billing/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboardStats(30)
    res.json({
      success: true,
      data: {
        totalUsers: data.users.total,
        totalLinks: data.urls.total,
        totalVisits: data.visits.total,
        activeSubscriptions: data.activeSubscriptions,
        mrr: data.mrr,
        quotaMonth: data.quotaMonth,
      },
    })
  } catch (err) {
    next(err)
  }
})

router.get('/system/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getSystemConfig()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get('/system/flags', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: getAllFeatureFlags() })
  } catch (err) {
    next(err)
  }
})

router.post('/maintenance/purge-expired', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { daysOld } = purgeExpiredSchema.parse(req.body)
    const data = await triggerPurgeExpired(daysOld)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.post('/maintenance/recheck-links', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await triggerHealthCheck()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get('/maintenance/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = getMaintenanceStatus()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
