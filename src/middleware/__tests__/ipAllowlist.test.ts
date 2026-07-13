import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { ipInCidr, isIpAllowed, requireIpAllowlist } from '../ipAllowlist'
import { AppError } from '../../utils/AppError'

function mockReq(ip?: string): Request {
  return { ip, socket: { remoteAddress: undefined } } as unknown as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('ipInCidr', () => {
  it('matches exact IPv4', () => {
    expect(ipInCidr('192.168.1.1', '192.168.1.1/32')).toBe(true)
  })

  it('matches IPv4 within /24 range', () => {
    expect(ipInCidr('192.168.1.50', '192.168.1.0/24')).toBe(true)
  })

  it('rejects IPv4 outside range', () => {
    expect(ipInCidr('192.168.2.1', '192.168.1.0/24')).toBe(false)
  })

  it('matches IPv4 with /16', () => {
    expect(ipInCidr('10.0.5.100', '10.0.0.0/16')).toBe(true)
    expect(ipInCidr('10.1.5.100', '10.0.0.0/16')).toBe(false)
  })

  it('matches IPv6 with /64', () => {
    expect(ipInCidr('::1', '::1/128')).toBe(true)
  })

  it('matches IPv6 within /64 range', () => {
    expect(ipInCidr('2001:db8::1', '2001:db8::/64')).toBe(true)
  })

  it('rejects IPv6 outside range', () => {
    expect(ipInCidr('2001:db9::1', '2001:db8::/64')).toBe(false)
  })

  it('returns false for invalid IP', () => {
    expect(ipInCidr('invalid', '10.0.0.0/8')).toBe(false)
  })

  it('handles /0 CIDR as match-all', () => {
    expect(ipInCidr('1.2.3.4', '0.0.0.0/0')).toBe(true)
  })
})

describe('isIpAllowed', () => {
  it('allows exact IP match', () => {
    expect(isIpAllowed('10.0.0.1', ['10.0.0.1'])).toBe(true)
  })

  it('allows IP in CIDR range', () => {
    expect(isIpAllowed('10.0.0.50', ['10.0.0.0/24'])).toBe(true)
  })

  it('rejects IP not in list', () => {
    expect(isIpAllowed('10.0.1.1', ['10.0.0.0/24'])).toBe(false)
  })

  it('rejects IP not matching any entry', () => {
    expect(isIpAllowed('1.2.3.4', ['10.0.0.1', '192.168.1.0/24'])).toBe(false)
  })

  it('allows IP matching mixed list', () => {
    expect(isIpAllowed('192.168.1.50', ['10.0.0.1', '192.168.1.0/24'])).toBe(true)
  })
})

describe('requireIpAllowlist', () => {
  it('passes when IP is allowed', () => {
    const req = mockReq('10.0.0.1')
    const res = mockRes()
    const next = vi.fn()

    requireIpAllowlist(['10.0.0.1'])(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('blocks when IP is not allowed', () => {
    const req = mockReq('1.2.3.4')
    const res = mockRes()
    const next = vi.fn()

    requireIpAllowlist(['10.0.0.0/8'])(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(AppError))
    expect(next.mock.calls[0][0].statusCode).toBe(403)
    expect(next.mock.calls[0][0].code).toBe('IP_NOT_ALLOWED')
  })

  it('passes when allowlist is empty', () => {
    const req = mockReq('1.2.3.4')
    const res = mockRes()
    const next = vi.fn()

    requireIpAllowlist([])(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('passes when allowlist is undefined', () => {
    const req = mockReq('1.2.3.4')
    const res = mockRes()
    const next = vi.fn()

    requireIpAllowlist([])(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('falls back to socket.remoteAddress when req.ip is missing', () => {
    const req = { socket: { remoteAddress: '10.0.0.1' } } as unknown as Request
    const res = mockRes()
    const next = vi.fn()

    requireIpAllowlist(['10.0.0.1'])(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })
})
