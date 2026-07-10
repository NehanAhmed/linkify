import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000
const generalMax = Number(process.env.RATE_LIMIT_MAX) || 100

const standardKey = (req: Request) => req.ip ?? 'unknown'

export const generalLimiter = rateLimit({
  windowMs,
  max: generalMax,
  keyGenerator: standardKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
})

export const strictLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: standardKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
})

export const bulkLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: standardKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
})
