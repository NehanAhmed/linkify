import { Router } from 'express'
import * as urlController from '../controllers/url.controllers'
import * as linkController from '../controllers/link.controller'
import * as qrController from '../controllers/qr.controller'
import { requireAuth } from '../middleware/auth'
import { requireAAL } from '../middleware/requireAAL'
import { strictLimiter, bulkLimiter, passwordLimiter } from '../middleware/rateLimiter'

const router = Router()

router.post('/bulk', requireAuth, bulkLimiter, urlController.createUrlBulk)
router.post('/', requireAuth, strictLimiter, urlController.createUrl)
router.get('/', requireAuth, urlController.listUrls)
router.get('/:code', urlController.redirectUrl)
router.get('/:code/info', urlController.getUrlInfo)
router.get('/:code/visits', urlController.getVisits)
router.get('/:code/stats', urlController.getUrlStats)
router.get('/:code/visits/export', urlController.exportVisits)
router.get('/:code/qr', requireAuth, qrController.generateQr)
router.post('/:code/qr/regenerate', requireAuth, qrController.regenerateQr)
router.post('/:code/verify-password', passwordLimiter, urlController.verifyPasswordRedirect)
router.delete('/:code', requireAuth, urlController.deleteUrl)
router.delete('/:code/purge', requireAuth, requireAAL(), urlController.purgeUrl)

router.patch('/:code/settings', requireAuth, linkController.updateLinkSettings)
router.post('/:code/password', requireAuth, linkController.setPassword)
router.delete('/:code/password', requireAuth, linkController.removePassword)
router.post('/:code/verify-password-token', passwordLimiter, linkController.verifyPassword)
router.post('/bulk-operations', requireAuth, bulkLimiter, linkController.executeBulkOperation)
router.post('/import/csv', requireAuth, bulkLimiter, linkController.importCsv)

export default router
