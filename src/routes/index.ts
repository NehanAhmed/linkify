import { Router } from 'express'
import urlRoutes from './url.routes'
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'
import { check as healthCheck } from '../controllers/health.controller'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { requireAAL } from '../middleware/requireAAL'

const router = Router()

router.get('/api/health', healthCheck)
router.use('/api/auth', authRoutes)
router.use('/api/urls', urlRoutes)
router.use('/api/admin', requireAuth, requireRole('admin'), requireAAL(), adminRoutes)

export default router
