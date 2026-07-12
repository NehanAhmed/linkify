import { db } from '../db'
import { sql } from 'drizzle-orm'
import { env } from '../utils/env'
import { logger } from '../utils/logger'

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  uptime: number
  timestamp: string
  db: { connected: boolean }
  redis: { connected: boolean; configured: boolean }
  version: string
}

async function checkRedis(): Promise<boolean> {
  if (!env.REDIS_URL) return false
  try {
    const Redis = (await import('ioredis')).default
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
    })
    await client.connect()
    await client.ping()
    await client.quit()
    return true
  } catch {
    return false
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  let dbConnected = false
  let redisConnected = false

  try {
    await db.execute(sql`SELECT 1`)
    dbConnected = true
  } catch {
    // DB down
  }

  redisConnected = await checkRedis()

  let status: HealthStatus['status'] = 'ok'
  if (!dbConnected) {
    status = 'down'
  } else if (env.REDIS_URL && !redisConnected) {
    status = 'degraded'
  }

  return {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: { connected: dbConnected },
    redis: { connected: redisConnected, configured: !!env.REDIS_URL },
    version: '1.0.0',
  }
}