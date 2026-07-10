import type { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.services'
import { z } from 'zod'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
})

const resetPasswordSchema = z.object({
  email: z.string().email(),
})

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
})

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = refreshSchema.parse(req.body)
    const tokens = await authService.refreshSupabaseToken(refresh_token)
    res.json({ success: true, data: tokens })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = resetPasswordSchema.parse(req.body)
    const result = await authService.triggerPasswordReset(email)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1)

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

export async function createApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, scopes, expiresAt } = createApiKeySchema.parse(req.body)
    const result = await authService.createApiKey(
      req.user!.id,
      name,
      scopes,
      expiresAt ? new Date(expiresAt) : undefined,
    )
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function listApiKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const keys = await authService.listApiKeys(req.user!.id)
    res.json({ success: true, data: keys })
  } catch (err) {
    next(err)
  }
}

export async function revokeApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params)
    await authService.revokeApiKey(req.user!.id, id)
    res.json({ success: true, message: 'API key revoked' })
  } catch (err) {
    next(err)
  }
}
