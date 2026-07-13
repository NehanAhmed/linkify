import { Router } from 'express'
import * as tagController from '../controllers/tag.controller'
import { requireAuth } from '../middleware/auth'
import { bulkLimiter } from '../middleware/rateLimiter'

const router = Router()

router.use(requireAuth)

router.get('/', tagController.listTags)
router.post('/', tagController.createTag)
router.patch('/:id', tagController.updateTag)
router.delete('/:id', tagController.deleteTag)
router.post('/bulk', bulkLimiter, tagController.bulkTagUrls)
router.get('/:id/urls', tagController.getTagUrls)

export default router
