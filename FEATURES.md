# linkify — implemented features

> Backend features, security, performance, and platform concerns only.
> UI/UX is intentionally excluded.

---

## 1. Authentication & User System (Supabase Auth)

> Uses [Supabase Auth](https://supabase.com/auth) as the identity provider — built on GoTrue, handles all OAuth flows, MFA, email verification, and password management. The Express API validates Supabase JWTs via JWKS endpoint. A local `users` table mirrors `auth.users` for application-level relationships and roles.

- [x] **Supabase project setup** — Create Supabase project (or use existing Neon + separate Supabase Auth). Enable email/password auth, Google, GitHub providers. Configure site URL and redirect URLs in Supabase dashboard.
- [x] **User `public.users` table** — Table with `id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE`, `email text`, `role text DEFAULT 'user'`, `suspended_at timestamptz`, `created_at timestamptz DEFAULT now()`. Sync via Supabase `on_auth_user_created` trigger or application-level webhook.
- [x] **JWT validation middleware** — Supabase JWT verification using `jose` + JWKS endpoint. Cache JWKS keys with TTL. Decode `sub` (user UUID) and `aal` from JWT claims.
- [x] **Ownership model** — Every `urls` row has a `user_id uuid REFERENCES public.users(id) ON DELETE CASCADE` column. All queries scoped to `user_id`. Admins have an `admin` role bypass.
- [x] **Role-based access control** — `admin` and `user` roles stored in `public.users.role`. Admin-only endpoints check role from JWT claim. Role assignment via admin API.
- [x] **OAuth / SSO** — Enabled in Supabase dashboard (Google, GitHub, Apple). Supabase handles the full OAuth flow. API receives Supabase JWT on successful auth.
- [x] **Two-factor authentication (2FA / TOTP)** — Supabase Auth supports TOTP natively. API reads `aal` claim from JWT to enforce 2FA for sensitive endpoints via `requireAAL` middleware.
- [x] **API key management** — Custom `api_keys` table with `key_hash` (bcrypt), `name`, `scopes`, `allowed_ips`, `last_used_at`, `expires_at`. `requireAuth` middleware checks for `Authorization: Bearer <key>` and validates against bcrypt hash.
- [x] **Email verification & password reset** — Built into Supabase Auth. API endpoint `POST /api/auth/reset-password` triggers Supabase's magic link flow.
- [x] **Session management** — Supabase Auth issues short-lived access tokens + long-lived refresh tokens. `POST /api/auth/refresh` calls Supabase `auth.token('refresh_token')` endpoint.

---

## 2. Link Management & Organization

- [x] **Collections / folders** — Group links into hierarchical folders. Drag-and-drop ordering. Share entire collections via UUID token.
- [x] **Tags & labels** — Many-to-many tag system. Filter and bulk-operate by tags. Color-coded labels.
- [x] **Password-protected links** — Require a password to access the redirect. Brute-force rate limiting on password attempts (5/min per code).
- [x] **Scheduled activation & expiry** — Set `active_at` + `expires_at` timestamps. Links auto-activate and auto-expire without manual intervention.
- [x] **Custom branded domains** — Users can configure their own domain. Domain verification via DNS TXT record (`_linkify-domain-verification`).
- [x] **QR code generation** — Per-link QR codes in PNG and SVG. Include logo overlay option. Download endpoint `GET /:code/qr`.
- [x] **Bulk operations** — Bulk tag, bulk move to folder, bulk extend expiry, bulk delete. CSV import of URLs with optional metadata (max 500 rows).
- [x] **Link chaining** — Short link pointing to another short link. Depth limit (max 5 hops). Cycle detection.

---

## 3. Security Hardening

- [x] **Security audit log** — Append-only `audit_log` table recording all privileged actions. Immutable at the application layer.
- [x] **CSRF protection** — Double-submit cookie pattern with HMAC-signed CSRF tokens. Skipped for Bearer-authenticated requests.
- [x] **IP allowlisting** — Restrict API access to trusted IP ranges for enterprise users. Configurable per API key.
- [x] **JWT refresh token rotation** — Refresh delegated to Supabase Auth which rotates tokens server-side. Local refresh token hash tracking detects replay of already-consumed tokens.
- [x] **Encryption at rest** — Encrypt PII columns (email, IP addresses in long-term storage) using AES-256-GCM via application layer.
- [x] **Rate limiting on auth endpoints** — Strict rate limits on auth endpoints (configurable, default 3/min per IP).
- [x] **Bot / crawler detection** — Identify known bots, headless browsers via 29+ UA patterns. Flagged in visit records. Per-link `blockBots` setting returns 403 for automated requests.
- [x] **Request fingerprinting** — HMAC-SHA256 of canonicalized, delimited (IP + UA) with a rotatable secret key.

---

## 4. Performance & Scaling

- [x] **Redis caching layer** — LRU-backed Redis cache for URL resolves via `ioredis`. `resolveUrl` checks cache before DB; writes bust the key. Gracefully degrades when Redis is unavailable.
- [x] **Database read replicas** — Optional `DATABASE_REPLICA_URL` env var. When set, read queries route to the replica via `dbReplica` Drizzle instance.
- [x] **Database indexing audit** — Composite indexes added: `urls(user_id, deleted_at)`, `urls(deleted_at)`, `visits(code, visited_at)`, `visits(fingerprint, code, visited_at)`.
- [x] **Response compression** — `compression` middleware enabled for gzip/brotli on all responses.
- [x] **Streaming CSV exports** — Paginated batch writes (500 rows/page) via `res.write()` instead of buffering all rows in memory.
- [x] **Lazy analytics computation** — Pre-computed `url_stats_hourly` table upserted on every visit. Stats endpoint reads from the aggregated table instead of scanning raw visits.

---

## 5. Monetization & Business

- [x] **Subscription tiers** — Free (100 links, basic stats), Pro (10k links, full analytics, custom domains), Enterprise (unlimited, SSO, SLA). Managed via Stripe Billing.
- [x] **Stripe integration** — Webhook handler for `checkout.session.completed`, `invoice.paid`, `subscription.cancelled`, `customer.subscription.updated`. Sync plan limits to DB.
- [x] **API quota management** — Track usage per user/plan with monthly reset. Block or return 429 when quota exhausted. Upgrade prompt in response headers.
- [x] **Branded short domains** — Paid add-on feature. Domain verification via DNS TXT record. SSL is manual/stub (no Let's Encrypt ACME yet).
- [x] **Affiliate link management** — Assign affiliate IDs to links. Track commission-ready clicks. Export reports for affiliate payouts.
- [x] **Usage analytics dashboard data** — Aggregated stats endpoint for billing: total links, total clicks, active users, API calls.

---

## 6. Platform & Infrastructure

- [x] **Admin dashboard API** — `GET /api/admin/*` endpoints: dashboard stats with deltas, user list/detail/role/suspend, paginated audit log with user emails, system config viewer, feature flags viewer, maintenance job triggers (purge expired, recheck links, status).
- [x] **Docker Compose for local dev** — `docker-compose.yml` with app + Postgres + Redis. One-command local environment setup. Production build by default.
- [x] **Database backup automation** — `pg_dump` to timestamped gzip files. Retention policy. Optional S3 sync.
- [x] **Pre-commit hooks** — `husky` + `lint-staged`: typecheck changed files, run related tests on commit.
- [x] **Feature flags** — Simple enum + env var system. 10 flags with descriptions. Flag evaluation endpoint for admin UI.
