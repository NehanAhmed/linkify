import { z } from 'zod'

export const qrQuerySchema = z.object({
  format: z.enum(['png', 'svg']).default('png'),
  logo: z.string().optional(),
})

export const regenerateQrSchema = z.object({
  expiresAt: z.string().datetime({ message: 'expiresAt must be an ISO 8601 date' }),
}).strict()

export type RegenerateQrInput = z.infer<typeof regenerateQrSchema>
