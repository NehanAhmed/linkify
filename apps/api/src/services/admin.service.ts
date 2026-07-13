import { db } from '../db'
import { users, urls, visits, subscriptions, plans, auditLog, usageQuota } from '../db/schema'
import { count, sql, eq, and, inArray, desc, gte, lt, isNull } from 'drizzle-orm'

import { AppError } from '../utils/AppError'
import { getAllFeatureFlags } from '../utils/featureFlags'
import { purgeExpiredUrls } from './url.services'
import { processBatch } from '../jobs/healthCheckJob'
import { env } from '../utils/env'

let lastPurgeAt: Date | null = null
let lastHealthCheckAt: Date | null = null
let lastPurgeCount = 0
let lastHealthCheckCount = 0

export function resetMaintenanceState(): void {
  lastPurgeAt = null
  lastHealthCheckAt = null
  lastPurgeCount = 0
  lastHealthCheckCount = 0
}

export interface DashboardStats {
  users: { total: number; delta: number }
  urls: { total: number; delta: number }
  visits: { total: number; delta: number }
  activeSubscriptions: number
  mrr: number
  quotaMonth: string
  storageEstimateMb: number
}

export interface UserDetail {
  id: string
  email: string | null
  role: string
  suspendedAt: string | null
  createdAt: string
  linkCount: number
  visitCount: number
  subscription: {
    plan: string | null
    status: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null
}

export interface MaintenanceStatus {
  lastPurgeAt: string | null
  lastPurgeCount: number
  lastHealthCheckAt: string | null
  lastHealthCheckCount: number
  healthCheckIntervalMs: number
}

export interface SystemConfig {
  nodeEnv: string
  baseUrl: string
  baseUrlHost: string
  redisConfigured: boolean
  stripeConfigured: boolean
  sentryConfigured: boolean
  readReplicaConfigured: boolean
  healthCheckIntervalMs: number
  rateLimitMax: number
  authRateLimitMax: number
  featureFlags: Record<string, { enabled: boolean; description: string }>
}

export async function getDashboardStats(daysAgo: number = 30): Promise<DashboardStats> {
  const cutoff = new Date(Date.now() - daysAgo * 86_400_000)

  const [[userCount], [urlCount], [visitCount], [prevUserCount], [prevUrlCount], [prevVisitCount]] =
    await Promise.all([
      db.select({ total: count() }).from(users),
      db.select({ total: count() }).from(urls),
      db.select({ total: count() }).from(visits),
      db.select({ total: count() }).from(users).where(lt(users.createdAt, cutoff)),
      db.select({ total: count() }).from(urls).where(lt(urls.createdAt, cutoff)),
      db.select({ total: count() }).from(visits).where(lt(visits.visitedAt, cutoff)),
    ])

  const [activeSubs] = await db
    .select({ total: count() })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ['active', 'trialing', 'past_due']))

  const [mrrResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${plans.priceMonthly}), 0)` })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(inArray(subscriptions.status, ['active', 'trialing']))

  const [storageResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(LENGTH(COALESCE(${urls.url}, '')) + LENGTH(COALESCE(${urls.title}, '')) + LENGTH(COALESCE(${urls.description}, ''))), 0)` })
    .from(urls)

  const yearMonth = new Date().toISOString().slice(0, 7)

  return {
    users: {
      total: userCount?.total ?? 0,
      delta: (userCount?.total ?? 0) - (prevUserCount?.total ?? 0),
    },
    urls: {
      total: urlCount?.total ?? 0,
      delta: (urlCount?.total ?? 0) - (prevUrlCount?.total ?? 0),
    },
    visits: {
      total: visitCount?.total ?? 0,
      delta: (visitCount?.total ?? 0) - (prevVisitCount?.total ?? 0),
    },
    activeSubscriptions: activeSubs?.total ?? 0,
    mrr: mrrResult?.total ?? 0,
    quotaMonth: yearMonth,
    storageEstimateMb: Math.round(((storageResult?.total ?? 0) / (1024 * 1024)) * 100) / 100,
  }
}

export async function getUserDetail(userId: string): Promise<UserDetail> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  const [linkCountResult] = await db
    .select({ total: count() })
    .from(urls)
    .where(and(eq(urls.userId, userId), isNull(urls.deletedAt)))

  const [visitCountResult] = await db
    .select({ total: count() })
    .from(visits)
    .innerJoin(urls, eq(visits.code, urls.code))
    .where(eq(urls.userId, userId))

  const [sub] = await db
    .select({
      planName: plans.name,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ['active', 'trialing', 'past_due']),
      ),
    )
    .limit(1)

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    linkCount: linkCountResult?.total ?? 0,
    visitCount: visitCountResult?.total ?? 0,
    subscription: sub
      ? {
          plan: sub.planName,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
  }
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  if (!['user', 'admin'].includes(role)) {
    throw new AppError('Invalid role. Must be "user" or "admin"', 400, 'INVALID_ROLE')
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
}

export async function suspendUser(userId: string): Promise<void> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  await db
    .update(users)
    .set({ suspendedAt: new Date() })
    .where(eq(users.id, userId))
}

