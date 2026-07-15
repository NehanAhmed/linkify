# Linkify API Reference

> **Base URL**: `http://localhost:3000` (development) | `https://your-domain.com` (production)
>
> **API Version**: 1.0.0

---

## Table of Contents

- [Authentication](#authentication)
- [Standard Response Envelope](#standard-response-envelope)
- [Error Codes](#error-codes)
- [Pagination](#pagination)
- [Rate Limiting](#rate-limiting)
- [Auth API](#auth-api)
- [URLs API](#urls-api)
- [Collections API](#collections-api)
- [Tags API](#tags-api)
- [Custom Domains API](#custom-domains-api)
- [Billing API](#billing-api)
- [Admin API](#admin-api)
- [Public Endpoints](#public-endpoints)
- [System & Health](#system--health)
- [Database Schema](#database-schema)

---

## Authentication

Linkify supports two authentication methods: **JWT Bearer Tokens** (from Supabase Auth) and **API Keys**. All authenticated endpoints require the `Authorization: Bearer <token>` header.

### JWT Authentication

JWT tokens are issued by Supabase Auth. The server verifies tokens against the Supabase JWKS endpoint.

```http
Authorization: Bearer <supabase-jwt-token>
```

### API Key Authentication

API keys use the `linkify_` prefix format. The raw key is shown only once at creation.

```http
Authorization: Bearer <api-key>
```

### CSRF Protection

All state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) under `/api` require a CSRF token **unless** using Bearer auth.

1. `GET /api/auth/csrf-token` → receive `{ token: "..." }`
2. `Set-Cookie: csrf-token=<signed>` (httpOnly, sameSite=strict)
3. Include header: `x-csrf-token: <token from step 1>`

### AAL2 / Two-Factor Authentication

Sensitive admin operations require **AAL2** (Supabase 2FA). Include header:

```
x-aal: aal2
```

---

## Standard Response Envelope

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "url", "message": "URL is required" }
  ]
}
```

---

## Error Codes

| Code | HTTP | Description |
|---|---|---|
| `AUTH_HEADER_MISSING` | 401 | No Authorization header |
| `AUTH_INVALID_FORMAT` | 401 | Not Bearer scheme |
| `AUTH_INVALID_TOKEN` | 401 | Token expired or malformed |
| `AUTH_INVALID_KEY` | 401 | API key not found or invalid |
| `AUTH_REQUIRED` | 401 | Authentication required for this resource |
| `FORBIDDEN` | 403 | Insufficient role permissions |
| `AAL2_REQUIRED` | 403 | Two-factor authentication required |
| `IP_NOT_ALLOWED` | 403 | IP not in API key allowlist |
| `CSRF_TOKEN_MISSING` | 403 | CSRF token header or cookie absent |
| `CSRF_TOKEN_INVALID` | 403 | CSRF token mismatch |
| `URL_NOT_FOUND` | 404 | Short URL code not found |
| `LINK_EXPIRED` | 410 | Short URL has passed its expiry date |
| `LINK_NOT_ACTIVE` | 410 | Short URL is scheduled but not yet active |
| `QR_CODE_EXPIRED` | 410 | QR code has passed its `qrExpiresAt` date |
| `QR_NOT_YET_EXPIRED` | 400 | Attempted to regenerate a QR that has not yet expired |
| `LINK_PASSWORD_REQUIRED` | 401 | Link is password-protected; token needed |
| `INCORRECT_PASSWORD` | 403 | Submitted password does not match |
| `PASSWORD_EXPIRED` | 403 | Link password has expired per policy |
| `NO_PASSWORD` | 400 | No password set on link |
| `INVALID_ACCESS_TOKEN` | 403 | Password access token invalid/expired |
| `BOTS_BLOCKED` | 403 | Bot user-agent blocked for this link |
| `CODE_TAKEN` | 409 | Custom code already in use |
| `RESERVED_CODE` | 409 | Code is reserved (e.g. "api", "admin") |
| `INVALID_URL` | 400 | URL failed to parse |
| `INVALID_PROTOCOL` | 400 | Only http/https allowed |
| `PRIVATE_IP` | 400 | URL resolves to a private IP address |
| `BLOCKED_DOMAIN` | 400 | Domain is on the blocklist |
| `SUSPICIOUS_URL` | 400 | URL matches phishing/lookalike pattern |
| `CHAIN_TOO_DEEP` | 409 | Link chain exceeds 5 hops |
| `CHAIN_CYCLE` | 409 | Circular redirect detected |
| `CHAIN_URL_NOT_FOUND` | 404 | Intermediate chained link not found |
| `COLLECTION_NOT_FOUND` | 404 | Collection does not exist |
| `TAG_NOT_FOUND` | 404 | Tag does not exist |
| `TAG_EXISTS` | 409 | Tag name already in use |
| `TAGS_NOT_FOUND` | 404 | No valid tags found |
| `DOMAIN_NOT_FOUND` | 404 | Custom domain not found |
| `DOMAIN_TAKEN` | 409 | Domain already registered by another user |
| `DOMAIN_ALREADY_VERIFIED` | 400 | Domain already verified |
| `PLAN_LIMIT_REACHED` | 403 | Link/domain limit exceeded for plan |
| `FEATURE_NOT_AVAILABLE` | 403 | Feature not included in current plan |
| `QUOTA_EXHAUSTED` | 429 | Monthly API rate limit depleted |
| `PLAN_NOT_FOUND` | 404 | Subscription plan not found |
| `SUBSCRIPTION_NOT_FOUND` | 404 | No active subscription found |
| `NO_CUSTOMER` | 404 | No Stripe customer record |
| `BILLING_NOT_CONFIGURED` | 503 | Stripe not configured on server |
| `STRIPE_SIGNATURE_MISSING` | 400 | Webhook signature header absent |
| `STRIPE_WEBHOOK_NOT_CONFIGURED` | 500 | Webhook secret not set |
| `API_KEY_NOT_FOUND` | 404 | API key does not exist |
| `INVALID_PLAN_CODE` | 400 | Unrecognised plan code |
| `INVALID_OPERATION` | 400 | Unrecognised bulk operation |
| `INVALID_ROLE` | 400 | Role must be "user" or "admin" |
| `USER_NOT_FOUND` | 404 | User not found |
| `CSV_PARSE_ERROR` | 400 | CSV could not be parsed |
| `CSV_EMPTY` | 400 | CSV has no data rows |
| `CSV_TOO_LARGE` | 400 | CSV exceeds 500 row limit |
| `TOKEN_REFRESH_FAILED` | 401 | Supabase token refresh failed |
| `PASSWORD_RESET_FAILED` | 400 | Password reset email failed |
| `ACCESS_TOKEN_REQUIRED` | 401 | Password access token missing |
| `TOKEN_MISMATCH` | 403 | Token does not match requested code |

---

## Pagination

List endpoints return paginated responses with the following structure:

```json
{
  "success": true,
  "data": {
    "urls": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 57,
      "totalPages": 6
    }
  }
}
```

Query parameters: `?page=1&limit=10` (default: page=1, limit=10, max limit=100)

---

## Rate Limiting

| Limiter | Window | Max Requests | Scope | Applied To |
|---|---|---|---|---|
| General | Configurable (default 60s) | 100 | IP | Global (Express) |
| Strict | 60s | 10 | IP | POST `/api/urls` |
| Bulk | 60s | 5 | IP | Bulk create, bulk ops, CSV import |
| Password | 60s | 5 | IP + Code | Password verification endpoints |
| Auth | 60s | 3 | IP | Token refresh, password reset, API key mutations |
| Redirect | 60s | 30 | IP | Root redirect `/:code` |

---

## Auth API

All endpoints under `/api/auth`.

### `GET /api/auth/csrf-token`

Get a CSRF token. Returns the raw token in the response body and a signed cookie.

**Auth**: None

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "token": "a1b2c3d4..."
  }
}
```
`Set-Cookie: csrf-token=<signed-value>` (httpOnly, sameSite=strict, secure in production)

---

### `POST /api/auth/refresh`

Refresh a Supabase JWT token.

**Auth**: None

**Rate Limit**: Auth limiter (3 req/min)

**Request Body**:
```json
{
  "refresh_token": "string (required)"
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "access_token": "new-jwt...",
    "refresh_token": "new-refresh-token...",
    "expires_in": 3600,
    "user": { "id": "uuid" }
  }
}
```

---

### `POST /api/auth/reset-password`

Trigger a password reset email via Supabase.

**Auth**: None

**Rate Limit**: Auth limiter (3 req/min)

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

---

### `GET /api/auth/me`

Get the authenticated user's profile.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### `POST /api/auth/api-keys`

Create a new API key. The raw key is shown **only once** in the response.

**Auth**: Required

**Rate Limit**: Auth limiter (3 req/min)

**Request Body**:
```json
{
  "name": "My API Key",
  "scopes": ["urls:read", "urls:write"],
  "expiresAt": "2025-01-01T00:00:00.000Z",
  "allowedIps": ["203.0.113.0/24", "198.51.100.1"]
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "key": "linkify_a1b2c3d4e5f6...",
    "name": "My API Key",
    "id": 1
  }
}
```

---

### `GET /api/auth/api-keys`

List all API keys for the authenticated user.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "My API Key",
      "scopes": ["urls:read"],
      "allowedIps": ["203.0.113.0/24"],
      "lastUsedAt": "2024-06-15T12:00:00.000Z",
      "expiresAt": "2025-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `PUT /api/auth/api-keys/:id`

Update an API key's name, scopes, allowed IPs, or expiry.

**Auth**: Required

**Rate Limit**: Auth limiter (3 req/min)

**Request Body** (all optional):
```json
{
  "name": "Renamed Key",
  "scopes": ["urls:write"],
  "allowedIps": ["10.0.0.0/8"],
  "expiresAt": "2025-06-01T00:00:00.000Z"
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "id": 1
  }
}
```

---

### `DELETE /api/auth/api-keys/:id`

Revoke an API key. The key is permanently deleted.

**Auth**: Required

**Rate Limit**: Auth limiter (3 req/min)

**Response** `200`:
```json
{
  "success": true,
  "message": "API key revoked"
}
```

---

## URLs API

All endpoints under `/api/urls`.

### `POST /api/urls`

Create a new short URL.

**Auth**: Required

**Rate Limit**: Strict limiter (10 req/min)

**Request Body**:
```json
{
  "url": "https://example.com/very-long-url",
  "customCode": "my-link",
  "ttlDays": 30,
  "password": "secret123",
  "activeAt": "2024-07-01T00:00:00.000Z",
  "blockBots": false,
  "tags": ["docs", "product"],
  "collectionId": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | **yes** | Destination URL (max 2048 chars). Auto-prepends `https://` if missing. |
| `customCode` | string | no | Custom short code (3-16 alphanumeric, hyphens, underscores). Auto-generated if omitted. |
| `ttlDays` | number | no | Link expiry in days (1-365). `null` = never expires. |
| `password` | string | no | Password protect the link (4-128 chars). Requires plan feature. |
| `activeAt` | string (ISO 8601) | no | Schedule activation date/time. |
| `qrExpiresAt` | string (ISO 8601) | no | QR code expiry date (independent of link TTL). |
| `blockBots` | boolean | no | Block known bots from accessing. Default `false`. |
| `tags` | string[] | no | Tag names to attach (max 10, max 50 chars each). Tags must exist. |
| `collectionId` | number | no | Collection ID to add link to. Requires plan feature. |

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "code": "aB3xK9m",
    "url": "https://example.com/very-long-url",
    "shortUrl": "http://localhost:3000/aB3xK9m",
    "title": null,
    "description": null,
    "image": null,
    "visits": 0,
    "uniqueVisits": 0,
    "expiresAt": "2024-08-15T12:00:00.000Z",
    "activeAt": null,
    "qrExpiresAt": null,
    "hasPassword": false,
    "blockBots": false,
    "createdAt": "2024-07-15T12:00:00.000Z"
  }
}
```

---

### `POST /api/urls/bulk`

Create up to 50 short URLs at once.

**Auth**: Required

**Rate Limit**: Bulk limiter (5 req/min)

**Request Body**:
```json
{
  "urls": [
    { "url": "https://example.com/page1" },
    { "url": "https://example.com/page2", "customCode": "page2" }
  ]
}
```

**Response** `201` / `207`:
```json
{
  "success": true,
  "data": [
    { "index": 0, "success": true, "data": { "code": "aB3xK9m", ... } },
    { "index": 1, "success": false, "error": "Code already taken" }
  ]
}
```
Returns `207 Multi-Status` if any individual item failed.

---

### `GET /api/urls`

List URLs for the authenticated user with optional filters.

**Auth**: Required

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 100) |
| `q` | string | — | Search query (matches URL and code, case-insensitive) |
| `createdAfter` | ISO 8601 | — | Filter by creation date start |
| `createdBefore` | ISO 8601 | — | Filter by creation date end |
| `minVisits` | number | — | Minimum visit count |
| `sortBy` | enum | `createdAt` | `createdAt`, `visits`, `code` |
| `sortOrder` | enum | `desc` | `asc`, `desc` |
| `tagIds` | string (comma-separated) | — | Filter by tag IDs |
| `collectionId` | number | — | Filter by collection ID |
| `hasPassword` | boolean | — | Filter by password protection status |
| `isActive` | boolean | — | Filter by active status (not expired, within schedule) |

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "urls": [
      {
        "code": "aB3xK9m",
        "url": "https://example.com",
        "shortUrl": "http://localhost:3000/aB3xK9m",
        "title": "Example Title",
        "description": "OG description",
        "image": "https://example.com/og.jpg",
        "visits": 42,
        "uniqueVisits": 35,
        "expiresAt": null,
        "activeAt": null,
        "hasPassword": false,
        "blockBots": false,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 57,
      "totalPages": 6
    }
  }
}
```

---

### `GET /api/urls/:code`

Redirect to the destination URL. If the link is password-protected, include `?token=<access-token>`.

**Auth**: None (public redirect)

**Rate Limit**: Redirect limiter (30 req/min on root `/:code`)

**Path Parameter**: `code` — short URL code (3-16 alphanumeric characters)

**Response**: `301 Redirect` to the destination URL.

**Error Responses**:
- `401`: Link is password protected (include `?token=`)
- `403`: Bots blocked
- `404`: Code not found
- `410`: Link expired or not yet active

---

### `GET /api/urls/:code/info`

Get metadata about a short URL without redirecting.

**Auth**: None

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "code": "aB3xK9m",
    "url": "https://example.com",
    "title": "Example Title",
    "description": "OG description",
    "image": "https://example.com/og.jpg",
    "visits": 42,
    "uniqueVisits": 35,
    "expiresAt": null,
    "activeAt": null,
    "qrExpiresAt": null,
    "hasPassword": false,
    "blockBots": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### `GET /api/urls/:code/visits`

Get paginated visit log for a short URL.

**Auth**: None

**Query Parameters**: `page` (default 1), `limit` (default 10, max 100)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "visits": [
      {
        "id": 1,
        "code": "aB3xK9m",
        "ipAddress": null,
        "userAgent": "Mozilla/5.0...",
        "referer": "https://twitter.com/...",
        "country": "US",
        "city": "San Francisco",
        "deviceType": "mobile",
        "os": "iOS",
        "browser": "Safari",
        "browserVersion": "17.0",
        "referrerCategory": "social",
        "isBot": false,
        "visitedAt": "2024-06-15T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    }
  }
}
```

> **Note**: IP addresses are encrypted at rest (AES-256-GCM) and returned as `null` in API responses.

---

### `GET /api/urls/:code/stats`

Get analytics statistics for a short URL (hourly + daily aggregation, last 7 days).

**Auth**: None

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "totalVisits": 42,
    "uniqueVisits": 35,
    "hourly": [
      { "hour": "2024-06-15T10:00:00.000Z", "visits": 5, "uniqueVisits": 4 }
    ],
    "daily": [
      { "date": "2024-06-15", "visits": 20, "uniqueVisits": 15 }
    ]
  }
}
```

---

### `GET /api/urls/:code/visits/export`

Export visit log as a CSV file (UTF-8 BOM).

**Auth**: None

**Response**: `200` with `Content-Type: text/csv` and `Content-Disposition: attachment; filename="<code>-visits.csv"`

CSV columns: `id`, `code`, `ip_address`, `user_agent`, `referer`, `country`, `city`, `device_type`, `os`, `browser`, `browser_version`, `referrer_category`, `is_bot`, `visited_at`

---

### `GET /api/urls/:code/qr`

Get a QR code for the short URL. The QR encodes the **short URL** (not the destination), so scans are recorded as visits and respect link expiry, password protection, and scheduled activation.

**Auth**: Required (owner only)

**Rate Limit**: Standard (120 req/min)

**Path Parameters**:

| Param | Type | Description |
|---|---|---|
| `code` | string | Short URL code (3-16 alphanumeric) |

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | enum | `png` | `png` or `svg` |
| `logo` | string | — | URL of an optional logo image to embed in the centre |

**Response** `200`:
- `Content-Type: image/png` or `image/svg+xml`
- `Content-Disposition: attachment; filename="<code>-qr.<format>"`

The QR is cached in the `qr_codes` table on first generation. Subsequent requests with the same `(code, format, logo)` combination return the cached version.

**Error Responses**:
- `404 URL_NOT_FOUND` — code does not exist or is not owned by the requesting user
- `410 QR_CODE_EXPIRED` — QR has a `qrExpiresAt` date that has passed

**cURL Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/urls/aB3xK9m/qr?format=svg&logo=https://example.com/logo.png" \
  --output qr-code.svg
```

---

### `POST /api/urls/:code/qr/regenerate`

Regenerate an expired QR code with a new expiry date.

**Auth**: Required (owner only)

**Rate Limit**: Standard (120 req/min)

**Path Parameters**:

| Param | Type | Description |
|---|---|---|
| `code` | string | Short URL code (3-16 alphanumeric) |

**Query Parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | enum | `png` | `png` or `svg` |
| `logo` | string | — | URL of an optional logo image to embed in the centre |

**Request Body**:
```json
{
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `expiresAt` | string (ISO 8601) | **yes** | New expiry datetime for the QR code |

The `expiresAt` datetime must be in ISO 8601 format.

**Response** `200`: Same as `GET /api/urls/:code/qr` — the new QR code image.

**Error Responses**:
- `404 URL_NOT_FOUND` — code does not exist or is not owned by the requesting user
- `400 QR_NOT_YET_EXPIRED` — QR has not expired yet; cannot regenerate until after `qrExpiresAt`

---

### `POST /api/urls/:code/verify-password`

Verify a password-protected link's password and receive a temporary access token.

**Auth**: None

**Rate Limit**: Password limiter (5 req/min per IP + code)

**Request Body**:
```json
{
  "password": "secret123"
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "token": "jwt-access-token..."
  }
}
```

The token is a JWT valid for 5 minutes. Use as `?token=<token>` when accessing the redirect.

---

### `DELETE /api/urls/:code`

Soft-delete a short URL. Sets `deletedAt` timestamp; the URL is no longer accessible.

**Auth**: Required (owner or admin)

**Response** `200`:
```json
{
  "success": true,
  "message": "URL soft deleted successfully"
}
```

---

### `DELETE /api/urls/:code/purge`

Permanently delete a short URL and all associated data (visits, tags, collections).

**Auth**: Required + AAL2 (owner or admin)

**Response** `200`:
```json
{
  "success": true,
  "message": "URL permanently deleted"
}
```

---

### `PATCH /api/urls/:code/settings`

Update a short URL's settings.

**Auth**: Required (owner)

**Request Body** (all optional):
```json
{
  "activeAt": "2024-08-01T00:00:00.000Z",
  "expiresAt": "2025-01-01T00:00:00.000Z",
  "qrExpiresAt": "2025-06-01T00:00:00.000Z",
  "password": "new-password",
  "blockBots": true
}
```

| Field | Type | Description |
|---|---|---|
| `activeAt` | string \| null | ISO 8601 date or `null` to clear |
| `expiresAt` | string \| null | ISO 8601 date or `null` to clear |
| `qrExpiresAt` | string \| null | ISO 8601 date or `null` to clear (independent of link expiry) |
| `password` | string \| null | New password or `null` to remove |
| `blockBots` | boolean | Toggle bot blocking |

**Response** `200`:
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

### `POST /api/urls/:code/password`

Set a password on the short URL. Overwrites any existing password.

**Auth**: Required (owner)

**Request Body**:
```json
{
  "password": "secret123"
}
```

**Response** `200`:
```json
{
  "success": true,
  "message": "Password set successfully"
}
```

---

### `DELETE /api/urls/:code/password`

Remove password protection from a short URL.

**Auth**: Required (owner)

**Response** `200`:
```json
{
  "success": true,
  "message": "Password removed successfully"
}
```

---

### `POST /api/urls/:code/verify-password-token`

Verify a password and receive a JWT access token (alternative to the URL controller variant).

**Auth**: None

**Rate Limit**: Password limiter (5 req/min per IP + code)

**Request Body**:
```json
{
  "password": "secret123"
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "token": "jwt-access-token..."
  }
}
```

---

### `POST /api/urls/bulk-operations`

Execute a bulk operation on multiple short URLs.

**Auth**: Required

**Rate Limit**: Bulk limiter (5 req/min)

**Request Body**:
```json
{
  "operation": "tag",
  "codes": ["code1", "code2"],
  "tagIds": [1, 2],
  "collectionId": 1,
  "extendDays": 30
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `operation` | enum | **yes** | `tag`, `move`, `extend`, `delete` |
| `codes` | string[] | **yes** | URL codes to operate on (1-100) |
| `tagIds` | number[] | for tag | Tag IDs to assign |
| `collectionId` | number | for move | Collection ID to move URLs to |
| `extendDays` | number | for extend | Days to extend expiry by (1-365) |

**Response** `200` / `207`:
```json
{
  "success": true,
  "data": [
    { "code": "code1", "success": true },
    { "code": "code2", "success": false, "error": "URL not found" }
  ]
}
```

---

### `POST /api/urls/import/csv`

Import URLs from a CSV string. Create up to 500 URLs.

**Auth**: Required

**Rate Limit**: Bulk limiter (5 req/min)

**Request Body**:
```json
{
  "csv": "url,customCode,ttlDays,password,activeAt,tags\nhttps://example.com,,30,,,\"tag1,tag2\"",
  "collectionId": 1
}
```

Supported CSV columns: `url` (required), `customCode`, `ttlDays`, `password`, `activeAt`, `tags` (comma-separated)

**Response** `201` / `207`:
```json
{
  "success": true,
  "data": [
    { "code": "aB3xK9m", "success": true, "url": "http://localhost:3000/aB3xK9m" },
    { "code": "row 2", "success": false, "error": "Missing url column" }
  ]
}
```

---

## Collections API

All endpoints under `/api/collections`. **All require authentication.**

### `GET /api/collections`

List collections for the authenticated user, with URL counts.

**Auth**: Required

**Query Parameters**: `page` (default 1), `limit` (default 10, max 100)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id": 1,
        "name": "Marketing",
        "parentId": null,
        "sortOrder": 0,
        "urlCount": 12,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
  }
}
```

---

### `POST /api/collections`

Create a new collection.

**Auth**: Required

**Request Body**:
```json
{
  "name": "Marketing",
  "parentId": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **yes** | Collection name (1-100 chars) |
| `parentId` | number | no | Parent collection ID for nesting |

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Marketing",
    "parentId": null,
    "userId": "uuid",
    "sortOrder": 0,
    "shareToken": null,
    "sharedAt": null,
    "createdAt": "2024-07-01T00:00:00.000Z",
    "updatedAt": "2024-07-01T00:00:00.000Z"
  }
}
```

---

### `PATCH /api/collections/reorder`

Reorder collections by updating their sort order in bulk.

**Auth**: Required

**Request Body**:
```json
[
  { "id": 1, "sortOrder": 0 },
  { "id": 2, "sortOrder": 1 }
]
```

**Response** `200`:
```json
{
  "success": true,
  "message": "Collections reordered successfully"
}
```

---

### `GET /api/collections/:id`

Get a single collection with full details.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Marketing",
    "parentId": null,
    "userId": "uuid",
    "sortOrder": 0,
    "shareToken": null,
    "sharedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### `PATCH /api/collections/:id`

Update a collection's name, parent, or sort order.

**Auth**: Required

**Request Body** (all optional):
```json
{
  "name": "Updated Name",
  "parentId": null,
  "sortOrder": 2
}
```

**Response** `200`: Returns updated collection object.

---

### `DELETE /api/collections/:id`

Delete a collection. Does not delete the URLs within it.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "message": "Collection deleted successfully"
}
```

---

### `POST /api/collections/:id/share`

Generate a public share link for a collection.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "shareToken": "uuid",
    "shareUrl": "/api/shared/<uuid>"
  }
}
```

---

### `DELETE /api/collections/:id/share`

Revoke a collection's public share link.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "message": "Collection share revoked"
}
```

---

### `GET /api/collections/:id/urls`

Get URLs within a collection.

**Auth**: Required

**Query Parameters**: `page` (default 1), `limit` (default 10, max 100)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "urlCodes": ["aB3xK9m", "xyz123"],
    "pagination": { "page": 1, "limit": 10, "total": 2, "totalPages": 1 }
  }
}
```

---

### `POST /api/collections/:id/urls`

Add a URL to a collection.

**Auth**: Required

**Request Body**:
```json
{
  "urlCode": "aB3xK9m"
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "urlCode": "aB3xK9m",
    "collectionId": 1
  }
}
```

---

### `DELETE /api/collections/:id/urls`

Remove a URL from a collection.

**Auth**: Required

**Request Body**:
```json
{
  "urlCode": "aB3xK9m"
}
```

**Response** `200`:
```json
{
  "success": true,
  "message": "URL removed from collection"
}
```

---

## Tags API

All endpoints under `/api/tags`. **All require authentication.**

### `GET /api/tags`

List tags for the authenticated user, with URL counts.

**Auth**: Required

**Query Parameters**: `page` (default 1), `limit` (default 10, max 100)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": 1,
        "name": "docs",
        "color": "#6366f1",
        "urlCount": 5,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
  }
}
```

---

### `POST /api/tags`

Create a new tag.

**Auth**: Required

**Request Body**:
```json
{
  "name": "docs",
  "color": "#6366f1"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **yes** | Tag name (1-50 chars, unique per user) |
| `color` | string | no | Hex colour (default `#6366f1`) |

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "docs",
    "color": "#6366f1",
    "userId": "uuid",
    "createdAt": "2024-07-01T00:00:00.000Z"
  }
}
```

---

### `PATCH /api/tags/:id`

Update a tag's name or colour.

**Auth**: Required

**Request Body** (all optional):
```json
{
  "name": "documentation",
  "color": "#ff0000"
}
```

**Response** `200`: Returns updated tag object.

---

### `DELETE /api/tags/:id`

Delete a tag. Removes associations from all URLs.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "message": "Tag deleted successfully"
}
```

---

### `POST /api/tags/bulk`

Assign tags to multiple URLs in bulk.

**Auth**: Required

**Rate Limit**: Bulk limiter (5 req/min)

**Request Body**:
```json
{
  "codes": ["aB3xK9m", "xyz123"],
  "tagIds": [1, 2]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `codes` | string[] | **yes** | URL codes to tag (1-100) |
| `tagIds` | number[] | **yes** | Tag IDs to assign (1-20) |

**Response** `200` / `207`:
```json
{
  "success": true,
  "data": [
    { "code": "aB3xK9m", "success": true },
    { "code": "xyz123", "success": false, "error": "URL not found" }
  ]
}
```

---

### `GET /api/tags/:id/urls`

Get URLs associated with a tag.

**Auth**: Required

**Query Parameters**: `page` (default 1), `limit` (default 10, max 100)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "urlCodes": ["aB3xK9m"],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
}
```

---

## Custom Domains API

All endpoints under `/api/domains`. **All require authentication + API quota.**

### `POST /api/domains`

Register a new custom domain for your short URLs.

**Auth**: Required

**Quota**: Checked

**Request Body**:
```json
{
  "domain": "links.example.com"
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "domain": "links.example.com",
    "verificationToken": "a1b2c3d4e5f6...",
    "verifiedAt": null,
    "sslStatus": "pending",
    "active": false,
    "createdAt": "2024-07-01T00:00:00.000Z",
    "dnsRecord": "_linkify-domain-verification TXT \"a1b2c3d4e5f6...\""
  }
}
```

Add the returned `dnsRecord` as a TXT record in your DNS provider.

---

### `GET /api/domains`

List custom domains for the authenticated user.

**Auth**: Required

**Quota**: Checked

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "domain": "links.example.com",
      "verifiedAt": null,
      "sslStatus": "pending",
      "active": false,
      "createdAt": "2024-07-01T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/domains/:id/verify`

Mark a domain as verified (one-click after DNS propagation).

**Auth**: Required

**Quota**: Checked

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "message": "Domain verified successfully",
    "sslStatus": "pending"
  }
}
```

---

### `DELETE /api/domains/:id`

Remove a custom domain.

**Auth**: Required

**Quota**: Checked

**Response** `200`:
```json
{
  "success": true,
  "message": "Domain removed successfully"
}
```

---

## Billing API

Endpoints under `/api/billing`.

### `GET /api/billing/plans`

List all active subscription plans.

**Auth**: None

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Free",
      "code": "free",
      "description": "Essential link management for individuals",
      "maxLinks": 100,
      "maxCustomDomains": 0,
      "apiRateLimit": 100,
      "features": {
        "advancedStats": false,
        "customDomains": false,
        "passwordProtection": true,
        "bulkOperations": false,
        "apiAccess": true,
        "affiliateLinks": false,
        "prioritySupport": false
      },
      "priceMonthly": 0,
      "priceYearly": 0,
      "sortOrder": 0
    }
  ]
}
```

---

### `POST /api/billing/checkout`

Create a Stripe Checkout Session for a subscription.

**Auth**: Required

**Request Body**:
```json
{
  "planCode": "pro"
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/...",
    "sessionId": "cs_test_..."
  }
}
```

---

### `GET /api/billing/portal`

Get a Stripe Customer Portal URL for managing the subscription.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/..."
  }
}
```

---

### `GET /api/billing/subscription`

Get the current user's subscription and plan details.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "plan": {
      "planId": 2,
      "planCode": "pro",
      "planName": "Pro",
      "maxLinks": 10000,
      "maxCustomDomains": 5,
      "apiRateLimit": 10000,
      "features": {
        "advancedStats": true,
        "customDomains": true,
        "passwordProtection": true,
        "bulkOperations": true,
        "apiAccess": true,
        "affiliateLinks": true,
        "prioritySupport": false
      },
      "status": "active",
      "currentPeriodEnd": "2024-08-01T00:00:00.000Z",
      "cancelAtPeriodEnd": false
    },
    "subscription": {
      "id": 1,
      "status": "active",
      "currentPeriodStart": "2024-07-01T00:00:00.000Z",
      "currentPeriodEnd": "2024-08-01T00:00:00.000Z",
      "cancelAtPeriodEnd": false,
      "trialEnd": null
    }
  }
}
```

