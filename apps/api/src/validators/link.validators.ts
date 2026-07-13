import { z } from 'zod'

export const setPasswordSchema = z.object({
  password: z.string().min(4, 'Password must be at least 4 characters').max(128, 'Password too long'),
}).strict()

export const verifyPasswordSchema = z.object({
  password: z.string().min(1),
}).strict()

export const updateLinkSettingsSchema = z.object({
  activeAt: z.string().datetime({ message: 'activeAt must be an ISO 8601 date' }).optional().nullable(),
  expiresAt: z.string().datetime({ message: 'expiresAt must be an ISO 8601 date' }).optional().nullable(),
  password: z.string().min(4).max(128).optional().nullable(),
  blockBots: z.boolean().optional(),
}).strict()

export const bulkOperationSchema = z.object({
  operation: z.enum(['tag', 'move', 'extend', 'delete']),
  codes: z.array(z.string().min(1).max(16)).min(1, 'At least one code is required').max(100, 'Max 100 codes'),
  tagIds: z.array(z.number().int().positive()).optional(),
  collectionId: z.number().int().positive().optional(),
  extendDays: z.number().int().min(1).max(365).optional(),
}).strict()

export const csvImportSchema = z.object({
  csv: z.string().min(1, 'CSV content is required'),
  collectionId: z.number().int().positive().optional(),
}).strict()

export type SetPasswordInput = z.infer<typeof setPasswordSchema>
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>
export type UpdateLinkSettingsInput = z.infer<typeof updateLinkSettingsSchema>
export type BulkOperationInput = z.infer<typeof bulkOperationSchema>
export type CsvImportInput = z.infer<typeof csvImportSchema>
