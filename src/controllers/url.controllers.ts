import type { Request, Response, NextFunction } from 'express'
import {
  createUrlSchema,
  createUrlBulkSchema,
  getUrlParamsSchema,
  paginationSchema,
  listUrlsQuerySchema,
} from '../validators/url.validators'
import * as urlService from '../services/url.services'
import { verifyLinkAccessToken, resolveChain } from '../services/link.service'
import { AppError } from '../utils/AppError'
import { logActionFromReq } from '../services/audit.service'
import { isBot } from '../utils/botDetection'
import { logger } from '../utils/logger'
import { db } from '../db'
import { visits } from '../db/schema'
import { count, eq, asc } from 'drizzle-orm'

export async function createUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUrlSchema.parse(req.body)
    const result = await urlService.createShortUrl(input, req.user!.id)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function createUrlBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUrlBulkSchema.parse(req.body)
    const results = await urlService.createShortUrlBulk(input, req.user!.id)
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

export async function verifyPasswordRedirect(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const token = req.query.token as string | undefined
    if (!token) {
      throw new AppError('Access token required', 401, 'ACCESS_TOKEN_REQUIRED')
    }
    const resolvedCode = await verifyLinkAccessToken(token)
    if (resolvedCode !== code) {
      throw new AppError('Token does not match this link', 403, 'TOKEN_MISMATCH')
    }
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
        uniqueVisits: url.uniqueVisits,
        expiresAt: url.expiresAt?.toISOString() ?? null,
        activeAt: url.activeAt?.toISOString() ?? null,
        hasPassword: !!url.passwordHash,
        blockBots: url.blockBots,
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

export async function getUrlStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const stats = await urlService.getUrlStats(code)
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
}

const CSV_EXPORT_PAGE_SIZE = 500

export async function exportVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)

    const [totalResult] = await db.select({ total: count() }).from(visits).where(eq(visits.code, code))
    const total = totalResult?.total ?? 0

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${code}-visits.csv"`)

    const headerRow = urlService.CSV_HEADERS.join(',')
    res.write('\uFEFF' + headerRow + '\n')

    for (let page = 1; page <= Math.ceil(total / CSV_EXPORT_PAGE_SIZE); page++) {
      const rows = await urlService.getUrlVisitsPage(code, page, CSV_EXPORT_PAGE_SIZE)
      for (const v of rows) {
        res.write(urlService.visitToCsvRow(v) + '\n')
      }
    }

    res.end()
  } catch (err) {
    next(err)
  }
}

export async function listUrls(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listUrlsQuerySchema.parse(req.query)
    const userId = req.user!.id
    const isAdmin = req.user!.role === 'admin'
    const result = await urlService.listUrls(query, userId, isAdmin)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    await urlService.deleteUrl(code, req.user!.id, req.user!.role === 'admin')
    logActionFromReq(req, 'url.deleted', 'url', code).catch((err) => {
      logger.error({ err, code }, 'Failed to persist audit log for URL deletion')
    })
    res.json({ success: true, message: 'URL soft deleted successfully' })
  } catch (err) {
    next(err)
  }
}

export async function purgeUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    await urlService.purgeUrl(code, req.user!.id, req.user!.role === 'admin')
    await logActionFromReq(req, 'url.purged', 'url', code)
    res.json({ success: true, message: 'URL permanently deleted' })
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

  if (url.blockBots) {
    const ua = req.headers['user-agent']
    const botResult = isBot(ua, req.ip)
    if (botResult.isBot) {
      res.status(403).json({
        success: false,
        error: 'Automated requests are not allowed for this link',
        code: 'BOTS_BLOCKED',
      })
      return
    }
  }

  if (url.passwordHash) {
    const token = req.query.token as string | undefined
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'This link is password protected. POST /:code/verify-password to get an access token.',
        code: 'LINK_PASSWORD_REQUIRED',
      })
      return
    }
    await verifyLinkAccessToken(token)
  }

  const targetUrl = await resolveChain(url.url)

  urlService.recordVisit(code, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
  }).catch(() => {})

  res.redirect(301, targetUrl)
}
