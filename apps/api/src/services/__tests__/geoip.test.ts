import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLookup = vi.hoisted(() => vi.fn())

vi.mock('geoip-lite', () => ({
  default: { lookup: mockLookup },
  lookup: mockLookup,
}))

import { lookupGeo } from '../geoip'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('lookupGeo', () => {
  it('returns country and city for a public IP', () => {
    mockLookup.mockReturnValueOnce({ country: 'US', city: 'New York', range: [], eu: '0', timezone: '', ll: [], metro: 0, area: 1 })
    const result = lookupGeo('8.8.8.8')
    expect(result.country).toBe('US')
    expect(result.city).toBe('New York')
  })

  it('returns nulls for private IPv4 (10.x.x.x)', () => {
    const result = lookupGeo('10.0.0.1')
    expect(result).toEqual({ country: null, city: null, isp: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns nulls for private IPv4 (192.168.x.x)', () => {
    const result = lookupGeo('192.168.1.1')
    expect(result).toEqual({ country: null, city: null, isp: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns nulls for private IPv4 (172.16.x.x)', () => {
    const result = lookupGeo('172.16.0.1')
    expect(result).toEqual({ country: null, city: null, isp: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns nulls for loopback', () => {
    const result = lookupGeo('127.0.0.1')
    expect(result).toEqual({ country: null, city: null, isp: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns nulls for localhost IPv6', () => {
    const result = lookupGeo('::1')
    expect(result).toEqual({ country: null, city: null, isp: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns nulls for link-local IPv6', () => {
    const result = lookupGeo('fe80::1')
    expect(result).toEqual({ country: null, city: null, isp: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns nulls for undefined IP', () => {
    const result = lookupGeo(undefined)
    expect(result).toEqual({ country: null, city: null, isp: null })
    expect(mockLookup).not.toHaveBeenCalled()
  })

  it('returns nulls when geoip lookup returns null', () => {
    mockLookup.mockReturnValueOnce(null)
    const result = lookupGeo('1.2.3.4')
    expect(result).toEqual({ country: null, city: null, isp: null })
  })

  it('handles lookup error', () => {
    mockLookup.mockImplementationOnce(() => { throw new Error('lookup failed') })
    const result = lookupGeo('1.2.3.4')
    expect(result).toEqual({ country: null, city: null, isp: null })
  })

  it('returns null isp field', () => {
    mockLookup.mockReturnValueOnce({ country: 'GB', city: 'London', range: [], eu: '0', timezone: '', ll: [], metro: 0, area: 1 })
    const result = lookupGeo('1.2.3.4')
    expect(result.isp).toBeNull()
  })
})
