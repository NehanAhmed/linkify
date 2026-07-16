import { Router } from 'express'
import * as collectionController from '../controllers/collection.controller'
import { requireAuth } from '../middleware/auth'
import { requireScope } from '../middleware/requireScope'

const router = Router()

router.get('/', requireAuth, requireScope('urls:read'), collectionController.listCollections)
router.post('/', requireAuth, requireScope('urls:write'), collectionController.createCollection)
router.patch('/reorder', requireAuth, requireScope('urls:write'), collectionController.reorderCollections)
router.get('/:id', requireAuth, requireScope('urls:read'), collectionController.getCollection)
router.patch('/:id', requireAuth, requireScope('urls:write'), collectionController.updateCollection)
router.delete('/:id', requireAuth, requireScope('urls:write'), collectionController.deleteCollection)
router.post('/:id/share', requireAuth, requireScope('urls:write'), collectionController.shareCollection)
router.delete('/:id/share', requireAuth, requireScope('urls:write'), collectionController.revokeShare)
router.get('/:id/urls', requireAuth, requireScope('urls:read'), collectionController.getCollectionUrls)
router.post('/:id/urls', requireAuth, requireScope('urls:write'), collectionController.addUrlToCollection)
router.delete('/:id/urls', requireAuth, requireScope('urls:write'), collectionController.removeUrlFromCollection)

export default router
