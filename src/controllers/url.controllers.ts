import type { Request, Response, NextFunction } from 'express'
import { createUrlSchema, getUrlParamsSchema, paginationSchema } from '../validators/url.validators'
import * as urlService from '../services/url.services'

export async function createUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUrlSchema.parse(req.body)
    const result = await urlService.createShortUrl(input)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function redirectUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const url = await urlService.resolveUrl(code)

    await urlService.recordVisit(code, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
    })

    res.redirect(301, url.url)
  } catch (err) {
    next(err)
  }
}

export async function getUrlInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const url = await urlService.resolveUrl(code)
    res.json({
      success: true,
      data: {
        code: url.code,
        url: url.url,
        visits: url.visits,
        createdAt: url.createdAt.toISOString(),
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const pagination = paginationSchema.parse(req.query)
    const result = await urlService.getUrlVisits(code, pagination.page, pagination.limit)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function listUrls(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = paginationSchema.parse(req.query)
    const result = await urlService.listUrls(pagination.page, pagination.limit)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    await urlService.deleteUrl(code)
    res.json({ success: true, message: 'URL deleted successfully' })
  } catch (err) {
    next(err)
  }
}
