# linkify — advanced features roadmap

> Backend features, security, performance, and platform concerns only.
> UI/UX is intentionally excluded.

---

## 1. Authentication & User System

- [ ] **User accounts** — Registration and login with email/password (bcrypt/argon2). JWT access + refresh token pair. Session management with rotation and revocation.
- [ ] **Ownership model** — Every URL belongs to a user. Scoped CRUD so users see and manage only their own links. Admins see all.
- [ ] **Role-based access control** — `admin`, `user` roles. Admins can manage users, purge data, view system metrics. Users manage their own links.
- [ ] **OAuth / SSO** — Sign in with Google, GitHub, and Apple. Link multiple OAuth providers to one account.
- [ ] **Two-factor authentication (2FA / TOTP)** — Optional TOTP via authenticator app for admin accounts. Backup recovery codes.
- [ ] **API key management** — Per-user scoped API keys stored as bcrypt hashes. Key rotation, expiration, per-key rate limits, and last-used tracking via `api_keys` table.
- [ ] **Breached password detection** — Check registration passwords against Have I Been Pwned API (k-anonymity model). Reject compromised passwords.

---

## 2. Link Management & Organization

- [ ] **Collections / folders** — Group links into hierarchical folders. Drag-and-drop ordering. Share entire collections.
- [ ] **Tags & labels** — Many-to-many tag system. Filter and bulk-operate by tags. Color-coded labels.
- [ ] **Password-protected links** — Require a password to access the redirect. Brute-force rate limiting on password attempts.
- [ ] **Scheduled activation & expiry** — Set `active_at` + `expires_at` timestamps. Links auto-activate and auto-expire without manual intervention.
- [ ] **Link rotation / A/B testing** — Multiple destination URLs with weighted traffic distribution. Track conversion per variant. Console to create and monitor tests.
- [ ] **Custom branded domains** — Users can configure their own domain (e.g. `go.acme.co`). SSL cert provisioning via Let's Encrypt. Domain verification via DNS TXT record.
- [ ] **QR code generation** — Per-link QR codes in PNG and SVG. Include logo overlay option. Download endpoint `GET /:code/qr`.
- [ ] **Deep linking / platform routing** — Detect mobile vs desktop. Route to native app via intent URL or universal link. Configurable per-platform destinations.
- [ ] **Multi-language redirects** — Redirect based on `Accept-Language` header. Fallback chain with configurable language → URL mapping.
- [ ] **Bulk operations** — Bulk tag, bulk move to folder, bulk extend expiry, bulk delete. CSV import of URLs with optional metadata.
- [ ] **Link chaining** — Short link pointing to another short link. Depth limit (max 5 hops). Cycle detection.

---

## 3. Advanced Analytics & Insights

- [ ] **Real-time analytics** — WebSocket push (`/api/ws/links/:code`) for live click notifications. SSE endpoint for server-sent events.
- [ ] **UTM auto-tagging & parsing** — Auto-append UTM parameters to destination URLs on creation. Parse and store UTM source/medium/campaign/content/term on every click.
- [ ] **Conversion funnel tracking** — Accept a `conversion_url` parameter. Log conversion events. Report click→conversion rate per link and per campaign.
- [ ] **Geographic heatmap** — Aggregate clicks by country/city with lat/lng for map rendering. Endpoint `GET /:code/stats/geo`.
- [ ] **Device & browser breakdown** — Structured breakdown endpoint `GET /:code/stats/devices` returning counts by device_type, os, browser. Pie-chart-ready data.
- [ ] **Custom date range comparisons** — Compare two periods: `GET /:code/stats/compare?from1=&to1=&from2=&to2=`. Returns delta percentages.
- [ ] **Retention / cohort analysis** — Track returning visitors by IP. Report new vs returning ratio per time window (24h, 7d, 30d).
- [ ] **Click quality scoring** — Flag bot/crawler traffic via known bot UA patterns and behavior heuristics. Separate "valid" vs "bot" click counts.
- [ ] **Export scheduler** — Schedule recurring CSV/JSON exports to email or S3. Configurable frequency (daily, weekly, monthly).

---

## 4. API Platform & Developer Experience

- [ ] **API versioning** — Mount `/api/v1/` and `/api/v2/` gracefully. Deprecation headers (`Sunset`, `Deprecation`). Migration guide per version.
- [ ] **OpenAPI / Swagger documentation** — Auto-generated OpenAPI 3.1 spec from Zod schemas (`zod-to-openapi` or `@asteasolutions/zod-to-openapi`). Swagger UI at `/docs`.
- [ ] **Webhook system** — Register webhooks for events: `link.clicked`, `link.expired`, `link.created`, `link.deleted`. Configurable retry with exponential backoff. Signature verification via HMAC.
- [ ] **Cursor-based pagination** — Replace offset pagination with cursor-based for visit lists and large result sets. Cursor encoded as opaque base64 string.
- [ ] **Idempotency support** — Accept `Idempotency-Key` header on POST endpoints. Deduplicate within 24h. Return cached response on replay.
- [ ] **Rate limit tiers** — Per-user-plan limits (free: 100/h, pro: 10000/h). Return `X-RateLimit-*` headers. Rate limit info on auth check endpoint.
- [ ] **GraphQL API** — Optional GraphQL endpoint (`/api/graphql`) for flexible queries. Powered by code-first schema (TypeGraphQL or Pothos). Batched resolvers for performance.
- [ ] **Client SDKs** — TypeScript SDK (`@linkify/sdk`) with full type safety. Python SDK for data/automation teams. Auto-generated from OpenAPI spec.

