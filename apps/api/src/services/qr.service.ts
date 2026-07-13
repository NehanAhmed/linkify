import QRCode from 'qrcode'
import sharp from 'sharp'
import { AppError } from '../utils/AppError'

const LOGO_SIZE_RATIO = 0.25
const LOGO_FETCH_TIMEOUT = 3000

export async function generateQrCode(
  url: string,
  format: 'png' | 'svg' = 'png',
  logoUrl?: string,
): Promise<Buffer | string> {
  if (format === 'svg') {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 2, width: 512 })
    if (logoUrl) {
      try {
        return await embedLogoSvg(svg, logoUrl)
      } catch {
        return svg
      }
    }
    return svg
  }

  const pngBuffer = await QRCode.toBuffer(url, { type: 'png', margin: 2, width: 512 })

  if (logoUrl) {
    try {
      return await embedLogoPng(pngBuffer, logoUrl)
    } catch {
      return pngBuffer
    }
  }

  return pngBuffer
}

async function embedLogoPng(qrBuffer: Buffer, logoUrl: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LOGO_FETCH_TIMEOUT)

  let logoBuffer: Buffer
  try {
    const response = await fetch(logoUrl, { signal: controller.signal })
    if (!response.ok) throw new Error('Failed to fetch logo')
    logoBuffer = Buffer.from(await response.arrayBuffer())
  } finally {
    clearTimeout(timeout)
  }

  const qrMeta = await sharp(qrBuffer).metadata()
  const qrSize = qrMeta.width ?? 512
  const logoSize = Math.round(qrSize * LOGO_SIZE_RATIO)

  const resizedLogo = await sharp(logoBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer()

  const offset = Math.round((qrSize - logoSize) / 2)

  return sharp(qrBuffer)
    .composite([{ input: resizedLogo, top: offset, left: offset }])
    .png()
    .toBuffer()
}

async function embedLogoSvg(svg: string, logoUrl: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LOGO_FETCH_TIMEOUT)

  let logoBase64: string
  try {
    const response = await fetch(logoUrl, { signal: controller.signal })
    if (!response.ok) throw new Error('Failed to fetch logo')
    const buffer = Buffer.from(await response.arrayBuffer())
    const ext = logoUrl.match(/\.(png|jpg|jpeg|gif|svg)$/i)?.[1] ?? 'png'
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    logoBase64 = `data:${mime};base64,${buffer.toString('base64')}`
  } finally {
    clearTimeout(timeout)
  }

  const insertBefore = '</svg>'
  const logoSize = 25
  const logoElem = `
  <rect x="${(100 - logoSize) / 2}%" y="${(100 - logoSize) / 2}%" width="${logoSize}%" height="${logoSize}%" fill="white" rx="4"/>
  <image href="${logoBase64}" x="${(100 - logoSize) / 2}%" y="${(100 - logoSize) / 2}%" width="${logoSize}%" height="${logoSize}%" preserveAspectRatio="xMidYMid meet"/>
  `

  return svg.replace(insertBefore, logoElem + insertBefore)
}
