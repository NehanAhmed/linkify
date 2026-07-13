import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockLinkService = vi.hoisted(() => ({
  setPassword: vi.fn(),
  removePassword: vi.fn(),
  verifyPasswordReturnToken: vi.fn(),
  updateLinkSettings: vi.fn(),
}))

const mockBulkService = vi.hoisted(() => ({
  executeBulkOperation: vi.fn(),
  importCsv: vi.fn(),
}))

vi.mock('../../services/link.service', () => mockLinkService)
vi.mock('../../services/bulk.service', () => mockBulkService)

vi.mock('../../services/audit.service', () => ({
  logActionFromReq: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import * as linkController from '../link.controller'

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: 'user-1', role: 'user' } as any,
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
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

describe('setPassword', () => {
  it('sets password on a link', async () => {
    const req = mockReq({ params: { code: 'abc' }, body: { password: 'secret123' } })
    const res = mockRes()
    const next = vi.fn()

    mockLinkService.setPassword.mockResolvedValueOnce(undefined)

    await linkController.setPassword(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('removePassword', () => {
  it('removes password from a link', async () => {
    const req = mockReq({ params: { code: 'abc' } })
    const res = mockRes()
    const next = vi.fn()

    mockLinkService.removePassword.mockResolvedValueOnce(undefined)

    await linkController.removePassword(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('verifyPassword', () => {
  it('verifies password and returns token', async () => {
    const req = mockReq({ params: { code: 'abc' }, body: { password: 'secret123' } })
    const res = mockRes()
    const next = vi.fn()

    mockLinkService.verifyPasswordReturnToken.mockResolvedValueOnce('access-token')

    await linkController.verifyPassword(req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { token: 'access-token' },
    })
  })
})

describe('updateLinkSettings', () => {
  it('updates link settings', async () => {
    const req = mockReq({
      params: { code: 'abc' },
      body: { blockBots: true },
    })
    const res = mockRes()
    const next = vi.fn()

    mockLinkService.updateLinkSettings.mockResolvedValueOnce(undefined)

    await linkController.updateLinkSettings(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('executeBulkOperation', () => {
  it('executes bulk operation', async () => {
    const req = mockReq({
      body: { operation: 'delete', codes: ['abc', 'def'] },
    })
    const res = mockRes()
    const next = vi.fn()

    mockBulkService.executeBulkOperation.mockResolvedValueOnce([
      { success: true, code: 'abc' },
      { success: true, code: 'def' },
    ])

    await linkController.executeBulkOperation(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('returns 207 on partial failure', async () => {
    const req = mockReq({
      body: { operation: 'delete', codes: ['abc', 'def'] },
    })
    const res = mockRes()
    const next = vi.fn()

    mockBulkService.executeBulkOperation.mockResolvedValueOnce([
      { success: true, code: 'abc' },
      { success: false, code: 'def', error: 'not found' },
    ])

    await linkController.executeBulkOperation(req, res, next)

    expect(res.status).toHaveBeenCalledWith(207)
  })
})

describe('importCsv', () => {
  it('imports URLs from CSV data', async () => {
    const req = mockReq({
      body: { csv: 'url\nhttps://example.com' },
    })
    const res = mockRes()
    const next = vi.fn()

    mockBulkService.importCsv.mockResolvedValueOnce([
      { success: true, code: 'abc' },
    ])

    await linkController.importCsv(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('returns 207 on partial CSV import failure', async () => {
    const req = mockReq({
      body: { csv: 'url\ninvalid' },
    })
    const res = mockRes()
    const next = vi.fn()

    mockBulkService.importCsv.mockResolvedValueOnce([
      { success: false, error: 'invalid url' },
    ])

    await linkController.importCsv(req, res, next)

    expect(res.status).toHaveBeenCalledWith(207)
  })
})
