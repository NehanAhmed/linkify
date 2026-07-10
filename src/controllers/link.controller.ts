import type { Request, Response, NextFunction } from 'express'
import {
  setPasswordSchema,
  verifyPasswordSchema,
  updateLinkSettingsSchema,
  bulkOperationSchema,
  csvImportSchema,
} from '../validators/link.validators'
import { getUrlParamsSchema } from '../validators/url.validators'
import * as linkService from '../services/link.service'
import * as bulkService from '../services/bulk.service'

export async function setPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const { password } = setPasswordSchema.parse(req.body)
    await linkService.setPassword(code, req.user!.id, password)
    res.json({ success: true, message: 'Password set successfully' })
  } catch (err) {
    next(err)
  }
}

export async function removePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    await linkService.removePassword(code, req.user!.id)
    res.json({ success: true, message: 'Password removed successfully' })
  } catch (err) {
    next(err)
  }
}

export async function verifyPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const { password } = verifyPasswordSchema.parse(req.body)
    const token = await linkService.verifyPasswordReturnToken(code, password)
    res.json({ success: true, data: { token } })
  } catch (err) {
    next(err)
  }
}

export async function updateLinkSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = getUrlParamsSchema.parse(req.params)
    const input = updateLinkSettingsSchema.parse(req.body)
    await linkService.updateLinkSettings(code, req.user!.id, input)
    res.json({ success: true, message: 'Settings updated successfully' })
  } catch (err) {
    next(err)
  }
}

export async function executeBulkOperation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = bulkOperationSchema.parse(req.body)
    const results = await bulkService.executeBulkOperation(req.user!.id, input)
    const hasError = results.some((r) => !r.success)
    res.status(hasError ? 207 : 200).json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
}

export async function importCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const input = csvImportSchema.parse(req.body)
    const results = await bulkService.importCsv(input, req.user!.id)
    const hasError = results.some((r) => !r.success)
    res.status(hasError ? 207 : 201).json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
}
