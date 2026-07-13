import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDbExecute = vi.hoisted(() => vi.fn())

vi.mock('../../db', () => ({
  db: { execute: mockDbExecute },
}))

vi.mock('../../utils/env', () => ({
  env: { REDIS_URL: 'redis://localhost:6379' },
}))

class MockRedisClient {
  connect = vi.fn().mockResolvedValue(undefined)
  ping = vi.fn().mockResolvedValue('PONG')
  quit = vi.fn().mockResolvedValue(undefined)
}

const mockRedisConstructor = vi.hoisted(() => vi.fn().mockImplementation(function () {
  return new MockRedisClient()
}))

vi.mock('ioredis', () => ({ default: mockRedisConstructor }))

import { getHealthStatus } from '../healthCheckEndpoint'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getHealthStatus', () => {
  it('returns ok when all services are healthy', async () => {
    mockDbExecute.mockResolvedValueOnce([{ 1: 1 }])

    const result = await getHealthStatus()

    expect(result.status).toBe('ok')
    expect(result.db.connected).toBe(true)
    expect(result.redis.connected).toBe(true)
    expect(result.redis.configured).toBe(true)
    expect(result.uptime).toBeGreaterThanOrEqual(0)
    expect(result.timestamp).toBeTruthy()
    expect(result.version).toBe('1.0.0')
  })

  it('returns down when database is not connected', async () => {
    mockDbExecute.mockRejectedValueOnce(new Error('connection refused'))

    const result = await getHealthStatus()

    expect(result.status).toBe('down')
    expect(result.db.connected).toBe(false)
  })

  it('returns degraded when redis connection fails', async () => {
    mockDbExecute.mockResolvedValueOnce([{ 1: 1 }])
    mockRedisConstructor.mockReturnValueOnce(new MockRedisClient())
    // Override to fail - we need to inject a failing client
    const failingClient = new MockRedisClient()
    failingClient.connect.mockRejectedValueOnce(new Error('redis down'))
    mockRedisConstructor.mockReturnValueOnce(failingClient)

    const result = await getHealthStatus()

    expect(result.status).toBe('degraded')
    expect(result.db.connected).toBe(true)
    expect(result.redis.connected).toBe(false)
    expect(result.redis.configured).toBe(true)
  })
})
