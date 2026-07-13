import { db } from '../db'
import { urls } from '../db/schema'
import { eq, and, or, isNull, lt, sql } from 'drizzle-orm'
import { checkLink } from '../services/healthCheck'
import { logger } from '../utils/logger'

const BATCH_SIZE = 20

let intervalHandle: ReturnType<typeof setInterval> | null = null

export function startHealthCheckJob(intervalMs: number): void {
  if (intervalMs <= 0) return

  const run = async () => {
    try {
      await processBatch()
    } catch (err) {
      logger.error({ err }, 'Health check job error')
    }
  }

  run()
  intervalHandle = setInterval(run, intervalMs)
}

export function stopHealthCheckJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

export async function processBatch(): Promise<number> {
  const staleCutoff = new Date(Date.now() - 86_400_000) // 24 hours ago

  const rows = await db
    .select({ code: urls.code, url: urls.url })
    .from(urls)
    .where(
      and(
        or(
          isNull(urls.lastCheckedAt),
          lt(urls.lastCheckedAt, staleCutoff),
        ),
      ),
    )
    .limit(BATCH_SIZE)

  if (rows.length === 0) return 0

  const results = await Promise.allSettled(
    rows.map(async (row) => {
      const result = await checkLink(row.url)
      await db
        .update(urls)
        .set({
          lastCheckedAt: new Date(),
          lastStatusCode: result.statusCode,
        })
        .where(eq(urls.code, row.code))
    }),
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    logger.warn({ checked: rows.length, failed }, 'Health check partial failure')
  }

  return rows.length
}
