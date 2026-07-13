import { z } from 'zod'

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  parentId: z.number().int().positive().optional(),
}).strict()

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
}).strict()

export const collectionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict()

export const addUrlToCollectionSchema = z.object({
  urlCode: z.string().min(1).max(16),
}).strict()

export const reorderCollectionsSchema = z.array(
  z.object({
    id: z.number().int().positive(),
    sortOrder: z.number().int().min(0),
  }),
).min(1, 'At least one item required')

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>
export type CollectionParams = z.infer<typeof collectionParamsSchema>
export type AddUrlToCollectionInput = z.infer<typeof addUrlToCollectionSchema>
export type ReorderCollectionsInput = z.infer<typeof reorderCollectionsSchema>
