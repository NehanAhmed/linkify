import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}))

vi.mock('../../db', () => ({ db: mockDb }))

vi.mock('../../services/healthCheck', () => ({
  checkLink: vi.fn(),
}))

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { processBatch, startHealthCheckJob, stopHealthCheckJob } from '../healthCheckJob'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  stopHealthCheckJob()
})

describe('processBatch', () => {
  it('returns 0 when no stale URLs found', async () => {
    const result = await processBatch()
    expect(result).toBe(0)
  })

  it('checks links for stale URLs and updates them', async () => {
    const { checkLink } = await import('../../services/healthCheck')
    vi.mocked(mockDb.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([
            { code: 'abc', url: 'https://example.com' },
            { code: 'def', url: 'https://test.com' },
          ])),
        })),
      })),
    } as any)

    vi.mocked(checkLink).mockResolvedValueOnce({ statusCode: 200, ok: true })
    vi.mocked(checkLink).mockResolvedValueOnce({ statusCode: 404, ok: false })

    const result = await processBatch()

    expect(result).toBe(2)
    expect(mockDb.update).toHaveBeenCalledTimes(2)
  })

  it('handles checkLink failures gracefully', async () => {
    const { checkLink } = await import('../../services/healthCheck')
    vi.mocked(mockDb.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([
            { code: 'abc', url: 'https://example.com' },
          ])),
        })),
      })),
    } as any)

    vi.mocked(checkLink).mockRejectedValueOnce(new Error('network error'))

    const result = await processBatch()

    expect(result).toBe(1)
  })
})

describe('startHealthCheckJob / stopHealthCheckJob', () => {
  it('starts and stops the health check interval', () => {
    startHealthCheckJob(1000)
    expect(vi.getTimerCount()).toBe(1)

    stopHealthCheckJob()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not start job with zero interval', () => {
    startHealthCheckJob(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not start job with negative interval', () => {
    startHealthCheckJob(-1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
