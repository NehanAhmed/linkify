import { describe, it, expect } from 'vitest'
import { createFingerprint } from '../fingerprint'

describe('createFingerprint', () => {
  it('returns a hex string', () => {
    const fp = createFingerprint('127.0.0.1', 'Mozilla/5.0', 'en-US')
    expect(fp).toMatch(/^[a-f0-9]{64}$/)
  })

  it('produces the same output for the same inputs', () => {
    const fp1 = createFingerprint('192.168.1.1', 'curl/7.0', 'en')
    const fp2 = createFingerprint('192.168.1.1', 'curl/7.0', 'en')
    expect(fp1).toBe(fp2)
  })

  it('produces different output for different inputs', () => {
    const fp1 = createFingerprint('1.2.3.4', 'Mozilla', 'en')
    const fp2 = createFingerprint('5.6.7.8', 'Mozilla', 'en')
    expect(fp1).not.toBe(fp2)
  })

  it('handles null and undefined inputs', () => {
    const fp = createFingerprint(null, undefined, null)
    expect(fp).toMatch(/^[a-f0-9]{64}$/)
  })

  it('produces consistent output for null vs empty string', () => {
    const fp1 = createFingerprint(null, null, null)
    const fp2 = createFingerprint('', '', '')
    expect(fp1).toBe(fp2)
  })

  it('trims whitespace', () => {
    const fp1 = createFingerprint(' 1.2.3.4 ', '  Mozilla  ', ' en ')
    const fp2 = createFingerprint('1.2.3.4', 'Mozilla', 'en')
    expect(fp1).toBe(fp2)
  })

  it('produces different output per missing field', () => {
    const fp1 = createFingerprint('1.2.3.4', 'Mozilla', 'en')
    const fp2 = createFingerprint('1.2.3.4', 'Mozilla', null)
    expect(fp1).not.toBe(fp2)
  })
})
