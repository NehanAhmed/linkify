import { isIPv4, isIPv6 } from 'node:net'
import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'

function ipv4ToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0
}

function ipv6ToBigInt(ip: string): bigint {
  const zoneIdx = ip.indexOf('%')
  const clean = zoneIdx !== -1 ? ip.slice(0, zoneIdx) : ip
  const parts = clean.split(':')

  const hasDoubleColon = clean.includes('::')
  if (hasDoubleColon) {
    const groups = parts.filter((p) => p !== '')
    const missing = 8 - groups.length
    const expanded: string[] = []
    let filled = false
    for (const p of parts) {
      if (p === '') {
        if (!filled) {
          for (let i = 0; i < missing; i++) expanded.push('0000')
          filled = true
        }
      } else {
        expanded.push(p.padStart(4, '0'))
      }
    }
    const hex = expanded.join('')
    return BigInt(`0x${hex}`)
  }

  const hex = parts.map((p) => p.padStart(4, '0')).join('')
  return BigInt(`0x${hex}`)
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bits = '32'] = cidr.split('/')
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1)
  const ipLong = ipv4ToLong(ip)
  const rangeLong = ipv4ToLong(range!)
  return (ipLong & mask) === (rangeLong & mask)
}

function ipv6InCidr(ip: string, cidr: string): boolean {
  const [range, bits = '128'] = cidr.split('/')
  const prefixLen = parseInt(bits, 10)
  if (prefixLen === 0) return true
  if (prefixLen === 128) return ipv6ToBigInt(ip) === ipv6ToBigInt(range!)
  const hostBits = 128 - prefixLen
  const mask = ~((1n << BigInt(hostBits)) - 1n)
  return (ipv6ToBigInt(ip) & mask) === (ipv6ToBigInt(range!) & mask)
}

export function ipInCidr(ip: string, cidr: string): boolean {
  if (isIPv4(ip)) return ipv4InCidr(ip, cidr)
  if (isIPv6(ip)) return ipv6InCidr(ip, cidr)
  return false
}

export function isIpAllowed(ip: string, allowedIps: string[]): boolean {
  for (const entry of allowedIps) {
    if (entry.includes('/')) {
      if (ipInCidr(ip, entry)) return true
    } else {
      if (ip === entry) return true
    }
  }
  return false
}

export function requireIpAllowlist(allowedIps: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!allowedIps || allowedIps.length === 0) {
      next()
      return
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? ''
    if (!isIpAllowed(ip, allowedIps)) {
      next(new AppError('Access from this IP is not allowed', 403, 'IP_NOT_ALLOWED'))
      return
    }

    next()
  }
}
