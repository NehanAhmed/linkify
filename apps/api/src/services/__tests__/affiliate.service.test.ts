import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockQb, mockDb, resetQb } = vi.hoisted(() => {
  const qb: Record<string, any> = {}
  const chainable = ['from', 'where', 'limit', 'values', 'set', 'delete', 'innerJoin', 'orderBy']
  for (const m of chainable) qb[m] = vi.fn(() => qb)
  qb.returning = vi.fn().mockResolvedValue([])
  qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
  qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  const db = { select: vi.fn(() => qb), insert: vi.fn(() => qb), update: vi.fn(() => qb), delete: vi.fn(() => qb) }
  function reset() {
    for (const m of Object.keys(qb)) {
      if (typeof qb[m] === 'function' && qb[m].mockReset) qb[m].mockReset()
    }
    for (const m of chainable) qb[m] = vi.fn(() => qb)
    qb.returning = vi.fn().mockResolvedValue([])
    qb.onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
    qb.then = (onfulfilled: any) => Promise.resolve([]).then(onfulfilled)
    qb.catch = (onrejected: any) => Promise.resolve([]).catch(onrejected)
  }
  return { mockQb: qb, mockDb: db, resetQb: reset }
})

vi.mock('../../db', () => ({ db: mockDb, dbReplica: mockDb }))

vi.mock('../../services/subscription.service', () => ({
  getUserPlan: vi.fn(),
}))

import * as affiliateService from '../affiliate.service'
import { getUserPlan } from '../subscription.service'

beforeEach(() => {
  vi.clearAllMocks()
  resetQb()
})

describe('assignAffiliate', () => {
  it('assigns affiliate ID to a URL', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      features: { affiliateLinks: true },
    } as any)
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { userId: 'user-1' },
    ]).then(onfulfilled)

    await affiliateService.assignAffiliate('abc123', 'user-1', 'aff_123', 'amazon')

    expect(mockDb.update).toHaveBeenCalled()
    expect(mockQb.set).toHaveBeenCalledWith(expect.objectContaining({
      affiliateId: 'aff_123',
      affiliateNetwork: 'amazon',
    }))
  })

  it('throws when affiliate links not in plan', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      features: { affiliateLinks: false },
    } as any)

    await expect(affiliateService.assignAffiliate('abc123', 'user-1', 'aff_123')).rejects.toThrow(
      'Affiliate links are not available on your plan',
    )
  })

  it('throws when URL not found', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      features: { affiliateLinks: true },
    } as any)

    await expect(affiliateService.assignAffiliate('nonexistent', 'user-1', 'aff_123')).rejects.toThrow(
      'URL not found',
    )
  })
})

describe('removeAffiliate', () => {
  it('removes affiliate from a URL', async () => {
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { userId: 'user-1' },
    ]).then(onfulfilled)

    await affiliateService.removeAffiliate('abc123', 'user-1')

    expect(mockDb.update).toHaveBeenCalled()
    expect(mockQb.set).toHaveBeenCalledWith(expect.objectContaining({
      affiliateId: null,
      affiliateNetwork: null,
    }))
  })

  it('throws when URL not found', async () => {
    await expect(affiliateService.removeAffiliate('nonexistent', 'user-1')).rejects.toThrow('URL not found')
  })
})

describe('getAffiliateReport', () => {
  it('returns affiliate click report', async () => {
    vi.mocked(getUserPlan).mockResolvedValue({
      features: { affiliateLinks: true },
    } as any)
    mockQb.then = (onfulfilled: any) => Promise.resolve([
      { code: 'abc', url: 'https://example.com', affiliateId: 'aff_123', affiliateNetwork: 'amazon', visitedAt: new Date(), country: 'US', userAgent: 'Mozilla/5.0' },
    ]).then(onfulfilled)

    const result = await affiliateService.getAffiliateReport('user-1', '2026-01-01', '2026-12-31')

    expect(result).toHaveLength(1)
    expect(result[0].affiliateId).toBe('aff_123')
  })
})
