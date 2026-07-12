import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb, resolveFn } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'values', 'set', 'delete', 'orderBy', 'offset', 'innerJoin', 'leftJoin', 'groupBy']
  for (const m of chainable) qb[m] = vi.fn(() => qb)
  const resolveFn = vi.fn()
  resolveFn.mockResolvedValue([])
  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  const db = { select: vi.fn(() => qb), insert: vi.fn(() => qb), update: vi.fn(() => qb), delete: vi.fn(() => qb) }
  function reset() {
    resolveFn.mockReset()
    resolveFn.mockResolvedValue([])
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }
  return { mockQb: qb, mockDb: db, resetQb: reset, resolveFn }
})

vi.mock('../../db', () => ({ db: mockDb }))

vi.mock('../../utils/featureFlags', () => ({
  getAllFeatureFlags: vi.fn(() => ({
    BulkOperations: { enabled: true, description: 'test' },
  })),
}))

vi.mock('../../utils/env', () => ({
  env: {
    NODE_ENV: 'test',
    BASE_URL: 'http://localhost:3000',
    REDIS_URL: '',
    STRIPE_SECRET_KEY: '',
    SENTRY_DSN: '',
    DATABASE_REPLICA_URL: '',
    HEALTH_CHECK_INTERVAL_MS: 3600000,
    RATE_LIMIT_MAX: 100,
    AUTH_RATE_LIMIT_MAX: 3,
  },
}))

vi.mock('../url.services', () => ({
  purgeExpiredUrls: vi.fn(),
}))

vi.mock('../../jobs/healthCheckJob', () => ({
  processBatch: vi.fn().mockResolvedValue(0),
}))

import * as adminService from '../admin.service'
import { purgeExpiredUrls } from '../url.services'
import { processBatch } from '../../jobs/healthCheckJob'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
  adminService.resetMaintenanceState()
})

describe('getDashboardStats', () => {
  it('returns aggregated stats with deltas', async () => {
    const now = new Date()

    resolveFn
      .mockResolvedValueOnce([{ total: 150 }])
      .mockResolvedValueOnce([{ total: 5000 }])
      .mockResolvedValueOnce([{ total: 25000 }])
      .mockResolvedValueOnce([{ total: 100 }])
      .mockResolvedValueOnce([{ total: 4000 }])
      .mockResolvedValueOnce([{ total: 20000 }])
      .mockResolvedValueOnce([{ total: 45 }])
      .mockResolvedValueOnce([{ total: 99900 }])
      .mockResolvedValueOnce([{ total: 500000 }])

    const result = await adminService.getDashboardStats(30)

    expect(result.users.total).toBe(150)
    expect(result.users.delta).toBe(50)
    expect(result.urls.total).toBe(5000)
    expect(result.urls.delta).toBe(1000)
    expect(result.visits.total).toBe(25000)
    expect(result.visits.delta).toBe(5000)
    expect(result.activeSubscriptions).toBe(45)
    expect(result.mrr).toBe(99900)
    expect(result.storageEstimateMb).toBeGreaterThan(0)
  })

  it('handles empty database gracefully', async () => {
    resolveFn
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])

    const result = await adminService.getDashboardStats(30)

    expect(result.users.total).toBe(0)
    expect(result.users.delta).toBe(0)
    expect(result.urls.total).toBe(0)
    expect(result.visits.total).toBe(0)
    expect(result.activeSubscriptions).toBe(0)
    expect(result.mrr).toBe(0)
    expect(result.storageEstimateMb).toBe(0)
  })
})

describe('getUsers', () => {
  it('returns paginated user list with link counts', async () => {
    resolveFn
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([
        { id: 'user-1', email: 'a@b.com', role: 'admin', suspendedAt: null, createdAt: new Date(), linkCount: 5 },
        { id: 'user-2', email: 'c@d.com', role: 'user', suspendedAt: null, createdAt: new Date(), linkCount: 3 },
      ])

    const result = await adminService.getUsers(1, 20)

    expect(result.users).toHaveLength(2)
    expect(result.pagination.total).toBe(2)
    expect(result.users[0].linkCount).toBe(5)
    expect(result.users[1].linkCount).toBe(3)
  })

  it('returns empty list when no users', async () => {
    resolveFn
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([])

    const result = await adminService.getUsers(1, 20)

    expect(result.users).toHaveLength(0)
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })
})