---

### `POST /api/billing/cancel`

Cancel a subscription at period end.

**Auth**: Required

**Request Body**:
```json
{
  "subscriptionId": 1
}
```

**Response** `200`:
```json
{
  "success": true,
  "message": "Subscription will be cancelled at period end"
}
```

---

### `GET /api/billing/usage`

Get the current user's usage statistics and plan.

**Auth**: Required

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "totalLinks": 42,
    "totalVisits": 1200,
    "plan": { "...": "..." },
    "quotaMonth": "2025-07"
  }
}
```

---

## Admin API

All endpoints under `/api/admin`. **All require authentication + `admin` role.** Some require AAL2 (2FA).

### `GET /api/admin/dashboard`

Get platform-wide dashboard statistics.

**Auth**: Admin

**Query Parameters**: `days` (default 30, max 365)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "users": { "total": 150, "delta": 12 },
    "urls": { "total": 3500, "delta": 200 },
    "visits": { "total": 50000, "delta": 3000 },
    "activeSubscriptions": 25,
    "mrr": 75000,
    "quotaMonth": "2025-07",
    "storageEstimateMb": 2.5
  }
}
```

---

### `GET /api/admin/users`

List all users with their link counts.

**Auth**: Admin

**Query Parameters**: `page` (default 1), `limit` (default 20, max 100)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "role": "user",
        "suspendedAt": null,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "linkCount": 12
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
  }
}
```

---

### `GET /api/admin/users/:id`

Get detailed information about a specific user.

**Auth**: Admin

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "suspendedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "linkCount": 12,
    "visitCount": 450,
    "subscription": {
      "plan": "Pro",
      "status": "active",
      "currentPeriodEnd": "2024-08-01T00:00:00.000Z",
      "cancelAtPeriodEnd": false
    }
  }
}
```

