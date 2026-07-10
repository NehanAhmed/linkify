import { Router } from 'express'
import urlRoutes from './url.routes'
import { check as healthCheck } from '../controllers/health.controller'

const router = Router()

router.get('/api/health', healthCheck)
router.use('/api/urls', urlRoutes)

export default router