export async function unsuspendUser(userId: string): Promise<void> {
  const [user] = await db
    .select({ id: users.id, suspendedAt: users.suspendedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  if (!user.suspendedAt) {
    return
  }

  await db
    .update(users)
    .set({ suspendedAt: null })
    .where(eq(users.id, userId))
}

export interface UserListItem {
  id: string
  email: string | null
  role: string
  suspendedAt: string | null
  createdAt: string
  linkCount: number
}

export async function getUsers(
  page: number = 1,
  limit: number = 20,
): Promise<{ users: UserListItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const offset = (page - 1) * limit

  const [totalResult] = await db
    .select({ total: count() })
    .from(users)

  const total = totalResult?.total ?? 0

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      suspendedAt: users.suspendedAt,
      createdAt: users.createdAt,
      linkCount: count(),
    })
    .from(users)
    .leftJoin(urls, eq(urls.userId, users.id))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)
    .groupBy(users.id, users.email, users.role, users.suspendedAt, users.createdAt)

  return {
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      suspendedAt: u.suspendedAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      linkCount: u.linkCount,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export interface UserLink {
  code: string
  url: string
  visits: number
  uniqueVisits: number
  createdAt: string
  deletedAt: string | null
}

export interface PaginatedLinks {
  links: UserLink[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export async function getUserLinks(
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedLinks> {
  const offset = (page - 1) * limit

  const [totalResult] = await db
    .select({ total: count() })
    .from(urls)
    .where(eq(urls.userId, userId))

  const total = totalResult?.total ?? 0

  const rows = await db
    .select({
      code: urls.code,
      url: urls.url,
      visits: urls.visits,
      uniqueVisits: urls.uniqueVisits,
      createdAt: urls.createdAt,
      deletedAt: urls.deletedAt,
    })
    .from(urls)
    .where(eq(urls.userId, userId))
    .orderBy(desc(urls.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    links: rows.map((r) => ({
      code: r.code,
      url: r.url,
      visits: r.visits,
      uniqueVisits: r.uniqueVisits,
      createdAt: r.createdAt.toISOString(),
      deletedAt: r.deletedAt?.toISOString() ?? null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export interface AuditEntry {
  id: number
  userId: string | null
  action: string
  resource: string
  resourceId: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  userEmail: string | null
}

export interface PaginatedAuditLog {
  entries: AuditEntry[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export async function getAuditLogWithUsers(
  page: number = 1,
  limit: number = 20,
  action?: string,
  userId?: string,
): Promise<PaginatedAuditLog> {
  const offset = (page - 1) * limit

  const conditions = []
  if (action) conditions.push(eq(auditLog.action, action))
  if (userId) conditions.push(eq(auditLog.userId, userId))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rowsPromise = db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      action: auditLog.action,
      resource: auditLog.resource,
      resourceId: auditLog.resourceId,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
      userEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset)

  const totalPromise = where
    ? db.select({ total: count() }).from(auditLog).where(where)
    : db.select({ total: count() }).from(auditLog)

  const [rows, [totalResult]] = await Promise.all([rowsPromise, totalPromise])

  const total = totalResult?.total ?? 0

  return {
    entries: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      metadata: r.metadata as Record<string, unknown> | null,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
      userEmail: r.userEmail,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getSystemConfig(): Promise<SystemConfig> {
  return {
    nodeEnv: env.NODE_ENV,
    baseUrl: env.BASE_URL,
    baseUrlHost: new URL(env.BASE_URL).hostname,
    redisConfigured: !!env.REDIS_URL,
    stripeConfigured: !!env.STRIPE_SECRET_KEY,
    sentryConfigured: !!env.SENTRY_DSN,
    readReplicaConfigured: !!env.DATABASE_REPLICA_URL,
    healthCheckIntervalMs: env.HEALTH_CHECK_INTERVAL_MS,
    rateLimitMax: env.RATE_LIMIT_MAX,
    authRateLimitMax: env.AUTH_RATE_LIMIT_MAX,
    featureFlags: getAllFeatureFlags(),
  }
}

export async function triggerPurgeExpired(daysOld: number = 30): Promise<{ purgedCount: number }> {
  const purged = await purgeExpiredUrls(daysOld)
  lastPurgeAt = new Date()
  lastPurgeCount = purged.length
  return { purgedCount: purged.length }
}

export async function triggerHealthCheck(): Promise<{ checkedCount: number }> {
  const count = await processBatch()
  lastHealthCheckAt = new Date()
  lastHealthCheckCount = count
  return { checkedCount: count }
}

export function getMaintenanceStatus(): MaintenanceStatus {
  return {
    lastPurgeAt: lastPurgeAt?.toISOString() ?? null,
    lastPurgeCount: lastPurgeCount,
    lastHealthCheckAt: lastHealthCheckAt?.toISOString() ?? null,
    lastHealthCheckCount: lastHealthCheckCount,
    healthCheckIntervalMs: env.HEALTH_CHECK_INTERVAL_MS,
  }
}