---

### `PATCH /api/admin/users/:id/role`

Update a user's role.

**Auth**: Admin + AAL2

**Request Body**:
```json
{
  "role": "admin"
}
```

**Response** `200`:
```json
{
  "success": true
}
```

---

### `POST /api/admin/users/:id/suspend`

Suspend a user account.

**Auth**: Admin + AAL2

**Response** `200`:
```json
{
  "success": true
}
```

---

### `POST /api/admin/users/:id/unsuspend`

Unsuspend a user account.

**Auth**: Admin + AAL2

**Response** `200`:
```json
{
  "success": true
}
```

---

### `GET /api/admin/users/:id/links`

Get all links belonging to a specific user.

**Auth**: Admin

**Query Parameters**: `page` (default 1), `limit` (default 20, max 100)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "links": [
      {
        "code": "aB3xK9m",
        "url": "https://example.com",
        "visits": 42,
        "uniqueVisits": 35,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "deletedAt": null
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
  }
}
```

---

### `GET /api/admin/audit-log`

Get the platform-wide audit log.

**Auth**: Admin

**Query Parameters**: `page` (default 1), `limit` (default 20, max 100), `action` (optional), `userId` (optional)

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": 1,
        "userId": "uuid",
        "action": "url.deleted",
        "resource": "url",
        "resourceId": "aB3xK9m",
        "metadata": null,
        "ipAddress": "203.0.113.1",
        "createdAt": "2024-07-01T12:00:00.000Z",
        "userEmail": "admin@example.com"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
  }
}
```

