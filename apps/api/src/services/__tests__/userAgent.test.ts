import { describe, it, expect } from 'vitest'
import { parseUserAgent } from '../userAgent'

describe('parseUserAgent', () => {
  it('parses Chrome on Windows', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )
    expect(result.browser).toBe('Chrome')
    expect(result.os).toBe('Windows')
    expect(result.deviceType).toBe('desktop')
  })

  it('parses Safari on iPhone', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    )
    expect(result.os).toBe('iOS')
    expect(result.deviceType).toBe('mobile')
  })

  it('parses Firefox on Android as mobile', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
    )
    expect(result.deviceType).toBe('mobile')
  })

  it('parses curl as desktop', () => {
    const result = parseUserAgent('curl/8.0')
    expect(result.os).toBeNull()
    expect(result.deviceType).toBe('desktop')
    expect(result.browser).toBeDefined()
  })

  it('returns nulls for undefined UA', () => {
    const result = parseUserAgent(undefined)
    expect(result).toEqual({ deviceType: null, os: null, browser: null, browserVersion: null })
  })

  it('returns nulls for empty string UA', () => {
    const result = parseUserAgent('')
    expect(result).toEqual({ deviceType: null, os: null, browser: null, browserVersion: null })
  })

  it('parses iPadOS as tablet', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    )
    expect(result.os).toBe('iOS')
    expect(['mobile', 'tablet']).toContain(result.deviceType)
  })
})
