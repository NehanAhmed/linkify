import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockDomainService = vi.hoisted(() => ({
  addDomain: vi.fn(),
  listDomains: vi.fn(),
  verifyDomain: vi.fn(),
  removeDomain: vi.fn(),
}))

vi.mock('../../services/domain.service', () => mockDomainService)

import {
  addDomain,
  listDomains,
  verifyDomain,
  removeDomain,
} from '../domain.controller'

function mockReq(overrides: Partial<Request> = {}): Request {
  return { user: { id: 'user-1', role: 'user' }, ...overrides } as Request
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

describe('addDomain', () => {
  it('creates a domain', async () => {
    mockDomainService.addDomain.mockResolvedValue({ id: 1, domain: 'example.com' })
    const req = mockReq({ body: { domain: 'example.com' } })
    const res = mockRes()
    const next = vi.fn()

    await addDomain(req, res, next)

    expect(mockDomainService.addDomain).toHaveBeenCalledWith('user-1', 'example.com')
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, domain: 'example.com' } })
  })

  it('validates domain is required', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    const next = vi.fn()

    await addDomain(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(mockDomainService.addDomain).not.toHaveBeenCalled()
  })
})

describe('listDomains', () => {
  it('lists domains', async () => {
    mockDomainService.listDomains.mockResolvedValue([{ id: 1, domain: 'example.com' }])
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await listDomains(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1, domain: 'example.com' }] })
  })
})

describe('verifyDomain', () => {
  it('verifies a domain', async () => {
    mockDomainService.verifyDomain.mockResolvedValue({ message: 'Domain verified', sslStatus: 'pending' })
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()
    const next = vi.fn()

    await verifyDomain(req, res, next)

    expect(mockDomainService.verifyDomain).toHaveBeenCalledWith('user-1', 1)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { message: 'Domain verified', sslStatus: 'pending' } })
  })
})

describe('removeDomain', () => {
  it('removes a domain', async () => {
    mockDomainService.removeDomain.mockResolvedValue(undefined)
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()
    const next = vi.fn()

    await removeDomain(req, res, next)

    expect(mockDomainService.removeDomain).toHaveBeenCalledWith('user-1', 1)
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Domain removed successfully' })
  })
})
