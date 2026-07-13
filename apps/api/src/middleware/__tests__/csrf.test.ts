import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../../utils/env', () => ({
  env: { CSRF_SECRET: 'test-secret-32-characters-long!!' },
}))

import { generateCsrfToken, validateCsrfToken, csrfProtection } from '../csrf'

function mockReq(method: string, headers: Record<string, string | undefined> = {}, cookies: Record<string, string> = {}): Request {
  return {
    method,
    headers,
    cookies,
  } as unknown as Request
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

describe('generateCsrfToken', () => {
  it('returns token and signed version', () => {
    const result = generateCsrfToken()
    expect(result.token).toBeTruthy()
    expect(result.signed).toBeTruthy()
    expect(result.token.length).toBe(64) // 32 bytes = 64 hex chars
    expect(result.signed).not.toBe(result.token)
  })

  it('produces unique tokens each call', () => {
    const a = generateCsrfToken()
    const b = generateCsrfToken()
    expect(a.token).not.toBe(b.token)
    expect(a.signed).not.toBe(b.signed)
  })
})

describe('validateCsrfToken', () => {
  it('validates a correctly signed token', () => {
    const { token, signed } = generateCsrfToken()
    expect(validateCsrfToken(token, signed)).toBe(true)
  })

  it('rejects a tampered token', () => {
    const { signed } = generateCsrfToken()
    expect(validateCsrfToken('tampered-token', signed)).toBe(false)
  })

  it('rejects tampered signed cookie', () => {
    const { token } = generateCsrfToken()
    expect(validateCsrfToken(token, 'tampered-signature')).toBe(false)
  })
})

describe('csrfProtection', () => {
  it('skips CSRF check for GET requests', () => {
    const req = mockReq('GET')
    const res = mockRes()
    const next = vi.fn()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('skips CSRF check for HEAD requests', () => {
    const req = mockReq('HEAD')
    const res = mockRes()
    const next = vi.fn()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('skips CSRF check for OPTIONS requests', () => {
    const req = mockReq('OPTIONS')
    const res = mockRes()
    const next = vi.fn()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('skips CSRF check for authenticated requests (Bearer token)', () => {
    const req = mockReq('POST', { authorization: 'Bearer some-jwt-token' })
    const res = mockRes()
    const next = vi.fn()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('rejects POST without CSRF token', async () => {
    const req = mockReq('POST', {}, {})
    const res = mockRes()
    const next = vi.fn()

    await csrfProtection(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' }),
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects POST with invalid CSRF token', async () => {
    const { signed } = generateCsrfToken()
    const req = mockReq('POST', { 'x-csrf-token': 'invalid-token' }, { 'csrf-token': signed })
    const res = mockRes()
    const next = vi.fn()

    await csrfProtection(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CSRF_TOKEN_INVALID' }),
    )
  })

  it('passes valid CSRF check', async () => {
    const { token, signed } = generateCsrfToken()
    const req = mockReq('POST', { 'x-csrf-token': token }, { 'csrf-token': signed })
    const res = mockRes()
    const next = vi.fn()

    await csrfProtection(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })
})
