import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCollectionController = vi.hoisted(() => ({
  createCollection: vi.fn(),
  listCollections: vi.fn(),
  getCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  addUrlToCollection: vi.fn(),
  removeUrlFromCollection: vi.fn(),
  getCollectionUrls: vi.fn(),
  reorderCollections: vi.fn(),
  shareCollection: vi.fn(),
  revokeShare: vi.fn(),
}))

vi.mock('../../controllers/collection.controller', () => mockCollectionController)

vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn((_req, _res, next) => {
    ;(_req as any).user = { id: 'user-1', role: 'user' }
    next()
  }),
}))

import express from 'express'
import supertest from 'supertest'
import collectionRoutes from '../collection.routes'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/', collectionRoutes)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message })
  })
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Collection Routes', () => {
  it('GET / — lists collections', async () => {
    mockCollectionController.listCollections.mockImplementation((_req, res) => {
      res.json({ success: true, data: { collections: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } })
    })
    const res = await supertest(createApp()).get('/')
    expect(res.status).toBe(200)
  })

  it('POST / — creates collection', async () => {
    mockCollectionController.createCollection.mockImplementation((_req, res) => {
      res.status(201).json({ success: true, data: { id: 1, name: 'My Collection' } })
    })
    const res = await supertest(createApp()).post('/').send({ name: 'My Collection' })
    expect(res.status).toBe(201)
  })

  it('PATCH /reorder — reorders collections', async () => {
    mockCollectionController.reorderCollections.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'Collections reordered successfully' })
    })
    const res = await supertest(createApp()).patch('/reorder').send({ order: [{ id: 1, sortOrder: 1 }] })
    expect(res.status).toBe(200)
  })

  it('GET /:id — gets collection', async () => {
    mockCollectionController.getCollection.mockImplementation((_req, res) => {
      res.json({ success: true, data: { id: 1, name: 'My Collection' } })
    })
    const res = await supertest(createApp()).get('/1')
    expect(res.status).toBe(200)
  })

  it('PATCH /:id — updates collection', async () => {
    mockCollectionController.updateCollection.mockImplementation((_req, res) => {
      res.json({ success: true, data: { id: 1, name: 'Updated' } })
    })
    const res = await supertest(createApp()).patch('/1').send({ name: 'Updated' })
    expect(res.status).toBe(200)
  })

  it('DELETE /:id — deletes collection', async () => {
    mockCollectionController.deleteCollection.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'Collection deleted successfully' })
    })
    const res = await supertest(createApp()).delete('/1')
    expect(res.status).toBe(200)
  })

  it('POST /:id/share — shares collection', async () => {
    mockCollectionController.shareCollection.mockImplementation((_req, res) => {
      res.json({ success: true, data: { shareUrl: '/api/shared/token' } })
    })
    const res = await supertest(createApp()).post('/1/share')
    expect(res.status).toBe(200)
  })

  it('DELETE /:id/share — revokes share', async () => {
    mockCollectionController.revokeShare.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'Collection share revoked' })
    })
    const res = await supertest(createApp()).delete('/1/share')
    expect(res.status).toBe(200)
  })

  it('GET /:id/urls — gets collection URLs', async () => {
    mockCollectionController.getCollectionUrls.mockImplementation((_req, res) => {
      res.json({ success: true, data: { urls: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } })
    })
    const res = await supertest(createApp()).get('/1/urls')
    expect(res.status).toBe(200)
  })

  it('POST /:id/urls — adds URL to collection', async () => {
    mockCollectionController.addUrlToCollection.mockImplementation((_req, res) => {
      res.status(201).json({ success: true, data: { id: 1, code: 'abc' } })
    })
    const res = await supertest(createApp()).post('/1/urls').send({ urlCode: 'abc' })
    expect(res.status).toBe(201)
  })

  it('DELETE /:id/urls — removes URL from collection', async () => {
    mockCollectionController.removeUrlFromCollection.mockImplementation((_req, res) => {
      res.json({ success: true, message: 'URL removed from collection' })
    })
    const res = await supertest(createApp()).delete('/1/urls').send({ urlCode: 'abc' })
    expect(res.status).toBe(200)
  })
})
