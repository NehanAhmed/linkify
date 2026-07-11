import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAdminService = vi.hoisted(() => ({
  getDashboardStats: vi.fn(),
  getUsers: vi.fn(),
  getUserDetail: vi.fn(),
  updateUserRole: vi.fn(),
  suspendUser: vi.fn(),
  unsuspendUser: vi.fn(),
  getUserLinks: vi.fn(),
  getAuditLogWithUsers: vi.fn(),
  getSystemConfig: vi.fn(),
  triggerPurgeExpired: vi.fn(),
  triggerHealthCheck: vi.fn(),
  getMaintenanceStatus: vi.fn(),
}))

vi.mock('../../services/admin.service', () => mockAdminService)

vi.mock('../../utils/featureFlags', () => ({
  getAllFeatureFlags: vi.fn(() => ({
    BulkOperations: { enabled: true, description: 'Bulk operations' },
    LinkChaining: { enabled: true, description: 'Link chaining' },
  })),
}))

import express from 'express'
import supertest from 'supertest'
import { ZodError } from 'zod'
import adminRoutes from '../admin.routes'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', adminRoutes)
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', code: 'VALIDATION_ERROR' })
      return
    }
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as { statusCode: number; message: string; code?: string }
      res.status(e.statusCode).json({ success: false, error: e.message, code: e.code ?? 'APP_ERROR' })
      return
    }
    res.status(500).json({ success: false, error: 'Internal server error' })
  })
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /dashboard', () => {
  it('returns dashboard stats with default days', async () => {
    mockAdminService.getDashboardStats.mockResolvedValue({
      users: { total: 150, delta: 10 },
      urls: { total: 5000, delta: 200 },
      visits: { total: 25000, delta: 5000 },
      activeSubscriptions: 45,
      mrr: 99900,
      quotaMonth: '2026-07',
      storageEstimateMb: 12.5,
    })

    const res = await supertest(createApp()).get('/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.users.total).toBe(150)
    expect(res.body.data.mrr).toBe(99900)
    expect(mockAdminService.getDashboardStats).toHaveBeenCalledWith(30)
  })

  it('accepts custom days query param', async () => {
    mockAdminService.getDashboardStats.mockResolvedValue({
      users: { total: 50, delta: 5 },
      urls: { total: 1000, delta: 50 },
      visits: { total: 5000, delta: 1000 },
      activeSubscriptions: 10,
      mrr: 50000,
      quotaMonth: '2026-07',
      storageEstimateMb: 2.1,
    })

    await supertest(createApp()).get('/dashboard?days=7')

    expect(mockAdminService.getDashboardStats).toHaveBeenCalledWith(7)
  })

  it('rejects invalid days', async () => {
    const res = await supertest(createApp()).get('/dashboard?days=-1')

    expect(res.status).toBe(400)
    expect(mockAdminService.getDashboardStats).not.toHaveBeenCalled()
  })
})

