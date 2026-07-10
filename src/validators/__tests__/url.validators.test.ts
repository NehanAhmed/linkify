import { describe, it, expect } from 'vitest'
import {
  createUrlSchema,
  createUrlBulkSchema,
  getUrlParamsSchema,
  paginationSchema,
  listUrlsQuerySchema,
} from '../url.validators'

describe('createUrlSchema', () => {
  it('accepts a valid URL', () => {
    const result = createUrlSchema.parse({ url: 'https://example.com' })
    expect(result.url).toBe('https://example.com/')
  })

  it('rejects empty URL', () => {
    expect(() => createUrlSchema.parse({ url: '' })).toThrow()
  })

  it('prepends https:// when missing', () => {
    const result = createUrlSchema.parse({ url: 'example.com' })
    expect(result.url).toBe('https://example.com/')
  })

  it('accepts optional customCode', () => {
    const result = createUrlSchema.parse({ url: 'https://example.com', customCode: 'my-code' })
    expect(result.customCode).toBe('my-code')
  })

  it('rejects invalid customCode', () => {
    expect(() => createUrlSchema.parse({ url: 'https://example.com', customCode: 'ab' })).toThrow()
    expect(() => createUrlSchema.parse({ url: 'https://example.com', customCode: 'code with spaces' })).toThrow()
  })

  it('rejects excessive TTL', () => {
    expect(() => createUrlSchema.parse({ url: 'https://example.com', ttlDays: 999 })).toThrow()
  })

  it('rejects unknown fields in strict mode', () => {
    expect(() => createUrlSchema.parse({ url: 'https://example.com', unknownField: 'test' })).toThrow()
  })

  it('accepts valid TTL', () => {
    const result = createUrlSchema.parse({ url: 'https://example.com', ttlDays: 30 })
    expect(result.ttlDays).toBe(30)
  })
})

describe('createUrlBulkSchema', () => {
  it('accepts array of URLs', () => {
    const result = createUrlBulkSchema.parse({
      urls: [{ url: 'https://example.com' }, { url: 'https://test.com' }],
    })
    expect(result.urls).toHaveLength(2)
  })

  it('rejects empty array', () => {
    expect(() => createUrlBulkSchema.parse({ urls: [] })).toThrow()
  })

  it('rejects more than 50 URLs', () => {
    const urls = Array.from({ length: 51 }, (_, i) => ({ url: `https://example${i}.com` }))
    expect(() => createUrlBulkSchema.parse({ urls })).toThrow()
  })
})

describe('getUrlParamsSchema', () => {
  it('accepts valid code', () => {
    const result = getUrlParamsSchema.parse({ code: 'abc123' })
    expect(result.code).toBe('abc123')
  })

  it('rejects too short code', () => {
    expect(() => getUrlParamsSchema.parse({ code: 'ab' })).toThrow()
  })
})

describe('paginationSchema', () => {
  it('provides defaults', () => {
    const result = paginationSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
  })

  it('rejects negative page', () => {
    expect(() => paginationSchema.parse({ page: -1 })).toThrow()
  })
})

describe('listUrlsQuerySchema', () => {
  it('parses search query', () => {
    const result = listUrlsQuerySchema.parse({ q: 'example', sortBy: 'visits' })
    expect(result.q).toBe('example')
    expect(result.sortBy).toBe('visits')
  })

  it('rejects unknown fields', () => {
    expect(() => listUrlsQuerySchema.parse({ unknown: true })).toThrow()
  })
})
