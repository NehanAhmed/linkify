import type { Request, Response, NextFunction } from 'express'
import {
  createTagSchema,
  updateTagSchema,
  tagParamsSchema,
  bulkTagSchema,
} from '../validators/tag.validators'
import { paginationSchema } from '../validators/url.validators'
import * as tagsService from '../services/tags.service'
import { logActionFromReq } from '../services/audit.service'

export async function createTag(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTagSchema.parse(req.body)
    const result = await tagsService.createTag(req.user!.id, input)
    await logActionFromReq(req, 'tag.created', 'tag', String(result.id), { name: input.name })
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function listTags(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = paginationSchema.parse(req.query)
    const result = await tagsService.listTags(req.user!.id, page, limit)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function updateTag(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = tagParamsSchema.parse(req.params)
    const input = updateTagSchema.parse(req.body)
    const result = await tagsService.updateTag(id, req.user!.id, input)
    await logActionFromReq(req, 'tag.updated', 'tag', String(id), { name: input.name })
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteTag(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = tagParamsSchema.parse(req.params)
    await tagsService.deleteTag(id, req.user!.id)
    await logActionFromReq(req, 'tag.deleted', 'tag', String(id))
    res.json({ success: true, message: 'Tag deleted successfully' })
  } catch (err) {
    next(err)
  }
}

export async function bulkTagUrls(req: Request, res: Response, next: NextFunction) {
  try {
    const input = bulkTagSchema.parse(req.body)
    const results = await tagsService.bulkTagUrls(input.codes, input.tagIds, req.user!.id)
    const hasError = results.some((r) => !r.success)
    res.status(hasError ? 207 : 200).json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
}

export async function getTagUrls(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = tagParamsSchema.parse(req.params)
    const pagination = paginationSchema.parse(req.query)
    const result = await tagsService.getUrlsByTag(id, req.user!.id, pagination.page, pagination.limit)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}
