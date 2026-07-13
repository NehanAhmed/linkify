import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimiter'

const router = Router()

router.post('/refresh', authLimiter, authController.refreshToken)
router.post('/reset-password', authLimiter, authController.resetPassword)
router.get('/me', requireAuth, authController.getUserProfile)
router.post('/api-keys', authLimiter, requireAuth, authController.createApiKey)
router.get('/api-keys', requireAuth, authController.listApiKeys)
router.put('/api-keys/:id', authLimiter, requireAuth, authController.updateApiKey)
router.delete('/api-keys/:id', authLimiter, requireAuth, authController.revokeApiKey)

export default router
