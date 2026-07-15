# QR Code Caching & Time-Limited QR — Implementation Spec

## Problem

The current QR code endpoint (`GET /api/urls/:code/qr`) generates the QR on-the-fly every request. Two issues:

1. **No caching** — every download re-renders the same QR, wasting CPU. The QR encodes the **destination URL** (not the short URL), so if the destination hasn't changed, the image is identical each time.
2. **QR encodes destination URL directly** — scans bypass linkify's redirect entirely. This means:
   - Visit analytics are **not recorded** from QR scans
   - Password-protected links are **bypassed**
   - Expired/deleted links still resolve (the QR points to the destination, not the short URL)
   - Scheduled activation is ignored

## Approach

### 1. Change what the QR encodes

Switch from encoding the **destination URL** to encoding the **short URL** (`http://localhost:3000/aB3xK9m`).

**Why:** Scanning the short URL means every request goes through the redirect handler, which:
- Records visit analytics
- Checks password protection
- Checks expiry (`expiresAt`) — the QR is naturally time-limited by the link's own TTL
- Checks scheduled activation (`activeAt`)
- Allows bot blocking, soft-delete enforcement, etc.

**In the controller** (`qr.controller.ts`), instead of:
```ts
const urlRow = await resolveUrl(code)
const targetUrl = urlRow.url
```
Use:
```ts
const targetUrl = `${BASE_URL}/${code}`  // the short URL
```
(BASE_URL being the configured `BASE_URL` from env or `http://localhost:3000`)

### 2. Cache the QR in the database

Add a `qrCode` column to the `short_urls` table (or a separate `qr_codes` table keyed by `code + format + logo_hash`).

**Schema option A — column on short_urls:**
```sql
ALTER TABLE short_urls ADD COLUMN qr_code_png bytea;
ALTER TABLE short_urls ADD COLUMN qr_code_svg text;
ALTER TABLE short_urls ADD COLUMN qr_logo_url text;
ALTER TABLE short_urls ADD COLUMN qr_updated_at timestamptz;
```

**Schema option B — separate table (more flexible):**
```sql
CREATE TABLE qr_codes (
  id serial PRIMARY KEY,
  code text NOT NULL REFERENCES short_urls(code) ON DELETE CASCADE,
  format text NOT NULL,        -- 'png' or 'svg'
  logo_url text,
  data bytea NOT NULL,         -- PNG binary or SVG text stored as bytes
  created_at timestamptz DEFAULT now(),
  UNIQUE(code, format, COALESCE(logo_url, ''))
);
```

Option B is cleaner — supports multiple formats without sparse columns, and the composite unique key prevents duplicates.

**Controller flow becomes:**
1. Parse `format` and `logo` from query params
2. Compute lookup key: `(code, format, logo_url ?? '')`
3. Check DB cache — if row exists, return `data` with appropriate Content-Type
4. If not cached, generate QR, store in DB, return it

### 3. Invalidation triggers

The cached QR must be invalidated when the **short URL encoding** changes. The QR encodes `BASE_URL/code`, and `code` never changes (it's the identity). So for the basic approach (encoding the short URL), **no invalidation is ever needed** — the QR is immutable for a given `(code, format, logo)` combination.

If you later decide to encode the destination URL or add metadata like title, then invalidation triggers would be:
- `PATCH /api/urls/:code/settings` — if destination URL or expiry changed
- `DELETE /api/urls/:code` — cascade delete the QR rows
- `DELETE /api/urls/:code/purge` — cascade delete

### 4. Time-limited QR via dedicated field (optional enhancement)

If you want QR expiry **independent** of link expiry, add a field:

```sql
ALTER TABLE short_urls ADD COLUMN qr_expires_at timestamptz;
```

This allows scenarios like:
- Link is permanent but QR for a printed flyer should expire after the campaign
- QR for a conference talk expires after the event, but the underlying link stays active for registered attendees via a password

Add `qrExpiresAt` to the URL settings form (Phase 5) and check it in the QR controller before serving.

## Summary of Changes

| File | Change |
|---|---|
| `controllers/qr.controller.ts` | Encode short URL not destination; add cache check + store |
| `services/qr.service.ts` | No change (still generates buffer/string) |
| `db/schema.ts` | Add `qr_codes` table (or columns on `short_urls`) |
| `controllers/link.controller.ts` | Add invalidation on settings update (if needed) |
| `services/url.services.ts` | Add `getQrCache` / `setQrCache` helpers |
| `pages/UrlDetailPage.tsx` | No change needed (already fetches from API) |

## Migration

- Existing saved QRs (none, since nothing is saved) — no migration needed
- After deploy, first request for each QR generates + caches it; subsequent requests return cached version
- If switching to short-URL encoding, any previously distributed QRs (encoding destination URL) will continue to work — they just won't be tracked. Newly generated QRs will encode the short URL.
