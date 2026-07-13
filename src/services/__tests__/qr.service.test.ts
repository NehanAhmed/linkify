import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQrToString = vi.hoisted(() => vi.fn())
const mockQrToBuffer = vi.hoisted(() => vi.fn())
const mockSharp = vi.hoisted(() => vi.fn())
const mockFetch = vi.hoisted(() => vi.fn())

const mockSharpInstance = vi.hoisted(() => ({
  resize: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  toBuffer: vi.fn(),
  metadata: vi.fn(),
  composite: vi.fn().mockReturnThis(),
}))

vi.mock('qrcode', () => ({
  default: { toString: mockQrToString, toBuffer: mockQrToBuffer },
  toString: mockQrToString,
  toBuffer: mockQrToBuffer,
}))

vi.mock('sharp', () => ({ default: mockSharp }))

vi.stubGlobal('fetch', mockFetch)

vi.mock('../../utils/AppError', () => ({
  AppError: class AppError extends Error {
    constructor(public message: string, public statusCode: number, public code?: string) {
      super(message)
    }
  },
}))

import { generateQrCode } from '../qr.service'

beforeEach(() => {
  vi.clearAllMocks()
  mockSharp.mockReturnValue(mockSharpInstance)
})

describe('generateQrCode', () => {
  it('generates SVG QR code', async () => {
    mockQrToString.mockResolvedValueOnce('<svg>...</svg>')
    const result = await generateQrCode('https://example.com', 'svg')
    expect(result).toBe('<svg>...</svg>')
    expect(mockQrToString).toHaveBeenCalledWith('https://example.com', { type: 'svg', margin: 2, width: 512 })
  })

  it('generates PNG QR code', async () => {
    mockQrToBuffer.mockResolvedValueOnce(Buffer.from('png-data'))
    const result = await generateQrCode('https://example.com', 'png')
    expect(result).toEqual(Buffer.from('png-data'))
    expect(mockQrToBuffer).toHaveBeenCalledWith('https://example.com', { type: 'png', margin: 2, width: 512 })
  })

  it('returns SVG with embedded logo when logoUrl provided', async () => {
    mockQrToString.mockResolvedValueOnce('<svg>content</svg>')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValueOnce(Buffer.from('logo-data').buffer),
    })

    const result = await generateQrCode('https://example.com', 'svg', 'https://example.com/logo.png')
    expect(result).toContain('<svg>')
    expect(result).toContain('<image href="data:image/png;base64,')
  })

  it('returns plain SVG when logo embed fails', async () => {
    mockQrToString.mockResolvedValueOnce('<svg>...</svg>')
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'))

    const result = await generateQrCode('https://example.com', 'svg', 'https://example.com/logo.png')
    expect(result).toBe('<svg>...</svg>')
  })

  it('returns PNG with embedded logo when logoUrl provided', async () => {
    const pngBuffer = Buffer.from('png-data')
    mockQrToBuffer.mockResolvedValueOnce(pngBuffer)
    mockSharpInstance.metadata.mockResolvedValue({ width: 512 })
    mockSharpInstance.composite = vi.fn().mockReturnThis()
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('final-png'))
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValueOnce(Buffer.from('logo-data').buffer),
    })

    const result = await generateQrCode('https://example.com', 'png', 'https://example.com/logo.png')
    expect(result).toEqual(Buffer.from('final-png'))
  })

  it('returns plain PNG when logo embed fails in PNG mode', async () => {
    const pngBuffer = Buffer.from('png-data')
    mockQrToBuffer.mockResolvedValueOnce(pngBuffer)
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'))

    const result = await generateQrCode('https://example.com', 'png', 'https://example.com/logo.png')
    expect(result).toEqual(pngBuffer)
  })

  it('defaults to PNG format', async () => {
    mockQrToBuffer.mockResolvedValueOnce(Buffer.from('png-data'))
    const result = await generateQrCode('https://example.com')
    expect(result).toEqual(Buffer.from('png-data'))
  })
})