describe('getUserDetail', () => {
  it('returns full user profile', async () => {
    resolveFn
      .mockResolvedValueOnce([{ id: 'user-1', email: 'a@b.com', role: 'admin', suspendedAt: null, createdAt: new Date() }])
      .mockResolvedValueOnce([{ total: 10 }])
      .mockResolvedValueOnce([{ total: 100 }])
      .mockResolvedValueOnce([{ planName: 'Pro', status: 'active', currentPeriodEnd: new Date(), cancelAtPeriodEnd: false }])

    const result = await adminService.getUserDetail('user-1')

    expect(result.email).toBe('a@b.com')
    expect(result.role).toBe('admin')
    expect(result.linkCount).toBe(10)
    expect(result.visitCount).toBe(100)
    expect(result.subscription?.plan).toBe('Pro')
  })

  it('throws when user not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(adminService.getUserDetail('nonexistent')).rejects.toThrow('User not found')
  })

  it('returns user without subscription', async () => {
    resolveFn
      .mockResolvedValueOnce([{ id: 'user-2', email: 'free@b.com', role: 'user', suspendedAt: null, createdAt: new Date() }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([])

    const result = await adminService.getUserDetail('user-2')

    expect(result.subscription).toBeNull()
    expect(result.linkCount).toBe(0)
    expect(result.visitCount).toBe(0)
  })

  it('marks suspended user correctly', async () => {
    resolveFn
      .mockResolvedValueOnce([{ id: 'user-3', email: 'suspended@b.com', role: 'user', suspendedAt: new Date(), createdAt: new Date() }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([])

    const result = await adminService.getUserDetail('user-3')

    expect(result.suspendedAt).not.toBeNull()
  })
})

describe('updateUserRole', () => {
  it('updates role successfully', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 'user-1' }])

    await adminService.updateUserRole('user-1', 'admin')

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws when user not found', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(adminService.updateUserRole('nonexistent', 'admin')).rejects.toThrow('User not found')
  })

  it('throws on invalid role', async () => {
    await expect(adminService.updateUserRole('user-1', 'superadmin' as any)).rejects.toThrow('Invalid role')
  })
})

describe('suspendUser / unsuspendUser', () => {
  it('suspends a user', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 'user-1' }])

    await adminService.suspendUser('user-1')

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws when suspending nonexistent user', async () => {
    resolveFn.mockResolvedValueOnce([])

    await expect(adminService.suspendUser('nonexistent')).rejects.toThrow('User not found')
  })

  it('unsuspends a user', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 'user-1', suspendedAt: new Date() }])

    await adminService.unsuspendUser('user-1')

    expect(mockDb.update).toHaveBeenCalled()
  })

  it('does nothing if user is not suspended', async () => {
    resolveFn.mockResolvedValueOnce([{ id: 'user-1', suspendedAt: null }])

    await adminService.unsuspendUser('user-1')

    expect(mockDb.update).not.toHaveBeenCalled()
  })
})

describe('getUserLinks', () => {
  it('returns paginated links for a user', async () => {
    resolveFn
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{ code: 'abc', url: 'https://example.com', visits: 5, uniqueVisits: 3, createdAt: new Date(), deletedAt: null }])

    const result = await adminService.getUserLinks('user-1')

    expect(result.links).toHaveLength(1)
    expect(result.links[0].code).toBe('abc')
    expect(result.pagination.total).toBe(1)
  })
})

describe('getAuditLogWithUsers', () => {
  it('returns audit log with user emails', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 1, userId: 'user-1', action: 'url.created', resource: 'url', resourceId: 'abc', metadata: null, ipAddress: '127.0.0.1', createdAt: new Date(), userEmail: 'a@b.com' },
    ]).then(onfulfilled)

    const result = await adminService.getAuditLogWithUsers(1, 20)

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].userEmail).toBe('a@b.com')
  })

  it('filters by action', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 2, userId: 'user-1', action: 'url.deleted', resource: 'url', resourceId: 'xyz', metadata: null, ipAddress: '::1', createdAt: new Date(), userEmail: 'a@b.com' },
    ]).then(onfulfilled)

    const result = await adminService.getAuditLogWithUsers(1, 20, 'url.deleted')

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].action).toBe('url.deleted')
  })
})

describe('getSystemConfig', () => {
  it('returns sanitized config', async () => {
    const result = await adminService.getSystemConfig()

    expect(result.nodeEnv).toBe('test')
    expect(result.redisConfigured).toBe(false)
    expect(result.stripeConfigured).toBe(false)
    expect(result.featureFlags.BulkOperations.enabled).toBe(true)
  })
})

describe('triggerPurgeExpired', () => {
  it('triggers purge and returns count', async () => {
    vi.mocked(purgeExpiredUrls).mockResolvedValue(['abc', 'def'])

    const result = await adminService.triggerPurgeExpired(30)

    expect(result.purgedCount).toBe(2)
    expect(purgeExpiredUrls).toHaveBeenCalledWith(30)
  })
})

describe('triggerHealthCheck', () => {
  it('triggers health check and returns count', async () => {
    vi.mocked(processBatch).mockResolvedValue(5)

    const result = await adminService.triggerHealthCheck()

    expect(result.checkedCount).toBe(5)
  })
})

describe('getMaintenanceStatus', () => {
  it('returns maintenance status with defaults', () => {
    const result = adminService.getMaintenanceStatus()

    expect(result.lastPurgeAt).toBeNull()
    expect(result.lastHealthCheckAt).toBeNull()
    expect(result.healthCheckIntervalMs).toBe(3600000)
  })

  it('reflects triggered maintenance actions', async () => {
    vi.mocked(purgeExpiredUrls).mockResolvedValue(['a', 'b', 'c'])
    vi.mocked(processBatch).mockResolvedValue(10)

    await adminService.triggerPurgeExpired(7)
    await adminService.triggerHealthCheck()

    const status = adminService.getMaintenanceStatus()
    expect(status.lastPurgeAt).not.toBeNull()
    expect(status.lastPurgeCount).toBe(3)
    expect(status.lastHealthCheckAt).not.toBeNull()
    expect(status.lastHealthCheckCount).toBe(10)
  })
})
