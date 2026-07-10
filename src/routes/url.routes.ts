import { Router } from 'express'
import * as urlController from '../controllers/url.controllers'

const router = Router()

router.post('/', urlController.createUrl)
router.get('/', urlController.listUrls)
router.get('/:code', urlController.redirectUrl)
router.get('/:code/info', urlController.getUrlInfo)
router.get('/:code/visits', urlController.getVisits)
router.delete('/:code', urlController.deleteUrl)

export default router
