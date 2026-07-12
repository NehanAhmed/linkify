# linkify — Complete Code Audit

Generated: 2026-07-12

---

## 🔴 CRITICAL BUGS

### 0. Secrets, URLs, and passwords hardcoded as defaults in `env.ts`

**File:** `utils/env.ts:5-46`

The Zod schema provides default values for virtually every sensitive configuration variable:

```ts
SUPABASE_URL: z.string().default('https://pobqjltfdfhbpocjnhbe.supabase.co'),
LINK_ACCESS_SECRET: z.string().default(() => randomBytes(32).toString('hex')),
ENCRYPTION_KEY: z.string().default(() => randomBytes(32).toString('hex')),
CSRF_SECRET: z.string().default(() => randomBytes(32).toString('hex')),
FINGERPRINT_SECRET: z.string().default(() => randomBytes(32).toString('hex')),
STRIPE_PRICE_PRO: z.string().default(''),
BILLING_SUCCESS_URL: z.string().default('http://localhost:3000/billing/success'),
BILLING_CANCEL_URL: z.string().default('http://localhost:3000/billing/cancel'),
BASE_URL: z.string().default('http://localhost:3000'),
```

This violates the principle that **all secrets, URLs, and passwords must come from the environment (`.env` file), not from code defaults**. Specific issues:

