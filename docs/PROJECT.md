# Linkify — Enterprise URL Shortener & Link Management API

> **Version**: 1.0.0 | **Node**: >= 20.0.0 | **Package Manager**: pnpm 10.33.2

---

## Overview

Linkify is a **production-grade URL shortener and link management platform** built with Express 5 and TypeScript. It provides a complete REST API for creating, managing, analyzing, and securing shortened URLs at scale. Designed for developers, marketers, and enterprises who need reliable link infrastructure with granular access control, billing, and analytics.

Linkify handles the complete lifecycle of a short link — from creation with custom codes and password protection, through visit tracking with rich analytics (geo, device, browser, referrer), to scheduled expiry and automated health checks. It supports hierarchical collections, colour-coded tagging, custom domains, QR code generation, bulk operations, CSV import/export, and link chaining with cycle detection.

---

## Features

### Core Short URL Management
- **Create Short URLs** — Auto-generated 7-character alphanumeric codes or custom 3-16 character codes
- **Bulk Creation** — Create up to 50 URLs in a single request
- **Link Chaining** — Short links can point to other short links (max 5 hops, cycle detection)
- **Scheduled Activation** — Set a future `activeAt` time for delayed link activation
- **TTL / Expiry** — Set link expiry from 1 to 365 days
- **Link Preview** — Auto-fetches Open Graph title, description, and image from destination URL
- **Soft Delete & Purge** — Soft delete (recoverable) or permanent purge (with AAL2 verification)
- **CSV Import** — Import up to 500 URLs from a CSV string

### Analytics & Tracking
- **Per-Visit Analytics** — Every redirect records IP (encrypted), User-Agent, Referer, country, city, device type, OS, browser, and referrer category
- **Unique Visitor Counting** — Fingerprint-based (HMAC of IP + UA + Accept-Language) with configurable deduplication window (default 24h)
- **Hourly Stats Aggregation** — Rolled-up visit counts per hour for the last 7 days
- **CSV Export** — Download full visit log as UTF-8 BOM CSV
- **Referrer Classification** — Automatically categorises referrers as `direct`, `search`, `social`, or `other`

### Password Protection
- **Set/Remove Passwords** — bcrypt-hashed passwords on individual links
- **JWT Access Tokens** — Password verification returns a 5-minute JWT for authenticated redirect access
- **Configurable Password Expiry** — Enforce maximum password age across the platform
- **Plan-Gated** — Controlled by the plan's `passwordProtection` feature flag

### Collections (Folders)
- **Nested Hierarchies** — Create parent-child collection structures
- **Reorderable** — Drag-and-drop style reordering via `sortOrder`
- **URL Counts** — Automatic count of URLs per collection
- **Public Sharing** — Generate a UUID-based share link for read-only public access

### Tags
- **Colour-Coded** — Tags with custom hex colours for visual organisation
- **Bulk Tagging** — Apply multiple tags to multiple URLs at once
- **URL Counts** — Per-tag URL counts for quick overview

### Custom Domains
- **Bring Your Own Domain** — Register custom domains for branded short URLs
- **DNS Verification** — TXT record verification token
- **Per-Plan Limits** — Free: 0, Pro: 5, Enterprise: 50
- **SSL Tracking** — Automatic SSL certificate status tracking (pending/active/expired)

### QR Codes
- **PNG & SVG Formats** — Download QR codes in either format
- **Logo Embedding** — Optionally embed a logo image in the centre of the QR code
- **Auto-Fetch** — Fetches logo from URL, resizes, and composites

### Bulk Operations
- **Bulk Tag** — Assign tags to multiple URLs at once
- **Bulk Move** — Add multiple URLs to a collection
- **Bulk Extend** — Extend expiry dates on multiple URLs
- **Bulk Delete** — Soft-delete multiple URLs at once
- **Audit Logging** — All bulk operations are recorded in the audit log

### Authentication & Authorization
- **JWT Authentication** — Supabase Auth integration with JWKS verification
- **API Key Authentication** — Create scoped, IP-allowlisted API keys with optional expiry
- **Role-Based Access Control** — `user` and `admin` roles
- **AAL2 / Two-Factor Enforcement** — Sensitive operations require Supabase 2FA level `aal2`
- **CSRF Protection** — Cookie + header token verification for browser-based clients
- **IP Allowlisting** — CIDR-based IP restrictions on API keys

