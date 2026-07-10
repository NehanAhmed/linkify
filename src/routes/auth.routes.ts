import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth'
import { strictLimiter } from '../middleware/rateLimiter'

const router = Router()

router.post('/refresh', strictLimiter, authController.refreshToken)
router.post('/reset-password', strictLimiter, authController.resetPassword)
router.get('/me', requireAuth, authController.getUserProfile)
router.post('/api-keys', requireAuth, authController.createApiKey)
router.get('/api-keys', requireAuth, authController.listApiKeys)
router.delete('/api-keys/:id', requireAuth, authController.revokeApiKey)

export default router
