import { BLOCKLIST_TLDS, BLOCKLIST_PATTERNS } from '../constants/blocklistDomains'
import { AppError } from '../utils/AppError'
import { lookup as dnsLookup } from 'dns/promises'
import { isIP } from 'net'

export async function validateUrlSafety(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new AppError('Invalid URL', 400)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('Only http and https URLs are allowed', 400)
  }

  const hostname = parsed.hostname.toLowerCase()

  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new AppError('URLs pointing to private networks are not allowed', 400)
    }
    return
  }

  const domain = getETLDPlus1(hostname)
  if (domain && BLOCKLIST_TLDS.has(domain)) {
    throw new AppError('This domain has been blocked for security reasons', 400)
  }

  for (const pattern of BLOCKLIST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new AppError('This URL appears to be suspicious and has been blocked', 400)
    }
  }

  try {
    const addresses = await dnsLookup(hostname, { all: true })
    for (const addr of addresses) {
      if (isPrivateIP(addr.address)) {
        throw new AppError('URLs pointing to private networks are not allowed', 400)
      }
    }
  } catch {
    // DNS lookup failed (NXDOMAIN, network error, etc.)
    // Allow the creation — a non-resolving domain might be temporary or internal
  }
}

function isPrivateIP(ip: string): boolean {
  if (isIP(ip) === 0) return false

  if (ip === '::1') return true

  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false

  if (parts[0] === 10) return true
  if (parts[0] === 127) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true

  return false
}

function getETLDPlus1(hostname: string): string | null {
  const parts = hostname.split('.')
  if (parts.length < 2) return null
  return parts.slice(-2).join('.').toLowerCase()
}
