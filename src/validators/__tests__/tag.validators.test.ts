import { describe, it, expect } from 'vitest'
import {
  createTagSchema,
  updateTagSchema,
  tagParamsSchema,
  bulkTagSchema,
} from '../tag.validators'

describe('createTagSchema', () => {
  it('accepts a valid name with default color', () => {
    const result = createTagSchema.parse({ name: 'important' })
    expect(result.name).toBe('important')
    expect(result.color).toBe('#6366f1')
  })

  it('accepts a custom valid hex color', () => {
    const result = createTagSchema.parse({ name: 'urgent', color: '#FF0000' })
    expect(result.color).toBe('#FF0000')
  })

  it('accepts lowercase hex color', () => {
    const result = createTagSchema.parse({ name: 'test', color: '#ff0000' })
    expect(result.color).toBe('#ff0000')
  })

  it('rejects empty name', () => {
    expect(() => createTagSchema.parse({ name: '' })).toThrow()
  })

  it('rejects name longer than 50 chars', () => {
    expect(() => createTagSchema.parse({ name: 'a'.repeat(51) })).toThrow()
  })

  it('rejects invalid color format', () => {
    expect(() => createTagSchema.parse({ name: 'x', color: 'red' })).toThrow()
    expect(() => createTagSchema.parse({ name: 'x', color: '#GGGGGG' })).toThrow()
    expect(() => createTagSchema.parse({ name: 'x', color: '#12345' })).toThrow()
    expect(() => createTagSchema.parse({ name: 'x', color: '#1234567' })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => createTagSchema.parse({ name: 'x', extra: true })).toThrow()
  })
})

describe('updateTagSchema', () => {
  it('accepts partial updates', () => {
    const result = updateTagSchema.parse({ name: 'renamed' })
    expect(result.name).toBe('renamed')
  })

  it('accepts only color update', () => {
    const result = updateTagSchema.parse({ color: '#00FF00' })
    expect(result.color).toBe('#00FF00')
  })

  it('accepts empty object (no updates)', () => {
    const result = updateTagSchema.parse({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('rejects invalid color', () => {
    expect(() => updateTagSchema.parse({ color: 'invalid' })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => updateTagSchema.parse({ name: 'x', extra: true })).toThrow()
  })
})

describe('tagParamsSchema', () => {
  it('accepts a valid numeric id', () => {
    const result = tagParamsSchema.parse({ id: 5 })
    expect(result.id).toBe(5)
  })

  it('coerces string to number', () => {
    const result = tagParamsSchema.parse({ id: '5' })
    expect(result.id).toBe(5)
  })

  it('rejects non-positive id', () => {
    expect(() => tagParamsSchema.parse({ id: 0 })).toThrow()
    expect(() => tagParamsSchema.parse({ id: -1 })).toThrow()
  })
})

describe('bulkTagSchema', () => {
  it('accepts valid codes and tagIds', () => {
    const result = bulkTagSchema.parse({
      codes: ['abc123', 'def456'],
      tagIds: [1, 2, 3],
    })
    expect(result.codes).toHaveLength(2)
    expect(result.tagIds).toHaveLength(3)
  })

  it('rejects empty codes', () => {
    expect(() => bulkTagSchema.parse({ codes: [], tagIds: [1] })).toThrow()
  })

  it('rejects more than 100 codes', () => {
    const codes = Array.from({ length: 101 }, (_, i) => `c${i}`)
    expect(() => bulkTagSchema.parse({ codes, tagIds: [1] })).toThrow()
  })

  it('rejects empty tagIds', () => {
    expect(() => bulkTagSchema.parse({ codes: ['abc'], tagIds: [] })).toThrow()
  })

  it('rejects more than 20 tags', () => {
    const tagIds = Array.from({ length: 21 }, (_, i) => i + 1)
    expect(() => bulkTagSchema.parse({ codes: ['abc'], tagIds })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => bulkTagSchema.parse({ codes: ['abc'], tagIds: [1], extra: true })).toThrow()
  })
})
