import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { env } from '../utils/env'
import { logger } from '../utils/logger'

const sql = neon(env.DATABASE_URL)
export const db = drizzle(sql)

const replicaUrl = env.DATABASE_REPLICA_URL
let replicaSql: ReturnType<typeof neon> | null = null
if (replicaUrl) {
  replicaSql = neon(replicaUrl)
} else {
  logger.warn('DATABASE_REPLICA_URL not set — read queries will hit the primary database')
}
export const dbReplica = replicaSql ? drizzle(replicaSql) : db