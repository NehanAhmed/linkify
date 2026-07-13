import { Router } from 'express'
import { getShared } from '../controllers/public.controller'

const router = Router()

router.get('/shared/:token', getShared)

export default router
