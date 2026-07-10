import { z } from 'zod'
import { RESERVED_CODES } from '../constants/reservedWords'

const codeRegex = /^[a-zA-Z0-9_-]{3,16}$/

function isReserved(code: string): boolean {
  return RESERVED_CODES.has(code.toLowerCase())
}

export const createUrlSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL must be under 2048 characters')
    .trim()
    .transform((val) => {
      val = val.replace(/[\x00-\x1f\x7f]/g, '')
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        return `https://${val}`
      }
      return val
    }),
  customCode: z
    .string()
    .regex(codeRegex, 'Custom code must be 3-16 alphanumeric characters (letters, numbers, hyphens, underscores)')
    .refine((code) => !isReserved(code), {
      message: 'This code is reserved and cannot be used',
    })
    .optional(),
  ttlDays: z
    .number()
    .int('TTL must be a whole number')
    .min(1, 'TTL must be at least 1 day')
    .max(365, 'TTL cannot exceed 365 days')
    .optional(),
})

export const createUrlBulkSchema = z.object({
  urls: z
    .array(createUrlSchema)
    .min(1, 'At least one URL is required')
    .max(50, 'Bulk creation is limited to 50 URLs at a time'),
})

export const getUrlParamsSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(16, 'Code is too long')
    .regex(codeRegex, 'Invalid code format'),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const statsQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', 'all']).default('7d'),
})

export type CreateUrlInput = z.infer<typeof createUrlSchema>
export type CreateUrlBulkInput = z.infer<typeof createUrlBulkSchema>
export type GetUrlParams = z.infer<typeof getUrlParamsSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type StatsQueryInput = z.infer<typeof statsQuerySchema>
