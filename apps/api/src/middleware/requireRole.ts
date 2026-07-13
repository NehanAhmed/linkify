import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import type { UserRole } from '../types/auth.types'

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'))
      return
    }
    next()
  }
}
