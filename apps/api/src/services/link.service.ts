import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcrypt'
import { db } from '../db'
import { urls, urlTags, collections, urlCollections } from '../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { AppError } from '../utils/AppError'
import { env } from '../utils/env'
import type { UpdateLinkSettingsInput } from '../validators/link.validators'
import { logAction } from './audit.service'
import { cacheDel, buildCacheKeyForUrl } from './cache'
import { getUserPlan } from './subscription.service'

const LINK_CHAIN_MAX_HOPS = 5
const JWT_SECRET = new TextEncoder().encode(env.LINK_ACCESS_SECRET)
const SHORT_URL_PATTERN = /^\/([a-zA-Z0-9_-]{3,16})$/

export async function setPassword(code: string, userId: string, password: string) {
  const plan = await getUserPlan(userId)
  if (!plan.features.passwordProtection) {
    throw new AppError('Password protection is not available on your plan', 403, 'FEATURE_NOT_AVAILABLE')
  }

  const [existing] = await db
    .select({ userId: urls.userId })
    .from(urls)
    .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
    .limit(1)

  if (!existing) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (existing.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await db.update(urls).set({ passwordHash, passwordSetAt: new Date() }).where(eq(urls.code, code))

  await logAction(userId, 'url.password_set', 'url', code)
  cacheDel(buildCacheKeyForUrl(code)).catch(() => {})
}

export async function removePassword(code: string, userId: string) {
  const [existing] = await db
    .select({ userId: urls.userId })
    .from(urls)
    .where(eq(urls.code, code))
    .limit(1)

  if (!existing) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (existing.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  await db.update(urls).set({ passwordHash: null }).where(eq(urls.code, code))

  await logAction(userId, 'url.password_removed', 'url', code)
  cacheDel(buildCacheKeyForUrl(code)).catch(() => {})
}

export async function verifyPasswordReturnToken(code: string, password: string): Promise<string> {
  const [row] = await db
    .select({ passwordHash: urls.passwordHash, passwordSetAt: urls.passwordSetAt })
    .from(urls)
    .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
    .limit(1)

  if (!row) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (!row.passwordHash) {
    throw new AppError('No password set on this link', 400, 'NO_PASSWORD')
  }

  const maxAgeDays = env.PASSWORD_MAX_AGE_DAYS
  if (maxAgeDays > 0 && row.passwordSetAt) {
    const ageDays = (Date.now() - new Date(row.passwordSetAt).getTime()) / 86_400_000
    if (ageDays > maxAgeDays) {
      throw new AppError(
        'This link password has expired. Please contact the link owner.',
        403,
        'PASSWORD_EXPIRED',
      )
    }
  }

  const match = await bcrypt.compare(password, row.passwordHash)
  if (!match) {
    throw new AppError('Incorrect password', 403, 'INCORRECT_PASSWORD')
  }

  const token = await new SignJWT({ sub: code, purpose: 'link_access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(JWT_SECRET)

  return token
}

export async function verifyLinkAccessToken(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    })
    if (payload.purpose !== 'link_access' || !payload.sub) {
      throw new AppError('Invalid token', 403, 'INVALID_ACCESS_TOKEN')
    }
    return payload.sub as string
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError('Invalid or expired token', 403, 'INVALID_ACCESS_TOKEN')
  }
}

export async function updateLinkSettings(code: string, userId: string, input: UpdateLinkSettingsInput) {
  const [existing] = await db
    .select({ userId: urls.userId })
    .from(urls)
    .where(and(eq(urls.code, code), isNull(urls.deletedAt)))
    .limit(1)

  if (!existing) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (existing.userId !== userId) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }

  const updates: Record<string, unknown> = {}

  if (input.activeAt !== undefined) {
    updates.activeAt = input.activeAt ? new Date(input.activeAt) : null
  }
  if (input.expiresAt !== undefined) {
    updates.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
  }
  if (input.password !== undefined) {
    updates.passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null
  }
  if (input.blockBots !== undefined) {
    updates.blockBots = input.blockBots
  }

  if (Object.keys(updates).length === 0) return

  await db.update(urls).set(updates).where(eq(urls.code, code))
  cacheDel(buildCacheKeyForUrl(code)).catch(() => {})
}

export async function resolveChain(
  targetUrl: string,
  depth: number = 0,
  visited: Set<string> = new Set(),
): Promise<string> {
  if (depth >= LINK_CHAIN_MAX_HOPS) {
    throw new AppError('Link chain too deep (max 5 hops)', 409, 'CHAIN_TOO_DEEP')
  }

  try {
    const parsed = new URL(targetUrl)
    const match = parsed.pathname.match(SHORT_URL_PATTERN)
    if (!match) return targetUrl

    const chainedCode = match[1]!

    if (visited.has(chainedCode)) {
      throw new AppError('Circular link chain detected', 409, 'CHAIN_CYCLE')
    }
    visited.add(chainedCode)

    const [row] = await db
      .select({ url: urls.url, deletedAt: urls.deletedAt, expiresAt: urls.expiresAt, activeAt: urls.activeAt })
      .from(urls)
      .where(eq(urls.code, chainedCode))
      .limit(1)

    if (!row || row.deletedAt) {
      throw new AppError('Chained URL not found', 404, 'CHAIN_URL_NOT_FOUND')
    }

    const now = new Date()
    if (row.expiresAt && row.expiresAt < now) {
      throw new AppError('Chained link has expired', 410, 'CHAIN_LINK_EXPIRED')
    }
    if (row.activeAt && row.activeAt > now) {
      throw new AppError('Chained link is not yet active', 410, 'CHAIN_LINK_INACTIVE')
    }

    return resolveChain(row.url, depth + 1, visited)
  } catch (err) {
    if (err instanceof AppError) throw err
    return targetUrl
  }
}
