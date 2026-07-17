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
import { logActionFromReq } from '../services/audit.service'
import { logger } from '../utils/logger'
import { isFeatureEnabled, FeatureFlag } from '../utils/featureFlags'
import { AppError } from '../utils/AppError'

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
    if (!isFeatureEnabled(FeatureFlag.BulkOperations)) {
      throw new AppError('Bulk operations are not available', 403, 'FEATURE_NOT_AVAILABLE')
    }
    const input = bulkOperationSchema.parse(req.body)
    const results = await bulkService.executeBulkOperation(req.user!.id, input)
    logActionFromReq(req, 'url.bulk_operation', 'url', undefined, {
      operation: input.operation,
      codeCount: input.codes.length,
      successCount: results.filter((r) => r.success).length,
    }).catch((err) => {
      logger.error({ err, operation: input.operation }, 'Failed to persist audit log for bulk operation')
    })
    const hasError = results.some((r) => !r.success)
    res.status(hasError ? 207 : 200).json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
}

export async function importCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isFeatureEnabled(FeatureFlag.BulkOperations)) {
      throw new AppError('Bulk operations are not available', 403, 'FEATURE_NOT_AVAILABLE')
    }
    const input = csvImportSchema.parse(req.body)
    const results = await bulkService.importCsv(input, req.user!.id)
    logActionFromReq(req, 'url.csv_imported', 'url', undefined, {
      rowCount: results.length,
      successCount: results.filter((r) => r.success).length,
    }).catch((err) => {
      logger.error({ err }, 'Failed to persist audit log for CSV import')
    })
    const hasError = results.some((r) => !r.success)
    res.status(hasError ? 207 : 201).json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
}
