import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedisInstance = vi.hoisted(() => {
  class MockRedis {
    get = vi.fn()
    setex = vi.fn()
    del = vi.fn()
    scanStream = vi.fn()
    on = vi.fn()
  }
  return new MockRedis()
})

// Keep the module-level client in sync by ensuring the constructor always
// returns the same instance.
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(function () {
    return mockRedisInstance
  }),
}))

vi.mock('../../utils/env', () => ({
  env: {
    REDIS_URL: 'redis://localhost:6379',
    REDIS_CACHE_TTL: 300,
  },
}))

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { cacheGet, cacheSet, cacheDel, cacheDelPattern, buildCacheKeyForUrl } from '../cache'

beforeEach(() => {
  // Reset each mock method, but preserve the instance so module-level
  // singleton references stay valid.
  mockRedisInstance.get.mockReset()
  mockRedisInstance.setex.mockReset()
  mockRedisInstance.del.mockReset()
  mockRedisInstance.scanStream.mockReset()
  mockRedisInstance.on.mockReset()
})

describe('cacheGet', () => {
  it('returns parsed value when key exists', async () => {
    mockRedisInstance.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }))
    const result = await cacheGet('test-key')
    expect(result).toEqual({ foo: 'bar' })
    expect(mockRedisInstance.get).toHaveBeenCalledWith('linkify:test-key')
  })

  it('returns null when key does not exist', async () => {
    mockRedisInstance.get.mockResolvedValue(null)
    const result = await cacheGet('test-key')
    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    mockRedisInstance.get.mockRejectedValue(new Error('connection error'))
    const result = await cacheGet('test-key')
    expect(result).toBeNull()
  })
})

describe('cacheSet', () => {
  it('stores value with TTL', async () => {
    await cacheSet('test-key', { data: 42 }, 600)
    expect(mockRedisInstance.setex).toHaveBeenCalledWith('linkify:test-key', 600, JSON.stringify({ data: 42 }))
  })

  it('uses default TTL when not provided', async () => {
    await cacheSet('test-key', 'value')
    expect(mockRedisInstance.setex).toHaveBeenCalledWith('linkify:test-key', 300, JSON.stringify('value'))
  })

  it('handles error gracefully', async () => {
    mockRedisInstance.setex.mockRejectedValue(new Error('write error'))
    await expect(cacheSet('test-key', 'value')).resolves.toBeUndefined()
  })
})

describe('cacheDel', () => {
  it('deletes key', async () => {
    await cacheDel('test-key')
    expect(mockRedisInstance.del).toHaveBeenCalledWith('linkify:test-key')
  })

  it('handles error gracefully', async () => {
    mockRedisInstance.del.mockRejectedValue(new Error('delete error'))
    await expect(cacheDel('test-key')).resolves.toBeUndefined()
  })
})

describe('cacheDelPattern', () => {
  it('deletes keys matching pattern using scanStream', async () => {
    const asyncIterator = {
      [Symbol.asyncIterator]: () => {
        let i = 0
        const batches = [['linkify:url:a', 'linkify:url:b'], []]
        return {
          next: () => {
            if (i >= batches.length) return Promise.resolve({ value: undefined, done: true })
            const batch = batches[i++]
            return Promise.resolve({ value: batch, done: false })
          },
        }
      },
    }
    mockRedisInstance.scanStream.mockReturnValue(asyncIterator)

    await cacheDelPattern('url:*')
    expect(mockRedisInstance.scanStream).toHaveBeenCalledWith({ match: 'linkify:url:*', count: 100 })
    expect(mockRedisInstance.del).toHaveBeenCalledWith('linkify:url:a', 'linkify:url:b')
  })

  it('handles empty scan results', async () => {
    const asyncIterator = {
      [Symbol.asyncIterator]: () => {
        let done = false
        return {
          next: () => {
            if (!done) { done = true; return Promise.resolve({ value: [], done: false }) }
            return Promise.resolve({ value: undefined, done: true })
          },
        }
      },
    }
    mockRedisInstance.scanStream.mockReturnValue(asyncIterator)

    await cacheDelPattern('empty:*')
    expect(mockRedisInstance.del).not.toHaveBeenCalled()
  })

  it('handles error gracefully', async () => {
    mockRedisInstance.scanStream.mockImplementation(() => { throw new Error('scan error') })
    await expect(cacheDelPattern('url:*')).resolves.toBeUndefined()
  })
})

describe('buildCacheKeyForUrl', () => {
  it('returns prefixed key', () => {
    expect(buildCacheKeyForUrl('abc')).toBe('url:abc')
  })
})
