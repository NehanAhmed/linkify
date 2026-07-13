import { describe, it, expect } from 'vitest'
import {
  adminPaginationSchema,
  updateUserRoleSchema,
  auditLogQuerySchema,
  dashboardQuerySchema,
  purgeExpiredSchema,
} from '../admin.validators'

describe('adminPaginationSchema', () => {
  it('accepts valid pagination defaults', () => {
    const result = adminPaginationSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('accepts explicit values', () => {
    const result = adminPaginationSchema.parse({ page: 2, limit: 50 })
    expect(result.page).toBe(2)
    expect(result.limit).toBe(50)
  })

  it('rejects limit over 100', () => {
    expect(() => adminPaginationSchema.parse({ limit: 101 })).toThrow()
  })

  it('rejects non-positive page', () => {
    expect(() => adminPaginationSchema.parse({ page: 0 })).toThrow()
  })
})

describe('updateUserRoleSchema', () => {
  it('accepts valid role', () => {
    const result = updateUserRoleSchema.parse({ role: 'admin' })
    expect(result.role).toBe('admin')
  })

  it('accepts user role', () => {
    const result = updateUserRoleSchema.parse({ role: 'user' })
    expect(result.role).toBe('user')
  })

  it('rejects invalid role', () => {
    expect(() => updateUserRoleSchema.parse({ role: 'superadmin' })).toThrow()
  })

  it('rejects missing role', () => {
    expect(() => updateUserRoleSchema.parse({})).toThrow()
  })
})

describe('auditLogQuerySchema', () => {
  it('accepts defaults', () => {
    const result = auditLogQuerySchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.action).toBeUndefined()
    expect(result.userId).toBeUndefined()
  })

  it('accepts filters', () => {
    const result = auditLogQuerySchema.parse({ action: 'url.created', userId: 'user-1' })
    expect(result.action).toBe('url.created')
    expect(result.userId).toBe('user-1')
  })
})

describe('dashboardQuerySchema', () => {
  it('accepts default days', () => {
    const result = dashboardQuerySchema.parse({})
    expect(result.days).toBe(30)
  })

  it('accepts custom days', () => {
    const result = dashboardQuerySchema.parse({ days: 7 })
    expect(result.days).toBe(7)
  })

  it('rejects days over 365', () => {
    expect(() => dashboardQuerySchema.parse({ days: 366 })).toThrow()
  })
})

describe('purgeExpiredSchema', () => {
  it('accepts default daysOld', () => {
    const result = purgeExpiredSchema.parse({})
    expect(result.daysOld).toBe(30)
  })

  it('accepts custom daysOld', () => {
    const result = purgeExpiredSchema.parse({ daysOld: 60 })
    expect(result.daysOld).toBe(60)
  })

  it('rejects daysOld over 365', () => {
    expect(() => purgeExpiredSchema.parse({ daysOld: 1000 })).toThrow()
  })
})
