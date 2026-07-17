# Audit Report: `@linkify/dashboard`

## 1. Summary

| Check | Result |
|---|---|
| `pnpm install --filter @linkify/dashboard` | ✅ PASS |
| `pnpm --filter @linkify/dashboard typecheck` | ✅ PASS (0 errors) |
| `pnpm --filter @linkify/dashboard build` | ✅ PASS (1 warning: chunk >500 kB) |
| `pnpm --filter @linkify/dashboard lint` | ⚠️ No lint script in `package.json` |

**Finding count by severity:**

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 2 |
| Medium | 8 |
| Low | 6 |

**Total findings: 16**

---

## 2. Phase Implementation Status

### Phase 0: Foundation & Scaffolding

| Deliverable | Status | Notes |
|---|---|---|
| `@supabase/supabase-js` dep | Implemented | |
| `tailwindcss` v4 + `@tailwindcss/vite` deps | Implemented | |
| `tw-animate-css`, `tailwindcss-animate`, `tailwind-merge`, `clsx`, `class-variance-authority` deps | Implemented | |
| `lucide-react` dep | Implemented | |
| `sonner` dep | Implemented | |
| `date-fns` dep | Implemented | |
| `recharts` dep | Implemented | Version 3.8.0 (per spec) |
| `cmdk`, `input-otp`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels` deps | Partial | In `package.json` but all 5 are **unused** — no import anywhere in `src/**` |
| `@shadcn/react` dep | Missing | Listed in spec appendix but not in `package.json`; not strictly required (UI is hand-coded) |
| `@/` path alias in `vite.config.ts` | Implemented | |
| `@/` path alias in `tsconfig.json` | Implemented | |
| `index.css` with Tailwind v4 + `tw-animate-css` + Geist font | Implemented | |
| Geist font import (`@fontsource-variable/geist`) | Implemented | |
| API client (`lib/api.ts`) — all 34 helper functions | Implemented | 33 of 34 listed functions present; `regenerateQrCode` is missing |
| Supabase client (`lib/supabase.ts`) | Implemented | |
| Auth context (`hooks/use-auth.tsx`) | Implemented | |
| Shared types (`packages/shared/src/index.ts`) | Implemented | All 13 types/interfaces present |
| Root-level dashboard scripts | Implemented | `dashboard:dev`, `dashboard:build`, `dashboard:preview`, `dashboard:typecheck`, `dashboard:test` |
| `.lintstagedrc.json` dashboard entry | Implemented | |

### Phase 1: Dashboard Shell & Navigation

| Deliverable | Status | Notes |
|---|---|---|
| `AppLayout` component | Implemented | |
| `Sidebar` component | Implemented | Logo, nav items, active highlighting, mobile drawer |
| `Topbar` component | Partial | Breadcrumbs, user avatar, theme toggle, **role badge instead of plan badge** per spec |
| `PageHeader` component | Implemented | |
| Route table (14 routes) | Implemented | All 14 routes match spec exactly |
| `ProtectedRoute` component | Implemented | |
| `ThemeProvider` + `ThemeToggle` | Implemented | |
| `ErrorBoundary` component | Implemented | |
| `NotFoundPage` | Implemented | |
| Sidebar responsive (mobile icon-only) | Implemented | |

### Phase 2: Dashboard Overview

| Deliverable | Status | Notes |
|---|---|---|
| 4 stat cards (Total Links, Total Visits, Active Links, Plan Usage) | Implemented | |
| StatsCard component | Implemented | |
| Recent links list (5 most recent) | Implemented | |
| "View all" link to `/urls` | Implemented | |
| Quick-create URL form | Implemented | |
| Success animation for created link | Implemented | `animate-in slide-in-from-top-1 fade-in duration-200` |
| Error toast on quick-create | Implemented | |
| Plan status card | Implemented | |
| "Upgrade" link to `/billing` | Implemented | |
| Loading skeletons | Implemented | |
| Empty state (new user) | Implemented | |
| Plan Usage progress bar | Implemented | |
| Rate-limit awareness on quick-create | **Missing** | Spec: "show counter or disable temporarily after 10 req/min" |
| Delta/trend on stat cards | **Missing** | Spec: "subtle delta/trend if available" |

### Phase 3: URL Management — Create & List

| Deliverable | Status | Notes |
|---|---|---|
| URLs list page (`/urls`) | Implemented | |
| Data table with 8 columns | Implemented | |
| Search input (`q` param) | Implemented | |
| Date range filter | Implemented | |
| Tag filter dropdown | Implemented | |
| Collection filter dropdown | Implemented | |
| Password toggle filter | Implemented | |
| Active status toggle filter | Implemented | |
| "Clear filters" button | Implemented | |
| Filters persist in URL search params | Implemented | |
| Sort controls (code, visits, createdAt) | Implemented | |
| Pagination with page size selector | Implemented | |
| Create URL page (`/urls/new`) | Implemented | |
| URL field with validation | Implemented | |
| Custom code field | Implemented | |
| TTL presets (7d, 30d, 90d, 365d, never) | Implemented | |
| Password field | Implemented | |
| Active at date-time picker | Implemented | |
| Block bots toggle | Implemented | |
| Tags multi-select with create-new-tag | Implemented | |
| Collection dropdown | Implemented | |
| Success view with copy + "Create another" | Implemented | |
| Field-level error messages (CODE_TAKEN, INVALID_URL) | Implemented | |
| Bulk create page (`/urls/bulk`) | Implemented | |
| Line-by-line URL parsing | Implemented | |
| Client-side validation before submit | Implemented | |
| Results table with success/error | Implemented | |
| Summary bar | Implemented | |
| Empty state | Implemented | |
| **QR expires at field** in create form | **Missing** | Spec lists `qrExpiresAt` in `/urls/new` form fields |

### Phase 4: URL Detail & Analytics

| Deliverable | Status | Notes |
|---|---|---|
| URL info header with OG preview | Implemented | |
| Short URL with copy button | Implemented | |
| Destination URL (clickable) | Implemented | |
| Status badge | Implemented | |
| Created/expiry/activation dates | Implemented | |
| Visit counts (total + unique) | Implemented | |
| Settings/Delete action buttons | Implemented | |
| Visit log tab with paginated table | Implemented | |
| Country flag + name | Implemented | |
| Device type icons | Implemented | |
| Referrer category badges | Implemented | |
| Bot indicator | Implemented | |
| Stats charts tab (daily + hourly) | Implemented | Using recharts |
| Daily avg summary | Implemented | |
| Toggle total/unique visits | Implemented | |
| CSV export button | Implemented | |
| QR code generation tab | Implemented | PNG/SVG format, optional logo |
| QR code download | Implemented | |
| Tab navigation (Info/Visits/Stats/QR Code) | Implemented | |
| Loading states per tab | Implemented | |
| Empty state for stats | Implemented | "Not enough data yet..." |
| **Regenerate QR** button | **Missing** | No `regenerateQrCode` in api.ts; no UI for regenerating expired QR |
| QR expiry badge | **Missing** | No display of `qrExpiresAt` in QR tab |

### Phase 5: Link Settings & Password Protection

| Deliverable | Status | Notes |
|---|---|---|
| URL settings page (`/urls/:code/settings`) | Implemented | |
| Active at date-time picker | Implemented | |
| Expires at date-time picker | Implemented | |
| QR expires at date-time picker | Implemented | |
| Block bots toggle | Implemented | |
| "Clear" buttons for date fields | Implemented | |
| Save with loading + success toast | Implemented | |
| Password set form (password + confirm) | Implemented | |
| Password change form | Implemented | |
| Password remove with confirmation | Implemented | |
| "Password protected" badge | Implemented | |
| Soft delete with confirmation | Implemented | |
| Permanent purge with type-to-confirm | Implemented | |
| Unsaved changes warning (beforeunload) | Implemented | |
| **Show `passwordSetAt` when password is set** | **Missing** | Not in `ShortUrl` type; not displayed |
| **AAL2 proactive check for purge** | **Missing** | Spec: "if user doesn't have AAL2, show info" — only catches API error reactively |
| **Plan upgrade prompt for password protection** | **Partial** | Catches `FEATURE_NOT_AVAILABLE` from API but doesn't proactively check plan features |

### Phase 6: Collections

| Deliverable | Status | Notes |
|---|---|---|
| Collections list page (`/collections`) | Implemented | |
| Expandable tree/nested list | Implemented | Only 2 levels (parent + children); spec implies arbitrary nesting |
| Create collection dialog (name + parent) | Implemented | |
| Edit collection dialog | Implemented | |
| Delete collection with confirmation | Implemented | |
| Drag-to-reorder with `@dnd-kit` | Implemented | |
| Optimistic UI with rollback | Implemented | |
| Collection detail page (`/collections/:id`) | Implemented | |
| Add URL by code | Implemented | |
| Select from existing URLs modal | Implemented | |
| Remove URL from collection | Implemented | |
| URL code list in collection | Implemented | |
| **Share section (Generate Share Link, Revoke Share)** | **Missing** | `shareCollection` / `revokeCollectionShare` exist in api.ts but no UI in CollectionDetailPage |

### Phase 7: Tags

| Deliverable | Status | Notes |
|---|---|---|
| Tags list page (`/tags`) | Implemented | |
| Card/grid display | Implemented | |
| Color indicator dot | Implemented | |
| URL count badge | Implemented | |
| Create tag dialog (name + color picker) | Implemented | |
| Edit tag dialog | Implemented | |
| Delete tag with confirmation | Implemented | |
| Tag detail page (`/tags/:id`) | Implemented | |
| URL list with code and destination | Implemented | |
| Pagination | Implemented | |
| Color picker component (12 presets + custom hex) | Implemented | |
| Bulk tagging from URLs list page | Implemented | Via bulk action toolbar |

### Phase 8: Bulk Operations & CSV Import

| Deliverable | Status | Notes |
|---|---|---|
| Bulk action toolbar (floating bottom bar) | Implemented | |
| Selected count display | Implemented | |
| Tag selected URLs | Implemented | |
| Move to collection | Implemented | |
| Extend expiry | Implemented | |
| Delete selected | Implemented | |
| Plan-gating (Pro check) | Implemented | |
| "Clear selection" button | Implemented | |
| CSV import dialog | Implemented | |
| CSV results table | Implemented | |
| Summary bar | Implemented | |
| **Client-side CSV parsing (PapaParse)** | **Missing** | Raw text sent to server; no column preview per spec |
| **Column headers preview** | **Missing** | Spec: "Column headers row shown as preview" |
| **Custom code per line in bulk create** | **Partial** | `bulkCreateUrls` accepts `customCode` in payload but UI never sends it — always `{ url }` only |

### Phase 9: Billing & Subscription

| Deliverable | Status | Notes |
|---|---|---|
| Plans page (`/billing/plans`) | Implemented | |
| Three-column comparison layout | Implemented | |
| Plan cards (name, price, features) | Implemented | |
| Monthly/yearly toggle | Implemented | |
| "Current plan" badge | Implemented | |
| Subscribe/Upgrade/Downgrade buttons | Implemented | |
| Subscription page (`/billing`) | Implemented | |
| Current plan card with dates | Implemented | |
| Usage progress bars | Implemented | |
| Color-coded bars (green/yellow/red) | Implemented | |
| Manage Subscription (Stripe portal) | Implemented | |
| Cancel subscription with confirmation | Implemented | |
| Stripe checkout redirect | Implemented | |
| **Tooltip with exact numbers on progress bars** | **Missing** | Spec: "Tooltip showing exact numbers" |

### Phase 10: API Key Management

| Deliverable | Status | Notes |
|---|---|---|
| API keys page (`/api-keys`) | Implemented | |
| Keys table with all 7 columns | Implemented | |
| Create key modal form | Implemented | |
| Key reveal dialog with copy + warning | Implemented | "I've copied the key" button |
| Edit key modal | Implemented | |
| Revoke key with confirmation | Implemented | |
| Rate limit cooldown (20s) | Implemented | |

### Phase 11: Password-Protected Link Interstitial

| Deliverable | Status | Notes |
|---|---|---|
| Route `/link/:code` in `apps/web` | Deferred (by design) | Out of scope — assigned to `apps/web` per spec |

### Phase 12: Admin Panel (Separate App)

| Deliverable | Status | Notes |
|---|---|---|
| `apps/admin` app | Deferred (by design) | Phase marked DEFERRED in spec |

### Phase 13: Custom Domains

| Deliverable | Status | Notes |
|---|---|---|
| Domain management | Deferred (by design) | Phase marked DEFERRED in spec |

### Phase 14: Affiliate Links

| Deliverable | Status | Notes |
|---|---|---|
| Affiliate link management | Deferred (by design) | Phase marked DEFERRED in spec |

---

## 3. Findings

### High Severity

#### H1. Collection share section is completely missing

- **Severity:** High
- **Location:** `apps/dashboard/src/pages/CollectionDetailPage.tsx`
- **Evidence:** `shareCollection` and `revokeCollectionShare` are implemented in `lib/api.ts` (lines 362–379) but never imported or rendered in the page component. The spec (Phase 6) requires: "Generate Share Link" button, share URL with copy button, "Revoke Share" button. None exist.
- **Impact:** Users cannot share collections or generate share links — a core Phase 6 feature is entirely absent from the UI.
- **Suggested fix:** Add share section UI to `CollectionDetailPage.tsx` using the existing `shareCollection`/`revokeCollectionShare` API functions.

#### H2. QR code regeneration not implemented

- **Severity:** High
- **Location:** `apps/dashboard/src/lib/api.ts`
- **Evidence:** No `regenerateQrCode` function exists. Grep confirms zero matches for `regenerateQr` or `regenerate` in the dashboard src. The spec (Phase 4) requires: `"Regenerate QR" — visible when QR is expired`, calling `POST /:code/qr/regenerate`.
- **Impact:** Users with expired QR codes cannot regenerate them — must delete and recreate the entire link.
- **Suggested fix:** Add `regenerateQrCode(token, code, expiresAt)` to `api.ts` and add UI in the QR tab of `UrlDetailPage.tsx`.

### Medium Severity

#### M1. Unused dependencies (5 packages)

- **Severity:** Medium
- **Location:** `apps/dashboard/package.json`
- **Evidence:** The following packages in `dependencies` are never imported in any file under `src/`:
  - `cmdk` (line 21)
  - `input-otp` (line 25)
  - `embla-carousel-react` (line 23)
  - `react-day-picker` (line 28)
  - `react-resizable-panels` (line 30)
- **Impact:** Unnecessary bundle weight (~50 kB+ collectively), misleading dep graph. All 5 are listed in phases.md as shadcn/ui transitive deps but the dashboard doesn't use shadcn/ui.
- **Suggested fix:** Remove all 5 unused packages from `package.json` (or add a comment explaining why they're retained).

#### M2. Topbar shows role badge instead of plan badge

- **Severity:** Medium
- **Location:** `apps/dashboard/src/components/topbar.tsx:31-35`
- **Evidence:** `Topbar` renders `<Badge variant="secondary">{profile.role}</Badge>`. Phase 1 spec says "Plan badge (current plan name)". The user role (e.g. "admin"/"user") is not the current plan name.
- **Impact:** Users see their role rather than their subscription plan — the wrong information in a prominent UI position.
- **Suggested fix:** Replace the role badge with a plan badge fetched from subscription data (e.g., via `getSubscription` context or prop).

#### M3. Missing QR `expiresAt` field in Create URL form

- **Severity:** Medium
- **Location:** `apps/dashboard/src/pages/CreateUrlPage.tsx`
- **Evidence:** The spec (Phase 3) lists "QR expires at (optional) — date-time picker" among the create URL form fields. The actual form has URL, custom code, TTL, password, active at, block bots, tags, and collection — but no QR expires at field. Confirmed by grep: `qrExpiresAt` only appears in `UrlSettingsPage.tsx`, never in `CreateUrlPage.tsx`.
- **Impact:** Users must create a URL first, navigate to settings, then set QR expiry — two steps instead of one.
- **Suggested fix:** Add a QR expiry date-time field to `CreateUrlPage.tsx` in the form.

#### M4. `passwordSetAt` not displayed on password-protected links

- **Severity:** Medium
- **Location:** `apps/dashboard/src/pages/UrlSettingsPage.tsx` / `packages/shared/src/index.ts`
- **Evidence:** Spec (Phase 5) says "Show when password was set (`passwordSetAt`)". No `passwordSetAt` property exists in the `ShortUrl` type.
- **Impact:** Users cannot see when a link's password was last set or changed.
- **Suggested fix:** Add `passwordSetAt` to the `ShortUrl` type and display it in the password section of `UrlSettingsPage.tsx`.

#### M5. CSV import has no client-side parsing or column preview

- **Severity:** Medium
- **Location:** `apps/dashboard/src/pages/UrlsListPage.tsx:861-953`
- **Evidence:** Spec (Phase 8) says: "Parse and validate CSV client-side (using PapaParse or basic string splitting)" and "Column headers row shown as preview". The CSV import sends raw text directly to the server (`importCsv` at `api.ts:289-298`) with zero client-side parsing, validation, or column preview. `PapaParse` is not in `package.json`.
- **Impact:** CSV validation errors are only surfaced post-submit — poor UX, wasted server round-trips for malformed input.
- **Suggested fix:** Add basic client-side CSV parsing (first line as headers, row count, URL validation) before submission.

#### M6. `regenerateQrCode` function missing from API client

- **Severity:** Medium
- **Location:** `apps/dashboard/src/lib/api.ts`
- **Evidence:** All 34 helper functions listed in Phase 0 exist except `regenerateQrCode`. The spec requires `regenerateQrCode` as an API helper function.
- **Impact:** See H2 — no API binding exists for the QR regeneration endpoint.
- **Suggested fix:** Add `regenerateQrCode(token, code, expiresAt)` function to `api.ts`.

#### M7. Quick-create form lacks rate-limit awareness

- **Severity:** Medium
- **Location:** `apps/dashboard/src/components/overview/quick-create-form.tsx`
- **Evidence:** Spec (Phase 2) says: "Rate-limit awareness (10 req/min on POST /api/urls) — show counter or disable temporarily". The form has no rate-limit tracking or cooldown.
- **Impact:** Users can hit the API rate limit without feedback, resulting in silent HTTP 429 errors shown as generic toasts.
- **Suggested fix:** Add a 10-req/min cooldown counter with disabled state on the Shorten button, similar to the API keys page cooldown.

#### M8. Bulk create does not send per-URL custom codes

- **Severity:** Medium
- **Location:** `apps/dashboard/src/pages/BulkCreatePage.tsx:71`
- **Evidence:** Phase 3 spec says bulk create supports per-line custom codes. The API function `bulkCreateUrls` accepts `customCode` in the payload (`api.ts:164`). The UI at line 71 only sends `{ url: u.url }` — custom codes are never input or forwarded.
- **Impact:** Users who paste URLs expecting to specify custom codes per line cannot — a specified feature of the bulk create page is missing.
- **Suggested fix:** Add per-line custom code support in bulk create input parsing and payload.

### Low Severity

#### L1. No lint script configured

- **Severity:** Low
- **Location:** `apps/dashboard/package.json:6-12`
- **Evidence:** No `lint` script exists in the package scripts. The `.lintstagedrc.json` only runs `typecheck`.
- **Impact:** No ESLint/Biome enforcement — coding style drift goes undetected.
- **Suggested fix:** Add a `lint` script (e.g., `"lint": "biome check src"`) and configure a linter.

#### L2. Sora font not imported

- **Severity:** Low
- **Location:** `apps/dashboard/src/index.css`
- **Evidence:** `DESIGN.md` specifies Sora Variable for display/headline and Geist Variable for body. Only `@import "@fontsource-variable/geist"` is present. Sora is never imported or configured as a CSS font-family.
- **Impact:** The Sora/Geist pairing prescribed by the design system is not applied — all text uses Geist.
- **Suggested fix:** Add `@import "@fontsource-variable/sora"` to `index.css` and add `--font-display: "Sora Variable", sans-serif` to the `@theme inline` block.

#### L3. Build chunk size exceeds 500 kB

- **Severity:** Low
- **Location:** build output
- **Evidence:** `(!) Some chunks are larger than 500 kB after minification.` — the main JS chunk is 1,114 kB (318 kB gzip).
- **Impact:** Slower initial load on slow connections; no code-splitting strategy applied.
- **Suggested fix:** Use `React.lazy()` for route-level code-splitting on heavy pages (Billing, API Keys, URL Detail with recharts).

#### L4. Missing delta/trend indicators on stat cards

- **Severity:** Low
- **Location:** `apps/dashboard/src/components/overview/stats-card.tsx`
- **Evidence:** Phase 2 spec: "subtle delta/trend if available". Stats cards show title, value, icon and optional progress bar but no trend/delta arrows.
- **Impact:** Users cannot see whether metrics are trending up or down.
- **Suggested fix:** Add an optional `delta` prop to `StatsCard` component and populate from usage data.

#### L5. AAL2 requirement for purge is only handled reactively

- **Severity:** Low
- **Location:** `apps/dashboard/src/pages/UrlSettingsPage.tsx:227-243`
- **Evidence:** Phase 5 spec: "Requires AAL2 — if user doesn't have AAL2, show info about 2FA requirement". The code only catches `AAL2_REQUIRED` error from the API after the user clicks Purge, rather than checking proactively.
- **Impact:** User must go through the purge flow and submit before learning they need 2FA — unnecessary friction.
- **Suggested fix:** Add a proactive AAL2 check (e.g., from auth context or an API call) when the purge button is clicked, showing the 2FA prompt before the dialog.

#### L6. Shared types missing `passwordSetAt` and `qrExpiresAt` on ShortUrl fields

- **Severity:** Low
- **Location:** `packages/shared/src/index.ts:31-46`
- **Evidence:** The spec's `ShortUrl` type definition in Phase 0 includes `passwordSetAt`? No, actually checking — the spec Phase 0 lists `ShortUrl` with `{ code, url, shortUrl, title, description, image, visits, uniqueVisits, expiresAt, activeAt, hasPassword, blockBots, qrExpiresAt, createdAt }`. The actual type has all of these. But `passwordSetAt` is referenced in Phase 5 but not in the `ShortUrl` type in the spec or implementation. This is minor — the field simply doesn't exist anywhere.
- **Impact:** Cannot display password set date as required by Phase 5.
- **Suggested fix:** Add `passwordSetAt?: string | null` to the `ShortUrl` interface.

---

## 4. Missing Dependencies / Config

| Package | Declared in import? | In `package.json`? | Listed in phases.md? | Status |
|---|---|---|---|---|
| `@shadcn/react` | No | No | Yes (phase 0) | Unnecessary — UI is hand-coded. Safe to remove from spec. |
| `papaparse` | No | No | Yes (phase 8) | Missing — spec expects client-side CSV parsing |
| `@fontsource-variable/sora` | No | No | No (implied by DESIGN.md) | Missing — Sora not imported anywhere |
| `cmdk` | No | Yes | Yes | Unused — safe to remove |
| `input-otp` | No | Yes | Yes | Unused — safe to remove |
| `embla-carousel-react` | No | Yes | Yes | Unused — safe to remove |
| `react-day-picker` | No | Yes | Yes | Unused — safe to remove |
| `react-resizable-panels` | No | Yes | Yes | Unused — safe to remove |
| `@dnd-kit/core` | Yes | Yes | No | Used — should be added to phases.md |
| `@dnd-kit/sortable` | Yes | Yes | No | Used — should be added to phases.md |

### Path alias verification

| Alias | `vite.config.ts` | `tsconfig.json` | Status |
|---|---|---|---|
| `@/` → `./src/*` | Line 10: `"@": path.resolve(__dirname, "./src")` | Line 12: `"@/*": ["./src/*"]` | ✅ |

### Lint script

| Check | Status |
|---|---|
| `package.json` lint script | ❌ Missing — no lint command defined |
| `.lintstagedrc.json` coverage | ✅ Dashboard included (runs typecheck only) |

---

## 5. Documentation & Design-System Drift

### Design system drift (`DESIGN.md` vs actual)

| Claimed (`DESIGN.md`) | Actual (`src/`) | Status |
|---|---|---|
| Font pairing: **Sora Variable** (display) + **Geist Variable** (body) | Only Geist Variable imported and configured | ❌ Sora is missing |
| Primary: oklch(0.35 0.12 260) | `index.css:40`: `--primary: oklch(0.35 0.12 260)` | ✅ |
| Border: oklch(0.88 0.005 260) | `index.css:46`: `--border: oklch(0.88 0.005 260)` | ✅ |
| Radius: sm=6px, md=8px, lg=10px, xl=14px | `index.css:29-32`: matches exactly | ✅ |
| Spacing: xs=0.5rem, sm=1rem, md=1.5rem, lg=2rem, xl=4rem | Not explicitly re-declared — uses Tailwind defaults | ⚠️ Relies on default scale, not explicitly set |
| Motion: 400ms entrance, 200ms exit, 150ms micro | CSS classes use Tailwind defaults (animate-in class) | ⚠️ Not explicitly configured |
| Hover lift: `0 8px 24px rgba(0,0,0,0.1)` + `translateY(-2px)` | `--shadow-hover` defined in `index.css:34` but **never used** in any component class | ⚠️ Declared but unused |
| Dark mode surface: oklch(0.12 0.005 260) | `index.css:58`: `--background: oklch(0.12 0.005 260)` | ✅ |
| Flat-by-Default Rule (no shadow on cards at rest) | Cards use border only, no shadow at rest | ✅ |
| No glassmorphism, no gradient text, no warm beige | None found | ✅ |
| No numbered section markers, no tiny uppercase eyebrows | None found | ✅ |

### Product doc drift (`PRODUCT.md` vs actual)

| Claimed | Actual | Status |
|---|---|---|
| Auth redirects to `apps/web` login with `?redirectTo=` param | `use-auth.tsx:59`: redirects to `${WEB_LOGIN_URL}/login?redirectTo=...` | ✅ |
| Cool-tinted neutrals | All OKLCH neutrals have `260` hue (indigo/cool) | ✅ |

### Phase spec drift (`phases.md` vs actual)

| Documented | Actual | Status |
|---|---|---|
| Root scripts: `dashboard:dev/build/typecheck` | All three exist in root `package.json:20-23` | ✅ |
| `BILLING_SUCCESS_URL` env var | Not configured or documented | **Needs verification** — not in code, not in spec appendix |
| Sora not mentioned in phases.md appendix | No Sora dep | ⚠️ Same as L2: font drift |

---

## Appendix: Commands Run

All commands executed from workspace root (`/mnt/ItWorksOnMyDrive/MERN/linkify`).

```bash
# Install
pnpm install --filter @linkify/dashboard

# Typecheck
pnpm --filter @linkify/dashboard typecheck

# Build
pnpm --filter @linkify/dashboard build

# Lint — not available (no script)
```
