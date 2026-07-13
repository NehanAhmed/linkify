import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPino = vi.hoisted(() => vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })))

vi.mock('pino', () => ({ default: mockPino }))

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('creates pino logger with info level in test env', async () => {
    vi.mock('../../utils/env', () => ({
      env: { NODE_ENV: 'test', LOG_LEVEL: 'info' },
    }))

    const { logger } = await import('../logger')

    expect(logger).toBeDefined()
    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info' }),
    )
  })

  it('redacts authorization header', async () => {
    vi.mock('../../utils/env', () => ({
      env: { NODE_ENV: 'test', LOG_LEVEL: 'info' },
    }))

    const { logger } = await import('../logger')

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({
        redact: ['req.headers.authorization'],
      }),
    )
  })

  it('does not use transport in non-development', async () => {
    vi.mock('../../utils/env', () => ({
      env: { NODE_ENV: 'production', LOG_LEVEL: 'info' },
    }))

    await import('../logger')

    expect(mockPino).toHaveBeenCalledWith(
      expect.not.objectContaining({ transport: expect.anything() }),
    )
  })
})
