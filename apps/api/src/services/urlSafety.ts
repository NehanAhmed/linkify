import { BLOCKLIST_DOMAINS, BLOCKLIST_PATTERNS } from '../constants/blocklistDomains'
import { AppError } from '../utils/AppError'
import { lookup as dnsLookup } from 'dns/promises'
import { isIP, isIPv4, isIPv6 } from 'net'
import { getDomain } from 'tldts'

const IPv4_PRIVATE_RANGES = [
  { start: [10, 0, 0, 0], end: [10, 255, 255, 255] },
  { start: [127, 0, 0, 0], end: [127, 255, 255, 255] },
  { start: [169, 254, 0, 0], end: [169, 254, 255, 255] },
  { start: [172, 16, 0, 0], end: [172, 31, 255, 255] },
  { start: [192, 168, 0, 0], end: [192, 168, 255, 255] },
]

function ipv4InRanges(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false
  for (const range of IPv4_PRIVATE_RANGES) {
    if (
      parts[0]! >= range.start[0]! && parts[0]! <= range.end[0]! &&
      parts[1]! >= range.start[1]! && parts[1]! <= range.end[1]! &&
      parts[2]! >= range.start[2]! && parts[2]! <= range.end[2]! &&
      parts[3]! >= range.start[3]! && parts[3]! <= range.end[3]!
    ) return true
  }
  return false
}

function ipv6InPrivateRange(ip: string): boolean {
  const normalized = ip.toLowerCase()

  // Loopback ::1
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true

  // IPv4-mapped IPv6 (::ffff:0:0/96) — check the embedded IPv4
  const v4mappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4mappedMatch) {
    return ipv4InRanges(v4mappedMatch[1]!)
  }

  // Unique Local Address fc00::/7
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true

  // Link-Local fe80::/10
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb')) return true

  return false
}

function isPrivateIP(ip: string): boolean {
  if (isIP(ip) === 0) return false
  if (isIPv4(ip)) return ipv4InRanges(ip)
  if (isIPv6(ip)) return ipv6InPrivateRange(ip)
  return false
}

export async function validateUrlSafety(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new AppError('Invalid URL', 400, 'INVALID_URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('Only http and https URLs are allowed', 400, 'INVALID_PROTOCOL')
  }

  const hostname = parsed.hostname.toLowerCase()

  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new AppError('URLs pointing to private networks are not allowed', 400, 'PRIVATE_IP')
    }
    return
  }

  const domain = getDomain(hostname)
  if (domain && BLOCKLIST_DOMAINS.has(domain)) {
    throw new AppError('This domain has been blocked for security reasons', 400, 'BLOCKED_DOMAIN')
  }

  for (const pattern of BLOCKLIST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new AppError('This URL appears to be suspicious and has been blocked', 400, 'SUSPICIOUS_URL')
    }
  }

  try {
    const addresses = await dnsLookup(hostname, { all: true })
    for (const addr of addresses) {
      if (isPrivateIP(addr.address)) {
        throw new AppError('URLs pointing to private networks are not allowed', 400, 'PRIVATE_IP')
      }
    }
  } catch {
    // DNS lookup failed (NXDOMAIN, network error, etc.)
    // Allow the creation — a non-resolving domain might be temporary or internal
  }
}