---

### `GET /api/admin/billing/stats`

Get aggregated billing statistics.

**Auth**: Admin

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalLinks": 3500,
    "totalVisits": 50000,
    "activeSubscriptions": 25,
    "mrr": 75000,
    "quotaMonth": "2025-07"
  }
}
```

---

### `GET /api/admin/system/config`

Get the current system configuration (non-sensitive values only).

**Auth**: Admin

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "nodeEnv": "production",
    "baseUrl": "https://your-domain.com",
    "baseUrlHost": "your-domain.com",
    "redisConfigured": true,
    "stripeConfigured": true,
    "sentryConfigured": false,
    "readReplicaConfigured": false,
    "healthCheckIntervalMs": 3600000,
    "rateLimitMax": 100,
    "authRateLimitMax": 3,
    "featureFlags": { "...": { "enabled": true, "description": "..." } }
  }
}
```

---

### `GET /api/admin/system/flags`

Get all feature flags and their current status.

**Auth**: Admin

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "BulkOperations": { "enabled": true, "description": "Bulk tag, move, extend, delete operations" },
    "LinkChaining": { "enabled": true, "description": "Short link to short link redirects" },
    "ScheduledLinks": { "enabled": true, "description": "Scheduled activation and expiry timestamps" }
  }
}
```

---

### `POST /api/admin/maintenance/purge-expired`

Purge all soft-deleted URLs older than the specified days.

**Auth**: Admin + AAL2

**Request Body**:
```json
{
  "daysOld": 30
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "purgedCount": 15
  }
}
```

---

### `POST /api/admin/maintenance/recheck-links`

Trigger a batch health check on stale links.

**Auth**: Admin + AAL2

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "checkedCount": 20
  }
}
```

