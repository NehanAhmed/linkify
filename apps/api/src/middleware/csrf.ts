import { doubleCsrf } from 'csrf-csrf'
import type { Request, Response, NextFunction } from 'express'
import { env } from '../utils/env'

const CSRF_COOKIE_NAME = env.NODE_ENV === 'production'
  ? '__Host-linkify.x-csrf-token'
  : 'linkify.x-csrf-token'

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.headers['user-agent'] ?? 'unknown',
  cookieName: CSRF_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/',
  },
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => {
    const token = req.headers['x-csrf-token'] as string | undefined
    return token ?? null
  },
  skipCsrfProtection: (req) => {
    return !!req.headers.authorization?.startsWith('Bearer ')
  },
})

export function csrfTokenHandler(req: Request, res: Response) {
  const token = generateCsrfToken(req, res)
  res.json({ success: true, data: { token } })
}

export { doubleCsrfProtection as csrfProtection }
