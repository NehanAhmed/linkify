import { db } from '../db'
import { urls, visits } from '../db/schema'
import { eq, desc, count, sql } from 'drizzle-orm'
import { generateShortCode } from '../utils/codeGenerator'
import type { CreateUrlInput } from '../validators/url.validators'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export async function createShortUrl(input: CreateUrlInput) {
  const code = input.customCode || generateShortCode()

  const existing = await db.select().from(urls).where(eq(urls.code, code)).limit(1)
  if (existing.length > 0) {
    throw new AppError('Code already taken', 409)
  }

  await db.insert(urls).values({ code, url: input.url })

  return {
    code,
    url: input.url,
    shortUrl: `${BASE_URL}/${code}`,
    createdAt: new Date().toISOString(),
  }
}

export async function resolveUrl(code: string) {
  const result = await db.select().from(urls).where(eq(urls.code, code)).limit(1)
  const row = result[0]
  if (!row) {
    throw new AppError('URL not found', 404)
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
    urls: rows.map((u) => ({
      code: u.code,
      url: u.url,
      shortUrl: `${BASE_URL}/${u.code}`,
      visits: u.visits,
      createdAt: u.createdAt.toISOString(),
    })),
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

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