---

### `GET /api/admin/maintenance/status`

Get the current maintenance job status.

**Auth**: Admin

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "lastPurgeAt": "2024-07-01T12:00:00.000Z",
    "lastPurgeCount": 15,
    "lastHealthCheckAt": "2024-07-01T12:30:00.000Z",
    "lastHealthCheckCount": 20,
    "healthCheckIntervalMs": 3600000
  }
}
```

---

## Public Endpoints

### `GET /api/shared/:token`

Get a publicly shared collection by its share token.

**Auth**: None

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "collection": {
      "id": 1,
      "name": "Marketing Resources",
      "urlCount": 5
    },
    "urls": [
      {
        "code": "aB3xK9m",
        "url": "https://example.com",
        "title": "Example",
        "description": null,
        "image": null,
        "visits": 42
      }
    ]
  }
}
```

---

### `GET /:code`

Root-level redirect. Matches codes of 3-16 alphanumeric characters.

**Auth**: None

**Rate Limit**: Redirect limiter (30 req/min)

**Behaviour**: Identical to `GET /api/urls/:code`. Resolves chained links, checks passwords via `?token=`, checks bot blocking, records a visit, and returns a `301 Redirect`.

---

## System & Health

### `GET /api/health`

Get the server's health status.

**Auth**: None

