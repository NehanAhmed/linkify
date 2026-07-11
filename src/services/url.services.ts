import { db, dbReplica } from '../db'
import { urls, visits, tags, urlTags, urlCollections, collections, urlStatsHourly } from '../db/schema'
import { eq, desc, count, sql, and, gte, isNull, inArray, asc, type SQL } from 'drizzle-orm'
import { generateShortCode } from '../utils/codeGenerator'
import { RESERVED_CODES } from '../constants/reservedWords'
import { fetchLinkPreview } from './linkPreview'
import { validateUrlSafety } from './urlSafety'
import { parseUserAgent } from './userAgent'
import { classifyReferrer } from '../utils/referrerClassifier'
import { lookupGeo } from './geoip'
import { AppError } from '../utils/AppError'
import { env } from '../utils/env'
import type { CreateUrlInput, CreateUrlBulkInput, ListUrlsQueryInput } from '../validators/url.validators'
import bcrypt from 'bcrypt'
import { isBot } from '../utils/botDetection'
import { createFingerprint } from '../utils/fingerprint'
import { encrypt, decrypt } from '../utils/encryption'
import { cacheGet, cacheSet, cacheDel, buildCacheKeyForUrl } from './cache'
import { getUserPlan } from './subscription.service'

const BASE_URL = env.BASE_URL
const UNIQUE_VISIT_WINDOW_HOURS = env.UNIQUE_VISIT_WINDOW_HOURS

export { AppError } from '../utils/AppError'

