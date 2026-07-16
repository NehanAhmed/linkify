import { Router } from 'express'
import * as tagController from '../controllers/tag.controller'
import { requireAuth } from '../middleware/auth'
import { requireScope } from '../middleware/requireScope'
import { bulkLimiter } from '../middleware/rateLimiter'

const router = Router()

router.get('/', requireAuth, requireScope('urls:read'), tagController.listTags)
router.post('/', requireAuth, requireScope('urls:write'), tagController.createTag)
router.patch('/:id', requireAuth, requireScope('urls:write'), tagController.updateTag)
router.delete('/:id', requireAuth, requireScope('urls:write'), tagController.deleteTag)
router.post('/bulk', requireAuth, requireScope('urls:write'), bulkLimiter, tagController.bulkTagUrls)
router.get('/:id/urls', requireAuth, requireScope('urls:read'), tagController.getTagUrls)

export default router
