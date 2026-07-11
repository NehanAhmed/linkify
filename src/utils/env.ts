import { z } from 'zod'
import { randomBytes } from 'crypto'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(3000),
  BASE_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('*'),
  SUPABASE_URL: z.string().default('https://pobqjltfdfhbpocjnhbe.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  LINK_ACCESS_SECRET: z.string().default(() => randomBytes(32).toString('hex')),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().int().min(0).default(3_600_000),
  UNIQUE_VISIT_WINDOW_HOURS: z.coerce.number().int().positive().default(24),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SENTRY_DSN: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENCRYPTION_KEY: z.string().default(() => randomBytes(32).toString('hex')),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  CSRF_SECRET: z.string().default(() => randomBytes(32).toString('hex')),
  FINGERPRINT_SECRET: z.string().default(() => randomBytes(32).toString('hex')),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error(`Invalid environment variables: ${result.error.message}`)
    }
    console.error('Invalid environment variables:')
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  return result.data
}

export const env = validateEnv()
export type Env = z.infer<typeof envSchema>
