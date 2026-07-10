import geoip from 'geoip-lite'

export interface GeoResult {
  country: string | null
  city: string | null
  isp: null
}

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
]

function isPrivateIP(ip: string): boolean {
  return PRIVATE_RANGES.some((range) => range.test(ip))
}

export function lookupGeo(ip: string | undefined): GeoResult {
  if (!ip || isPrivateIP(ip)) {
    return { country: null, city: null, isp: null }
  }

  try {
    const result = geoip.lookup(ip)
    if (!result) {
      return { country: null, city: null, isp: null }
    }
    return {
      country: result.country ?? null,
      city: result.city ?? null,
      isp: null,
    }
  } catch {
    return { country: null, city: null, isp: null }
  }
}
