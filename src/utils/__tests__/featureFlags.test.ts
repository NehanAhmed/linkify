import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockEnv = vi.hoisted(() => ({
  FEATURE_BULK_OPERATIONS: 'enabled',
  FEATURE_LINK_CHAINING: 'enabled',
  FEATURE_LINK_ROTATION: 'disabled',
  FEATURE_DEEP_LINKING: 'disabled',
  FEATURE_MULTI_LANGUAGE: 'disabled',
  FEATURE_WEBHOOK_SYSTEM: 'disabled',
  FEATURE_GRAPHQL: 'disabled',
  FEATURE_SCHEDULED_LINKS: 'enabled',
  FEATURE_RETENTION_ANALYSIS: 'disabled',
  FEATURE_EXPORT_SCHEDULER: 'disabled',
}))

vi.mock('../env', () => ({ env: mockEnv }))

import { FeatureFlag, isFeatureEnabled, getAllFeatureFlags } from '../featureFlags'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isFeatureEnabled', () => {
  it('returns true for enabled flags', () => {
    expect(isFeatureEnabled(FeatureFlag.BulkOperations)).toBe(true)
    expect(isFeatureEnabled(FeatureFlag.LinkChaining)).toBe(true)
    expect(isFeatureEnabled(FeatureFlag.ScheduledLinks)).toBe(true)
  })

  it('returns false for disabled flags', () => {
    expect(isFeatureEnabled(FeatureFlag.LinkRotation)).toBe(false)
    expect(isFeatureEnabled(FeatureFlag.DeepLinking)).toBe(false)
    expect(isFeatureEnabled(FeatureFlag.MultiLanguage)).toBe(false)
    expect(isFeatureEnabled(FeatureFlag.WebhookSystem)).toBe(false)
    expect(isFeatureEnabled(FeatureFlag.GraphQL)).toBe(false)
    expect(isFeatureEnabled(FeatureFlag.RetentionAnalysis)).toBe(false)
    expect(isFeatureEnabled(FeatureFlag.ExportScheduler)).toBe(false)
  })
})

describe('getAllFeatureFlags', () => {
  it('returns all flags with correct shape', () => {
    const flags = getAllFeatureFlags()

    expect(Object.keys(flags)).toHaveLength(10)
    expect(flags.BulkOperations).toEqual({ enabled: true, description: expect.any(String) })
    expect(flags.LinkRotation).toEqual({ enabled: false, description: expect.any(String) })
    expect(flags.ExportScheduler).toEqual({ enabled: false, description: expect.any(String) })
  })

  it('includes descriptions for every flag', () => {
    const flags = getAllFeatureFlags()

    for (const [, value] of Object.entries(flags)) {
      expect(value.description).toBeTruthy()
    }
  })
})


