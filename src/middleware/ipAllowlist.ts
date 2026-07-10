import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'

function ipv4ToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits = '32'] = cidr.split('/')
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1)
  const ipLong = ipv4ToLong(ip)
  const rangeLong = ipv4ToLong(range!)
  return (ipLong & mask) === (rangeLong & mask)
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
