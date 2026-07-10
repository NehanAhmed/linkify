import { z } from 'zod'

const urlRegex =
  /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-./?%&=~#@!$'()*+,;:]*)?$/

export const createUrlSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL must be under 2048 characters')
    .refine((val) => urlRegex.test(val), {
      message: 'Invalid URL format',
    })
    .transform((val) => {
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        return `https://${val}`
      }
      return val
    }),
  customCode: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{3,16}$/, 'Custom code must be 3-16 alphanumeric characters')
    .optional(),
})

export const getUrlParamsSchema = z.object({
  code: z.string().min(1, 'Code is required').max(16),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export type CreateUrlInput = z.infer<typeof createUrlSchema>
export type GetUrlParams = z.infer<typeof getUrlParamsSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
