import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  listPlans,
  createCheckout,
  getPortalLink,
  getSubscription,
  cancelUserSubscription,
  getUsageStats,
} from '../controllers/billing.controller'

const router = Router()

router.get('/plans', listPlans)
router.post('/checkout', requireAuth, createCheckout)
router.get('/portal', requireAuth, getPortalLink)
router.get('/subscription', requireAuth, getSubscription)
router.post('/cancel', requireAuth, cancelUserSubscription)
router.get('/usage', requireAuth, getUsageStats)

export default router
