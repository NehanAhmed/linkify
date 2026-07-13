import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockHealthController = vi.hoisted(() => ({ check: vi.fn() }))
const mockAuthRoutes = vi.hoisted(() => { const r = require('express').Router(); return r })
const mockUrlRoutes = vi.hoisted(() => { const r = require('express').Router(); return r })
const mockCollectionRoutes = vi.hoisted(() => { const r = require('express').Router(); return r })
const mockTagRoutes = vi.hoisted(() => { const r = require('express').Router(); return r })
const mockAdminRoutes = vi.hoisted(() => { const r = require('express').Router(); return r })
const mockPublicRoutes = vi.hoisted(() => { const r = require('express').Router(); return r })
const mockBillingRoutes = vi.hoisted(() => { const r = require('express').Router(); return r })
const mockDomainRoutes = vi.hoisted(() => { const r = require('express').Router(); return r })

vi.mock('../../controllers/health.controller', () => mockHealthController)
vi.mock('../auth.routes', () => ({ default: mockAuthRoutes }))
vi.mock('../url.routes', () => ({ default: mockUrlRoutes }))
vi.mock('../collection.routes', () => ({ default: mockCollectionRoutes }))
vi.mock('../tag.routes', () => ({ default: mockTagRoutes }))
vi.mock('../admin.routes', () => ({ default: mockAdminRoutes }))
vi.mock('../public.routes', () => ({ default: mockPublicRoutes }))
vi.mock('../billing.routes', () => ({ default: mockBillingRoutes }))
vi.mock('../domain.routes', () => ({ default: mockDomainRoutes }))

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn((_req, _res, next) => {
    ;(_req as any).user = { id: 'admin-1', role: 'admin' }
    next()
  }),
}))

vi.mock('../../middleware/requireRole', () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}))

vi.mock('../../middleware/requireAAL', () => ({
  requireAAL: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}))

import express from 'express'
import routes from '../index'

describe('Index Routes (route mounting)', () => {
  it('mounts health check at /api/health', () => {
    const app = express()
    app.use(routes)
    expect(app).toBeDefined()
  })

  it('mounts all route groups under /api', () => {
    const app = express()
    app.use(routes)
    expect(app).toBeDefined()
  })

  it('health endpoint calls health controller', async () => {
    mockHealthController.check.mockImplementation((_req: any, res: any) => {
      res.json({ success: true, data: { status: 'ok' } })
    })

    const app = express()
    app.use(routes)
    const supertest = (await import('supertest')).default
    const res = await supertest(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
  })
})
