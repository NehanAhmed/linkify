import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'

export function requireScope(...scopes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'))
      return
    }

    // JWT users bypass scope checks entirely
    if (!req.user.apiKeyName) {
      next()
      return
    }

    // API key with null/undefined scopes = full access (legacy keys)
    if (!req.user.scopes || req.user.scopes.length === 0) {
      next()
      return
    }

    // Check the API key has at least one of the required scopes
    const hasScope = scopes.some((s) => req.user!.scopes!.includes(s))
    if (!hasScope) {
      next(new AppError(
        `API key requires one of: ${scopes.join(', ')}`,
        403,
        'FORBIDDEN',
      ))
      return
    }

    next()
  }
}