---

## 5. Security Hardening

- [ ] **Security audit log** — Append-only `audit_log` table recording every privileged action: user creation, API key generation, link purge, role change. Immutable via DB triggers or separate audit service.
- [ ] **CSRF protection** — Double-submit cookie pattern or SameSite=Strict + CSRF token header for any cookie-authenticated routes (future admin UI).
- [ ] **IP allowlisting** — Restrict API access to trusted IP ranges for enterprise users. Configurable per API key.
- [ ] **JWT refresh token rotation** — Every refresh issues a new refresh token and revokes the old one. Refresh token reuse detection triggers full session invalidation.
- [ ] **Encryption at rest** — Encrypt PII columns (email, IP addresses in long-term storage) using Postgres `pgcrypto` or AES-256-GCM via application layer.
- [ ] **Rate limiting on auth endpoints** — Strict rate limits on login, registration, password reset (3/min per IP). Delayed error responses to prevent user enumeration.
- [ ] **Bot / crawler detection** — Identify and optionally block known bots, headless browsers, and data center IPs. Configurable per-link allowance.
- [ ] **Request fingerprinting** — Hash and store request fingerprint (IP + UA + Accept-Language) for abuse pattern detection. Alert on anomalous velocity.

---

## 6. Performance & Scaling

- [ ] **Redis caching layer** — Cache top-N links in Redis (LRU eviction). Cache bust on update/delete. Sub-millisecond redirects for cached entries. Separate Redis for rate-limit counters.
- [ ] **CDN edge redirects** — Deploy redirect logic to Cloudflare Workers or Lambda@Edge. Edge responds with 301/302 without reaching origin. Origin only for uncached misses and API requests.
- [ ] **Database read replicas** — Route read queries (list, search, stats) to read replicas. Writes and critical reads (resolve) go to primary. Configurable via Drizzle's `withReplica`.
- [ ] **Connection pooling** — Use PgBouncer in transaction mode or Neon's built-in pooled connection string. Prevent connection exhaustion under load.
- [ ] **Database indexing audit** — Review all query patterns and add missing composite indexes. Partial indexes for soft-delete filtering, covering indexes for stats queries.
- [ ] **Response compression** — Enable `compression` middleware for gzip/brotli on API responses (especially CSV exports > 1MB).
- [ ] **Streaming CSV exports** — Stream large CSV exports row-by-row instead of buffering in memory. Use `res.write()` with batch queries.
- [ ] **Lazy analytics computation** — Defer hourly/daily stats aggregation to background jobs. Pre-compute and cache stats. Update on write, serve from cache on read.
- [ ] **HTTP/2 server** — Enable HTTP/2 via Node.js `http2` module for multiplexed connections and reduced latency.

---

## 7. Monetization & Business

- [ ] **Subscription tiers** — Free (100 links, basic stats), Pro (10k links, full analytics, custom domains), Enterprise (unlimited, SSO, SLA). Managed via Stripe Billing.
- [ ] **Stripe integration** — Webhook handler for `checkout.session.completed`, `invoice.paid`, `subscription.cancelled`. Sync plan limits to DB.
- [ ] **API quota management** — Track usage per user/plan with monthly reset. Block or return 429 when quota exhausted. Upgrade prompt in response headers.
- [ ] **Branded short domains** — Paid add-on feature. Each custom domain costs $X/month. Automated SSL via Let's Encrypt.
- [ ] **Affiliate link management** — Assign affiliate IDs to links. Track commission-ready clicks. Export reports for affiliate payouts.
- [ ] **Usage analytics dashboard data** — Aggregated stats endpoint for billing: total links, total clicks, active users, API calls. Used for internal dashboards.

---

## 8. Platform & Infrastructure

- [ ] **Admin dashboard API** — `GET /api/admin/*` endpoints: list users, view system metrics, trigger maintenance jobs, view audit log. Prototype for a future web UI.
- [ ] **Docker Compose for local dev** — `docker-compose.yml` with app + Postgres + Redis. One-command local environment setup. Profile-based service selection.
- [ ] **Database backup automation** — Automated `pg_dump` to S3/GCS. Retention policy (daily for 7 days, weekly for 3 months). Integrity check and restore drill.
- [ ] **Pre-commit hooks** — `husky` + `lint-staged`: auto-format, typecheck changed files, run relevant tests on commit.
- [ ] **Feature flags** — Toggle features per environment via `@launchdarkly/node-server-sdk` or a simple enum + env var. Flag evaluation endpoint for admin UI.
- [ ] **Load testing suite** — `k6` scripts for redirect throughput (10k req/s), API CRUD, stats aggregation. CI-integrated regression checks.
- [ ] **End-to-end tests** — Playwright tests for critical user flows (if admin UI is built). API-only e2e with supertest covering full request→DB→response cycle.
- [ ] **Database migration CI** — Automatically run `db:push` or `db:generate` in CI for new branches. Fail build if schema drift detected.
- [ ] **Automated canary deployments** — Deploy new version to 5% of traffic. Auto-rollback on error rate spike >1%. Prometheus + Grafana for monitoring.

---

