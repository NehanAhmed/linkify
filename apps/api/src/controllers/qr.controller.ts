import type { Request, Response, NextFunction } from 'express'
import { and, eq, isNull } from 'drizzle-orm'
import { getUrlParamsSchema } from '../validators/url.validators'
import { qrQuerySchema, regenerateQrSchema } from '../validators/qr.validators'
import { generateQrCode } from '../services/qr.service'
import { getQrCache, setQrCache, deleteAllQrCaches } from '../services/url.services'
import { db } from '../db'
import { urls } from '../db/schema'
import { env } from '../utils/env'
import { AppError } from '../utils/AppError'

export async function generateQr(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const { format, logo } = qrQuerySchema.parse(req.query)

    const [urlRow] = await db
      .select({ qrExpiresAt: urls.qrExpiresAt, userId: urls.userId })
      .from(urls)
      .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
      .limit(1)

    if (!urlRow) {
      throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
    }

    if (urlRow.userId !== req.user!.id) {
      throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
    }

    if (urlRow.qrExpiresAt && urlRow.qrExpiresAt < new Date()) {
      res.status(410).json({
        error: 'QR_CODE_EXPIRED',
        message: `This QR code expired on ${urlRow.qrExpiresAt.toISOString()}`,
        expiredAt: urlRow.qrExpiresAt.toISOString(),
      })
      return
    }

    const cached = await getQrCache(code, format, logo)
    if (cached) {
      const buf = Buffer.from(cached.data, 'base64')
      res.setHeader('Content-Type', format === 'svg' ? 'image/svg+xml' : 'image/png')
      res.setHeader('Content-Disposition', `attachment; filename="${code}-qr.${format}"`)
      res.send(buf)
      return
    }

    const targetUrl = `${env.BASE_URL}/${code}`
    const result = await generateQrCode(targetUrl, format, logo)

    const data = format === 'svg' ? result.toString() : (result as Buffer).toString('base64')
    await setQrCache(code, format, data, logo)

    res.setHeader('Content-Type', format === 'svg' ? 'image/svg+xml' : 'image/png')
    res.setHeader('Content-Disposition', `attachment; filename="${code}-qr.${format}"`)
    res.send(result)
  } catch (err) {
    next(err)
  }
}

export async function regenerateQr(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const { format, logo } = qrQuerySchema.parse(req.query)
    const { expiresAt } = regenerateQrSchema.parse(req.body)

    const [urlRow] = await db
      .select({ qrExpiresAt: urls.qrExpiresAt, userId: urls.userId })
      .from(urls)
      .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
      .limit(1)

    if (!urlRow) {
      throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
    }

    if (urlRow.userId !== req.user!.id) {
      throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
    }

    if (!urlRow.qrExpiresAt || urlRow.qrExpiresAt >= new Date()) {
      throw new AppError('QR code has not expired yet', 400, 'QR_NOT_YET_EXPIRED')
    }

    await deleteAllQrCaches(code)

    await db.update(urls).set({ qrExpiresAt: new Date(expiresAt) }).where(eq(urls.code, code))

    const targetUrl = `${env.BASE_URL}/${code}`
    const result = await generateQrCode(targetUrl, format, logo)

    const data = format === 'svg' ? result.toString() : (result as Buffer).toString('base64')
    await setQrCache(code, format, data, logo)

    res.setHeader('Content-Type', format === 'svg' ? 'image/svg+xml' : 'image/png')
    res.setHeader('Content-Disposition', `attachment; filename="${code}-qr.${format}"`)
    res.send(result)
  } catch (err) {
    next(err)
  }
}
