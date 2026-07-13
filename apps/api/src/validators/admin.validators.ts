import { z } from 'zod'

export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
})

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  action: z.string().optional(),
  userId: z.string().optional(),
})

export const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
})

export const purgeExpiredSchema = z.object({
  daysOld: z.coerce.number().int().positive().max(365).default(30),
})

export type AdminPaginationInput = z.infer<typeof adminPaginationSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>
export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>
export type PurgeExpiredInput = z.infer<typeof purgeExpiredSchema>
