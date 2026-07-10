import type { Request, Response, NextFunction } from 'express'
import {
  createUrlSchema,
  createUrlBulkSchema,
  getUrlParamsSchema,
  paginationSchema,
} from '../validators/url.validators'
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

export async function createUrlBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUrlBulkSchema.parse(req.body)
    const results = await urlService.createShortUrlBulk(input)
    const hasError = results.some((r) => !r.success)
    res.status(hasError ? 207 : 201).json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
}

export async function redirectUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    await performRedirect(code, req, res)
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
        title: url.title,
        description: url.description,
        image: url.image,
        visits: url.visits,
        expiresAt: url.expiresAt?.toISOString() ?? null,
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

export async function rootRedirect(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params[0]
    await performRedirect(code, req, res)
  } catch (err) {
    next(err)
  }
}

async function performRedirect(code: string, req: Request, res: Response) {
  const url = await urlService.resolveUrl(code)

  urlService.recordVisit(code, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
  }).catch(() => {})

  res.redirect(301, url.url)
}
