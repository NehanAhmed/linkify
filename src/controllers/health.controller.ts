import type { Request, Response, NextFunction } from 'express'
import { getHealthStatus } from '../services/healthCheckEndpoint'

export async function check(_req: Request, res: Response, _next: NextFunction) {
  const status = await getHealthStatus()
  const httpStatus = status.status === 'ok' ? 200 : 503
  res.status(httpStatus).json({ success: true, data: status })
}
