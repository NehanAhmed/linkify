import { Router } from 'express'
import * as collectionController from '../controllers/collection.controller'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/', collectionController.listCollections)
router.post('/', collectionController.createCollection)
router.patch('/reorder', collectionController.reorderCollections)
router.get('/:id', collectionController.getCollection)
router.patch('/:id', collectionController.updateCollection)
router.delete('/:id', collectionController.deleteCollection)
router.post('/:id/share', collectionController.shareCollection)
router.delete('/:id/share', collectionController.revokeShare)
router.get('/:id/urls', collectionController.getCollectionUrls)
router.post('/:id/urls', collectionController.addUrlToCollection)
router.delete('/:id/urls', collectionController.removeUrlFromCollection)

export default router
