import { env } from './env'

export enum FeatureFlag {
  BulkOperations = 'FEATURE_BULK_OPERATIONS',
  LinkChaining = 'FEATURE_LINK_CHAINING',
  LinkRotation = 'FEATURE_LINK_ROTATION',
  DeepLinking = 'FEATURE_DEEP_LINKING',
  MultiLanguage = 'FEATURE_MULTI_LANGUAGE',
  WebhookSystem = 'FEATURE_WEBHOOK_SYSTEM',
  GraphQL = 'FEATURE_GRAPHQL',
  ScheduledLinks = 'FEATURE_SCHEDULED_LINKS',
  RetentionAnalysis = 'FEATURE_RETENTION_ANALYSIS',
  ExportScheduler = 'FEATURE_EXPORT_SCHEDULER',
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const key = flag as keyof typeof env
  return env[key] === 'enabled'
}

export function getAllFeatureFlags(): Record<string, { enabled: boolean; description: string }> {
  const descriptions: Record<string, string> = {
    BulkOperations: 'Bulk tag, move, extend, delete operations',
    LinkChaining: 'Short link to short link redirects with depth limit',
    LinkRotation: 'A/B testing with weighted traffic distribution',
    DeepLinking: 'Platform-aware mobile vs desktop routing',
    MultiLanguage: 'Accept-Language based redirect routing',
    WebhookSystem: 'Event-driven webhook notifications',
    GraphQL: 'GraphQL API endpoint',
    ScheduledLinks: 'Scheduled activation and expiry timestamps',
    RetentionAnalysis: 'Returning visitor tracking and cohort analysis',
    ExportScheduler: 'Recurring CSV/JSON export to email or S3',
  }

  const flags: Record<string, { enabled: boolean; description: string }> = {}
  for (const [key, value] of Object.entries(FeatureFlag)) {
    flags[key] = {
      enabled: isFeatureEnabled(value as FeatureFlag),
      description: descriptions[key] ?? '',
    }
  }
  return flags
}


