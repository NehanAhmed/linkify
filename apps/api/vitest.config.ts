import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://test@localhost/test',
      NODE_ENV: 'test',
      BASE_URL: 'http://localhost:3000',
      SUPABASE_URL: 'https://test.supabase.co',
      LINK_ACCESS_SECRET: 'test-link-access-secret-not-for-production',
      ENCRYPTION_KEY: 'test-encryption-key-not-for-production-32b',
      CSRF_SECRET: 'test-csrf-secret-not-for-production-32byte',
      FINGERPRINT_SECRET: 'test-fingerprint-secret-not-for-production',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/db/**'],
    },
  },
})
