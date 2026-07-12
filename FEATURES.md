# linkify — advanced features roadmap

> Backend features, security, performance, and platform concerns only.
> UI/UX is intentionally excluded.

---

## 2. Link Management & Organization

- [ ] **Link rotation / A/B testing** — Multiple destination URLs with weighted traffic distribution. Track conversion per variant. Console to create and monitor tests.
- [ ] **Deep linking / platform routing** — Detect mobile vs desktop. Route to native app via intent URL or universal link. Configurable per-platform destinations.
- [ ] **Multi-language redirects** — Redirect based on `Accept-Language` header. Fallback chain with configurable language → URL mapping.

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
- [ ] **GraphQL API** — Optional GraphQL endpoint (`/api/graphql`) for flexible queries. Powered by code-first schema (TypeGraphQL or Pothos). Batched resolvers for performance.
- [ ] **Client SDKs** — TypeScript SDK (`@linkify/sdk`) with full type safety. Python SDK for data/automation teams. Auto-generated from OpenAPI spec.

---

## 6. Performance & Scaling

- [ ] **CDN edge redirects** — Deploy redirect logic to Cloudflare Workers or Lambda@Edge. Edge responds with 301/302 without reaching origin. Origin only for uncached misses and API requests.
- [ ] **Connection pooling** — Use PgBouncer in transaction mode or Neon's built-in pooled connection string. Prevent connection exhaustion under load.
- [ ] **HTTP/2 server** — Enable HTTP/2 via Node.js `http2` module for multiplexed connections and reduced latency.

---

## 8. Platform & Infrastructure

- [ ] **Load testing suite** — `k6` scripts for redirect throughput (10k req/s), API CRUD, stats aggregation. CI-integrated regression checks.
- [ ] **End-to-end tests** — Playwright tests for critical user flows (if admin UI is built). API-only e2e with supertest covering full request→DB→response cycle.
- [ ] **Database migration CI** — Automatically run `db:push` or `db:generate` in CI for new branches. Fail build if schema drift detected.
- [ ] **Automated canary deployments** — Deploy new version to 5% of traffic. Auto-rollback on error rate spike >1%. Prometheus + Grafana for monitoring.
