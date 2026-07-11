import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { checkQuota } from '../middleware/quota'
import {
  addDomain,
  listDomains,
  verifyDomain,
  removeDomain,
} from '../controllers/domain.controller'

const router = Router()

router.use(requireAuth)
router.use(checkQuota)

router.post('/', addDomain)
router.get('/', listDomains)
router.post('/:id/verify', verifyDomain)
router.delete('/:id', removeDomain)

export default router
