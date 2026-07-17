# Linkify API — Audit Report

**Audit date:** 2026-07-17
**Scope:** `apps/api/` (Express 5 + TypeScript backend)
**Method:** Line-by-line source review + full build/test run + cross-referencing deps, env, routes, docs

---

## Summary

| Metric | Result |
|---|---|
| Typecheck | 0 errors |
| Build | Passed |
| Tests | 639 passed (64 files) |
| Security issues | 3 critical, 2 high, 2 medium |
| Documentation errors | 3 |
| Dead code paths | 3 |

---

## 🔴 Critical

### C‑1. CSRF protection described in docs, absent from code

`docs/API.md` describes a `GET /api/auth/csrf-token` endpoint, a `CSRF_COOKIE_NAME` constant, and states that mutation endpoints require an `X-CSRF-Token` header. **None of this exists in the source.**

- `grep -r "csrf" apps/api/src/` returns zero results.
- No `csrf-csrf`, `csrf`, or `lusca` package in `package.json`.
- `src/routes/auth.routes.ts` has no `GET /csrf-token` route.
- Cookie-parsing middleware is present (`cookieParser()` in `app.ts`) but no CSRF token is ever generated or validated.
- The docs describe `CSRF_COOKIE_NAME=__Host-linkify.x-csrf-token` and `CSRF_COOKIE_SECRET` env vars — neither is defined in `src/utils/env.ts` or `.env.example`.

**Impact:** Every mutation endpoint (`POST/PUT/PATCH/DELETE /api/*`) is unprotected against cross-site request forgery. An attacker can trick a logged-in user into performing actions from an external site.

**Fix:** Install `csrf-csrf`, add `CSRF_SECRET` to `env.ts`, generate token on `GET /api/auth/csrf-token`, validate on all mutation routes (or via a middleware applied to the router).

---

### C‑2. Three required env vars missing from `.env.example`

Three variables that will crash the server on startup are absent from `apps/api/.env.example`:

| Variable | Code path | Why required |
|---|---|---|
| `ENCRYPTION_KEY` | `env.ts` — `encryptionKey()` calls `z.string().min(1)` | Unlocks password-protected links |
| `LINK_ACCESS_SECRET` | `env.ts` — `linkAccessSecret()` calls `z.string().min(1)` | Signs link access tokens |
| `FINGERPRINT_SECRET` | `env.ts` — `fingerprintSecret()` calls `z.string().min(1)` | Signs anonymous fingerprints |

**Impact:** A new developer cloning the repo will hit a runtime crash configuring these. The `.env.example` is the onboarding contract — every `process.env` variable the code expects must appear there.

**Fix:** Add all three to `apps/api/.env.example`.

---

### C‑3. `generalLimiter` defined but never mounted

`src/middleware/rateLimiter.ts` exports `generalLimiter` (100 req / 15 min), but it is **never imported or mounted** in `app.ts` or any route file.

```typescript
// rateLimiter.ts — defined
export const generalLimiter = rateLimit({ ... })

// app.ts — only these limiters are mounted:
//   authLimiter   → /api/auth/*
//   shortLimiter  → POST /api/urls/shorten (via getRateLimiter)
//   redirectLimiter → /:code
```

`docs/API.md` states "General — 100 requests per 15 minutes per IP" is applied to all `/api/*` endpoints.

**Impact:** API endpoints outside `auth/*` and `urls/shorten` (like link management, analytics, admin) have no request rate limiting configured.

**Fix:** `app.use('/api', generalLimiter)` before the routes are mounted, unless a route specifies its own tighter limiter.

---

## 🟠 High

### H‑1. Feature flags defined but never checked in application code

`src/utils/featureFlags.ts` defines a `FeatureFlag` enum with 10 entries (`LINK_SHORTENING`, `QR_CODE_GENERATION`, `ANALYTICS`, etc.), and provides `isFeatureEnabled(db, flag)`. The flags are stored via `GET /api/admin/feature-flags` and validated against `FEATURE_FLAGS_SCHEMA`.

However, `isFeatureEnabled()` is never called by any route handler, service, middleware, or controller. The only code path consuming it is `getAllFeatureFlags()` for the admin list endpoint.

**Impact:** Feature flags are write-only. Rolling out a feature flag has zero effect on application behavior. A feature flag system with no enforcement provides a false sense of control.

**Evidence:**
```bash
grep -rn "isFeatureEnabled" apps/api/src/  → only the definition file and getAllFeatureFlags
grep -rn "FEATURE_FLAGS" apps/api/src/      → definition + admin route only
```

**Fix:** Guard each gated feature behind `isFeatureEnabled(db, FeatureFlag.XXX)`, returning `403` or a suitable error when disabled.

---

### H‑2. SSRF/link‑safety validation bypass on chained URLs

`src/services/urlSafety.ts` — `validateUrlSafety(url)` performs two safety checks:
1. Validates the URL is not in the blocklist (blocked domains / patterns).
2. Validates the URL is reachable (HTTP 200).

This function is **called in `createShortUrl`** (the primary shorten flow), but it is **never called in `resolveChain`** (`src/services/link.service.ts:143`) or the `resolve` path.

`resolveChain` performs a recursive forward-resolution of link chains (`/a → /b → /c → /destination`) — each intermediate URL could point to a blocked/malicious domain. The safety check only runs on the initial short-code creation, not on chain traversal.

**Impact:** If a short link's destination is updated to point to a malicious site, or a chain link's intermediate URL is edited after creation, the safety check is bypassed. An attacker could use the linkify redirect as a blind proxy.

**Fix:** Call `validateUrlSafety(currentUrl)` inside `resolveChain` for each hop. Decide on policy (warn vs block) for non-200 intermediaries.

---

## 🟡 Medium

