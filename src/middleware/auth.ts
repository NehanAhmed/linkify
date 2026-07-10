import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { AppError } from '../utils/AppError'
import { env } from '../utils/env'
import { db } from '../db'
import { apiKeys } from '../db/schema'
import { eq, or, isNull, gt } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import type { AuthenticatedUser, UserRole } from '../types/auth.types'
import { syncUser } from '../services/auth.services'
import { isIpAllowed } from './ipAllowlist'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    )
  }
  return jwks
}

async function verifyJwt(token: string): Promise<AuthenticatedUser> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `${env.SUPABASE_URL}/auth/v1`,
  })

  const userId = payload.sub!
  const email = payload.email as string | undefined
  const role = (await syncUser(userId, email)) as UserRole
  const aal = payload.aal as 'aal1' | 'aal2' | undefined

  return { id: userId, email, role, aal }
}

async function verifyApiKey(token: string, ip?: string): Promise<AuthenticatedUser> {
  const keys = await db
    .select()
    .from(apiKeys)
    .where(
      or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
    )

  for (const key of keys) {
    const match = await bcrypt.compare(token, key.keyHash)
    if (!match) continue

    if (key.allowedIps && key.allowedIps.length > 0 && ip) {
      if (!isIpAllowed(ip, key.allowedIps)) {
        throw new AppError('Access from this IP is not allowed', 403, 'IP_NOT_ALLOWED')
      }
    }

    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id))
      .catch(() => {})

    const role = await syncUser(key.userId)
    return { id: key.userId, role: role as UserRole, apiKeyName: key.name }
  }

  throw new AppError('Invalid API key', 401, 'AUTH_INVALID_KEY')
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header) {
      throw new AppError('Authorization header required', 401, 'AUTH_HEADER_MISSING')
    }

    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Authorization must be Bearer <token>', 401, 'AUTH_INVALID_FORMAT')
    }

    const isJwt = token.split('.').length === 3
    if (isJwt) {
      req.user = await verifyJwt(token)
    } else {
      req.user = await verifyApiKey(token, req.ip)
    }

    next()
  } catch (err) {
    if (err instanceof AppError) {
      next(err)
      return
    }
    next(new AppError('Invalid or expired token', 401, 'AUTH_INVALID_TOKEN'))
  }
}
