import { db } from '../db'
import { sql } from 'drizzle-orm'

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down'
  uptime: number
  timestamp: string
  db: { connected: boolean }
  version: string
}

export async function getHealthStatus(): Promise<HealthStatus> {
  let dbConnected = false

  try {
    await db.execute(sql`SELECT 1`)
    dbConnected = true
  } catch {
    // DB down
  }

  return {
    status: dbConnected ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: { connected: dbConnected },
    version: '1.0.0',
  }
}
