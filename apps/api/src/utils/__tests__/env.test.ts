import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('validates env with all required fields', async () => {
    vi.stubGlobal('process', {
      ...process,
      env: {
        DATABASE_URL: 'postgres://localhost:5432/db',
        BASE_URL: 'http://localhost:3000',
        SUPABASE_URL: 'https://test.supabase.co',
        LINK_ACCESS_SECRET: 'test-secret-32-characters-long!!',
        ENCRYPTION_KEY: 'test-encryption-key-32chars!',
        FINGERPRINT_SECRET: 'test-fingerprint-secret-32!',
        NODE_ENV: 'test',
      },
    })

    const { env } = await import('../env')
    expect(env.DATABASE_URL).toBe('postgres://localhost:5432/db')
  })

  it('uses defaults for optional fields', async () => {
    vi.stubGlobal('process', {
      ...process,
      env: {
        DATABASE_URL: 'postgres://localhost:5432/db',
        BASE_URL: 'http://localhost:3000',
        SUPABASE_URL: 'https://test.supabase.co',
        LINK_ACCESS_SECRET: 'test-secret-32-characters-long!!',
        ENCRYPTION_KEY: 'test-encryption-key-32chars!',
        FINGERPRINT_SECRET: 'test-fingerprint-secret-32!',
        NODE_ENV: 'test',
      },
    })

    const { env } = await import('../env')
    expect(env.PORT).toBe(3000)
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60000)
    expect(env.RATE_LIMIT_MAX).toBe(100)
    expect(env.HEALTH_CHECK_INTERVAL_MS).toBe(3600000)
    expect(env.UNIQUE_VISIT_WINDOW_HOURS).toBe(24)
    expect(env.LOG_LEVEL).toBe('info')
    expect(env.FEATURE_BULK_OPERATIONS).toBe('enabled')
    expect(env.REDIS_CACHE_TTL).toBe(300)
  })

  it('coerces numeric string values', async () => {
    vi.stubGlobal('process', {
      ...process,
      env: {
        DATABASE_URL: 'postgres://localhost:5432/db',
        BASE_URL: 'http://localhost:3000',
        SUPABASE_URL: 'https://test.supabase.co',
        LINK_ACCESS_SECRET: 'test-secret-32-characters-long!!',
        ENCRYPTION_KEY: 'test-encryption-key-32chars!',
        FINGERPRINT_SECRET: 'test-fingerprint-secret-32!',
        PORT: '8080',
        RATE_LIMIT_WINDOW_MS: '120000',
        RATE_LIMIT_MAX: '200',
        NODE_ENV: 'test',
      },
    })

    const { env } = await import('../env')
    expect(env.PORT).toBe(8080)
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(120000)
    expect(env.RATE_LIMIT_MAX).toBe(200)
  })

  it('defers validation until env access', async () => {
    vi.stubGlobal('process', {
      ...process,
      env: {
        NODE_ENV: 'test',
      },
    })

    const mod = await import('../env')
    expect(() => mod.env.DATABASE_URL).toThrow()
  })
})
