import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStartHealthCheckJob = vi.hoisted(() => vi.fn())
const mockSeedPlans = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockListen = vi.hoisted(() => vi.fn((_port, cb) => cb()))
const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }))

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
  config: vi.fn(),
}))

vi.mock('../utils/env', () => ({
  env: {
    PORT: 4000,
    HEALTH_CHECK_INTERVAL_MS: 3600000,
  },
}))

vi.mock('../utils/logger', () => ({
  logger: mockLogger,
}))

vi.mock('../app', () => ({
  default: {},
}))

vi.mock('http', () => ({
  createServer: vi.fn(() => ({
    listen: mockListen,
  })),
}))

vi.mock('../jobs/healthCheckJob', () => ({
  startHealthCheckJob: mockStartHealthCheckJob,
}))

vi.mock('../jobs/seedPlans', () => ({
  seedPlans: mockSeedPlans,
}))

describe('Server entry point (index.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('starts the server on the configured port', async () => {
    await import('../index')
    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith(4000, expect.any(Function))
    })
  })

  it('logs server start message', async () => {
    await import('../index')
    await vi.waitFor(() => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        { port: 4000 },
        'Server started',
      )
    })
  })

  it('starts health check job when interval is configured', async () => {
    await import('../index')
    await vi.waitFor(() => {
      expect(mockStartHealthCheckJob).toHaveBeenCalledWith(3600000)
    })
    expect(mockLogger.info).toHaveBeenCalledWith(
      { interval: 3600000 },
      'Health check job started',
    )
  })

  it('seeds plans on startup (fire-and-forget)', async () => {
    await import('../index')
    await vi.waitFor(() => {
      expect(mockSeedPlans).toHaveBeenCalled()
    })
  })
})