### Security
- **SSRF Protection** — Validates destination URLs against private IP ranges (IPv4 + IPv6), DNS resolution checks, and domain blocklists
- **Bot Detection** — Blocks headless browsers and known crawlers per-link (optional)
- **Phishing Blocklist** — Patterns for typosquatting, lookalike domains, and suspicious URL structures
- **AES-256-GCM Encryption** — Encrypts PII (IP addresses, emails) at rest
- **Rate Limiting** — Multi-tier rate limiting (general, strict, bulk, auth, password, redirect)
- **Helmet** — Security headers via helmet middleware
- **CORS** — Configurable origin allowlist
- **Sentry Integration** — Optional error tracking with Sentry

### Billing & Subscriptions
- **Three Plans** — Free, Pro, Enterprise with graduated feature access
- **Stripe Integration** — Checkout sessions, customer portal, webhook sync
- **Usage-Based Quota** — Monthly API request counting with plan-based limits
- **Plan Feature Gating** — Features are controlled by individual feature flags per plan
- **MRR Tracking** — Admin dashboard with monthly recurring revenue calculation

### API Key Management
- **Create & Revoke** — Full CRUD for programmatic API keys
- **Scope Permissions** — Optional scopes array for granular access control
- **IP Allowlisting** — Restrict key usage to specific IPs or CIDR ranges
- **Usage Tracking** — `lastUsedAt` timestamp for key audit

### Administration
- **Dashboard** — Platform-wide stats: users, URLs, visits, subscriptions, MRR, storage
- **User Management** — List, detail view, role changes, suspend/unsuspend
- **Audit Log** — Full action audit trail with user and IP tracking
- **System Config** — Non-sensitive configuration exposure for debugging
- **Feature Flags** — Runtime feature toggling via environment variables
- **Maintenance** — Manual purge of expired URLs and batch link health checks

### Automation
- **Scheduled Health Checks** — Periodically checks all stale URLs for availability (configurable interval)
- **Startup Plan Seeding** — Automatically syncs plan definitions on server start
- **Stripe Webhooks** — Real-time subscription lifecycle synchronisation

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | >= 20.0.0 |
| Language | TypeScript | ^7.0.2 |
| Framework | Express | ^5.2.1 |
| ORM | Drizzle ORM | ^0.45.2 |
| Database | PostgreSQL (Neon Serverless) | — |
| Cache | Redis (ioredis) | ^5.11.1 |
| Auth | Supabase Auth (JWT via jose) | ^6.2.3 |
| Payments | Stripe | ^22.3.1 |
| Validation | Zod | ^3.24.4 |
| Logging | Pino | ^10.3.1 |
| Security | Helmet, bcrypt, express-rate-limit | — |
| QR | qrcode + sharp | — |
| GeoIP | geoip-lite | — |
| UA Parsing | ua-parser-js | — |
| CSV | PapaParse | — |
| Domain Parsing | tldts | — |
| Error Tracking | Sentry | ^10.65.0 |
| Compression | compression | ^1.8.1 |
| Testing | Vitest + supertest | — |
| Scheduling | node-cron (via setInterval) | — |
| Encryption | Node.js crypto (AES-256-GCM) | — |

---

## Architecture

```
Request
  │
  ▼
helmet() → cors() → compression() → cookieParser() → pinoHttp() → express.json()
  │
  ▼
csrfProtection()                 ←── CSRF cookie + header check
  │
  ▼
routes (Router tree)
  │
  ├─ /api/auth        → authController     → authService       → Supabase Auth + DB
  ├─ /api/urls        → urlController      → urlService        → DB + Redis
  │                    → linkController    → linkService       → DB + Redis
  │                    → qrController      → qrService         → QRCode + Sharp
  ├─ /api/collections → collectionController → collectionsService → DB
  ├─ /api/tags        → tagController      → tagsService       → DB
  ├─ /api/domains     → domainController   → domainService     → DB
  ├─ /api/billing     → billingController  → subscriptionService → DB + Stripe
  ├─ /api/admin       → adminService       → DB
  │   (requireAuth → requireRole → requireAAL)
  ├─ /api/health      → healthController   → healthCheckEndpoint → DB + Redis
  ├─ /api/shared/:token → publicController → collectionsService → DB
  └─ /:code           → urlController (rootRedirect) → urlService → DB + Redis
                          │
                          ▼
                    rateLimiter (redirect) → auth check → bot detection → password check
                          │
                          ▼
                    link chain resolution → visit recording (async)
                          │
                          ▼
                    301 Redirect to destination
```

