# linkify — backend features roadmap

> Server logic, security, analytics, and platform concerns only.
> UI/UX is intentionally excluded.

---

## 1. Core — missing pieces

- [ ] **Root-level redirect** — Expose `GET /:code` at the app root (not `/api/urls/:code`) so short links work as `https://linkify.io/abc123`
- [ ] **Custom alias validation** — Reserve blacklisted words (admin, api, etc.) so users can't hijack internal paths
- [ ] **Expiration / TTL** — Per-link expiry date (`expires_at` column). Auto-return 410 Gone for expired links. Optional cleanup job to delete or mark expired rows
- [ ] **Bulk creation endpoint** — `POST /api/urls/bulk` accepts array of `{ url, customCode? }`, returns array of results with per-item error reporting
- [ ] **Link preview data** — Fetch Open Graph / meta tags from target URL on creation (headless fetch `og:title`, `og:description`, `og:image`) and store alongside the link

---

## 2. Security & rate limiting

- [ ] **Rate limiting** — `express-rate-limit` on creation endpoint (e.g. 10/min per IP). Stricter limits for unauthenticated requests
- [ ] **API key authentication** — Protect write/delete endpoints with scoped API keys. Store hashed keys in a new `api_keys` table. Optional: key rotation, expiration, and per-key rate limits
- [ ] **URL sanitization & validation** — Reject private/reserved IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, ::1). Block `data:`, `javascript:`, `file:` protocols. DNS resolve check to catch SSRF vectors
- [ ] **Spam / phishing detection** — Integrate Google Safe Browsing API or community blocklists. Check against known malicious domains at creation time
- [ ] **Request size limits** — Enforce body size limits on POST endpoints via middleware (already have `express.json()`, but explicit cap matters)
- [ ] **CORS hardening** — Explicit allowed origins config instead of `*` in production
- [ ] **Helmet middleware** — Standard Express security headers (X-Content-Type-Options, X-Frame-Options, CSP, etc.)
- [ ] **SQL injection prevention** — Already mitigated by Drizzle ORM (parameterized queries), but confirm no raw SQL is used anywhere
- [ ] **Input normalization** — Strip leading/trailing whitespace, normalize Unicode URLs, prevent homograph attacks (Punycode conversion)

---

## 3. Analytics

- [ ] **Geolocation** — Resolve `ip_address` to country, city, and ISP via GeoIP (MaxMind GeoLite2 or ipapi.co). Store in `visits` table or a separate `visit_geo` table
- [ ] **User-agent parsing** — Parse `user_agent` into device type, OS, browser name, and browser version (ua-parser-js or similar). Store as structured JSON or separate columns
- [ ] **Referrer categorization** — Classify referrer as `direct`, `search`, `social`, or `other` based on domain patterns
- [ ] **Click timeline endpoint** — `GET /api/urls/:code/stats` returns aggregated counts grouped by hour/day
- [ ] **Export endpoint** — `GET /api/urls/:code/visits/export` returns CSV of all visit records
- [ ] **Unique visit tracking** — Deduplicate visits by `(code, ip_address)` within a configurable window to show "unique clicks" alongside total clicks
- [ ] **Link health checks** — Periodic background job that pings target URLs and flags broken links (4xx/5xx/DNS failure)

---

## 4. Platform & operations

- [ ] **Search / filter** — `GET /api/urls?q=<search>` searches by original URL and custom code. Optional filters: `createdAfter`, `createdBefore`, `minVisits`, `sortBy`
- [ ] **Soft delete** — Add `deleted_at` column instead of hard delete. Admin purge endpoint for permanent cleanup
- [ ] **Database migrations** — Run `pnpm db:generate && pnpm db:push` to sync the current schema (visits table + visits column on urls are defined in code but not yet migrated)
- [ ] **Testing** — Unit tests for services and validators, integration tests for endpoints (supertest + test DB or mocks)
- [ ] **Input validation hardening** — Ensure Zod schemas reject excessively long custom codes, malicious payloads, and unexpected fields (strict mode)
- [ ] **Structured logging** — Replace `console.log` with a logging library (pino / winston) with request IDs and structured JSON output
- [ ] **Health check endpoint** — `GET /api/health` returns DB connectivity status, uptime, and last migration applied
- [ ] **Environment validation** — Validate all required env vars (`DATABASE_URL`, `PORT`, etc.) at startup against a Zod schema
- [ ] **Error monitoring** — Structured error responses with unique error codes for production debugging; optional Sentry integration
- [ ] **Dockerfile** — Multi-stage Docker build for reproducible deployments
- [ ] **CI / CD** — GitHub Actions workflow: lint → typecheck → test → build

---