**Response** `200` (healthy) or `503` (degraded/down):
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 3600,
    "timestamp": "2024-07-01T12:00:00.000Z",
    "db": { "connected": true },
    "redis": { "connected": true, "configured": true },
    "version": "1.0.0"
  }
}
```

---

### Stripe Webhook

### `POST /api/stripe/webhook`

Stripe webhook receiver. Expects raw JSON body with Stripe signature verification.

**Auth**: Signature verification via `stripe-signature` header

**Handled Events**:
- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Response** `200`:
```json
{
  "received": true
}
```

---

## Database Schema

### `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | User ID from Supabase Auth |
| `email` | TEXT | — | Encrypted (AES-256-GCM) or plain text |
| `role` | TEXT | DEFAULT 'user', NOT NULL | `user` or `admin` |
| `suspendedAt` | TIMESTAMP | — | User suspension timestamp |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Account creation time |

### `refresh_tokens`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `userId` | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Token owner |
| `tokenHash` | TEXT | NOT NULL, UNIQUE | SHA-256 hash of refresh token |
| `expiresAt` | TIMESTAMP | NOT NULL | Token expiry |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |

### `api_keys`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `userId` | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Key owner |
| `keyHash` | TEXT | NOT NULL | bcrypt hash of the API key |
| `keyPrefix` | TEXT | NOT NULL | First 8 chars of raw key (lookup index) |
| `name` | TEXT | NOT NULL | Human-readable key name |
| `scopes` | TEXT[] | — | Permission scopes array |
| `allowedIps` | TEXT[] | — | IP/CIDR allowlist |
| `lastUsedAt` | TIMESTAMP | — | Last authentication timestamp |
| `expiresAt` | TIMESTAMP | — | Key expiry |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |

