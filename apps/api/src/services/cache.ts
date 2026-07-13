import Redis from 'ioredis'
import { env } from '../utils/env'
import { logger } from '../utils/logger'

let client: Redis | null = null
let enabled = true

function getClient(): Redis | null {
  if (client) return client
  if (!env.REDIS_URL) {
    enabled = false
    return null
  }
  try {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
      lazyConnect: true,
    })
    enabled = true
    client.on('error', (err) => {
      logger.error({ err }, 'Redis client error')
    })
  } catch {
    enabled = false
    return null
  }
  return client
}

const KEY_PREFIX = 'linkify:'

function prefixed(key: string): string {
  return `${KEY_PREFIX}${key}`
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!enabled) return null
  const c = getClient()
  if (!c) return null
  try {
    const raw = await c.get(prefixed(key))
    if (raw == null) return null
    return JSON.parse(raw) as T
  } catch (err) {
    logger.warn({ err, key }, 'Cache get failed')
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  if (!enabled) return
  const c = getClient()
  if (!c) return
  try {
    const ttl = ttlSeconds ?? env.REDIS_CACHE_TTL
    await c.setex(prefixed(key), ttl, JSON.stringify(value))
  } catch (err) {
    logger.warn({ err, key }, 'Cache set failed')
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!enabled) return
  const c = getClient()
  if (!c) return
  try {
    await c.del(prefixed(key))
  } catch (err) {
    logger.warn({ err, key }, 'Cache del failed')
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!enabled) return
  const c = getClient()
  if (!c) return
  try {
    const stream = c.scanStream({ match: prefixed(pattern), count: 100 })
    for await (const keys of stream) {
      if (keys.length > 0) {
        await c.del(...keys)
      }
    }
  } catch (err) {
    logger.warn({ err, pattern }, 'Cache del pattern failed')
  }
}

export function buildCacheKeyForUrl(code: string): string {
  return `url:${code}`
}
