import { db } from '../db'
import { urls, visits } from '../db/schema'
import { eq, desc, count, sql, and, gte, lte } from 'drizzle-orm'
import { generateShortCode } from '../utils/codeGenerator'
import { RESERVED_CODES } from '../constants/reservedWords'
import { fetchLinkPreview } from './linkPreview'
import { validateUrlSafety } from './urlSafety'
import { parseUserAgent } from './userAgent'
import { classifyReferrer } from '../utils/referrerClassifier'
import { lookupGeo } from './geoip'
import { AppError } from '../utils/AppError'
import type { CreateUrlInput, CreateUrlBulkInput } from '../validators/url.validators'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const UNIQUE_VISIT_WINDOW_HOURS = Number(process.env.UNIQUE_VISIT_WINDOW_HOURS) || 24

export { AppError } from '../utils/AppError'

export async function createShortUrl(input: CreateUrlInput) {
  const code = input.customCode || generateShortCode()

  if (RESERVED_CODES.has(code.toLowerCase())) {
    throw new AppError('This code is reserved and cannot be used', 409)
  }

  await validateUrlSafety(input.url)

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

  return formatUrlResponse(code, input.url, 0, 0, expiresAt, undefined, undefined, undefined)
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
  const ua = parseUserAgent(metadata.userAgent)
  const geo = lookupGeo(metadata.ipAddress)
  const referrerCategory = classifyReferrer(metadata.referer)

  await db.insert(visits).values({
    code,
    ipAddress: metadata.ipAddress || null,
    userAgent: metadata.userAgent || null,
    referer: metadata.referer || null,
    country: geo.country,
    city: geo.city,
    isp: geo.isp,
    deviceType: ua.deviceType,
    os: ua.os,
    browser: ua.browser,
    browserVersion: ua.browserVersion,
    referrerCategory,
  })

  await db.update(urls).set({ visits: sql`visits + 1` }).where(eq(urls.code, code))

  // Unique visit check — same IP within configurable window
  const windowStart = new Date(Date.now() - UNIQUE_VISIT_WINDOW_HOURS * 3_600_000)
  const [existing] = await db
    .select({ id: visits.id })
    .from(visits)
    .where(
      and(
        eq(visits.code, code),
        eq(visits.ipAddress, metadata.ipAddress || ''),
        gte(visits.visitedAt, windowStart),
      ),
    )
    .limit(1)

  if (!existing) {
    await db.update(urls).set({ uniqueVisits: sql`unique_visits + 1` }).where(eq(urls.code, code))
  }
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
      country: v.country,
      city: v.city,
      deviceType: v.deviceType,
      os: v.os,
      browser: v.browser,
      browserVersion: v.browserVersion,
      referrerCategory: v.referrerCategory,
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

export async function getUrlStats(code: string) {
  const [urlRow] = await db
    .select({ totalVisits: urls.visits, uniqueVisits: urls.uniqueVisits })
    .from(urls)
    .where(eq(urls.code, code))
    .limit(1)

  if (!urlRow) {
    throw new AppError('URL not found', 404)
  }

  // Hourly aggregation (last 7 days)
  const hourly = await db.execute<{ hour: string; count: number }>(
    sql`
      SELECT
        date_trunc('hour', visited_at) AS hour,
        COUNT(*)::int AS count
      FROM visits
      WHERE code = ${code}
        AND visited_at >= NOW() - INTERVAL '7 days'
      GROUP BY hour
      ORDER BY hour ASC
    `,
  )

  // Daily aggregation (all time)
  const daily = await db.execute<{ date: string; count: number }>(
    sql`
      SELECT
        date_trunc('day', visited_at) AS date,
        COUNT(*)::int AS count
      FROM visits
      WHERE code = ${code}
      GROUP BY date
      ORDER BY date ASC
    `,
  )

  return {
    totalVisits: urlRow.totalVisits,
    uniqueVisits: urlRow.uniqueVisits,
    hourly: hourly.rows.map((r) => ({
      hour: new Date(r.hour).toISOString(),
      count: r.count,
    })),
    daily: daily.rows.map((r) => ({
      date: new Date(r.date).toISOString(),
      count: r.count,
    })),
  }
}

export async function exportUrlVisits(code: string): Promise<string> {
  const rows = await db
    .select()
    .from(visits)
    .where(eq(visits.code, code))
    .orderBy(desc(visits.visitedAt))

  const headers = [
    'id', 'code', 'ip_address', 'user_agent', 'referer',
    'country', 'city', 'device_type', 'os', 'browser',
    'browser_version', 'referrer_category', 'visited_at',
  ]

  const csvRows = [headers.join(',')]

  for (const v of rows) {
    csvRows.push(
      [
        v.id,
        v.code,
        escapeCsv(v.ipAddress),
        escapeCsv(v.userAgent),
        escapeCsv(v.referer),
        escapeCsv(v.country),
        escapeCsv(v.city),
        escapeCsv(v.deviceType),
        escapeCsv(v.os),
        escapeCsv(v.browser),
        escapeCsv(v.browserVersion),
        escapeCsv(v.referrerCategory),
        v.visitedAt.toISOString(),
      ].join(','),
    )
  }

  // BOM for Excel compatibility
  return '\uFEFF' + csvRows.join('\n')
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
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
      u.code, u.url, u.visits, u.uniqueVisits, u.expiresAt, u.title, u.description, u.image, u.createdAt,
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
  uniqueVisits: number,
  expiresAt: Date | null,
  title?: string | null,
  description?: string | null,
  image?: string | null,
  createdAt?: Date,
) {
  return {
    code,
    url,
    shortUrl: `${BASE_URL}/${code}`,
    title: title ?? null,
    description: description ?? null,
    image: image ?? null,
    visits,
    uniqueVisits,
    expiresAt: expiresAt?.toISOString() ?? null,
    createdAt: (createdAt ?? new Date()).toISOString(),
  }
}
