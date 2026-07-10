import { db } from '../db'
import { urls } from '../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { AppError } from '../utils/AppError'
import { bulkTagUrls } from './tags.service'
import { addUrlToCollection } from './collections.service'
import { createShortUrl } from './url.services'
import papa from 'papaparse'
import type { BulkOperationInput, CsvImportInput } from '../validators/link.validators'
import type { BulkOperationResponse } from '../types/url.types'

export async function executeBulkOperation(
  userId: string,
  input: BulkOperationInput,
): Promise<BulkOperationResponse[]> {
  switch (input.operation) {
    case 'tag':
      return bulkTag(input.codes, input.tagIds ?? [], userId)
    case 'move':
      return bulkMoveToCollection(input.codes, input.collectionId!, userId)
    case 'extend':
      return bulkExtendExpiry(input.codes, input.extendDays!, userId)
    case 'delete':
      return bulkDelete(input.codes, userId)
    default:
      throw new AppError('Invalid operation', 400, 'INVALID_OPERATION')
  }
}

async function bulkTag(
  codes: string[],
  tagIds: number[],
  userId: string,
): Promise<BulkOperationResponse[]> {
  return bulkTagUrls(codes, tagIds, userId)
}

async function bulkMoveToCollection(
  codes: string[],
  collectionId: number,
  userId: string,
): Promise<BulkOperationResponse[]> {
  const results: BulkOperationResponse[] = []

  for (const code of codes) {
    try {
      await addUrlToCollection(code, collectionId, userId)
      results.push({ code, success: true })
    } catch (err) {
      results.push({ code, success: false, error: err instanceof AppError ? err.message : 'Failed to move' })
    }
  }

  return results
}

async function bulkExtendExpiry(
  codes: string[],
  extendDays: number,
  userId: string,
): Promise<BulkOperationResponse[]> {
  const results: BulkOperationResponse[] = []

  for (const code of codes) {
    try {
      const [existing] = await db
        .select({ expiresAt: urls.expiresAt, userId: urls.userId })
        .from(urls)
        .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
        .limit(1)

      if (!existing || existing.userId !== userId) {
        results.push({ code, success: false, error: 'URL not found' })
        continue
      }

      const base = existing.expiresAt ?? new Date()
      const newExpiry = new Date(base.getTime() + extendDays * 86_400_000)

      await db.update(urls).set({ expiresAt: newExpiry }).where(eq(urls.code, code))
      results.push({ code, success: true })
    } catch {
      results.push({ code, success: false, error: 'Failed to extend expiry' })
    }
  }

  return results
}

async function bulkDelete(
  codes: string[],
  userId: string,
): Promise<BulkOperationResponse[]> {
  const results: BulkOperationResponse[] = []

  for (const code of codes) {
    try {
      const [existing] = await db
        .select({ userId: urls.userId })
        .from(urls)
        .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
        .limit(1)

      if (!existing || existing.userId !== userId) {
        results.push({ code, success: false, error: 'URL not found' })
        continue
      }

      await db.update(urls).set({ deletedAt: new Date() }).where(eq(urls.code, code))
      results.push({ code, success: true })
    } catch {
      results.push({ code, success: false, error: 'Failed to delete' })
    }
  }

  return results
}

export async function importCsv(input: CsvImportInput, userId: string) {
  const { data, errors: parseErrors } = papa.parse<Record<string, string>>(input.csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (parseErrors.length > 0) {
    throw new AppError(
      `CSV parsing error: ${parseErrors[0]!.message}`,
      400,
      'CSV_PARSE_ERROR',
    )
  }

  if (data.length === 0) {
    throw new AppError('CSV file is empty or has no data rows', 400, 'CSV_EMPTY')
  }

  if (data.length > 500) {
    throw new AppError('CSV import is limited to 500 URLs at a time', 400, 'CSV_TOO_LARGE')
  }

  const results: (BulkOperationResponse & { url?: string })[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]!
    const url = row.url?.trim()

    if (!url) {
      results.push({ code: `row ${i + 1}`, success: false, error: 'Missing url column' })
      continue
    }

    try {
      const ttlDays = row.ttlDays ? parseInt(row.ttlDays, 10) : undefined
      const password = row.password || undefined
      const activeAt = row.activeAt || undefined
      const tags = row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined
      const customCode = row.customCode?.trim() || undefined

      const created = await createShortUrl(
        {
          url,
          customCode,
          ttlDays: ttlDays && !isNaN(ttlDays) ? ttlDays : undefined,
          password,
          activeAt,
          tags,
          collectionId: input.collectionId,
        },
        userId,
      )

      results.push({ code: created.code, success: true, url: created.shortUrl })
    } catch (err) {
      const identifier = row.customCode?.trim() || `row ${i + 1}`
      results.push({
        code: identifier,
        success: false,
        error: err instanceof AppError ? err.message : 'Failed to create URL',
      })
    }
  }

  return results
}
