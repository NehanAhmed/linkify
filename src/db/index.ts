import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { env } from '../utils/env'

const sql = neon(env.DATABASE_URL)
export const db = drizzle(sql)

const replicaUrl = env.DATABASE_REPLICA_URL
let replicaSql: ReturnType<typeof neon> | null = null
if (replicaUrl) {
  replicaSql = neon(replicaUrl)
}
export const dbReplica = replicaSql ? drizzle(replicaSql) : db