import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPublicController = vi.hoisted(() => ({
  getShared: vi.fn(),
}))

vi.mock('../../controllers/public.controller', () => mockPublicController)

import express from 'express'
import supertest from 'supertest'
import publicRoutes from '../public.routes'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', publicRoutes)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  })
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Public Routes', () => {
  it('GET /shared/:token — returns shared collection', async () => {
    mockPublicController.getShared.mockImplementation((_req, res) => {
      res.json({ success: true, data: { id: 1, name: 'Shared', urls: [] } })
    })
    const res = await supertest(createApp()).get('/shared/550e8400-e29b-41d4-a716-446655440000')
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Shared')
  })
})
