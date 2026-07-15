import { z } from 'zod'
import { RESERVED_CODES } from '../constants/reservedWords'

const codeRegex = /^[a-zA-Z0-9_-]{3,16}$/

function isReserved(code: string): boolean {
  return RESERVED_CODES.has(code.toLowerCase())
}

function normalizeUrl(val: string): string {
  val = val.replace(/[\x00-\x1f\x7f]/g, '').trim()
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    val = `https://${val}`
  }
  // Normalize internationalized domain names to Punycode
  try {
    const parsed = new URL(val)
    return parsed.toString()
  } catch {
    return val
  }
}

export const createUrlSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL must be under 2048 characters')
    .transform(normalizeUrl),
  customCode: z
    .string()
    .max(16, 'Custom code must be 16 characters or less')
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
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(128, 'Password too long')
    .optional(),
  activeAt: z
    .string()
    .datetime({ message: 'activeAt must be an ISO 8601 date' })
    .optional(),
  blockBots: z.boolean().optional(),
  qrExpiresAt: z
    .string()
    .datetime({ message: 'qrExpiresAt must be an ISO 8601 date' })
    .optional(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(10, 'Max 10 tags per link')
    .optional(),
  collectionId: z
    .number()
    .int()
    .positive()
    .optional(),
}).strict()

export const createUrlBulkSchema = z.object({
  urls: z
    .array(createUrlSchema)
    .min(1, 'At least one URL is required')
    .max(50, 'Bulk creation is limited to 50 URLs at a time'),
}).strict()

export const getUrlParamsSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(16, 'Code is too long')
    .regex(codeRegex, 'Invalid code format'),
}).strict()

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict()

export const listUrlsQuerySchema = paginationSchema.extend({
  q: z.string().max(256).optional(),
  createdAfter: z.string().datetime({ message: 'createdAfter must be an ISO 8601 date' }).optional(),
  createdBefore: z.string().datetime({ message: 'createdBefore must be an ISO 8601 date' }).optional(),
  minVisits: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'visits', 'code']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  tagIds: z.string().transform((s) => s ? s.split(',').map(Number).filter((n) => !isNaN(n)) : undefined).optional(),
  collectionId: z.coerce.number().int().positive().optional(),
  hasPassword: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
}).strict()

export type CreateUrlInput = z.infer<typeof createUrlSchema>
export type CreateUrlBulkInput = z.infer<typeof createUrlBulkSchema>
export type GetUrlParams = z.infer<typeof getUrlParamsSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type ListUrlsQueryInput = z.infer<typeof listUrlsQuerySchema>
