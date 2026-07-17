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
      LINK_ACCESS_SECRET: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ENCRYPTION_KEY: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      CSRF_SECRET: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      FINGERPRINT_SECRET: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/db/**'],
    },
  },
})
