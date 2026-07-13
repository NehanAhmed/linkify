import rateLimit from 'express-rate-limit'
import type { Request } from 'express'
import { env } from '../utils/env'

const windowMs = env.RATE_LIMIT_WINDOW_MS
const generalMax = env.RATE_LIMIT_MAX

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

export const passwordLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req) => `${req.ip ?? 'unknown'}:${req.params.code ?? 'unknown'}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many password attempts, please try again later' },
})

export const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  keyGenerator: standardKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
})
