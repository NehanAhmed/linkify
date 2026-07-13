import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockTagsService = vi.hoisted(() => ({
  createTag: vi.fn(),
  listTags: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  bulkTagUrls: vi.fn(),
  getUrlsByTag: vi.fn(),
}))

vi.mock('../../services/tags.service', () => mockTagsService)

vi.mock('../../services/audit.service', () => ({
  logActionFromReq: vi.fn().mockResolvedValue(undefined),
}))

import * as tagController from '../tag.controller'

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: 'user-1', role: 'user' } as any,
    body: {},
    params: {},
    query: {},
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

describe('createTag', () => {
  it('creates tag and returns 201', async () => {
    const req = mockReq({ body: { name: 'important' } })
    const res = mockRes()
    const next = vi.fn()

    mockTagsService.createTag.mockResolvedValueOnce({ id: 1, name: 'important' })

    await tagController.createTag(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('listTags', () => {
  it('lists tags with pagination', async () => {
    const req = mockReq({ query: { page: '1', limit: '20' } })
    const res = mockRes()
    const next = vi.fn()

    mockTagsService.listTags.mockResolvedValueOnce({
      tags: [{ id: 1, name: 'important' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })

    await tagController.listTags(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('updateTag', () => {
  it('updates a tag', async () => {
    const req = mockReq({ params: { id: '1' }, body: { name: 'updated' } })
    const res = mockRes()
    const next = vi.fn()

    mockTagsService.updateTag.mockResolvedValueOnce({ id: 1, name: 'updated' })

    await tagController.updateTag(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('deleteTag', () => {
  it('deletes a tag', async () => {
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()
    const next = vi.fn()

    mockTagsService.deleteTag.mockResolvedValueOnce(undefined)

    await tagController.deleteTag(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('bulkTagUrls', () => {
  it('applies tags to multiple URLs', async () => {
    const req = mockReq({ body: { codes: ['abc', 'def'], tagIds: [1, 2] } })
    const res = mockRes()
    const next = vi.fn()

    mockTagsService.bulkTagUrls.mockResolvedValueOnce([
      { success: true, code: 'abc' },
      { success: true, code: 'def' },
    ])

    await tagController.bulkTagUrls(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('returns 207 on partial failure', async () => {
    const req = mockReq({ body: { codes: ['abc', 'missing'], tagIds: [1] } })
    const res = mockRes()
    const next = vi.fn()

    mockTagsService.bulkTagUrls.mockResolvedValueOnce([
      { success: true, code: 'abc' },
      { success: false, code: 'missing', error: 'not found' },
    ])

    await tagController.bulkTagUrls(req, res, next)

    expect(res.status).toHaveBeenCalledWith(207)
  })
})

describe('getTagUrls', () => {
  it('gets URLs by tag', async () => {
    const req = mockReq({ params: { id: '1' }, query: { page: '1', limit: '20' } })
    const res = mockRes()
    const next = vi.fn()

    mockTagsService.getUrlsByTag.mockResolvedValueOnce({
      urls: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })

    await tagController.getTagUrls(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
