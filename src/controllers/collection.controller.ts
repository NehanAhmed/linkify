import type { Request, Response, NextFunction } from 'express'
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionParamsSchema,
  addUrlToCollectionSchema,
  reorderCollectionsSchema,
} from '../validators/collection.validators'
import { paginationSchema } from '../validators/url.validators'
import * as collectionsService from '../services/collections.service'
import { logActionFromReq } from '../services/audit.service'

export async function createCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCollectionSchema.parse(req.body)
    const result = await collectionsService.createCollection(req.user!.id, input)
    await logActionFromReq(req, 'collection.created', 'collection', String(result.id), { name: input.name })
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function listCollections(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = paginationSchema.parse(req.query)
    const result = await collectionsService.listCollections(req.user!.id, page, limit)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function getCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = collectionParamsSchema.parse(req.params)
    const result = await collectionsService.getCollection(id, req.user!.id)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function updateCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = collectionParamsSchema.parse(req.params)
    const input = updateCollectionSchema.parse(req.body)
    const result = await collectionsService.updateCollection(id, req.user!.id, input)
    await logActionFromReq(req, 'collection.updated', 'collection', String(id), { name: input.name })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = collectionParamsSchema.parse(req.params)
    await collectionsService.deleteCollection(id, req.user!.id)
    await logActionFromReq(req, 'collection.deleted', 'collection', String(id))
    res.json({ success: true, message: 'Collection deleted successfully' })
  } catch (err) {
    next(err)
  }
}

export async function addUrlToCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = collectionParamsSchema.parse(req.params)
    const { urlCode } = addUrlToCollectionSchema.parse(req.body)
    const result = await collectionsService.addUrlToCollection(urlCode, id, req.user!.id)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function removeUrlFromCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = collectionParamsSchema.parse(req.params)
    const { urlCode } = addUrlToCollectionSchema.parse(req.body)
    await collectionsService.removeUrlFromCollection(urlCode, id, req.user!.id)
    res.json({ success: true, message: 'URL removed from collection' })
  } catch (err) {
    next(err)
  }
}

export async function getCollectionUrls(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = collectionParamsSchema.parse(req.params)
    const pagination = paginationSchema.parse(req.query)
    const result = await collectionsService.getCollectionUrls(id, req.user!.id, pagination.page, pagination.limit)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function reorderCollections(req: Request, res: Response, next: NextFunction) {
  try {
    const input = reorderCollectionsSchema.parse(req.body)
    await collectionsService.reorderCollections(req.user!.id, input)
    res.json({ success: true, message: 'Collections reordered successfully' })
  } catch (err) {
    next(err)
  }
}

export async function shareCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = collectionParamsSchema.parse(req.params)
    const result = await collectionsService.shareCollection(id, req.user!.id)
    const maskedToken = result.shareToken.slice(0, 8) + '...'
    await logActionFromReq(req, 'collection.shared', 'collection', String(id), { shareToken: maskedToken })
    res.json({ success: true, data: { ...result, shareUrl: `/api/shared/${result.shareToken}` } })
  } catch (err) {
    next(err)
  }
}

export async function revokeShare(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = collectionParamsSchema.parse(req.params)
    await collectionsService.revokeShare(id, req.user!.id)
    await logActionFromReq(req, 'collection.share_revoked', 'collection', String(id))
    res.json({ success: true, message: 'Collection share revoked' })
  } catch (err) {
    next(err)
  }
}
