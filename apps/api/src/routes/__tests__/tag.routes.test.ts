import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTagController = vi.hoisted(() => ({
  createTag: vi.fn(),
  listTags: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  bulkTagUrls: vi.fn(),
  getTagUrls: vi.fn(),
}))

vi.mock('../../controllers/tag.controller', () => mockTagController)

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn((_req, _res, next) => {
    ;(_req as any).user = { id: 'user-1', role: 'user' }
    next()
  }),
}))

vi.mock('../../middleware/rateLimiter', () => ({
  bulkLimiter: vi.fn((_req, _res, next) => next()),
}))

import express from 'express'
import supertest from 'supertest'
import tagRoutes from '../tag.routes'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', tagRoutes)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  })
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Tag Routes', () => {
  it('GET / — lists tags', async () => {
    mockTagController.listTags.mockImplementation((_req, res) => {
      res.json({ success: true, data: { tags: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } })
    })
    const res = await supertest(createApp()).get('/')
    expect(res.status).toBe(200)
  })

  it('POST / — creates tag', async () => {
    mockTagController.createTag.mockImplementation((_req, res) => {
      res.status(201).json({ success: true, data: { id: 1, name: 'important' } })
    })
    const res = await supertest(createApp()).post('/').send({ name: 'important' })
    expect(res.status).toBe(201)
  })

  it('PATCH /:id — updates tag', async () => {
    mockTagController.updateTag.mockImplementation((_req, res) => {
      res.json({ success: true, data: { id: 1, name: 'updated' } })
    })
    const res = await supertest(createApp()).patch('/1').send({ name: 'updated' })
    expect(res.status).toBe(200)
  })

  it('DELETE /:id — deletes tag', async () => {
    mockTagController.deleteTag.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'Tag deleted successfully' })
    })
    const res = await supertest(createApp()).delete('/1')
    expect(res.status).toBe(200)
  })

  it('POST /bulk — bulk tags URLs', async () => {
    mockTagController.bulkTagUrls.mockImplementation((_req, res) => {
      res.json({ success: true, data: [{ success: true, code: 'abc' }] })
    })
    const res = await supertest(createApp()).post('/bulk').send({ codes: ['abc'], tagIds: [1] })
    expect(res.status).toBe(200)
  })

  it('GET /:id/urls — gets URLs by tag', async () => {
    mockTagController.getTagUrls.mockImplementation((_req, res) => {
      res.json({ success: true, data: { urls: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } })
    })
    const res = await supertest(createApp()).get('/1/urls')
    expect(res.status).toBe(200)
  })
})
