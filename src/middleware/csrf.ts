import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { env } from '../utils/env'

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']
const TOKEN_COOKIE = 'csrf-token'
const HEADER_NAME = 'x-csrf-token'
const TOKEN_BYTES = 32

function signToken(token: string): string {
  return createHmac('sha256', env.CSRF_SECRET).update(token).digest('hex')
}

export function generateCsrfToken(): { token: string; signed: string } {
  const token = randomBytes(TOKEN_BYTES).toString('hex')
  const signed = signToken(token)
  return { token, signed }
}

export function validateCsrfToken(token: string, signedCookie: string): boolean {
  const expected = signToken(token)
  if (expected.length !== signedCookie.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signedCookie))
}

export async function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.includes(req.method)) {
    next()
    return
  }

  if (req.headers.authorization?.startsWith('Bearer ')) {
    next()
    return
  }

  const token = req.headers[HEADER_NAME] as string | undefined
  const signedCookie = req.cookies?.[TOKEN_COOKIE] as string | undefined

  if (!token || !signedCookie) {
    res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING',
    })
    return
  }

  if (!validateCsrfToken(token, signedCookie)) {
    res.status(403).json({
      success: false,
      error: 'CSRF token invalid',
      code: 'CSRF_TOKEN_INVALID',
    })
    return
  }

  next()
}
