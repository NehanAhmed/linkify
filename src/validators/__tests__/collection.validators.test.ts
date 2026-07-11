import { describe, it, expect } from 'vitest'
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionParamsSchema,
  addUrlToCollectionSchema,
  reorderCollectionsSchema,
} from '../collection.validators'

describe('createCollectionSchema', () => {
  it('accepts a valid name', () => {
    const result = createCollectionSchema.parse({ name: 'My Links' })
    expect(result.name).toBe('My Links')
  })

  it('rejects empty name', () => {
    expect(() => createCollectionSchema.parse({ name: '' })).toThrow()
  })

  it('rejects name exceeding 100 chars', () => {
    expect(() => createCollectionSchema.parse({ name: 'a'.repeat(101) })).toThrow()
  })

  it('accepts optional parentId', () => {
    const result = createCollectionSchema.parse({ name: 'Child', parentId: 1 })
    expect(result.parentId).toBe(1)
  })

  it('rejects non-positive parentId', () => {
    expect(() => createCollectionSchema.parse({ name: 'Child', parentId: 0 })).toThrow()
    expect(() => createCollectionSchema.parse({ name: 'Child', parentId: -1 })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => createCollectionSchema.parse({ name: 'Test', extra: true })).toThrow()
  })
})

describe('updateCollectionSchema', () => {
  it('accepts partial updates', () => {
    const result = updateCollectionSchema.parse({ name: 'Renamed' })
    expect(result.name).toBe('Renamed')
  })

  it('accepts nullable parentId', () => {
    const result = updateCollectionSchema.parse({ parentId: null })
    expect(result.parentId).toBeNull()
  })

  it('accepts all fields', () => {
    const result = updateCollectionSchema.parse({
      name: 'Updated',
      parentId: 2,
      sortOrder: 1,
    })
    expect(result.name).toBe('Updated')
    expect(result.parentId).toBe(2)
    expect(result.sortOrder).toBe(1)
  })

  it('rejects empty object (no updates provided)', () => {
    const result = updateCollectionSchema.parse({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('rejects unknown fields', () => {
    expect(() => updateCollectionSchema.parse({ unknown: true })).toThrow()
  })
})

describe('collectionParamsSchema', () => {
  it('accepts a valid numeric id', () => {
    const result = collectionParamsSchema.parse({ id: 42 })
    expect(result.id).toBe(42)
  })

  it('coerces string to number', () => {
    const result = collectionParamsSchema.parse({ id: '42' })
    expect(result.id).toBe(42)
  })

  it('rejects non-positive id', () => {
    expect(() => collectionParamsSchema.parse({ id: 0 })).toThrow()
    expect(() => collectionParamsSchema.parse({ id: -1 })).toThrow()
  })
})

describe('addUrlToCollectionSchema', () => {
  it('accepts a valid urlCode', () => {
    const result = addUrlToCollectionSchema.parse({ urlCode: 'abc123' })
    expect(result.urlCode).toBe('abc123')
  })

  it('rejects empty urlCode', () => {
    expect(() => addUrlToCollectionSchema.parse({ urlCode: '' })).toThrow()
  })

  it('rejects overly long urlCode', () => {
    expect(() => addUrlToCollectionSchema.parse({ urlCode: 'a'.repeat(17) })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => addUrlToCollectionSchema.parse({ urlCode: 'abc', extra: true })).toThrow()
  })
})

describe('reorderCollectionsSchema', () => {
  it('accepts an array of id/sortOrder pairs', () => {
    const result = reorderCollectionsSchema.parse([
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 1 },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[0].sortOrder).toBe(0)
  })

  it('rejects empty array', () => {
    expect(() => reorderCollectionsSchema.parse([])).toThrow()
  })

  it('rejects non-positive id', () => {
    expect(() => reorderCollectionsSchema.parse([{ id: 0, sortOrder: 0 }])).toThrow()
  })

  it('rejects negative sortOrder', () => {
    expect(() => reorderCollectionsSchema.parse([{ id: 1, sortOrder: -1 }])).toThrow()
  })
})
