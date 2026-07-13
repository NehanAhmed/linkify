import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockCollectionsService = vi.hoisted(() => ({
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

vi.mock('../../services/collections.service', () => mockCollectionsService)

vi.mock('../../services/audit.service', () => ({
  logActionFromReq: vi.fn().mockResolvedValue(undefined),
}))

import * as collectionController from '../collection.controller'

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: 'user-1', role: 'user' } as any,
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createCollection', () => {
  it('creates collection and returns 201', async () => {
    const req = mockReq({ body: { name: 'My Collection' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.createCollection.mockResolvedValueOnce({ id: 1, name: 'My Collection' })

    await collectionController.createCollection(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('listCollections', () => {
  it('lists collections with pagination', async () => {
    const req = mockReq({ query: { page: '1', limit: '20' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.listCollections.mockResolvedValueOnce({
      collections: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })

    await collectionController.listCollections(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('getCollection', () => {
  it('gets a single collection', async () => {
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.getCollection.mockResolvedValueOnce({ id: 1, name: 'My Collection' })

    await collectionController.getCollection(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('updateCollection', () => {
  it('updates a collection', async () => {
    const req = mockReq({ params: { id: '1' }, body: { name: 'Updated' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.updateCollection.mockResolvedValueOnce({ id: 1, name: 'Updated' })

    await collectionController.updateCollection(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('deleteCollection', () => {
  it('deletes a collection', async () => {
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.deleteCollection.mockResolvedValueOnce(undefined)

    await collectionController.deleteCollection(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('addUrlToCollection', () => {
  it('adds URL to collection', async () => {
    const req = mockReq({ params: { id: '1' }, body: { urlCode: 'abc' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.addUrlToCollection.mockResolvedValueOnce({ id: 1, code: 'abc' })

    await collectionController.addUrlToCollection(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
  })
})

describe('removeUrlFromCollection', () => {
  it('removes URL from collection', async () => {
    const req = mockReq({ params: { id: '1' }, body: { urlCode: 'abc' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.removeUrlFromCollection.mockResolvedValueOnce(undefined)

    await collectionController.removeUrlFromCollection(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('getCollectionUrls', () => {
  it('gets URLs in a collection', async () => {
    const req = mockReq({ params: { id: '1' }, query: { page: '1', limit: '20' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.getCollectionUrls.mockResolvedValueOnce({
      urls: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })

    await collectionController.getCollectionUrls(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('reorderCollections', () => {
  it('reorders collections', async () => {
    const req = mockReq({ body: [{ id: 2, sortOrder: 1 }, { id: 1, sortOrder: 2 }] })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.reorderCollections.mockResolvedValueOnce(undefined)

    await collectionController.reorderCollections(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('shareCollection', () => {
  it('shares a collection and returns share URL', async () => {
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.shareCollection.mockResolvedValueOnce({
      shareToken: '550e8400-e29b-41d4-a716-446655440000',
    })

    await collectionController.shareCollection(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        shareUrl: expect.stringContaining('/api/shared/'),
      }),
    }))
  })
})

describe('revokeShare', () => {
  it('revokes collection sharing', async () => {
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()
    const next = vi.fn()

    mockCollectionsService.revokeShare.mockResolvedValueOnce(undefined)

    await collectionController.revokeShare(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
