import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getUrlParamsSchema } from '../validators/url.validators'
import { generateQrCode } from '../services/qr.service'
import { resolveUrl } from '../services/url.services'
import { env } from '../utils/env'

const qrQuerySchema = z.object({
  format: z.enum(['png', 'svg']).default('png'),
  logo: z.string().optional(),
})

export async function generateQr(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const { format, logo } = qrQuerySchema.parse(req.query)

    const urlRow = await resolveUrl(code)
    const targetUrl = urlRow.url

    const result = await generateQrCode(targetUrl, format, logo)

    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml')
      res.setHeader('Content-Disposition', `attachment; filename="${code}-qr.svg"`)
      res.send(result)
    } else {
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Content-Disposition', `attachment; filename="${code}-qr.png"`)
      res.send(result)
    }
  } catch (err) {
    next(err)
  }
}
