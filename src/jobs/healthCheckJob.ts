import { db } from '../db'
import { urls } from '../db/schema'
import { eq, and, or, isNull, lt, sql } from 'drizzle-orm'
import { checkLink } from '../services/healthCheck'

const BATCH_SIZE = 20

let intervalHandle: ReturnType<typeof setInterval> | null = null

export function startHealthCheckJob(intervalMs?: number): void {
  const interval = intervalMs ?? (Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 3_600_000)

  if (interval <= 0) return

  const run = async () => {
    try {
      await processBatch()
    } catch (err) {
      console.error('Health check job error:', err)
    }
  }

  // Run immediately on start, then on interval
  run()
  intervalHandle = setInterval(run, interval)
}

export function stopHealthCheckJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

async function processBatch(): Promise<void> {
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

  if (rows.length === 0) return

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
    console.warn(`Health check: ${failed}/${rows.length} updates failed`)
  }
}
