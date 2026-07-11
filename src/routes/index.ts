import { Router } from 'express'
import urlRoutes from './url.routes'
import authRoutes from './auth.routes'
import adminRoutes from './admin.routes'
import collectionRoutes from './collection.routes'
import tagRoutes from './tag.routes'
import publicRoutes from './public.routes'
import billingRoutes from './billing.routes'
import domainRoutes from './domain.routes'
import { check as healthCheck } from '../controllers/health.controller'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { requireAAL } from '../middleware/requireAAL'

const router = Router()

router.get('/api/health', healthCheck)
router.use('/api/auth', authRoutes)
router.use('/api/billing', billingRoutes)
router.use('/api/urls', urlRoutes)
router.use('/api/collections', collectionRoutes)
router.use('/api/tags', tagRoutes)
router.use('/api/domains', domainRoutes)
router.use('/api/admin', requireAuth, requireRole('admin'), requireAAL(), adminRoutes)
router.use('/api', publicRoutes)

export default router
