import { db } from '../db'
import { urls, visits } from '../db/schema'
import { eq, desc, count, sql } from 'drizzle-orm'
import { generateShortCode } from '../utils/codeGenerator'
import { RESERVED_CODES } from '../constants/reservedWords'
import { fetchLinkPreview } from './linkPreview'
import { AppError } from '../utils/AppError'
import type { CreateUrlInput, CreateUrlBulkInput } from '../validators/url.validators'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export { AppError } from '../utils/AppError'

export async function createShortUrl(input: CreateUrlInput) {
  const code = input.customCode || generateShortCode()

  if (RESERVED_CODES.has(code.toLowerCase())) {
    throw new AppError('This code is reserved and cannot be used', 409)
  }

  const existing = await db.select().from(urls).where(eq(urls.code, code)).limit(1)
  if (existing.length > 0) {
    throw new AppError('Code already taken', 409)
  }

  const expiresAt = input.ttlDays
    ? new Date(Date.now() + input.ttlDays * 86_400_000)
    : null

  await db.insert(urls).values({
    code,
    url: input.url,
    expiresAt,
  })

  fetchLinkPreview(input.url)
    .then((preview) => {
      if (preview.title || preview.description || preview.image) {
        db.update(urls)
          .set({
            title: preview.title || null,
            description: preview.description || null,
            image: preview.image || null,
          })
          .where(eq(urls.code, code))
          .catch(() => {})
      }
    })
    .catch(() => {})

  return formatUrlResponse(code, input.url, 0, expiresAt, undefined, undefined, undefined)
}

export async function resolveUrl(code: string) {
  const result = await db.select().from(urls).where(eq(urls.code, code)).limit(1)
  const row = result[0]
  if (!row) {
    throw new AppError('URL not found', 404)
  }

  if (row.expiresAt && row.expiresAt < new Date()) {
    throw new AppError('This link has expired', 410)
  }

  return row
}

export async function recordVisit(code: string, metadata: { ipAddress?: string; userAgent?: string; referer?: string }) {
  await db.insert(visits).values({
    code,
    ipAddress: metadata.ipAddress || null,
    userAgent: metadata.userAgent || null,
    referer: metadata.referer || null,
  })

  await db.update(urls).set({ visits: sql`visits + 1` }).where(eq(urls.code, code))
}

export async function getUrlVisits(code: string, page: number, limit: number) {
  const offset = (page - 1) * limit

  const [totalResult] = await db
    .select({ total: count() })
    .from(visits)
    .where(eq(visits.code, code))

  const total = totalResult?.total ?? 0

  const rows = await db
    .select()
    .from(visits)
    .where(eq(visits.code, code))
    .orderBy(desc(visits.visitedAt))
    .limit(limit)
    .offset(offset)

  return {
    visits: rows.map((v) => ({
      id: v.id,
      code: v.code,
      ipAddress: v.ipAddress,
      userAgent: v.userAgent,
      referer: v.referer,
      visitedAt: v.visitedAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function listUrls(page: number, limit: number) {
  const offset = (page - 1) * limit

  const [totalResult] = await db.select({ total: count() }).from(urls)
  const total = totalResult?.total ?? 0

  const rows = await db
    .select()
    .from(urls)
    .orderBy(desc(urls.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    urls: rows.map((u) => formatUrlResponse(
      u.code, u.url, u.visits, u.expiresAt, u.title, u.description, u.image, u.createdAt,
    )),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function deleteUrl(code: string) {
  const result = await db.delete(urls).where(eq(urls.code, code)).returning()
  if (result.length === 0) {
    throw new AppError('URL not found', 404)
  }
}

export async function createShortUrlBulk(input: CreateUrlBulkInput) {
  const results = await Promise.allSettled(
    input.urls.map(async (item, index) => {
      try {
        const data = await createShortUrl(item)
        return { index, success: true as const, data }
      } catch (err) {
        const message = err instanceof AppError
          ? err.message
          : 'Failed to create short URL'
        return { index, success: false as const, error: message }
      }
    }),
  )

  return results.map((r) =>
    r.status === 'fulfilled' ? r.value : { index: -1, success: false, error: 'Unexpected error' },
  )
}

function formatUrlResponse(
  code: string,
  url: string,
  visits: number,
  expiresAt: Date | null,
  title?: string | null,
  description?: string | null,
  image?: string | null,
  createdAt?: Date,
): {
  code: string
  url: string
  shortUrl: string
  title: string | null
  description: string | null
  image: string | null
  visits: number
  expiresAt: string | null
  createdAt: string
} {
  return {
    code,
    url,
    shortUrl: `${BASE_URL}/${code}`,
    title: title ?? null,
    description: description ?? null,
    image: image ?? null,
    visits,
    expiresAt: expiresAt?.toISOString() ?? null,
    createdAt: (createdAt ?? new Date()).toISOString(),
  }
}
