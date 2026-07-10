import { z } from 'zod'

const colorRegex = /^#[0-9a-fA-F]{6}$/

export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  color: z.string().regex(colorRegex, 'Color must be a valid hex color (e.g. #6366f1)').default('#6366f1'),
}).strict()

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(colorRegex, 'Color must be a valid hex color').optional(),
}).strict()

export const tagParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict()

export const bulkTagSchema = z.object({
  codes: z.array(z.string().min(1).max(16)).min(1, 'At least one code is required').max(100, 'Max 100 codes'),
  tagIds: z.array(z.number().int().positive()).min(1, 'At least one tag is required').max(20, 'Max 20 tags'),
}).strict()

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type TagParams = z.infer<typeof tagParamsSchema>
export type BulkTagInput = z.infer<typeof bulkTagSchema>
