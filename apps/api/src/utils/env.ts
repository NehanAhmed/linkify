import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(3000),
  BASE_URL: z.string().min(1, 'BASE_URL is required'),
  CORS_ORIGINS: z.string().optional(),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  LINK_ACCESS_SECRET: z.string().min(1, 'LINK_ACCESS_SECRET is required'),
  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY is required'),
  CSRF_SECRET: z.string().min(1, 'CSRF_SECRET is required'),
  FINGERPRINT_SECRET: z.string().min(1, 'FINGERPRINT_SECRET is required'),
  PASSWORD_MAX_AGE_DAYS: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().int().min(0).default(3_600_000),
  UNIQUE_VISIT_WINDOW_HOURS: z.coerce.number().int().positive().default(24),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SENTRY_DSN: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  REDIS_URL: z.string().optional(),
  REDIS_CACHE_TTL: z.coerce.number().int().positive().default(300),
  DATABASE_REPLICA_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_FREE: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  BILLING_SUCCESS_URL: z.string().optional(),
  BILLING_CANCEL_URL: z.string().optional(),
  BILLING_RETURN_URL: z.string().optional(),

  // Feature flags
  FEATURE_BULK_OPERATIONS: z.enum(['enabled', 'disabled']).default('enabled'),
  FEATURE_LINK_CHAINING: z.enum(['enabled', 'disabled']).default('enabled'),
  FEATURE_LINK_ROTATION: z.enum(['enabled', 'disabled']).default('disabled'),
  FEATURE_DEEP_LINKING: z.enum(['enabled', 'disabled']).default('disabled'),
  FEATURE_MULTI_LANGUAGE: z.enum(['enabled', 'disabled']).default('disabled'),
  FEATURE_WEBHOOK_SYSTEM: z.enum(['enabled', 'disabled']).default('disabled'),
  FEATURE_GRAPHQL: z.enum(['enabled', 'disabled']).default('disabled'),
  FEATURE_SCHEDULED_LINKS: z.enum(['enabled', 'disabled']).default('enabled'),
  FEATURE_RETENTION_ANALYSIS: z.enum(['enabled', 'disabled']).default('disabled'),
  FEATURE_EXPORT_SCHEDULER: z.enum(['enabled', 'disabled']).default('disabled'),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.filter(i => i.code === 'invalid_type' && i.message.includes('Required'))
    const other = result.error.issues.filter(i => !(i.code === 'invalid_type' && i.message.includes('Required')))
    if (missing.length > 0) {
      console.error('Missing required environment variables:')
      for (const issue of missing) {
        console.error(`  - ${issue.path.join('.')}`)
      }
    }
    if (other.length > 0) {
      console.error('Invalid environment variables:')
      for (const issue of other) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
      }
    }
    if (process.env.NODE_ENV === 'test') {
      throw new Error(`Invalid environment variables`)
    }
    process.exit(1)
  }
  return result.data
}

let validatedEnv: ReturnType<typeof validateEnv> | null = null

export const env = new Proxy({} as ReturnType<typeof validateEnv>, {
  get(target, prop) {
    if (validatedEnv === null) {
      validatedEnv = validateEnv()
    }
    return Reflect.get(validatedEnv!, prop)
  },
})
export type Env = z.infer<typeof envSchema>
