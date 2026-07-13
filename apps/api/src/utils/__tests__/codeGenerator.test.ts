import { describe, it, expect } from 'vitest'
import { generateShortCode } from '../codeGenerator'

describe('generateShortCode', () => {
  it('generates a 7-character code by default', () => {
    const code = generateShortCode()
    expect(code).toHaveLength(7)
  })

  it('generates a code with specified length', () => {
    const code = generateShortCode(12)
    expect(code).toHaveLength(12)
  })

  it('generates alphanumeric codes', () => {
    const code = generateShortCode()
    expect(code).toMatch(/^[a-zA-Z0-9]+$/)
  })

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateShortCode()))
    expect(codes.size).toBe(100)
  })
})
