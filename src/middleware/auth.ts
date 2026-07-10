import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { env } from '../utils/env'

const API_KEY = env.API_KEY

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!API_KEY) {
    next()
    return
  }

  const header = req.headers.authorization
  if (!header) {
    next(new AppError('Authorization header required', 401, 'AUTH_HEADER_MISSING'))
    return
  }

  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    next(new AppError('Authorization must be Bearer <token>', 401, 'AUTH_INVALID_FORMAT'))
    return
  }

  if (token !== API_KEY) {
    next(new AppError('Invalid API key', 401, 'AUTH_INVALID_KEY'))
    return
  }

  next()
}
