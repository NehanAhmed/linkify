import { randomBytes, createHash } from 'crypto'
import { db } from '../db'
import { users, apiKeys, refreshTokens } from '../db/schema'
import { eq, and, isNull, gt } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { AppError } from '../utils/AppError'
import { env } from '../utils/env'
import { encrypt, decrypt } from '../utils/encryption'
import { logAction } from './audit.service'

export async function syncUser(userId: string, email?: string): Promise<string> {
  const existing = await db
    .select({ role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (existing.length > 0) {
    if (email && email !== existing[0]!.email) {
      const encryptedEmail = encrypt(email)
      await db.update(users).set({ email: encryptedEmail }).where(eq(users.id, userId))
    }
    return existing[0]!.role
  }

  const encryptedEmail = email ? encrypt(email) : null

  await db
    .insert(users)
    .values({
      id: userId,
      email: encryptedEmail,
      role: 'user',
    })
    .onConflictDoNothing()

  return 'user'
}

export async function getUserDecryptedEmail(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user || !user.email) return null

  try {
    return decrypt(user.email)
  } catch {
    return user.email
  }
}

export async function refreshSupabaseToken(refreshToken: string) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new AppError(
      (error as any).error_description ?? 'Failed to refresh token',
      401,
      'TOKEN_REFRESH_FAILED',
    )
  }

  return response.json()
}

export async function checkRefreshTokenReuse(userId: string, refreshToken: string, ip?: string | null) {
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex')

  const [existing] = await db
    .select({ id: refreshTokens.id })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1)

  if (existing) {
    await logAction(
      userId,
      'auth.refresh_token_reuse',
      'refresh_token',
      undefined,
      undefined,
      ip,
    )

    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))

    return false
  }

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
  })

  return true
}

export async function triggerPasswordReset(email: string) {
  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/recover`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      },
      body: JSON.stringify({ email }),
    },
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new AppError(
      (error as any).error_description ?? 'Failed to send password reset email',
      400,
      'PASSWORD_RESET_FAILED',
    )
  }

  return { message: 'Password reset email sent' }
}

export async function createApiKey(
  userId: string,
  name: string,
  scopes?: string[],
  expiresAt?: Date,
  allowedIps?: string[],
) {
  const raw = `linkify_${randomBytes(32).toString('hex')}`
  const keyHash = await bcrypt.hash(raw, 12)

  const [result] = await db.insert(apiKeys).values({
    userId,
    keyHash,
    name,
    scopes: scopes ?? null,
    allowedIps: allowedIps ?? null,
    expiresAt: expiresAt ?? null,
  }).returning({ id: apiKeys.id })

  await logAction(
    userId,
    'api_key.created',
    'api_key',
    String(result!.id),
    { name },
  )

  return { key: raw, name, id: result!.id }
}

export async function updateApiKey(
  userId: string,
  keyId: number,
  updates: {
    name?: string
    scopes?: string[]
    allowedIps?: string[]
    expiresAt?: Date | null
  },
) {
  const [existing] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1)

  if (!existing) {
    throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND')
  }
  if (existing.userId !== userId) {
    throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND')
  }

  const setValues: Record<string, unknown> = {}
  if (updates.name !== undefined) setValues.name = updates.name
  if (updates.scopes !== undefined) setValues.scopes = updates.scopes
  if (updates.allowedIps !== undefined) setValues.allowedIps = updates.allowedIps
  if (updates.expiresAt !== undefined) setValues.expiresAt = updates.expiresAt

  if (Object.keys(setValues).length > 0) {
    await db.update(apiKeys).set(setValues).where(eq(apiKeys.id, keyId))
  }

  await logAction(
    userId,
    'api_key.updated',
    'api_key',
    String(keyId),
    updates,
  )

  return { id: keyId }
}

export async function listApiKeys(userId: string) {
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      scopes: apiKeys.scopes,
      allowedIps: apiKeys.allowedIps,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(apiKeys.createdAt)

  return keys
}

export async function revokeApiKey(userId: string, keyId: number) {
  const [existing] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .limit(1)

  if (!existing) {
    throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND')
  }

  if (existing.userId !== userId) {
    throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND')
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId))

  await logAction(
    userId,
    'api_key.revoked',
    'api_key',
    String(keyId),
  )
}
