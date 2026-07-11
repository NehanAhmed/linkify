# Remaining test gaps

## Services (7 untested)

| File | Risk |
|---|---|
| `src/services/cache.ts` | HIGH — Redis caching layer |
| `src/services/userAgent.ts` | MEDIUM — UA parsing |
| `src/services/geoip.ts` | MEDIUM — Geo lookup |
| `src/services/linkPreview.ts` | LOW — OG meta scraper |
| `src/services/qr.service.ts` | MEDIUM — QR image generation |
| `src/services/healthCheck.ts` | LOW — Link health checker job |
| `src/services/healthCheckEndpoint.ts` | LOW — DB connectivity check |

## Middleware (6 untested)

| File | Risk |
|---|---|
| `src/middleware/auth.ts` | CRITICAL — JWT + API key gate |
| `src/middleware/csrf.ts` | HIGH — CSRF token signing |
| `src/middleware/rateLimiter.ts` | MEDIUM — Rate limiting |
| `src/middleware/requireRole.ts` | MEDIUM — Role guard |
| `src/middleware/requireAAL.ts` | MEDIUM — 2FA level guard |
| `src/middleware/ipAllowlist.ts` | MEDIUM — IP allowlisting |

## Controllers (8 untested)

| File | Risk |
|---|---|
| `src/controllers/url.controllers.ts` | HIGH — Redirect + password + bot blocking |
| `src/controllers/auth.controller.ts` | HIGH — Token refresh, password reset, API keys |
| `src/controllers/link.controller.ts` | MEDIUM — Password ops, bulk ops, CSV import |
| `src/controllers/collection.controller.ts` | MEDIUM — Collection CRUD, share |
| `src/controllers/tag.controller.ts` | MEDIUM — Tag CRUD, bulk tag |
| `src/controllers/qr.controller.ts` | LOW — QR endpoint |
| `src/controllers/health.controller.ts` | LOW — Health endpoint |
| `src/controllers/public.controller.ts` | LOW — Shared collection lookup |

## Routes (7 untested)

| File |
|---|
| `src/routes/url.routes.ts` |
| `src/routes/auth.routes.ts` |
| `src/routes/collection.routes.ts` |
| `src/routes/tag.routes.ts` |
| `src/routes/admin.routes.ts` |
| `src/routes/public.routes.ts` |
| `src/routes/index.ts` |

## App & Infrastructure (5 untested)

| File | Risk |
|---|---|
| `src/app.ts` | Express app assembly |
| `src/index.ts` | Server entry point |
| `src/jobs/healthCheckJob.ts` | MEDIUM — Cron health checker |
| `src/utils/logger.ts` | LOW — Pino config |
| `src/utils/env.ts` | LOW — Zod env validation |

## Integration / E2E

- Zero integration tests. `supertest` is installed but unused.
- `src/test/` directory exists but is empty.