export async function createShortUrl(input: CreateUrlInput, userId: string) {
  const code = input.customCode || generateShortCode()

  if (RESERVED_CODES.has(code.toLowerCase())) {
    throw new AppError('This code is reserved and cannot be used', 409, 'RESERVED_CODE')
  }

  await validateUrlSafety(input.url)

  const plan = await getUserPlan(userId)
  const [userLinkCount] = await db
    .select({ total: count() })
    .from(urls)
    .where(and(eq(urls.userId, userId), isNull(urls.deletedAt)))

  if ((userLinkCount?.total ?? 0) >= plan.maxLinks) {
    throw new AppError(
      `Link limit reached (${plan.maxLinks}/${plan.maxLinks}). Upgrade your plan for more.`,
      403,
      'PLAN_LIMIT_REACHED',
    )
  }

  if (input.password && !plan.features.passwordProtection) {
    throw new AppError('Password protection is not available on your plan', 403, 'FEATURE_NOT_AVAILABLE')
  }

  if (input.collectionId && !plan.features.bulkOperations) {
    throw new AppError('Collections are not available on your plan', 403, 'FEATURE_NOT_AVAILABLE')
  }

  const existing = await db.select().from(urls).where(eq(urls.code, code)).limit(1)
  if (existing.length > 0) {
    throw new AppError('Code already taken', 409, 'CODE_TAKEN')
  }

  const expiresAt = input.ttlDays
    ? new Date(Date.now() + input.ttlDays * 86_400_000)
    : null

  const activeAt = input.activeAt ? new Date(input.activeAt) : null
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null
  const blockBots = input.blockBots ?? false

  await db.insert(urls).values({
    code,
    url: input.url,
    userId,
    expiresAt,
    activeAt,
    passwordHash,
    blockBots,
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

  if (input.tags && input.tags.length > 0) {
    const resolvedTags = await db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(and(eq(tags.userId, userId), inArray(tags.name, input.tags)))

    for (const tag of resolvedTags) {
      await db
        .insert(urlTags)
        .values({ urlCode: code, tagId: tag.id })
        .onConflictDoNothing()
        .catch(() => {})
    }
  }

  if (input.collectionId) {
    await db
      .insert(urlCollections)
      .values({ urlCode: code, collectionId: input.collectionId })
      .onConflictDoNothing()
      .catch(() => {})
  }

  return formatUrlResponse(code, input.url, 0, 0, expiresAt, undefined, undefined, undefined, undefined, !!passwordHash, activeAt, blockBots)
}

export async function resolveUrl(code: string) {
  const cacheKey = buildCacheKeyForUrl(code)
  const cached = await cacheGet<typeof urls.$inferSelect>(cacheKey)
  if (cached) {
    const now = new Date()
    if (cached.expiresAt && cached.expiresAt < now) {
      throw new AppError('This link has expired', 410, 'LINK_EXPIRED')
    }
    if (cached.activeAt && cached.activeAt > now) {
      throw new AppError('This link is not yet active', 410, 'LINK_NOT_ACTIVE')
    }
    return cached
  }

  const result = await db
    .select()
    .from(urls)
    .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
    .limit(1)
  const row = result[0]
  if (!row) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  const now = new Date()

  if (row.expiresAt && row.expiresAt < now) {
    throw new AppError('This link has expired', 410, 'LINK_EXPIRED')
  }

  if (row.activeAt && row.activeAt > now) {
    throw new AppError('This link is not yet active', 410, 'LINK_NOT_ACTIVE')
  }

  cacheSet(cacheKey, row).catch(() => {})

  return row
}

export async function recordVisit(code: string, metadata: { ipAddress?: string; userAgent?: string; referer?: string }) {
  const ua = parseUserAgent(metadata.userAgent)
  const geo = lookupGeo(metadata.ipAddress)
  const referrerCategory = classifyReferrer(metadata.referer)
  const botResult = isBot(metadata.userAgent, metadata.ipAddress)
  const fingerprint = createFingerprint(metadata.ipAddress, metadata.userAgent, undefined)

  let encryptedIp: string | null = null
  if (metadata.ipAddress) {
    encryptedIp = encrypt(metadata.ipAddress)
  }

  const [urlRow] = await db
    .select({ affiliateId: urls.affiliateId })
    .from(urls)
    .where(eq(urls.code, code))
    .limit(1)

  const isAffiliateClick = !!(urlRow?.affiliateId)

  await db.insert(visits).values({
    code,
    ipAddress: encryptedIp,
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
    isBot: botResult.isBot,
    fingerprint: fingerprint || null,
    isAffiliateClick,
  })

  await db.update(urls).set({ visits: sql`visits + 1` }).where(eq(urls.code, code))

  const windowStart = new Date(Date.now() - UNIQUE_VISIT_WINDOW_HOURS * 3_600_000)
  const [existing] = await db
    .select({ id: visits.id })
    .from(visits)
    .where(
      and(
        eq(visits.code, code),
        eq(visits.fingerprint, fingerprint),
        gte(visits.visitedAt, windowStart),
      ),
    )
    .limit(1)

  const isNewUnique = !existing

  if (isNewUnique) {
    await db.update(urls).set({ uniqueVisits: sql`unique_visits + 1` }).where(eq(urls.code, code))
  }

  const hourStart = new Date(Date.now() - Date.now() % 3_600_000)
  await db
    .insert(urlStatsHourly)
    .values({
      code,
      hour: hourStart,
      visits: 1,
      uniqueVisits: isNewUnique ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: [urlStatsHourly.code, urlStatsHourly.hour],
      set: {
        visits: sql`${urlStatsHourly.visits} + 1`,
        uniqueVisits: isNewUnique
          ? sql`${urlStatsHourly.uniqueVisits} + 1`
          : sql`${urlStatsHourly.uniqueVisits}`,
      },
    })
}

export async function getUrlVisits(code: string, page: number, limit: number) {
  const offset = (page - 1) * limit

  const [totalResult] = await dbReplica
    .select({ total: count() })
    .from(visits)
    .where(eq(visits.code, code))

  const total = totalResult?.total ?? 0

  const rows = await dbReplica
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
      ipAddress: null,
      userAgent: v.userAgent,
      referer: v.referer,
      country: v.country,
      city: v.city,
      deviceType: v.deviceType,
      os: v.os,
      browser: v.browser,
      browserVersion: v.browserVersion,
      referrerCategory: v.referrerCategory,
      isBot: v.isBot,
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
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  const hourlyRows = await dbReplica
    .select({
      hour: urlStatsHourly.hour,
      visits: urlStatsHourly.visits,
      uniqueVisits: urlStatsHourly.uniqueVisits,
    })
    .from(urlStatsHourly)
    .where(
      and(
        eq(urlStatsHourly.code, code),
        gte(urlStatsHourly.hour, sql`NOW() - INTERVAL '7 days'`),
      ),
    )
    .orderBy(asc(urlStatsHourly.hour))

  const dailyMap = new Map<string, { visits: number; uniqueVisits: number }>()
  for (const row of hourlyRows) {
    const day = row.hour.toISOString().slice(0, 10)
    const existing = dailyMap.get(day) ?? { visits: 0, uniqueVisits: 0 }
    existing.visits += row.visits
    existing.uniqueVisits += row.uniqueVisits
    dailyMap.set(day, existing)
  }

  return {
    totalVisits: urlRow.totalVisits,
    uniqueVisits: urlRow.uniqueVisits,
    hourly: hourlyRows.map((r) => ({
      hour: r.hour.toISOString(),
      visits: r.visits,
      uniqueVisits: r.uniqueVisits,
    })),
    daily: Array.from(dailyMap.entries())
      .map(([date, agg]) => ({ date, visits: agg.visits, uniqueVisits: agg.uniqueVisits }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export async function getUrlVisitsPage(code: string, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize
  const rows = await dbReplica
    .select()
    .from(visits)
    .where(eq(visits.code, code))
    .orderBy(asc(visits.id))
    .limit(pageSize)
    .offset(offset)
  return rows
}

export const CSV_HEADERS = [
  'id', 'code', 'ip_address', 'user_agent', 'referer',
  'country', 'city', 'device_type', 'os', 'browser',
  'browser_version', 'referrer_category', 'is_bot', 'visited_at',
]

export function visitToCsvRow(v: typeof visits.$inferSelect): string {
  return [
    v.id,
    v.code,
    '',
    escapeCsv(v.userAgent),
    escapeCsv(v.referer),
    escapeCsv(v.country),
    escapeCsv(v.city),
    escapeCsv(v.deviceType),
    escapeCsv(v.os),
    escapeCsv(v.browser),
    escapeCsv(v.browserVersion),
    escapeCsv(v.referrerCategory),
    v.isBot ? 'true' : 'false',
    v.visitedAt.toISOString(),
  ].join(',')
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function listUrls(query: ListUrlsQueryInput, userId?: string, isAdmin = false) {
  const { page, limit, q, createdAfter, createdBefore, minVisits, sortBy, sortOrder, tagIds, collectionId, hasPassword, isActive } = query
  const offset = (page - 1) * limit

  const conditions: SQL[] = []

  if (!isAdmin && userId) {
    conditions.push(eq(urls.userId, userId))
  }

  if (q) {
    const pattern = `%${q}%`
    conditions.push(
      sql`(${urls.url} ILIKE ${pattern} OR ${urls.code} ILIKE ${pattern})`,
    )
  }

  if (createdAfter) {
    conditions.push(sql`${urls.createdAt} >= ${new Date(createdAfter)}`)
  }

  if (createdBefore) {
    conditions.push(sql`${urls.createdAt} <= ${new Date(createdBefore)}`)
  }

  if (minVisits !== undefined) {
    conditions.push(sql`${urls.visits} >= ${minVisits}`)
  }

  if (hasPassword !== undefined) {
    if (hasPassword) {
      conditions.push(sql`${urls.passwordHash} IS NOT NULL`)
    } else {
      conditions.push(sql`${urls.passwordHash} IS NULL`)
    }
  }

  if (isActive !== undefined) {
    const now = new Date()
    if (isActive) {
      conditions.push(sql`(${urls.activeAt} IS NULL OR ${urls.activeAt} <= ${now})`)
      conditions.push(sql`(${urls.expiresAt} IS NULL OR ${urls.expiresAt} > ${now})`)
    }
  }

  conditions.push(isNull(urls.deletedAt))

  let where = conditions.length > 0 ? and(...conditions) : undefined

  if (tagIds && tagIds.length > 0) {
    const tagged = await dbReplica
      .select({ urlCode: urlTags.urlCode })
      .from(urlTags)
      .where(inArray(urlTags.tagId, tagIds))

    const taggedCodes = [...new Set(tagged.map((t) => t.urlCode))]
    if (taggedCodes.length === 0) {
      return { urls: [], pagination: { page, limit, total: 0, totalPages: 0 } }
    }
    where = where ? and(where, inArray(urls.code, taggedCodes)) : inArray(urls.code, taggedCodes)
  }

  if (collectionId) {
    const inCollection = await dbReplica
      .select({ urlCode: urlCollections.urlCode })
      .from(urlCollections)
      .where(eq(urlCollections.collectionId, collectionId))

    const collectionCodes = inCollection.map((c) => c.urlCode)
    if (collectionCodes.length === 0) {
      return { urls: [], pagination: { page, limit, total: 0, totalPages: 0 } }
    }
    where = where ? and(where, inArray(urls.code, collectionCodes)) : inArray(urls.code, collectionCodes)
  }

  const [totalResult] = where
    ? await dbReplica.select({ total: count() }).from(urls).where(where)
    : await dbReplica.select({ total: count() }).from(urls)
  const total = totalResult?.total ?? 0

  const orderColumn = sortBy === 'createdAt' ? urls.createdAt
    : sortBy === 'visits' ? urls.visits
    : urls.code
  const order = sortOrder === 'asc' ? sql`${orderColumn} ASC` : sql`${orderColumn} DESC`

  const rows = where
    ? await dbReplica.select().from(urls).where(where).orderBy(order).limit(limit).offset(offset)
    : await dbReplica.select().from(urls).orderBy(order).limit(limit).offset(offset)

  return {
    urls: rows.map((u) => formatUrlResponse(
      u.code, u.url, u.visits, u.uniqueVisits, u.expiresAt, u.title, u.description, u.image, u.createdAt, !!u.passwordHash, u.activeAt, u.blockBots,
    )),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function deleteUrl(code: string, userId: string, isAdmin = false) {
  const [existing] = await db
    .select({ deletedAt: urls.deletedAt, userId: urls.userId })
    .from(urls)
    .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
    .limit(1)

  if (!existing) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  if (!isAdmin && existing.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  await db.update(urls).set({ deletedAt: new Date() }).where(eq(urls.code, code))
  cacheDel(buildCacheKeyForUrl(code)).catch(() => {})
}

export async function purgeUrl(code: string, userId: string, isAdmin = false) {
  const [existing] = await db
    .select({ userId: urls.userId })
    .from(urls)
    .where(eq(urls.code, code))
    .limit(1)

  if (!existing) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  if (!isAdmin && existing.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  const result = await db.delete(urls).where(eq(urls.code, code)).returning()
  if (result.length === 0) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  cacheDel(buildCacheKeyForUrl(code)).catch(() => {})
}

export async function purgeExpiredUrls(daysOld: number = 30) {
  const cutoff = new Date(Date.now() - daysOld * 86_400_000)
  const result = await db
    .delete(urls)
    .where(and(sql`${urls.deletedAt} IS NOT NULL`, sql`${urls.deletedAt} < ${cutoff}`))
    .returning({ code: urls.code })

  return result.map((r) => r.code)
}

export async function createShortUrlBulk(input: CreateUrlBulkInput, userId: string) {
  const results = await Promise.allSettled(
    input.urls.map(async (item, index) => {
      try {
        const data = await createShortUrl(item, userId)
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
  hasPassword?: boolean,
  activeAt?: Date | null,
  blockBots?: boolean,
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
    activeAt: activeAt?.toISOString() ?? null,
    hasPassword: hasPassword ?? false,
    blockBots: blockBots ?? false,
    createdAt: (createdAt ?? new Date()).toISOString(),
  }
}