- `SUPABASE_URL` defaults to a real Supabase project — anyone who skips `.env` setup silently routes auth through an external project they don't control.
- `ENCRYPTION_KEY`, `LINK_ACCESS_SECRET`, `CSRF_SECRET`, `FINGERPRINT_SECRET` are randomly generated on every cold start, making all encrypted data undecryptable after restart (see issue #1).
- `BASE_URL` defaults to `http://localhost:3000` — if not set in production, generated short URLs will point to localhost.
- `BILLING_SUCCESS_URL` / `BILLING_CANCEL_URL` default to localhost — Stripe will redirect users there.

**Fix:** Remove all `.default()` calls for secrets, URLs, and passwords. Make them required (`z.string().min(1)`) so the app refuses to start without a proper `.env` file. For `STRIPE_PRICE_PRO`, it's referenced without `?.` in `stripe.ts:37` (`return env.STRIPE_PRICE_PRO`), so it should not default to `''`.

### 1. Random env defaults break persistence on restart

**File:** `utils/env.ts:11,19,22,23` (consequence of issue #0 above)

`LINK_ACCESS_SECRET`, `ENCRYPTION_KEY`, `CSRF_SECRET`, and `FINGERPRINT_SECRET` all default to `randomBytes(32).toString('hex')`. Every server restart generates entirely new keys:

- **Encrypted data loss**: All encrypted user emails and IPs become permanently undecryptable. The `ENCRYPTION_KEY` is used by `syncUser()` to encrypt emails before storage and by `recordVisit()` to encrypt IP addresses.
- **Password JWTs invalidated**: `LINK_ACCESS_SECRET` signs all password-access tokens (5min expiry, so this is less severe but tokens issued before restart all fail).
- **CSRF tokens invalidated**: `CSRF_SECRET` signs CSRF cookies, so all active sessions lose CSRF protection.
- **Fingerprints invalidated**: `FINGERPRINT_SECRET` hashes visit fingerprints, so unique-visit dedup breaks across restarts.

**Fix:** Same as #0 — remove `.default()` calls and require all secrets from the environment.

---

### 2. API key auth is O(n) scan

**File:** `middleware/auth.ts:37-64`

`verifyApiKey` fetches **every non-expired API key** from the database and calls `bcrypt.compare` on each one sequentially. With 1000+ API keys, every authenticated request takes 1000+ bcrypt rounds — catastrophic at scale.

**Fix:** Use a key prefix (e.g., first 8 chars of the key) to narrow the lookup, or store a separate index.

---

### 3. IPv6 private network bypass in URL safety

**File:** `utils/urlSafety.ts:39-63`

The DNS lookup returns IPv6 addresses, but `isPrivateIP()` only handles IPv4 dotted-decimal. IPv6 private ranges (`fc00::/7`, `fe80::/10`) and loopback (`::1` — the exact match works, but only for that single address) are not validated. A user could create a short URL pointing to an internal IPv6 service.

**Fix:** Add IPv6 private range detection using `net.isIPv6()` and proper CIDR math.

---

### 4. ETLD+1 extraction is wrong

**File:** `services/urlSafety.ts:68-72`

```ts
function getETLDPlus1(hostname: string): string | null {
  const parts = hostname.split('.')
  if (parts.length < 2) return null
  return parts.slice(-2).join('.').toLowerCase()
}
```

For `.co.uk`, `.com.au`, `.github.io`, `.s3.amazonaws.com`, etc., this takes the last 2 parts as the registrable domain — e.g., `evil.co.uk` is treated as ETLD+1 = `co.uk` instead of `evil.co.uk`. This causes the blocklist domain check to fire on `co.uk` (which it won't be in the blocklist, so it's a false negative), and any blocklisted string in those positions would false-positive.

**Fix:** Use a proper PSL (Public Suffix List) implementation or a library like `tldts`.

---

### 5. `BILLING_RETURN_URL` bypasses env validation

**File:** `controllers/billing.controller.ts:58`

```ts
return_url: process.env.BILLING_RETURN_URL || 'http://localhost:3000'
```

Uses `process.env` directly instead of `env.BILLING_RETURN_URL`, skipping Zod validation and defaulting.

**Fix:** Add `BILLING_RETURN_URL` to the env schema and reference `env.BILLING_RETURN_URL`.

---

### 6. Visit counts include soft-deleted URLs

**File:** `controllers/billing.controller.ts:112-117`

```ts
const [visitResult] = await db
  .select({ total: count() })
  .from(visits)
  .innerJoin(urls, eq(visits.code, urls.code))
  .where(eq(urls.userId, userId))
```

No `isNull(urls.deletedAt)` filter. Visit counts shown to the user include visits from soft-deleted URLs.

**Fix:** Add `isNull(urls.deletedAt)` to the WHERE clause.

---

## 🔸 PERFORMANCE ISSUES

### 7. N+1 queries in collections listing

**File:** `services/collections.service.ts:46-59`

Every collection gets its own `COUNT(*)` query for URL count. Could be a single `GROUP BY` query.

### 8. N+1 queries in tags listing

**File:** `services/tags.service.ts:38-51`

Same pattern — separate COUNT per tag.

### 9. N+1 in admin getUsers

**File:** `services/admin.service.ts:271-285`

Separate link count query per user row. A subquery or LEFT JOIN would be much faster.

### 10. N+1 in admin getUserLinks

**File:** `services/admin.service.ts:315-335`

Separate count query then fetch. Could use `SQL_CALC_FOUND_ROWS` pattern or a single query.

---

## 🔸 SECURITY ISSUES

### 11. Default Supabase URL in code

**File:** `utils/env.ts:9`

```ts
SUPABASE_URL: z.string().default('https://pobqjltfdfhbpocjnhbe.supabase.co'),
```

This is a real Supabase project URL. Anyone who deploys without setting `SUPABASE_URL` will silently authenticate against this project. Auth tokens from the deployer's own Supabase project won't work, but tokens from this default project would.

**Fix:** Remove the default. Require `SUPABASE_URL` to be explicitly set.

### 12. No `trust proxy` setting

**File:** `app.ts`

`app.set('trust proxy', ...)` is never called. Behind any reverse proxy (nginx, Cloudflare, ALB), `req.ip` returns the proxy's IP. This breaks:

- Rate limiting (all traffic from the same proxy IP)
- Geo IP lookups (wrong location)
- IP allowlisting for API keys
- Audit log IP addresses

**Fix:** Add `app.set('trust proxy', 1)` or appropriate configuration for the deployment.

### 13. `requireAAL()` on all admin routes

**File:** `routes/index.ts:24`

```ts
router.use('/api/admin', requireAuth, requireRole('admin'), requireAAL(), adminRoutes)
```

Every admin endpoint (including `GET /dashboard`, `GET /users`) requires AAL2 (two-factor auth). This is a design choice but means admins without MFA cannot access any admin functionality. Consider AAL2 only for sensitive mutations.

### 14. No rate limiting on public redirect

**File:** `app.ts:42`

```ts
app.get('/:code(\\w{3,16})', rootRedirect)
```

The most externally-facing endpoint has no rate limiting. An attacker can hammer short URLs to generate unlimited visit records and exhaust the DB, or use the endpoint for DDoS amplification.

---

## 🔸 LOGIC BUGS

### 15. `normalizeUrl` has a no-op line

**File:** `validators/url.validators.ts:18`

```ts
parsed.hostname = parsed.hostname
```

This is a no-op assignment. The hostname is never lowercased. `Example.COM` and `example.com` are treated as different URLs (though the URL constructor does lowercase the hostname in practice — `new URL('HTTP://EXAMPLE.COM')` normalizes it — but assigning a `URL` object's hostname to itself does nothing).

### 16. Duplicate pattern in blocklist

**File:** `constants/blocklistDomains.ts:20-21`

```ts
/\bg00gle\b/i,  // line 20
/\bg00gle\b/i,  // line 21
```

The same regex appears on two consecutive lines.

### 17. Duplicate key in reserved words

**File:** `constants/reservedWords.ts:16,29`

`'assets'` appears on both line 16 and line 29 in the `Set` literal. The duplicate is harmless (Set deduplicates) but indicates a copy-paste error.

### 18. Dead query in affiliate report

**File:** `services/affiliate.service.ts:53-56`

```ts
const [existing] = await db
  .select({ planCode: sql<string>`'pro'` })
  .from(visits)
  .limit(1)
```

This query executes a `SELECT 'pro' FROM visits` and discards the result. It appears to be leftover debugging code.

### 19. Unused `statsQuerySchema`

**File:** `validators/url.validators.ts:86-88`

```ts
export const statsQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', 'all']).default('7d'),
}).strict()
```

Defined and exported but never imported anywhere in the codebase.

### 20. Unused `generateCustomCode`

**File:** `utils/codeGenerator.ts:15-16`

```ts
export function generateCustomCode(slug: string): string {
  return slug.trim().replace(/\s+/g, '-').toLowerCase()
}
```

Never called anywhere.

### 21. Unused `requireFeature`

**File:** `utils/featureFlags.ts:45-50`

```ts
export function requireFeature(flag: FeatureFlag) {
  return (enabled: boolean) => {
    if (!enabled) return true
    return isFeatureEnabled(flag)
  }
}
```

Defined but never imported or called.

### 22. `fingerprint` called without 3rd arg

**File:** `services/url.services.ts:165`

```ts
const fingerprint = createFingerprint(metadata.ipAddress, metadata.userAgent, undefined)
```

The `acceptLanguage` parameter is never passed from the HTTP headers, making the third parameter permanently undefined.

### 23. Empty `tagIds` query param returns `[0]`

**File:** `validators/url.validators.ts:97`

```ts
tagIds: z.string().transform((s) => s.split(',').map(Number).filter((n) => !isNaN(n))).optional(),
```

If `?tagIds=` is passed (empty value), `"".split(",")` → `[""]`, and `Number("")` → `0`, which passes `!isNaN(0)`, resulting in `tagIds: [0]`. This would cause a query looking for tag ID 0, which doesn't exist.

---

## 🔸 TEST COVERAGE GAPS

| Module | Test File | Status |
|---|---|---|
| `controllers/url.controllers.ts` | — | ❌ Missing |
| `controllers/link.controller.ts` | — | ❌ Missing |
| `controllers/tag.controller.ts` | — | ❌ Missing |
| `controllers/auth.controller.ts` | — | ❌ Missing |
| `controllers/health.controller.ts` | — | ❌ Missing |
| `controllers/public.controller.ts` | — | ❌ Missing |
| `controllers/qr.controller.ts` | — | ❌ Missing |
| `services/healthCheck.ts` | — | ❌ Missing |
| `services/healthCheckEndpoint.ts` | — | ❌ Missing |
| `services/linkPreview.ts` | — | ❌ Missing |
| `services/qr.service.ts` | — | ❌ Missing |
| `services/userAgent.ts` | — | ❌ Missing |
| `services/geoip.ts` | — | ❌ Missing |
| `services/cache.ts` | — | ❌ Missing |
| `middleware/auth.ts` | — | ❌ Missing |
| `middleware/csrf.ts` | — | ❌ Missing |
| `middleware/rateLimiter.ts` | — | ❌ Missing |
| `middleware/requireAAL.ts` | — | ❌ Missing |
| `middleware/requireRole.ts` | — | ❌ Missing |
| `middleware/ipAllowlist.ts` | — | ❌ Missing |
| `routes/url.routes.ts` | — | ❌ Missing |
| `routes/auth.routes.ts` | — | ❌ Missing |
| `routes/billing.routes.ts` | — | ❌ Missing |
| `routes/collection.routes.ts` | — | ❌ Missing |
| `routes/domain.routes.ts` | — | ❌ Missing |
| `routes/public.routes.ts` | — | ❌ Missing |
| `routes/stripe.routes.ts` | — | ❌ Missing |
| `routes/tag.routes.ts` | — | ❌ Missing |
| `jobs/healthCheckJob.ts` | — | ❌ Missing |

Integration/e2e tests: **`src/test/` is completely empty**.

---

## 🔸 ARCHITECTURE / MISSING FEATURES

### 24. No integration or e2e tests

**File:** `src/test/`

Empty directory. The project has no integration tests for the full redirect flow, Stripe webhook processing, or auth token lifecycle.

### 25. No Redis health check

**File:** `services/healthCheckEndpoint.ts`

The `/api/health` endpoint only checks DB connectivity. If Redis is configured but unreachable, the health check still reports `ok`.

### 26. No IPv6 CIDR support in IP allowlist

**File:** `middleware/ipAllowlist.ts`

`ipv4ToLong()` only handles IPv4. API key `allowedIps` cannot have IPv6 entries, and CIDR matching for IPv6 is not implemented.

### 27. No pagination on `listCollections`

**File:** `services/collections.service.ts:33-61`

Returns all collections at once with no pagination. A user with thousands of collections would get a massive response.

### 28. No pagination on `listTags`

**File:** `services/tags.service.ts:26-54`

Same issue — returns all tags at once.

### 29. No password expiry on password-protected links

Password tokens expire after 5 minutes, but the link password itself never expires unless the user sets an `expiresAt`. There's no max-age for passwords.

### 30. Webhook signature verification fallback

**File:** `services/stripe.ts:20-26`

When `STRIPE_WEBHOOK_SECRET` is not configured, `getStripeWebhookSecret()` returns `""` and logs a warning. In that case, `stripe.webhooks.constructEvent(req.body, sig, "")` would throw an error, which is caught and returns 400. This is acceptable but doesn't handle the case gracefully.

---

## 🔸 CODE QUALITY / TYPING

### 31. Module-level side effects

**File:** `utils/env.ts:63`

```ts
export const env = validateEnv()
```

Importing `env` immediately validates all env variables and can `process.exit(1)` if any are invalid. This is fine for the main process but can kill test runners unexpectedly.

### 32. `as any` / loose typing in multiple places

- `stripe.controller.ts:34` — `event.data.object as { mode?: string; ... }`
- `auth.controller.ts:46` — `(tokens as any)?.user?.id`
- `services/stripe.ts:13` — `apiVersion: '2025-04-10' as any`
- `services/subscription.service.ts:221` — `const sub = stripeSub as unknown as Record<string, unknown>`

### 33. Dead migration files

**File:** `drizzle/` directory contains 5 migration SQLs. These are tracked in git. If tables are frequently modified, the migration chain may need squashing.

### 34. `dbReplica` silently falls back to primary

**File:** `db/index.ts:12`

```ts
export const dbReplica = replicaSql ? drizzle(replicaSql) : db
```

When no replica is configured, read-heavy endpoints (URL listing, visit queries, stats) hit the primary database. This is fine for single-node but means replica misconfiguration is silent.

### 35. Node.js version in Dockerfile

**File:** `Dockerfile`

Uses `node:20-alpine`. The project's `package.json` `engines` field is not set, so there's no documented minimum Node.js version.

---

## 🔸 SUMMARY BY PRIORITY

### Must fix before production
| # | Issue | Impact |
|---|---|---|
| 1 | Random secrets on restart | **Data loss** (undecryptable emails/IPs) |
| 3 | IPv6 private network bypass | **Security bypass** (internal network access) |
| 4 | Wrong ETLD+1 extraction | **Security bypass** (blocklist evasion) |
| 12 | No `trust proxy` | **All IP-based features broken** behind reverse proxy |
| 6 | Visits include deleted URLs | **Incorrect billing/quota** |
| 2 | API key O(n) scan | **DoS-level performance** at scale |

### Should fix soon
| # | Issue | Impact |
|---|---|---|
| 11 | Default Supabase URL | Auth routing to wrong project |
| 14 | No rate limiting on redirect | DDoS amplification, DB overload |
| 5 | BILLING_RETURN_URL bypasses env validation | Silent fallback to localhost |
| 13 | AAL2 on all admin routes | Overly restrictive |
| 7-10 | N+1 queries | Slow at scale |

### Good to fix
| # | Issue |
|---|---|
| 15 | No-op in URL normalizer |
| 16 | Duplicate regex |
| 17 | Duplicate reserved word |
| 18-22 | Dead code |
| 24 | No integration tests |
| 25 | No Redis health check |
| 27-28 | Missing pagination on collections/tags |