### M‑1. Orphaned `apps/api/.env.local`

Two `.env.local` files exist:

| File | Lines | Status |
|---|---|---|
| `../../.env.local` (root) | 16 | Loaded by `apps/api/src/index.ts` at startup |
| `apps/api/.env.local` | 59 | **Never loaded** by any runtime code |

`apps/api/drizzle.config.ts` hardcodes `../../.env.local` (the root one), which has only 16 vars — assuming `DATABASE_URL` is among them.

**Impact:** A developer who places env vars in `apps/api/.env.local` (the more natural location for a `@linkify/api` developer) will find them silently ignored. The 59-line file is a trap.

**Fix:** Either delete `apps/api/.env.local` and tell users to use root `.env`, or have `index.ts` also load `__dirname + '/.env.local'` (fallback). Update `drizzle.config.ts` to match the chosen strategy.

---

### M‑2. `@types/sharp` version mismatch

```json
// package.json
"sharp": "^0.35.0",
"@types/sharp": "^0.32.0"
```

Sharp has shipped its own types since v0.31. The `@types/sharp` package is years out of date and may conflict with Sharp's bundled types.

**Impact:** Type-checking for the QR-code generation code path (`src/services/qr.services.ts:39` — `sharp()` call) may silently use stale or incorrect type definitions.

**Fix:** Remove `@types/sharp` — Sharp >=0.31 includes types.

---

### M‑3. `BLOCKLIST_TLDS` naming is misleading

```typescript
// src/utils/blocklistDomains.ts
export const BLOCKLIST_TLDS: string[] = ['tor2web', ...]
```

The constant is named `TLDS` but contains **domain names** (`tor2web.org`, `tor2web.com`, etc.) not top-level domains. This is confusing for maintainers.

**Fix:** Rename to `BLOCKLIST_DOMAINS` and update imports.

---

### M‑4. `dist/` directory committed to Git

Build output in `apps/api/dist/` is tracked in the repository. The root `.gitignore` does not have an entry for `apps/api/dist/`.

**Impact:** Bloated diffs, merge conflicts on compiled JS, risk of stale artifacts being deployed.

**Fix:** Add `apps/api/dist/` to the root `.gitignore`.

---

## 🔵 Low

### L‑1. `docs/PROJECT.md` references non-existent file

`docs/PROJECT.md:281` mentions `blockedDomains.ts`. The actual file is named `blocklistDomains.ts`.

**Fix:** Update the reference in `PROJECT.md`.

---

### L‑2. Pino-http placed before stripe raw-body middleware

In `app.ts`:
```typescript
app.use(pinoHttp({ logger }))         // line 27 — logs ALL requests
app.use('/api/stripe', stripeRoutes)  // line 37 — expects raw body via req.on('data')
```

`pino-http` does not consume the request body by default, so this works today. However, future changes to pino-http serialization (body logging) or another middleware's body consumption placed above stripe routes would silently break the webhook handler.

**Fix:** Move `pinoHttp` after the stripe route, or add a comment explaining why ordering matters.

---

### L‑3. `POST /api/urls/shorten` rate‑limiter type looseness

`src/routes/url.routes.ts:15` reads `getRateLimiter(req).shortLimiter` where the return type of `getRateLimiter` is `Record<string, rateLimit.RateLimit>`. The plan rates are typed `[key: string]: RateLimitConfig`, but there is no compile-time guarantee the key `shortLimiter` exists. A typo or misconfiguration in the plan data becomes a runtime crash on every shorten request.

**Fix:** Define a concrete type for the rate-limiter map keys instead of `string`.

---

### L‑4. Zod schema imports but never validates session tokens

`src/utils/env.ts` validates that `SESSION_SECRET`, `ENCRYPTION_KEY`, etc. exist. But the actual *contents* of these secrets (entropy, length) are unchecked — any non-empty string passes.

**Fix:** Add `.min(32)` or `.length(32)` / `.length(64)` for hex/base64 secret keys.

---

## 📋 Documentation Drift

| What docs say | What code does | Severity |
|---|---|---|
| `GET /api/auth/csrf-token` exists | No such route | Critical |
| CSRF protection on mutation endpoints | No CSRF anywhere | Critical |
| "General" rate limiter (100/15min) on all `/api/*` | `generalLimiter` defined but never mounted | Critical |
| `CSRF_COOKIE_NAME`, `CSRF_COOKIE_SECRET`, `CSRF_SECRET` env vars | Not in `env.ts` or `.env.example` | Critical |
| `blockedDomains.ts` exists | File is `blocklistDomains.ts` | Low |
| Feature flag system documented as operational | 8/10 flags never checked | High |

---

## ✅ What passes review

- **Authentication flow:** JWT access + refresh token logic is sound. Token rotation, expiration, and blacklisting are correctly implemented.
- **Redirect logic:** Code->URL→destination resolution with chain traversal, password protection, expired/inactive checks — all correct.
- **Database schema:** Drizzle ORM definitions match the documented model. Migrations via `drizzle-kit`.
- **Input validation:** Zod schemas for all mutation endpoints (`shortenUrl`, `createLink`, `register`, `login`, etc.) with sensible constraints.
- **Error handling:** Consistent error class hierarchy (`AppError → NotFoundError, AuthError, ValidationError`) and global error handler with Sentry integration.
- **Test coverage:** 639 tests passing. Good unit test patterns for services. Some controllers and routes have less coverage.
- **Dependency health:** No unused packages, no outdated critical deps, no known-vulnerability packages (by npm audit). Lockfile is frozen in CI.
- **ORC-URI handling for analytics:** Works correctly — decodes, validates origin, falls back gracefully.
- **Container setup:** Dockerfile is workspace-aware, correctly uses `pnpm --filter`.
