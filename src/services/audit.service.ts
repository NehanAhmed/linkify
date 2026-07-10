import type { Request } from 'express'
import { db } from '../db'
import { auditLog } from '../db/schema'
import { desc, count, and, eq, sql, type SQL } from 'drizzle-orm'

export type AuditAction =
  | 'api_key.created'
  | 'api_key.revoked'
  | 'api_key.updated'
  | 'url.purged'
  | 'url.password_set'
  | 'url.password_removed'
  | 'url.bulk_operation'
  | 'url.csv_imported'
  | 'auth.refresh_token_reuse'

export async function logAction(
  userId: string,
  action: AuditAction,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string | null,
) {
  await db.insert(auditLog).values({
    userId,
    action,
    resource,
    resourceId: resourceId ?? null,
    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    ipAddress: ipAddress ?? null,
  })
}

export function logActionFromReq(req: Request, action: AuditAction, resource: string, resourceId?: string, metadata?: Record<string, unknown>) {
  return logAction(
    req.user!.id,
    action,
    resource,
    resourceId,
    metadata,
    req.ip,
  )
}

export async function getAuditLog(params: {
  page: number
  limit: number
  action?: string
  userId?: string
}) {
  const { page, limit, action, userId } = params
  const offset = (page - 1) * limit

  const conditions: SQL[] = []

  if (action) {
    conditions.push(eq(auditLog.action, action))
  }
  if (userId) {
    conditions.push(eq(auditLog.userId, userId))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [totalResult] = where
    ? await db.select({ total: count() }).from(auditLog).where(where)
    : await db.select({ total: count() }).from(auditLog)
  const total = totalResult?.total ?? 0

  const rows = where
    ? await db.select().from(auditLog).where(where).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset)
    : await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset)

  return {
    entries: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      metadata: r.metadata,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
