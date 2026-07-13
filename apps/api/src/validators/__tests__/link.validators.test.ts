import { describe, it, expect } from 'vitest'
import {
  setPasswordSchema,
  verifyPasswordSchema,
  updateLinkSettingsSchema,
  bulkOperationSchema,
  csvImportSchema,
} from '../link.validators'

describe('setPasswordSchema', () => {
  it('accepts a valid password', () => {
    const result = setPasswordSchema.parse({ password: 'my-secret' })
    expect(result.password).toBe('my-secret')
  })

  it('rejects password shorter than 4 chars', () => {
    expect(() => setPasswordSchema.parse({ password: 'ab' })).toThrow()
  })

  it('rejects password longer than 128 chars', () => {
    expect(() => setPasswordSchema.parse({ password: 'a'.repeat(129) })).toThrow()
  })

  it('rejects unknown fields in strict mode', () => {
    expect(() => setPasswordSchema.parse({ password: 'valid', extra: true })).toThrow()
  })
})

describe('verifyPasswordSchema', () => {
  it('accepts a valid password', () => {
    const result = verifyPasswordSchema.parse({ password: 'anything' })
    expect(result.password).toBe('anything')
  })

  it('rejects empty password', () => {
    expect(() => verifyPasswordSchema.parse({ password: '' })).toThrow()
  })
})

describe('updateLinkSettingsSchema', () => {
  it('accepts partial settings', () => {
    const result = updateLinkSettingsSchema.parse({ blockBots: true })
    expect(result.blockBots).toBe(true)
    expect(result.activeAt).toBeUndefined()
    expect(result.expiresAt).toBeUndefined()
  })

  it('accepts all fields', () => {
    const result = updateLinkSettingsSchema.parse({
      activeAt: '2025-01-01T00:00:00.000Z',
      expiresAt: '2026-01-01T00:00:00.000Z',
      password: 'newpass',
      blockBots: true,
    })
    expect(result.activeAt).toBe('2025-01-01T00:00:00.000Z')
    expect(result.expiresAt).toBe('2026-01-01T00:00:00.000Z')
    expect(result.password).toBe('newpass')
  })

  it('accepts nullable dates', () => {
    const result = updateLinkSettingsSchema.parse({ activeAt: null, expiresAt: null })
    expect(result.activeAt).toBeNull()
    expect(result.expiresAt).toBeNull()
  })

  it('rejects non-ISO datetime for activeAt', () => {
    expect(() => updateLinkSettingsSchema.parse({ activeAt: 'not-a-date' })).toThrow()
  })

  it('rejects password shorter than 4 chars', () => {
    expect(() => updateLinkSettingsSchema.parse({ password: 'ab' })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => updateLinkSettingsSchema.parse({ unknown: true })).toThrow()
  })
})

describe('bulkOperationSchema', () => {
  it('accepts a valid tag operation', () => {
    const result = bulkOperationSchema.parse({
      operation: 'tag',
      codes: ['abc123'],
      tagIds: [1, 2],
    })
    expect(result.operation).toBe('tag')
    expect(result.codes).toEqual(['abc123'])
    expect(result.tagIds).toEqual([1, 2])
  })

  it('accepts all operation types', () => {
    for (const op of ['tag', 'move', 'extend', 'delete'] as const) {
      const min = op === 'extend' ? { extendDays: 7 } : op === 'move' ? { collectionId: 1 } : {}
      expect(() => bulkOperationSchema.parse({ operation: op, codes: ['abc'], ...min })).not.toThrow()
    }
  })

  it('rejects invalid operation', () => {
    expect(() => bulkOperationSchema.parse({ operation: 'invalid', codes: ['abc'] })).toThrow()
  })

  it('rejects empty codes', () => {
    expect(() => bulkOperationSchema.parse({ operation: 'tag', codes: [], tagIds: [1] })).toThrow()
  })

  it('rejects more than 100 codes', () => {
    const codes = Array.from({ length: 101 }, (_, i) => `c${i}`)
    expect(() => bulkOperationSchema.parse({ operation: 'delete', codes })).toThrow()
  })

  it('validates extendDays range', () => {
    expect(() => bulkOperationSchema.parse({ operation: 'extend', codes: ['abc'], extendDays: 0 })).toThrow()
    expect(() => bulkOperationSchema.parse({ operation: 'extend', codes: ['abc'], extendDays: 366 })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => bulkOperationSchema.parse({ operation: 'tag', codes: ['abc'], unknown: 1 })).toThrow()
  })
})

describe('csvImportSchema', () => {
  it('accepts valid CSV content', () => {
    const result = csvImportSchema.parse({ csv: 'url,title\nhttps://example.com,Test' })
    expect(result.csv).toBe('url,title\nhttps://example.com,Test')
  })

  it('accepts optional collectionId', () => {
    const result = csvImportSchema.parse({ csv: 'url\nhttps://example.com', collectionId: 5 })
    expect(result.collectionId).toBe(5)
  })

  it('rejects empty CSV', () => {
    expect(() => csvImportSchema.parse({ csv: '' })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => csvImportSchema.parse({ csv: 'a', unknown: true })).toThrow()
  })
})
