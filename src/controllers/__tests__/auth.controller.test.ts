import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockAuthService = vi.hoisted(() => ({
  refreshSupabaseToken: vi.fn(),
  checkRefreshTokenReuse: vi.fn(),
  triggerPasswordReset: vi.fn(),
  getUserDecryptedEmail: vi.fn(),
  createApiKey: vi.fn(),
  updateApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
}))

vi.mock('../../services/auth.services', () => mockAuthService)

vi.mock('../../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
}))

vi.mock('../../middleware/csrf', () => ({
  generateCsrfToken: vi.fn(() => ({ token: 'test-token', signed: 'signed-token' })),
}))

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import * as authController from '../auth.controller'

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
  res.cookie = vi.fn().mockReturnValue(res)
  return res as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCsrfToken', () => {
  it('sets CSRF cookie and returns token', async () => {
    const req = mockReq()
    const res = mockRes()

    await authController.getCsrfToken(req, res)

    expect(res.cookie).toHaveBeenCalledWith('csrf-token', 'signed-token', expect.any(Object))
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { token: 'test-token' } })
  })
})

describe('refreshToken', () => {
  it('refreshes token successfully', async () => {
    const req = mockReq({ body: { refresh_token: 'valid-refresh-token' } })
    const res = mockRes()
    const next = vi.fn()

    mockAuthService.refreshSupabaseToken.mockResolvedValueOnce({
      access_token: 'new-access',
      user: { id: 'user-1' },
    })
    mockAuthService.checkRefreshTokenReuse.mockResolvedValueOnce(undefined)

    await authController.refreshToken(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
    expect(mockAuthService.checkRefreshTokenReuse).toHaveBeenCalled()
  })

  it('passes validation errors to next', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    const next = vi.fn()

    await authController.refreshToken(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

describe('resetPassword', () => {
  it('triggers password reset', async () => {
    const req = mockReq({ body: { email: 'user@test.com' } })
    const res = mockRes()
    const next = vi.fn()

    mockAuthService.triggerPasswordReset.mockResolvedValueOnce({ message: 'Check your email' })

    await authController.resetPassword(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('getUserProfile', () => {
  it('returns user profile with decrypted email', async () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    const mockDb = await import('../../db')
    vi.mocked(mockDb.db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 'user-1', email: 'enc@test.com', role: 'user', createdAt: new Date() }])),
        })),
      })),
    } as any)

    mockAuthService.getUserDecryptedEmail.mockResolvedValueOnce('user@test.com')

    await authController.getUserProfile(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  it('returns 404 when user not found', async () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    const mockDb = await import('../../db')
    vi.mocked(mockDb.db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    } as any)

    await authController.getUserProfile(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('createApiKey', () => {
  it('creates API key', async () => {
    const req = mockReq({ body: { name: 'My Key' } })
    const res = mockRes()
    const next = vi.fn()

    mockAuthService.createApiKey.mockResolvedValueOnce({ id: 1, name: 'My Key', key: 'sk_live_xxx' })

    await authController.createApiKey(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('updateApiKey', () => {
  it('updates API key', async () => {
    const req = mockReq({ params: { id: '1' }, body: { name: 'Updated Key' } })
    const res = mockRes()
    const next = vi.fn()

    mockAuthService.updateApiKey.mockResolvedValueOnce({ id: 1, name: 'Updated Key' })

    await authController.updateApiKey(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('listApiKeys', () => {
  it('lists API keys', async () => {
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    mockAuthService.listApiKeys.mockResolvedValueOnce([{ id: 1, name: 'My Key' }])

    await authController.listApiKeys(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})

describe('revokeApiKey', () => {
  it('revokes API key', async () => {
    const req = mockReq({ params: { id: '1' } })
    const res = mockRes()
    const next = vi.fn()

    mockAuthService.revokeApiKey.mockResolvedValueOnce(undefined)

    await authController.revokeApiKey(req, res, next)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