### `urls`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `code` | TEXT | PK | Short code (3-16 alphanumeric) |
| `url` | TEXT | NOT NULL | Destination URL |
| `title` | TEXT | — | Open Graph title (auto-fetched) |
| `description` | TEXT | — | Open Graph description (auto-fetched) |
| `image` | TEXT | — | Open Graph image URL (auto-fetched) |
| `visits` | INTEGER | DEFAULT 0, NOT NULL | Total visit count |
| `uniqueVisits` | INTEGER | DEFAULT 0, NOT NULL | Unique visitor count (24h fingerprint window) |
| `userId` | UUID | FK → users.id, ON DELETE CASCADE | Owner (null for anonymous) |
| `passwordHash` | TEXT | — | bcrypt hash for password protection |
| `passwordSetAt` | TIMESTAMP | — | When password was last set |
| `blockBots` | BOOLEAN | DEFAULT false, NOT NULL | Block known bots |
| `activeAt` | TIMESTAMP | — | Scheduled activation time |
| `expiresAt` | TIMESTAMP | — | Link expiry time |
| `qrExpiresAt` | TIMESTAMP | — | QR code expiry time (independent of link expiry) |
| `deletedAt` | TIMESTAMP | — | Soft-delete timestamp |
| `lastCheckedAt` | TIMESTAMP | — | Last health check timestamp |
| `lastStatusCode` | INTEGER | — | Last health check HTTP status |
| `affiliateId` | TEXT | — | Affiliate tracking ID |
| `affiliateNetwork` | TEXT | — | Affiliate network name |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |
| `updatedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Last update time |

**Indexes**: `(userId, deletedAt)`, `(deletedAt)`

### `visits`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `code` | TEXT | FK → urls.code, NOT NULL, ON DELETE CASCADE | Short URL code |
| `ipAddress` | TEXT | — | Encrypted IP (AES-256-GCM) |
| `userAgent` | TEXT | — | Raw User-Agent string |
| `referer` | TEXT | — | HTTP Referer header |
| `country` | TEXT | — | GeoIP country code |
| `city` | TEXT | — | GeoIP city name |
| `isp` | TEXT | — | ISP name (currently null) |
| `deviceType` | TEXT | — | mobile, desktop, tablet, etc. |
| `os` | TEXT | — | Operating system name |
| `browser` | TEXT | — | Browser name |
| `browserVersion` | TEXT | — | Browser version |
| `referrerCategory` | TEXT | — | direct, search, social, other |
| `isBot` | BOOLEAN | DEFAULT false, NOT NULL | Bot detection flag |
| `fingerprint` | TEXT | — | HMAC fingerprint (IP+UA+Accept-Language) |
| `isAffiliateClick` | BOOLEAN | DEFAULT false, NOT NULL | Affiliate click flag |
| `affiliateCommission` | NUMERIC | — | Affiliate commission amount |
| `visitedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Visit timestamp |