describe('GET /users', () => {
  it('returns paginated users', async () => {
    mockAdminService.getUsers.mockResolvedValue({
      users: [{ id: 'u1', email: 'a@b.com', role: 'user', suspendedAt: null, createdAt: '2026-01-01T00:00:00Z', linkCount: 5 }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })

    const res = await supertest(createApp()).get('/users')

    expect(res.status).toBe(200)
    expect(res.body.data.users).toHaveLength(1)
    expect(res.body.data.pagination.total).toBe(1)
    expect(mockAdminService.getUsers).toHaveBeenCalledWith(1, 20)
  })

  it('accepts pagination params', async () => {
    mockAdminService.getUsers.mockResolvedValue({
      users: [],
      pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
    })

    await supertest(createApp()).get('/users?page=2&limit=10')

    expect(mockAdminService.getUsers).toHaveBeenCalledWith(2, 10)
  })
})

describe('GET /users/:id', () => {
  it('returns user detail', async () => {
    mockAdminService.getUserDetail.mockResolvedValue({
      id: 'user-1', email: 'a@b.com', role: 'user', suspendedAt: null,
      createdAt: '2026-01-01T00:00:00Z', linkCount: 10, visitCount: 100,
      subscription: { plan: 'Pro', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false },
    })

    const res = await supertest(createApp()).get('/users/user-1')

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('user-1')
    expect(mockAdminService.getUserDetail).toHaveBeenCalledWith('user-1')
  })

  it('returns 404 when service throws', async () => {
    mockAdminService.getUserDetail.mockRejectedValue({ statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' })

    const res = await supertest(createApp()).get('/users/nonexistent')

    expect(res.status).toBe(404)
  })
})

describe('PATCH /users/:id/role', () => {
  it('updates user role', async () => {
    mockAdminService.updateUserRole.mockResolvedValue(undefined)

    const res = await supertest(createApp())
      .patch('/users/user-1/role')
      .send({ role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockAdminService.updateUserRole).toHaveBeenCalledWith('user-1', 'admin')
  })

  it('rejects invalid role', async () => {
    const res = await supertest(createApp())
      .patch('/users/user-1/role')
      .send({ role: 'superadmin' })

    expect(res.status).toBe(400)
    expect(mockAdminService.updateUserRole).not.toHaveBeenCalled()
  })

  it('rejects missing role', async () => {
    const res = await supertest(createApp())
      .patch('/users/user-1/role')
      .send({})

    expect(res.status).toBe(400)
  })
})

describe('POST /users/:id/suspend', () => {
  it('suspends a user', async () => {
    mockAdminService.suspendUser.mockResolvedValue(undefined)

    const res = await supertest(createApp()).post('/users/user-1/suspend')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockAdminService.suspendUser).toHaveBeenCalledWith('user-1')
  })
})

describe('POST /users/:id/unsuspend', () => {
  it('unsuspends a user', async () => {
    mockAdminService.unsuspendUser.mockResolvedValue(undefined)

    const res = await supertest(createApp()).post('/users/user-1/unsuspend')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockAdminService.unsuspendUser).toHaveBeenCalledWith('user-1')
  })
})

describe('GET /users/:id/links', () => {
  it('returns paginated user links', async () => {
    mockAdminService.getUserLinks.mockResolvedValue({
      links: [{ code: 'abc', url: 'https://example.com', visits: 5, uniqueVisits: 3, createdAt: '2026-01-01T00:00:00Z', deletedAt: null }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })

    const res = await supertest(createApp()).get('/users/user-1/links')

    expect(res.status).toBe(200)
    expect(res.body.data.links).toHaveLength(1)
    expect(mockAdminService.getUserLinks).toHaveBeenCalledWith('user-1', 1, 20)
  })
})

describe('GET /audit-log', () => {
  it('returns audit log entries', async () => {
    mockAdminService.getAuditLogWithUsers.mockResolvedValue({
      entries: [{ id: 1, userId: 'u1', action: 'url.created', resource: 'url', resourceId: 'abc', metadata: null, ipAddress: '::1', createdAt: '2026-01-01T00:00:00Z', userEmail: 'a@b.com' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })

    const res = await supertest(createApp()).get('/audit-log')

    expect(res.status).toBe(200)
    expect(res.body.data.entries).toHaveLength(1)
    expect(mockAdminService.getAuditLogWithUsers).toHaveBeenCalledWith(1, 20, undefined, undefined)
  })

  it('passes filter params', async () => {
    mockAdminService.getAuditLogWithUsers.mockResolvedValue({
      entries: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })

    await supertest(createApp()).get('/audit-log?action=url.created&userId=u1')

    expect(mockAdminService.getAuditLogWithUsers).toHaveBeenCalledWith(1, 20, 'url.created', 'u1')
  })
})

describe('GET /billing/stats', () => {
  it('returns billing stats', async () => {
    mockAdminService.getDashboardStats.mockResolvedValue({
      users: { total: 100, delta: 0 },
      urls: { total: 5000, delta: 0 },
      visits: { total: 100000, delta: 0 },
      activeSubscriptions: 30,
      mrr: 500000,
      quotaMonth: '2026-07',
      storageEstimateMb: 50,
    })

    const res = await supertest(createApp()).get('/billing/stats')

    expect(res.status).toBe(200)
    expect(res.body.data.totalUsers).toBe(100)
    expect(res.body.data.mrr).toBe(500000)
    expect(res.body.data.activeSubscriptions).toBe(30)
  })
})

describe('GET /system/config', () => {
  it('returns system config', async () => {
    mockAdminService.getSystemConfig.mockResolvedValue({
      nodeEnv: 'test',
      baseUrl: 'http://localhost:3000',
      baseUrlHost: 'localhost',
      redisConfigured: false,
      stripeConfigured: false,
      sentryConfigured: false,
      readReplicaConfigured: false,
      healthCheckIntervalMs: 3600000,
      rateLimitMax: 100,
      authRateLimitMax: 3,
      featureFlags: { BulkOperations: { enabled: true, description: 'test' } },
    })

    const res = await supertest(createApp()).get('/system/config')

    expect(res.status).toBe(200)
    expect(res.body.data.nodeEnv).toBe('test')
    expect(res.body.data.featureFlags.BulkOperations.enabled).toBe(true)
  })
})

describe('GET /system/flags', () => {
  it('returns feature flags', async () => {
    const res = await supertest(createApp()).get('/system/flags')

    expect(res.status).toBe(200)
    expect(res.body.data.BulkOperations.enabled).toBe(true)
  })
})

describe('POST /maintenance/purge-expired', () => {
  it('triggers purge with default days', async () => {
    mockAdminService.triggerPurgeExpired.mockResolvedValue({ purgedCount: 5 })

    const res = await supertest(createApp())
      .post('/maintenance/purge-expired')
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.data.purgedCount).toBe(5)
    expect(mockAdminService.triggerPurgeExpired).toHaveBeenCalledWith(30)
  })

  it('accepts custom daysOld', async () => {
    mockAdminService.triggerPurgeExpired.mockResolvedValue({ purgedCount: 10 })

    await supertest(createApp())
      .post('/maintenance/purge-expired')
      .send({ daysOld: 60 })

    expect(mockAdminService.triggerPurgeExpired).toHaveBeenCalledWith(60)
  })

  it('rejects invalid daysOld', async () => {
    const res = await supertest(createApp())
      .post('/maintenance/purge-expired')
      .send({ daysOld: -1 })

    expect(res.status).toBe(400)
    expect(mockAdminService.triggerPurgeExpired).not.toHaveBeenCalled()
  })
})

describe('POST /maintenance/recheck-links', () => {
  it('triggers health check', async () => {
    mockAdminService.triggerHealthCheck.mockResolvedValue({ checkedCount: 20 })

    const res = await supertest(createApp()).post('/maintenance/recheck-links')

    expect(res.status).toBe(200)
    expect(res.body.data.checkedCount).toBe(20)
  })
})

describe('GET /maintenance/status', () => {
  it('returns maintenance status', async () => {
    mockAdminService.getMaintenanceStatus.mockReturnValue({
      lastPurgeAt: null,
      lastPurgeCount: 0,
      lastHealthCheckAt: null,
      lastHealthCheckCount: 0,
      healthCheckIntervalMs: 3600000,
    })

    const res = await supertest(createApp()).get('/maintenance/status')

    expect(res.status).toBe(200)
    expect(res.body.data.healthCheckIntervalMs).toBe(3600000)
    expect(res.body.data.lastPurgeAt).toBeNull()
  })
})
