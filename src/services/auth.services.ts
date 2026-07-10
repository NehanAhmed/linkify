import { randomBytes } from 'crypto'
import { db } from '../db'
import { users, apiKeys } from '../db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { AppError } from '../utils/AppError'
import { env } from '../utils/env'

export async function syncUser(userId: string, email?: string): Promise<string> {
  const existing = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (existing.length > 0) {
    return existing[0]!.role
  }

  await db
    .insert(users)
    .values({
      id: userId,
      email: email ?? null,
      role: 'user',
    })
    .onConflictDoNothing()

  return 'user'
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
) {
  const raw = `linkify_${randomBytes(32).toString('hex')}`
  const keyHash = await bcrypt.hash(raw, 12)

  await db.insert(apiKeys).values({
    userId,
    keyHash,
    name,
    scopes: scopes ?? null,
    expiresAt: expiresAt ?? null,
  })

  return { key: raw, name }
}

export async function listApiKeys(userId: string) {
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      scopes: apiKeys.scopes,
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
}
