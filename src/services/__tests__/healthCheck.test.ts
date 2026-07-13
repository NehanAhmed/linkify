import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

import { checkLink } from '../healthCheck'

beforeEach(() => {
  vi.clearAllMocks()
})

function mockResponse(status: number, location?: string) {
  return {
    status,
    headers: new Map(location ? [['location', location]] : []),
    get: vi.fn((name: string) => location && name === 'location' ? location : undefined),
  }
}

describe('checkLink', () => {
  it('returns ok for 200 status', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    const result = await checkLink('https://example.com')
    expect(result).toEqual({ statusCode: 200, ok: true })
  })

  it('returns ok for 301 redirect', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(301, 'https://target.com'))
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    const result = await checkLink('https://example.com')
    expect(result).toEqual({ statusCode: 200, ok: true })
  })

  it('returns not ok for 404', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404))
    const result = await checkLink('https://example.com')
    expect(result).toEqual({ statusCode: 404, ok: false })
  })

  it('follows redirect chain up to 2 hops', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(301, 'https://hop1.com'))
    mockFetch.mockResolvedValueOnce(mockResponse(302, 'https://hop2.com'))
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    const result = await checkLink('https://example.com')
    expect(result).toEqual({ statusCode: 200, ok: true })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('fails after exceeding 2 redirect hops', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(301, 'https://hop1.com'))
    mockFetch.mockResolvedValueOnce(mockResponse(302, 'https://hop2.com'))
    mockFetch.mockResolvedValueOnce(mockResponse(303, 'https://hop3.com'))
    const result = await checkLink('https://example.com')
    expect(result).toEqual({ statusCode: null, ok: false })
  })

  it('uses HEAD method', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200))
    await checkLink('https://example.com')
    expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      method: 'HEAD',
    }))
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ENOTFOUND'))
    const result = await checkLink('https://nonexistent.example.com')
    expect(result).toEqual({ statusCode: null, ok: false })
  })

  it('handles redirect without location header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(302))
    const result = await checkLink('https://example.com')
    expect(result).toEqual({ statusCode: 302, ok: true })
  })

  it('handles 5xx status as not ok', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500))
    const result = await checkLink('https://example.com')
    expect(result).toEqual({ statusCode: 500, ok: false })
  })
})