### Request Flow Detail

1. **Middleware Stack** — Every request passes through helmet (security headers), cors (origin check), compression (gzip/brotli), cookie parser, pino-http (request logging), and JSON body parsing.
2. **CSRF Protection** — State-changing requests without a Bearer token require a valid CSRF token from cookie + header.
3. **Routing** — Requests are dispatched to the appropriate controller based on the route prefix.
4. **Authentication** — Routes marked as `requireAuth` extract and verify a JWT (via Supabase JWKS) or API key (via bcrypt comparison). Keys support IP allowlisting.
5. **Authorization** — Role-based (`requireRole`) and AAL-based (`requireAAL`) middleware gates sensitive endpoints.
6. **Rate Limiting** — Each route group has tailored rate limits stored in-memory (express-rate-limit).
7. **Quota Tracking** — Domain management endpoints track monthly API usage against plan limits.
8. **Controller Layer** — Validates input with Zod schemas, calls service layer, formats response.
9. **Service Layer** — Contains all business logic, database access, external API calls, and caching.
10. **Error Handling** — `AppError` class with status code + error code. Zod validation errors return field-level details. All unhandled errors are caught by the global `errorHandler`.

---

## Project Structure

```
src/
├── index.ts                     # Entry point: env loading, server start, job initialisation
├── app.ts                       # Express app setup: middleware stack, routes, error handlers
│
├── routes/
│   ├── index.ts                 # Route aggregator: mounts all route modules
│   ├── auth.routes.ts           # Auth endpoints (CSRF, refresh, reset, API keys)
│   ├── url.routes.ts            # URL endpoints (CRUD, bulk, analytics, QR, password)
│   ├── collection.routes.ts     # Collection endpoints (CRUD, share, reorder)
│   ├── tag.routes.ts            # Tag endpoints (CRUD, bulk tag)
│   ├── domain.routes.ts         # Custom domain endpoints
│   ├── billing.routes.ts        # Billing/plan endpoints
│   ├── admin.routes.ts          # Admin endpoints (inline handlers calling adminService)
│   ├── public.routes.ts         # Public shared collection endpoint
│   └── stripe.routes.ts         # Stripe webhook receiver
│
├── controllers/
│   ├── auth.controller.ts       # Auth request handlers
│   ├── url.controllers.ts       # URL + redirect request handlers
│   ├── link.controller.ts       # Link settings, password, bulk, CSV handlers
│   ├── collection.controller.ts # Collection request handlers
│   ├── tag.controller.ts        # Tag request handlers
│   ├── billing.controller.ts    # Billing request handlers
│   ├── domain.controller.ts     # Domain request handlers
│   ├── public.controller.ts     # Public shared collection handler
│   ├── stripe.controller.ts     # Stripe webhook handler
│   ├── health.controller.ts     # Health check handler
│   └── qr.controller.ts         # QR code generation handler
│
├── services/
│   ├── url.services.ts          # URL CRUD, resolution, visit recording, stats, CSV export
│   ├── link.service.ts          # Password management, link chaining, settings updates
│   ├── bulk.service.ts          # Bulk operations (tag, move, extend, delete) + CSV import
│   ├── auth.services.ts         # Supabase auth sync, token refresh, API key management
│   ├── subscription.service.ts  # Plan queries, checkout, sync, cancellation
│   ├── stripe.ts                # Stripe client singleton, price ID mapping
│   ├── collections.service.ts   # Collection CRUD, sharing, URL association
│   ├── tags.service.ts          # Tag CRUD, bulk tagging, URL association
│   ├── domain.service.ts        # Domain CRUD, verification, SSL status
│   ├── admin.service.ts         # Dashboard stats, user management, audit log, config
│   ├── audit.service.ts         # Audit log writing and querying
│   ├── cache.ts                 # Redis cache client with get/set/del/pattern
│   ├── urlSafety.ts             # UR L safety validation (SSRF, DNS, blocklist)
│   ├── qr.service.ts            # QR code generation with optional logo embedding
│   ├── affiliate.service.ts     # Affiliate link assignment and reporting
│   ├── healthCheck.ts           # Single-link health check with manual redirect following
│   ├── healthCheckEndpoint.ts   # Server health status (DB, Redis, uptime)
│   ├── geoip.ts                 # GeoIP lookup for visit tracking
│   ├── userAgent.ts             # User-Agent parsing (device, OS, browser)
│   └── linkPreview.ts           # Open Graph meta tag extraction
│
├── middleware/
│   ├── auth.ts                  # JWT + API key authentication
│   ├── rateLimiter.ts           # 6 rate limiters (general, strict, bulk, password, auth, redirect)
│   ├── requireRole.ts           # Role-based access control
│   ├── requireAAL.ts            # AAL2 / 2FA enforcement
│   ├── csrf.ts                  # CSRF token generation and validation
│   ├── quota.ts                 # API usage quota tracking and enforcement
│   ├── errorHandler.ts          # Global error handler + 404 handler
│   └── ipAllowlist.ts           # IPv4/IPv6 CIDR matching for API key IP restrictions
│
├── validators/
│   ├── url.validators.ts        # Zod schemas for URL CRUD, bulk, pagination, listing
│   ├── link.validators.ts       # Zod schemas for password, settings, bulk ops, CSV import
│   ├── collection.validators.ts # Zod schemas for collection CRUD, reorder, URL association
│   ├── tag.validators.ts        # Zod schemas for tag CRUD, bulk tagging
│   └── admin.validators.ts      # Zod schemas for admin pagination, user roles, audit log
│
├── db/
│   ├── schema.ts                # Complete Drizzle ORM schema (14 tables)
│   └── index.ts                 # Database client (primary + optional read replica)
│
├── types/
│   ├── auth.types.ts            # AuthenticatedUser, UserRole, Express.Request augmentation
│   └── url.types.ts             # Request/response interfaces (UrlResponse, VisitResponse, etc.)
│
├── constants/
│   ├── blockedDomains.ts        # Blocklist TLDs and phishing URL patterns
│   └── reservedWords.ts         # Reserved short codes (api, admin, dashboard, etc.)
│
├── utils/
│   ├── env.ts                   # Zod-validated environment variable access via Proxy
│   ├── AppError.ts              # Custom error class with status code + error code
│   ├── logger.ts                # Pino logger (pretty-print in dev, JSON in production)
│   ├── codeGenerator.ts         # Cryptographically random short code generation
│   ├── encryption.ts            # AES-256-GCM encrypt/decrypt for PII
│   ├── fingerprint.ts           # HMAC fingerprint for unique visitor deduplication
│   ├── botDetection.ts          # User-Agent based bot detection
│   ├── referrerClassifier.ts    # Referrer categorisation (direct/search/social/other)
│   └── featureFlags.ts          # Feature flag enum + runtime check from env
│
└── jobs/
    ├── seedPlans.ts             # Startup plan seeding (Free/Pro/Enterprise)
    └── healthCheckJob.ts        # Periodic batch health check for stale links
```

