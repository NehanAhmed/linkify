import { Router } from 'express'
import urlRoutes from './url.routes'

const router = Router()

router.use('/api/urls', urlRoutes)

export default router
