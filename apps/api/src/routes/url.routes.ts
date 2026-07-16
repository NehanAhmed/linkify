import { Router } from 'express'
import * as urlController from '../controllers/url.controllers'
import * as linkController from '../controllers/link.controller'
import * as qrController from '../controllers/qr.controller'
import { requireAuth } from '../middleware/auth'
import { requireAAL } from '../middleware/requireAAL'
import { requireScope } from '../middleware/requireScope'
import { strictLimiter, bulkLimiter, passwordLimiter } from '../middleware/rateLimiter'

const router = Router()

router.post('/bulk', requireAuth, requireScope('urls:write'), bulkLimiter, urlController.createUrlBulk)
router.post('/', requireAuth, requireScope('urls:write'), strictLimiter, urlController.createUrl)
router.get('/', requireAuth, requireScope('urls:read'), urlController.listUrls)
router.get('/:code', urlController.redirectUrl)
router.get('/:code/info', urlController.getUrlInfo)
router.get('/:code/visits', urlController.getVisits)
router.get('/:code/stats', urlController.getUrlStats)
router.get('/:code/visits/export', urlController.exportVisits)
router.get('/:code/qr', requireAuth, requireScope('urls:read'), qrController.generateQr)
router.post('/:code/verify-password', passwordLimiter, urlController.verifyPasswordRedirect)
router.delete('/:code', requireAuth, requireScope('urls:delete'), urlController.deleteUrl)
router.delete('/:code/purge', requireAuth, requireScope('urls:delete'), requireAAL(), urlController.purgeUrl)

router.patch('/:code/settings', requireAuth, requireScope('urls:write'), linkController.updateLinkSettings)
router.post('/:code/password', requireAuth, requireScope('urls:write'), linkController.setPassword)
router.delete('/:code/password', requireAuth, requireScope('urls:write'), linkController.removePassword)
router.post('/:code/verify-password-token', passwordLimiter, linkController.verifyPassword)
router.post('/bulk-operations', requireAuth, requireScope('urls:write'), bulkLimiter, linkController.executeBulkOperation)
router.post('/import/csv', requireAuth, requireScope('urls:write'), bulkLimiter, linkController.importCsv)

export default router