---

## Subscription Plans

| Feature | Free | Pro | Enterprise |
|---|---|---|---|
| **Price (Monthly)** | $0 | $29.99 | $99.99 |
| **Price (Yearly)** | $0 | $299.90 | $999.90 |
| **Max Links** | 100 | 10,000 | 1,000,000 |
| **Custom Domains** | 0 | 5 | 50 |
| **API Rate Limit (Monthly)** | 100 requests | 10,000 requests | 100,000 requests |
| **Password Protection** | ✅ | ✅ | ✅ |
| **API Access** | ✅ | ✅ | ✅ |
| **Advanced Stats** | — | ✅ | ✅ |
| **Custom Domains** | — | ✅ | ✅ |
| **Bulk Operations** | — | ✅ | ✅ |
| **Affiliate Links** | — | ✅ | ✅ |
| **Priority Support** | — | — | ✅ |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (Neon) |
| `SUPABASE_URL` | **Yes** | — | Supabase project URL |
| `LINK_ACCESS_SECRET` | **Yes** | — | JWT secret for password access tokens |
| `ENCRYPTION_KEY` | **Yes** | — | Key for AES-256-GCM PII encryption |
| `CSRF_SECRET` | **Yes** | — | HMAC secret for CSRF token signing |
| `FINGERPRINT_SECRET` | **Yes** | — | HMAC secret for visitor fingerprinting |
| `BASE_URL` | **Yes** | — | Public-facing base URL for short links |
| `PORT` | No | `3000` | HTTP server port |
| `CORS_ORIGINS` | No | `*` | Comma-separated allowed origins |
| `SUPABASE_SERVICE_ROLE_KEY` | No | — | Supabase service role key (for email ops) |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | General rate limit window (ms) |
| `RATE_LIMIT_MAX` | No | `100` | General rate limit max requests |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | `60000` | Auth rate limit window (ms) |
| `AUTH_RATE_LIMIT_MAX` | No | `3` | Auth rate limit max requests |
| `HEALTH_CHECK_INTERVAL_MS` | No | `3600000` | Health check job interval (0 to disable) |
| `UNIQUE_VISIT_WINDOW_HOURS` | No | `24` | Unique visitor deduplication window |
| `PASSWORD_MAX_AGE_DAYS` | No | `0` | Max password age (0 = unlimited) |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `NODE_ENV` | No | `development` | Environment |
| `REDIS_URL` | No | — | Redis connection string (optional) |
| `REDIS_CACHE_TTL` | No | `300` | Cache TTL in seconds |
| `DATABASE_REPLICA_URL` | No | — | Read replica connection string (optional) |
| `STRIPE_SECRET_KEY` | No | — | Stripe secret key (optional) |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook signing secret |
| `STRIPE_PRICE_FREE/PRO/ENTERPRISE` | No | — | Stripe price IDs |
| `BILLING_SUCCESS_URL` | No | — | Stripe checkout success redirect |
| `BILLING_CANCEL_URL` | No | — | Stripe checkout cancel redirect |
| `BILLING_RETURN_URL` | No | `BASE_URL` | Stripe portal return URL |
| `SENTRY_DSN` | No | — | Sentry DSN for error tracking |
| `FEATURE_*` | No | — | Feature flags (enabled/disabled) |

