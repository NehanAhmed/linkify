import { Router, raw } from 'express'
import { handleWebhook } from '../controllers/stripe.controller'

const router = Router()

router.post('/webhook', raw({ type: 'application/json' }), handleWebhook)

export default router
