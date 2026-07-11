import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb, resolveFn } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'values', 'set', 'delete', 'orderBy']
  for (const m of chainable) qb[m] = vi.fn(() => qb)
  const resolveFn = vi.fn()
  resolveFn.mockResolvedValue([])
  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  const db = { select: vi.fn(() => qb), insert: vi.fn(() => qb), update: vi.fn(() => qb), delete: vi.fn(() => qb) }
  function reset() {
    resolveFn.mockReset()
    resolveFn.mockResolvedValue([])
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => resolveFn().then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }
  return { mockQb: qb, mockDb: db, resetQb: reset, resolveFn }
})

vi.mock('../../db', () => ({ db: mockDb }))

vi.mock('../../services/subscription.service', () => ({
  getUserPlan: vi.fn(),
}))

import * as domainService from '../domain.service'
import { getUserPlan } from '../subscription.service'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('addDomain', () => {
  it('adds a new domain successfully', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      maxCustomDomains: 5,
    } as any)
    resolveFn.mockResolvedValueOnce([{ total: 0 }])
    resolveFn.mockResolvedValueOnce([])
    mockQb.returning.mockResolvedValue([{
      id: 1,
      domain: 'example.com',
      verificationToken: 'abc123',
      verifiedAt: null,
      sslStatus: 'pending',
      active: false,
      createdAt: new Date(),
    }])

    const result = await domainService.addDomain('user-1', 'Example.com')

    expect(result.domain).toBe('example.com')
    expect(result.dnsRecord).toContain('_linkify-domain-verification')
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('throws when domain limit reached', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      maxCustomDomains: 1,
    } as any)
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { total: 1 },
    ]).then(onfulfilled)

    await expect(domainService.addDomain('user-1', 'example.com')).rejects.toThrow('Custom domain limit reached')
  })

  it('throws when domain already taken', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      maxCustomDomains: 5,
    } as any)
    resolveFn.mockResolvedValueOnce([{ total: 0 }])
    resolveFn.mockResolvedValueOnce([{ id: 1 }])

    await expect(domainService.addDomain('user-1', 'example.com')).rejects.toThrow('Domain already registered')
  })
})

describe('verifyDomain', () => {
  it('verifies a pending domain', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 1, userId: 'user-1', domain: 'example.com', verifiedAt: null, sslStatus: 'pending', active: false, createdAt: new Date() },
    ]).then(onfulfilled)

    const result = await domainService.verifyDomain('user-1', 1)

    expect(result.message).toBe('Domain verified successfully')
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws when domain already verified', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 1, userId: 'user-1', domain: 'example.com', verifiedAt: new Date(), sslStatus: 'pending', active: false, createdAt: new Date() },
    ]).then(onfulfilled)

    await expect(domainService.verifyDomain('user-1', 1)).rejects.toThrow('Domain already verified')
  })

  it('throws when domain not found', async () => {
    await expect(domainService.verifyDomain('user-1', 999)).rejects.toThrow('Domain not found')
  })
})

describe('listDomains', () => {
  it('lists all domains for a user', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 1, domain: 'example.com', verifiedAt: new Date(), sslStatus: 'active', active: true, createdAt: new Date() },
    ]).then(onfulfilled)

    const result = await domainService.listDomains('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].domain).toBe('example.com')
  })

  it('returns empty list when no domains', async () => {
    const result = await domainService.listDomains('user-1')

    expect(result).toHaveLength(0)
  })
})

describe('removeDomain', () => {
  it('removes an owned domain', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { id: 1, userId: 'user-1' },
    ]).then(onfulfilled)

    await domainService.removeDomain('user-1', 1)

    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('throws when domain not found', async () => {
    await expect(domainService.removeDomain('user-1', 999)).rejects.toThrow('Domain not found')
  })
})
