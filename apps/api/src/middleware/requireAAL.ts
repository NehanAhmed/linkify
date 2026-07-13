import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'

export function requireAAL() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'))
      return
    }
    if (req.user.aal !== 'aal2') {
      next(new AppError('Two-factor authentication required', 403, 'AAL2_REQUIRED'))
      return
    }
    next()
  }
}
