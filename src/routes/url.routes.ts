import { Router } from 'express'
import * as urlController from '../controllers/url.controllers'
import { requireAuth } from '../middleware/auth'
import { strictLimiter, bulkLimiter } from '../middleware/rateLimiter'

const router = Router()

router.post('/bulk', requireAuth, bulkLimiter, urlController.createUrlBulk)
router.post('/', requireAuth, strictLimiter, urlController.createUrl)
router.get('/', requireAuth, urlController.listUrls)
router.get('/:code', urlController.redirectUrl)
router.get('/:code/info', urlController.getUrlInfo)
router.get('/:code/visits', urlController.getVisits)
router.get('/:code/stats', urlController.getUrlStats)
router.get('/:code/visits/export', urlController.exportVisits)
router.delete('/:code', requireAuth, urlController.deleteUrl)

export default router