**Indexes**: `(code)`, `(visitedAt)`, `(code, visitedAt)`, `(fingerprint, code, visitedAt)`, `(ipAddress, code)`

### `collections`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `name` | TEXT | NOT NULL | Collection name |
| `parentId` | INTEGER | — | Parent collection (nesting) |
| `userId` | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner |
| `sortOrder` | INTEGER | DEFAULT 0, NOT NULL | Display order |
| `shareToken` | TEXT | UNIQUE | UUID for public sharing |
| `sharedAt` | TIMESTAMP | — | When sharing was enabled |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |
| `updatedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Last update time |

### `url_collections`

Many-to-many join between URLs and collections.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `urlCode` | TEXT | PK, FK → urls.code, ON DELETE CASCADE | Short URL code |
| `collectionId` | INTEGER | PK, FK → collections.id, ON DELETE CASCADE | Collection ID |
| `addedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | When added |

### `tags`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `name` | TEXT | NOT NULL | Tag name |
| `color` | TEXT | DEFAULT '#6366f1', NOT NULL | Hex colour |
| `userId` | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |

**Unique**: `(userId, name)`

### `url_tags`

Many-to-many join between URLs and tags.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `urlCode` | TEXT | PK, FK → urls.code, ON DELETE CASCADE | Short URL code |
| `tagId` | INTEGER | PK, FK → tags.id, ON DELETE CASCADE | Tag ID |
| `addedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | When added |

### `url_stats_hourly`

Hourly aggregated visit statistics (last 7 days available).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `code` | TEXT | PK, FK → urls.code, ON DELETE CASCADE | Short URL code |
| `hour` | TIMESTAMPTZ | PK | Hour bucket |
| `visits` | INTEGER | DEFAULT 0, NOT NULL | Total visits in hour |
| `uniqueVisits` | INTEGER | DEFAULT 0, NOT NULL | Unique visits in hour |

### `audit_log`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `userId` | UUID | FK → users.id, ON DELETE SET NULL | Actor (nullable after user deletion) |
| `action` | TEXT | NOT NULL | Action identifier (e.g. `url.deleted`) |
| `resource` | TEXT | NOT NULL | Resource type (e.g. `url`, `tag`, `api_key`) |
| `resourceId` | TEXT | — | Resource identifier |
| `metadata` | JSONB | — | Additional context data |
| `ipAddress` | TEXT | — | Actor's IP address |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |

### `plans`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `name` | TEXT | NOT NULL | Display name |
| `code` | VARCHAR(50) | NOT NULL, UNIQUE | Programmatic code (free, pro, enterprise) |
| `description` | TEXT | — | Plan description |
| `maxLinks` | INTEGER | DEFAULT 100, NOT NULL | Max short URLs |
| `maxCustomDomains` | INTEGER | DEFAULT 0, NOT NULL | Max custom domains |
| `apiRateLimit` | INTEGER | DEFAULT 100, NOT NULL | Monthly API request limit |
| `features` | JSONB | DEFAULT [], NOT NULL | Feature flags object |
| `priceMonthly` | INTEGER | DEFAULT 0, NOT NULL | Monthly price in cents |
| `priceYearly` | INTEGER | DEFAULT 0, NOT NULL | Yearly price in cents |
| `sortOrder` | INTEGER | DEFAULT 0, NOT NULL | Display order |
| `active` | BOOLEAN | DEFAULT true, NOT NULL | Whether plan is available |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |
| `updatedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Last update time |

### `subscriptions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `userId` | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Subscriber |
| `planId` | INTEGER | FK → plans.id, NOT NULL, ON DELETE RESTRICT | Selected plan |
| `stripeSubscriptionId` | TEXT | — | Stripe subscription ID |
| `stripeCustomerId` | TEXT | — | Stripe customer ID |
| `status` | TEXT | DEFAULT 'incomplete', NOT NULL | Stripe subscription status |
| `currentPeriodStart` | TIMESTAMP | — | Billing period start |
| `currentPeriodEnd` | TIMESTAMP | — | Billing period end |
| `cancelAtPeriodEnd` | BOOLEAN | DEFAULT false, NOT NULL | Scheduled cancellation flag |
| `trialEnd` | TIMESTAMP | — | Trial end date |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |
| `updatedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Last update time |

### `usage_quota`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `userId` | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | User |
| `yearMonth` | VARCHAR(7) | NOT NULL | YYYY-MM format |
| `requestsCount` | INTEGER | DEFAULT 0, NOT NULL | Request count for month |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |
| `updatedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Last update time |

**Unique**: `(userId, yearMonth)`

### `custom_domains`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `userId` | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner |
| `domain` | TEXT | NOT NULL | Domain name |
| `verificationToken` | TEXT | NOT NULL | DNS verification token |
| `verifiedAt` | TIMESTAMP | — | When verified |
| `sslStatus` | TEXT | DEFAULT 'pending', NOT NULL | SSL certificate status |
| `sslExpiresAt` | TIMESTAMP | — | SSL certificate expiry |
| `active` | BOOLEAN | DEFAULT false, NOT NULL | Whether domain is active |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |
| `updatedAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Last update time |

**Unique**: `(userId, domain)`, `(domain)`

### `qr_codes`

Cached QR code images, keyed by URL code + format + optional logo.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment ID |
| `code` | TEXT | FK → urls.code, NOT NULL, ON DELETE CASCADE | Short URL code |
| `format` | TEXT | NOT NULL | `png` or `svg` |
| `data` | TEXT | NOT NULL | Base64-encoded PNG binary or SVG text |
| `logoUrl` | TEXT | — | Optional centre logo URL |
| `createdAt` | TIMESTAMP | DEFAULT NOW(), NOT NULL | Creation time |

**Unique**: `(code, format, COALESCE(logoUrl, ''))`