---

## Security Architecture

- **SSRF Prevention**: URL validation runs on every link creation — blocks private IP ranges (IPv4 + IPv6), DNS-resolved private addresses, and domain blocklists
- **PII Encryption**: IP addresses and email addresses are encrypted at rest using AES-256-GCM with a derived key from `ENCRYPTION_KEY`
- **Password Hashing**: Link passwords and API keys are hashed with bcrypt (cost factor 12)
- **CSRF Protection**: Double-submit cookie pattern with HMAC-signed tokens
- **Rate Limiting**: 6 independent rate limiters covering different attack surfaces
- **Bot Protection**: User-Agent pattern matching blocks headless browsers and known crawlers
- **Phishing Blocklist**: Regex patterns detect typosquatting and common phishing URL structures
- **CORS**: Origin validation configurable via `CORS_ORIGINS`
- **Helmet**: Standard web security headers
- **Sentry**: Optional error monitoring and tracking

---

## Feature Flags

Linkify uses environment-variable-based feature flags for runtime control. Each flag is set to either `enabled` or `disabled`.

| Flag | Default | Description |
|---|---|---|
| `FEATURE_BULK_OPERATIONS` | `enabled` | Bulk tag, move, extend, delete operations |
| `FEATURE_LINK_CHAINING` | `enabled` | Short link to short link redirects with depth limit |
| `FEATURE_LINK_ROTATION` | `disabled` | A/B testing with weighted traffic distribution |
| `FEATURE_DEEP_LINKING` | `disabled` | Platform-aware mobile vs desktop routing |
| `FEATURE_MULTI_LANGUAGE` | `disabled` | Accept-Language based redirect routing |
| `FEATURE_WEBHOOK_SYSTEM` | `disabled` | Event-driven webhook notifications |
| `FEATURE_GRAPHQL` | `disabled` | GraphQL API endpoint |
| `FEATURE_SCHEDULED_LINKS` | `enabled` | Scheduled activation and expiry timestamps |
| `FEATURE_RETENTION_ANALYSIS` | `disabled` | Returning visitor tracking and cohort analysis |
| `FEATURE_EXPORT_SCHEDULER` | `disabled` | Recurring CSV/JSON export to email or S3 |

---

## API Design Principles

- **Consistent Response Envelope**: Every endpoint returns `{ success, data?, error?, code? }`
- **Standardised Error Codes**: Machine-readable error codes for programmatic error handling
- **Uniform Pagination**: All list endpoints use the same `{ page, limit, total, totalPages }` structure
- **Input Validation**: All request bodies and query parameters are validated with Zod schemas
- **Idempotent Bulk Operations**: Each item in a bulk response has its own success/failure status
- **Async-Safe**: Visit recording and cache operations are fire-and-forget to minimise redirect latency
- **Multi-Status Responses**: Bulk endpoints return `207 Multi-Status` when some items fail
