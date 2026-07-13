import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', mockFetch)

import { fetchLinkPreview } from '../linkPreview'

beforeEach(() => {
  vi.clearAllMocks()
})

function htmlResponse(html: string) {
  return {
    ok: true,
    text: vi.fn().mockResolvedValue(html),
  }
}

describe('fetchLinkPreview', () => {
  it('extracts og:title, og:description, og:image', async () => {
    const html = `<html><head>
      <meta property="og:title" content="Test Title" />
      <meta property="og:description" content="Test Description" />
      <meta property="og:image" content="https://example.com/image.jpg" />
    </head></html>`
    mockFetch.mockResolvedValueOnce(htmlResponse(html))

    const result = await fetchLinkPreview('https://example.com')
    expect(result.title).toBe('Test Title')
    expect(result.description).toBe('Test Description')
    expect(result.image).toBe('https://example.com/image.jpg')
  })

  it('falls back to <title> when og:title is missing', async () => {
    const html = `<html><head><title>Fallback Title</title></head></html>`
    mockFetch.mockResolvedValueOnce(htmlResponse(html))

    const result = await fetchLinkPreview('https://example.com')
    expect(result.title).toBe('Fallback Title')
    expect(result.description).toBeUndefined()
    expect(result.image).toBeUndefined()
  })

  it('extracts meta description when og:description is missing', async () => {
    const html = `<html><head>
      <meta name="description" content="Meta desc" />
    </head></html>`
    mockFetch.mockResolvedValueOnce(htmlResponse(html))

    const result = await fetchLinkPreview('https://example.com')
    expect(result.description).toBe('Meta desc')
  })

  it('handles meta tags with name attribute for og properties', async () => {
    const html = `<html><head>
      <meta name="og:title" content="Named Title" />
    </head></html>`
    mockFetch.mockResolvedValueOnce(htmlResponse(html))

    const result = await fetchLinkPreview('https://example.com')
    expect(result.title).toBe('Named Title')
  })

  it('handles non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    const result = await fetchLinkPreview('https://example.com')
    expect(result).toEqual({})
  })

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))
    const result = await fetchLinkPreview('https://example.com')
    expect(result).toEqual({})
  })

  it('handles timeout via AbortController', async () => {
    vi.useFakeTimers()
    mockFetch.mockImplementationOnce((_url: string, opts: any) => {
      return new Promise((_, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'))
        })
      })
    })

    const promise = fetchLinkPreview('https://slow.example.com')
    vi.runAllTimers()

    const result = await promise
    expect(result).toEqual({})
    vi.useRealTimers()
  })

  it('decodes HTML entities in extracted values', async () => {
    const html = `<html><head>
      <meta property="og:title" content="Test &amp; Learn &lt;3" />
      <meta property="og:description" content="Quote: &quot;Hello&quot;" />
    </head></html>`
    mockFetch.mockResolvedValueOnce(htmlResponse(html))

    const result = await fetchLinkPreview('https://example.com')
    expect(result.title).toBe('Test & Learn <3')
    expect(result.description).toBe('Quote: "Hello"')
  })

  it('handles reversed property/content order in meta tag', async () => {
    const html = `<html><head>
      <meta content="Reversed Value" property="og:title" />
    </head></html>`
    mockFetch.mockResolvedValueOnce(htmlResponse(html))

    const result = await fetchLinkPreview('https://example.com')
    expect(result.title).toBe('Reversed Value')
  })
})
