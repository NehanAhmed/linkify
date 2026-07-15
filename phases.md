# Linkify Dashboard — Implementation Phases

> **Dashboard app**: `apps/dashboard` (`@linkify/dashboard`)
> **Landing + Auth app**: `apps/web` (`@linkify/web`) — already built
> **Admin app**: `apps/admin` (`@linkify/admin`) — deferred, not yet created
> **Shared package**: `packages/shared` (`@linkify/shared`) — add types here as needed

---

## Overview

This document divides the frontend implementation of the Linkify dashboard into discrete, buildable phases. Each phase describes **what** to build with enough context for an AI agent to implement it. Phases depend on previous ones — always complete a phase before starting the next.

### Apps Separation

| App | Purpose | Status |
|---|---|---|
| `apps/web` | Landing page, signup, login, password reset, auth callback | Built |
| `apps/dashboard` | Main dashboard for link management, analytics, settings | Scaffolded (empty) |
| `apps/admin` (future) | Admin panel for user management, audit log, system config | Not created |

After auth in `apps/web`, the user is redirected to `apps/dashboard` (port 5174). The dashboard checks the Supabase session on load; if absent, redirects back to `apps/web` login.

### Deferred Features

- Custom domains (domain CRUD, verification, SSL tracking)
- Affiliate links
- Admin panel (separate app)
- Public shared collection view (standalone page)

---

## Phase 0: Foundation & Scaffolding

**Goal**: Set up the dashboard app with its tech stack, build the API client, auth integration, and foundational utilities.

### Tasks

#### Dashboard app scaffolding
- Install missing deps into `apps/dashboard/package.json`:
  - `@supabase/supabase-js` — for auth session
  - `tailwindcss` v4 + `@tailwindcss/vite` — styling
  - `tw-animate-css`, `tailwindcss-animate`, `tailwind-merge`, `clsx`, `class-variance-authority` — shadcn/ui pre-reqs
  - `lucide-react` — icons
  - `sonner` — toast notifications
  - `date-fns` — date formatting
  - `recharts` — charts
  - `@shadcn/react` — UI component library
  - `cmdk`, `input-otp`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels` — shadcn/ui transitive deps
- Add `@/` path alias to `vite.config.ts` (already done) and verify tsconfig `paths`
- Update `apps/dashboard/src/index.css` with Tailwind v4 directives (`@import "tailwindcss"`) and import Geist font from `@fontsource-variable/geist`
- Verify the app runs on port 5174

#### Shared types (`packages/shared/src/index.ts`)
Add TypeScript interfaces/types for all API response shapes:

- `ShortUrl` — `{ code, url, shortUrl, title, description, image, visits, uniqueVisits, expiresAt, activeAt, hasPassword, blockBots, qrExpiresAt, createdAt }`
- `Visit` — `{ id, code, ipAddress, userAgent, referer, country, city, deviceType, os, browser, browserVersion, referrerCategory, isBot, visitedAt }`
- `VisitStats` — `{ totalVisits, uniqueVisits, hourly: VisitStat[], daily: VisitStat[] }`
- `VisitStat` — `{ hour/date, visits, uniqueVisits }`
- `Collection` — `{ id, name, parentId, userId, sortOrder, shareToken, sharedAt, urlCount, createdAt, updatedAt }`
- `Tag` — `{ id, name, color, userId, urlCount, createdAt }`
- `Plan` — `{ id, name, code, description, maxLinks, maxCustomDomains, apiRateLimit, features, priceMonthly, priceYearly, sortOrder }`
- `Subscription` — `{ id, userId, planId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, trialEnd }`
- `UserSubscription` — `{ plan: { planId, planCode, planName, maxLinks, maxCustomDomains, apiRateLimit, features, status, currentPeriodEnd, cancelAtPeriodEnd }, subscription: { id, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, trialEnd } }`
- `Usage` — `{ totalLinks, totalVisits, plan: Plan, quotaMonth }`
- `ApiKey` — `{ id, name, scopes, allowedIps, lastUsedAt, expiresAt, createdAt }`
- `Pagination` — `{ page, limit, total, totalPages }`
- `PaginatedResponse<T>` — `{ items: T[], pagination: Pagination }`
- `BulkResult` — `{ index/ code, success, data?, error? }`

#### API client (`apps/dashboard/src/lib/api.ts`)
- Create a fetch-based API client pointing at `localhost:3000` (configurable via `VITE_API_URL`)
- Automatic `Authorization: Bearer <token>` header injection from auth context
- Standard response envelope parsing: extract `data`, throw on `success: false`
- Export typed helper functions for every endpoint (one per API call):
  - Auth: `fetchMe`, `refreshToken`, `resetPassword`
  - API Keys: `createApiKey`, `listApiKeys`, `updateApiKey`, `revokeApiKey`
  - URLs: `createUrl`, `bulkCreateUrls`, `listUrls`, `getUrlInfo`, `getUrlVisits`, `getUrlStats`, `exportVisitsCsv`, `generateQrCode`, `regenerateQrCode`, `updateUrlSettings`, `setUrlPassword`, `removeUrlPassword`, `verifyUrlPassword`, `softDeleteUrl`, `purgeUrl`, `bulkOperations`, `importCsv`
  - Collections: `listCollections`, `createCollection`, `getCollection`, `updateCollection`, `deleteCollection`, `reorderCollections`, `shareCollection`, `revokeCollectionShare`, `getCollectionUrls`, `addUrlToCollection`, `removeUrlFromCollection`
  - Tags: `listTags`, `createTag`, `updateTag`, `deleteTag`, `bulkTagUrls`, `getTagUrls`
  - Billing: `listPlans`, `createCheckoutSession`, `getPortalUrl`, `getSubscription`, `cancelSubscription`, `getUsage`
  - Health: `getHealth`

#### Supabase client (`apps/dashboard/src/lib/supabase.ts`)
- Create a Supabase client identical to `apps/web/src/lib/supabase.ts`
- Read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from env (shared `.env` at root via `envDir`)

#### Auth context (`apps/dashboard/src/hooks/use-auth.tsx`)
- Create an `AuthProvider` + `useAuth` hook following the same pattern as `apps/web`
- On mount, check `supabase.auth.getSession()` for existing session
- Listen to `onAuthStateChange` for login/logout events
- Expose: `user`, `session`, `profile` (from `/api/auth/me`), `isLoading`, `signOut`
- On sign out, redirect to `apps/web` login URL
- If no session found and not loading, redirect to `apps/web` login URL

#### Root config
- Add root-level scripts in root `package.json`:
  - `"dashboard:dev": "pnpm --filter @linkify/dashboard dev"`
  - `"dashboard:build": "pnpm --filter @linkify/dashboard build"`
  - `"dashboard:typecheck": "pnpm --filter @linkify/dashboard typecheck"`
- Add `apps/dashboard/src/**/*.{ts,tsx}` to `.lintstagedrc.json`

---

## Phase 1: Dashboard Shell & Navigation

**Goal**: Build the persistent layout shell, navigation sidebar, topbar, and routing structure for all dashboard pages.

### Tasks

#### App layout components
- **`AppLayout`** — wrapper component with sidebar + topbar + main content area
- **`Sidebar`** — vertical navigation with:
  - Logo/brand at top
  - Nav items: Overview, URLs, Collections, Tags, API Keys, Billing
  - Active route highlighting
  - Collapsible (optional, mobile-first)
- **`Topbar`** — horizontal bar with:
  - Page title / breadcrumbs
  - User avatar dropdown (profile info, sign out)
  - Plan badge (current plan name)
- **`PageHeader`** — reusable component with title, description, and optional action buttons slot
- Sidebar collapses to icon-only on smaller screens (responsive)

#### Routing structure
Set up routes in `apps/dashboard/src/App.tsx`:

```
/                    → Overview (redirect to /overview)
/overview            → OverviewPage
/urls                → UrlsListPage
/urls/new            → CreateUrlPage
/urls/bulk           → BulkCreatePage
/urls/:code          → UrlDetailPage
/urls/:code/settings → UrlSettingsPage
/collections         → CollectionsListPage
/collections/:id     → CollectionDetailPage
/tags                → TagsListPage
/tags/:id            → TagDetailPage
/api-keys            → ApiKeysPage
/billing             → BillingPage
/billing/plans       → PlansPage
*                    → NotFoundPage
```

Each page component is a placeholder `<PageHeader title="..." />` — actual content comes in later phases.

#### Protected route wrapper
- Create `ProtectedRoute` component that checks `useAuth()`
- If `isLoading`, show a full-page spinner
- If no session, redirect to `apps/web` login URL (with a `?redirectTo=` param)
- If session exists, render children

#### Theme provider
- Add `next-themes` for dark/light mode toggle
- Create a `ThemeToggle` component in the topbar

#### Error handling
- Create an `ErrorBoundary` component for the dashboard
- Create a `NotFoundPage` with a 404 message and link back to overview

---

## Phase 2: Dashboard Overview

**Goal**: Build the home/overview page showing key metrics, usage stats, and recent activity.

### Tasks

#### Stats cards row
- 4 stat cards in a grid:
  - **Total Links** — count of user's short links
  - **Total Visits** — cumulative visit count
  - **Active Links** — count of non-expired, non-deleted links
  - **Plan Usage** — links used vs plan limit (progress bar)
- Each card shows the number, an icon, and subtle delta/trend if available
- Fetch data from `GET /api/billing/usage`

#### Recent links list
- Table showing the 5 most recently created links (code, destination URL preview, visits, created date)
- "View all" link to `/urls`
- Each row has a copy-short-url button

#### Quick-create URL form
- Inline form on the overview page: URL input field + "Shorten" button
- On success, show the created short URL with a copy button and animate it in
- On error, show toast with error message
- Rate-limit awareness (10 req/min on POST /api/urls) — show counter or disable temporarily

#### Plan status card
- Card showing current plan name, status, and period end date
- "Upgrade" button linking to `/billing`

#### Loading state
- Show skeleton cards while data loads
- Handle empty state (new user with no links)

---

## Phase 3: URL Management — Create & List

**Goal**: Build the full URL listing page with search, filter, sort, pagination, and the create URL form.

### Tasks

#### URL list page (`/urls`)
- **Data table** with columns:
  - Short code (clickable to detail page)
  - Destination URL (truncated with tooltip on hover)
  - Title (OG title if available)
  - Visits / Unique visits
  - Status badge (active / expired / scheduled / password-protected / blocked-bots)
  - Created date
  - Actions dropdown (copy short URL, copy destination URL, open settings, delete)
- Each row has a checkbox for bulk selection (Phase 8)

#### Search & filters toolbar
- Search input (`q` param) — searches URL and code
- Date range picker (`createdAfter` / `createdBefore`)
- Tag filter — multi-select tag dropdown (fetched from `GET /api/tags`)
- Collection filter — dropdown of collections
- Password filter — toggle switch (has password / no password)
- Active status filter — toggle switch (active / inactive)
- "Clear filters" button
- Filters persist in URL search params so they can be shared/bookmarked

#### Sort controls
- Clickable column headers to sort by: `createdAt`, `visits`, `code`
- Ascending/descending toggle

#### Pagination
- Standard pagination component at the bottom (page numbers, prev/next)
- Page size selector (10, 25, 50, 100)

#### Create URL page (`/urls/new`)
- Form with all fields from POST `/api/urls`:
  - **URL** (required) — text input with URL validation
  - **Custom code** (optional) — text input, shows availability hint
  - **TTL Days** (optional) — number input or preset buttons (7d, 30d, 90d, 365d, never)
  - **Password** (optional) — password input, only shown if plan allows
  - **Active at** (optional) — date-time picker (scheduled activation)
  - **QR expires at** (optional) — date-time picker (QR code expiry, independent of link TTL)
  - **Block bots** — toggle switch
  - **Tags** — multi-select of existing tags, with create-new-tag inline option
  - **Collection** — dropdown to select a collection
- Submit button with loading state
- On success, show the created short URL prominently with copy button and "Create another" option
- On error (CODE_TAKEN, INVALID_URL, etc.), show field-level error messages

#### Bulk create page (`/urls/bulk`)
- Textarea where user can paste one URL per line
- Parse and validate URLs client-side before submission
- Submit to POST `/api/urls/bulk`
- Results table showing each URL with success/error status
- Summary bar: "X of Y created successfully"

#### Empty state
- Friendly illustration/message when user has no URLs
- CTA button to create first URL

---

## Phase 4: URL Detail & Analytics

**Goal**: Build the URL detail page with OG preview, visit log, stats charts, CSV export, and QR code generation.

### Tasks

#### URL info header (`/urls/:code`)
- Card showing:
  - OG preview: title, description, image (if available) from `GET /api/urls/:code/info`
  - Short URL with copy button (large, prominent)
  - Destination URL (clickable, opens in new tab)
  - Status badge (active / expired / scheduled / password-protected)
  - Created date, expiry date, activation date
  - Visit counts (total + unique)
- Action buttons row: Settings, Delete, Purge

#### Visit log tab
- Paginated table of visits from `GET /api/urls/:code/visits`:
  - Timestamp
  - Country (flag emoji + name)
  - City
  - Device type (desktop/mobile/tablet icons)
  - OS
  - Browser + version
  - Referrer (truncated, with category badge: direct/search/social/other)
  - Bot indicator badge
- Pagination at the bottom

#### Stats charts tab
- Fetch from `GET /api/urls/:code/stats`
- **Daily chart** — bar/line chart (recharts) of visits for last 7 days
- **Hourly chart** — bar chart of visits for last 24 hours (if within 7-day range)
- Toggle between total visits and unique visits line
- Summary stats block (total, unique, daily average)
- Empty state: "Not enough data yet, share your link to get started"

#### CSV export
- Button "Export CSV" that downloads visits as CSV file
- Calls `GET /api/urls/:code/visits/export` and triggers browser download
- Filename: `<code>-visits.csv`
- Loading state while file generates

#### QR code
- QR encodes the **short URL** (not destination) → scans go through the redirect: tracked, time-limited, password-checked
- Button/modal "Generate QR Code"
- Format selector: PNG / SVG
- Optional logo URL input
- Preview of the QR code in the modal
- Download button for PNG or SVG
- Expiry badge: shows `qrExpiresAt` if set; "Expired" state when past
- **"Regenerate QR"** — visible when QR is expired
  - Confirmation dialog → calls `POST /:code/qr/regenerate` with new `expiresAt`
  - Replaces the stored QR (old cache is purged, new QR generated)
- QR is cached in DB on first generation; subsequent loads return cached version
- Loading state while QR generates

#### Page sections navigation
- Use tabs or a sub-navigation: Info | Visits | Stats | QR Code

---

## Phase 5: Link Settings & Password Protection

**Goal**: Build the settings page for editing link configuration and managing password protection.

### Tasks

#### URL settings page (`/urls/:code/settings`)
- Fetch current link info from `GET /api/urls/:code/info`
- Edit form using `PATCH /api/urls/:code/settings`:
  - **Active at** — date-time picker (null = no schedule)
  - **Expires at** — date-time picker (null = never expires)
  - **QR expires at** — date-time picker (null = never expires; independent of link expiry)
  - **Block bots** — toggle switch
  - "Clear" buttons next to date fields to set null
- Save button with loading state and success toast

#### Password section
- If link has no password:
  - "Set Password" form with password input + confirm input
  - Submits to `POST /api/urls/:code/password`
  - Validation: 4-128 chars
  - If plan doesn't support password protection, show upgrade prompt
- If link has a password:
  - Badge: "Password protected"
  - "Change Password" button → reveals change form
  - "Remove Password" button → confirmation dialog → `DELETE /api/urls/:code/password`
  - Show when password was set (`passwordSetAt`)

#### Delete actions
- **Soft Delete** button with confirmation dialog ("Are you sure? This link will no longer be accessible")
  - Calls `DELETE /api/urls/:code`
  - On success, redirect to `/urls` with success toast
- **Permanent Purge** button (destructive, with extra warning)
  - Only shown to owner
  - Calls `DELETE /api/urls/:code/purge`
  - Requires AAL2 — if user doesn't have AAL2, show info about 2FA requirement
  - Double confirmation: type the code to confirm deletion
  - On success, redirect to `/urls` with success toast

#### Unsaved changes warning
- Warn user before navigating away with unsaved changes

---

## Phase 6: Collections

**Goal**: Build collection management — CRUD, nesting, reordering, sharing, and URL association.

### Tasks

#### Collections list page (`/collections`)
- Fetch all collections from `GET /api/collections`
- Display as an expandable tree/nested list reflecting `parentId` hierarchy
- Each collection shows: name, url count, sort order indicator
- **Create collection** button → form (name, optional parent selection)
- **Edit collection** — inline edit or modal (name change)
- **Delete collection** — confirmation dialog (note: does not delete URLs)

#### Reorder collections
- Drag handles on each collection item
- On drag end, call `PATCH /api/collections/reorder` with the full updated ordering
- Optimistic UI update with rollback on error

#### Collection detail page (`/collections/:id`)
- Header: collection name, edit button, delete button
- **Share section**:
  - If not shared: "Generate Share Link" button → calls `POST /api/collections/:id/share`
  - If shared: show share URL with copy button + "Revoke Share" button
  - Revoke calls `DELETE /api/collections/:id/share`
- **URLs in collection**:
  - Table/list of URL codes in this collection (from `GET /api/collections/:id/urls`)
  - Each row: code (clickable), remove from collection button
  - "Add URL" form: input for URL code + add button

#### URL-Collection association
- When creating/editing a URL, ability to select a collection
- From URL detail page, ability to add/remove from collections

---

## Phase 7: Tags

**Goal**: Build tag management — CRUD with color picker, bulk tagging, and tag-filtered URL views.

### Tasks

#### Tags list page (`/tags`)
- Fetch all tags from `GET /api/tags`
- Card/grid display showing:
  - Tag name
  - Color indicator (small colored dot)
  - URL count
  - Edit/delete actions
- **Create tag** — form with name input + color picker (predefined palette + custom hex)
  - Calls `POST /api/tags`
- **Edit tag** — modal with name + color
  - Calls `PATCH /api/tags/:id`
- **Delete tag** — confirmation dialog (removes from all URLs)
  - Calls `DELETE /api/tags/:id`

#### Tag detail page (`/tags/:id`)
- Tag name + color header
- List of URLs with this tag (from `GET /api/tags/:id/urls`)
- Each URL: code (clickable), destination URL, visits
- Pagination

#### Color picker component
- Predefined palette of ~12 colors (indigo, red, green, blue, orange, purple, pink, teal, yellow, cyan, rose, amber)
- Custom hex input option
- Color displayed as a filled circle/swatch

#### Bulk tagging interface
- On the URLs list page (`/urls`), after selecting multiple URLs via checkboxes:
  - "Tag Selected" button appears in a floating action bar
  - Opens a modal with tag multi-select
  - Calls `POST /api/tags/bulk`
  - Shows result summary (success count, failure count)

---

## Phase 8: Bulk Operations & CSV Import

**Goal**: Build bulk action toolbar and CSV import functionality.

### Tasks

#### Bulk action toolbar
- When URLs are selected (checkboxes on `/urls`), show a floating bottom bar:
  - Count of selected items: "X selected"
  - Action buttons based on available operations:
    - **Tag** — opens tag selection modal (reuses bulk tag from Phase 7)
    - **Move to Collection** — opens collection selector modal
    - **Extend Expiry** — opens days input modal (1-365)
    - **Delete** — confirmation dialog → soft delete
  - "Clear selection" button
- Submit calls `POST /api/urls/bulk-operations` with `operation`, `codes`, and relevant params
- Show results as a toast or slide-in panel with success/failure per code
- Handle plan-gating (bulk operations require Pro plan)

#### CSV import modal
- Accessible from `/urls` page via "Import CSV" button
- Textarea where user pastes CSV content
- Column headers row shown as preview:
  - Required: `url`
  - Optional: `customCode`, `ttlDays`, `password`, `activeAt`, `tags`
- Parse and validate CSV client-side (using PapaParse or basic string splitting)
- Show row count and any validation errors before submitting
- Optional collection selector to tag all imported URLs
- Submit to `POST /api/urls/import/csv`
- Results table: each row with code/url + success/error
- Summary: "X of Y URLs created successfully"

---

## Phase 9: Billing & Subscription

**Goal**: Build the billing section — plans comparison, current subscription, usage stats, and Stripe checkout flow.

### Tasks

#### Plans page (`/billing/plans`)
- Fetch all plans from `GET /api/billing/plans`
- Three-column comparison layout (Free | Pro | Enterprise)
- Each plan card shows:
  - Plan name + description
  - Monthly price / yearly price
  - Feature checklist (checkmarks vs dashes)
  - "Current plan" badge if subscribed
  - "Subscribe" / "Upgrade" / "Downgrade" button
- Monthly/yearly toggle at the top

#### Current subscription page (`/billing`)
- Fetch from `GET /api/billing/subscription`
- Current plan card: plan name, status, period dates, cancel-at-period-end flag
- **Usage card**: links used / plan limit, API requests used / plan limit (from `GET /api/billing/usage`)
- **Actions**:
  - "Manage Subscription" button → opens Stripe Customer Portal (`GET /api/billing/portal` — redirect user to the URL)
  - "Change Plan" → goes to `/billing/plans`
  - "Cancel Subscription" button → confirmation dialog → `POST /api/billing/cancel`

#### Upgrade flow
- "Subscribe" button on a plan → calls `POST /api/billing/checkout` with `planCode`
- Receive Stripe Checkout URL → redirect user to Stripe
- After successful payment, Stripe redirects back to the dashboard (use `BILLING_SUCCESS_URL`)
- Dashboard should re-fetch subscription on return to reflect the change

#### Cancel flow
- Confirmation dialog: "Are you sure? Your plan will remain active until the end of the billing period."
- Calls `POST /api/billing/cancel` with `subscriptionId`
- Shows success toast and updates subscription state

#### Usage progress bars
- Visual progress bars for link count and API request count
- Color coding: green (< 60%), yellow (60-80%), red (> 80%)
- Tooltip showing exact numbers

---

## Phase 10: API Key Management

**Goal**: Build the API keys management page — create, list, update, and revoke programmatic API keys.

### Tasks

#### API keys page (`/api-keys`)
- Fetch keys from `GET /api/auth/api-keys`
- Table display:
  - Key name
  - Scopes (badge list: `urls:read`, `urls:write`)
  - IP allowlist display
  - Last used date (or "Never" if null)
  - Expiry date (or "Never" if null)
  - Status indicator (active / expired)
  - Edit / Revoke actions

#### Create API key
- Modal form with:
  - **Name** (required) — text input
  - **Scopes** — multi-select checkboxes (urls:read, urls:write, etc.)
  - **Allowed IPs** — text input for CIDR notation, add/remove tags/chips
  - **Expires At** — optional date-time picker
- Submit calls `POST /api/auth/api-keys`
- On success, show the raw key prominently in a modal with:
  - Large monospace text showing the key
  - Warning: "This key will only be shown once. Copy it now."
  - Copy button
  - "I've copied the key" button to close

#### Edit API key
- Modal pre-filled with existing values
- Update name, scopes, allowed IPs, expiry
- Calls `PUT /api/auth/api-keys/:id`

#### Revoke API key
- Confirmation dialog: "Are you sure? This will immediately invalidate this key."
- Shows the key name being revoked
- Calls `DELETE /api/auth/api-keys/:id`
- Removes key from list with animation

#### Rate limit awareness
- Auth limiter (3 req/min) — disable create/edit/revoke buttons momentarily after use, show cooldown counter

---

## Phase 11: Password-Protected Link Interstitial

**Goal**: Build a public-facing page where visitors enter a password to access a protected short link.

### Location
This can be in `apps/web` (landing app) or a minimal standalone page. For simplicity, put it in `apps/web`.

### Tasks

#### Route
- `GET /link/:code` → PasswordInterstitialPage (in apps/web)

#### Password entry page
- Clean, minimal design (single focus: the password input)
- Shows the short URL code and a lock icon
- Password input field + "Submit" button
- On submit:
  - Calls `POST /api/urls/:code/verify-password`
  - On success: redirect to `GET /api/urls/:code?token=<access-token>` which 301-redirects to destination
  - On error: show error message (INCORRECT_PASSWORD, LINK_EXPIRED, LINK_NOT_ACTIVE, BOTS_BLOCKED, etc.)
- Loading state while verifying
- Handle edge cases:
  - Link not found → show 404
  - Link expired → show expired message
  - Bot blocked → show blocked message
  - No password set on link → redirect directly (shouldn't happen, but safe fallback)

#### Rate limit awareness
- Show "Too many attempts. Please wait." on 429
- Disable submit button briefly after failed attempts

---

## Phase 12: Admin Panel (Separate App) — DEFERRED

**Goal**: When ready, create `apps/admin` (`@linkify/admin`) for platform administration.

### Scope (build when un-deferred)
- Admin dashboard with platform-wide stats (users, URLs, visits, MRR)
- User management (list, detail, role change, suspend/unsuspend)
- User links viewer
- Audit log browser with filters
- System configuration viewer
- Feature flags viewer
- Maintenance jobs (purge expired, recheck links)

---

## Phase 13: Custom Domains — DEFERRED

**Goal**: When ready, add custom domain management to the dashboard.

### Scope (build when un-deferred)
- Domain registration form
- Domain list with verification status, SSL status
- DNS instruction display (TXT record details)
- One-click verify
- Domain removal

---

## Phase 14: Affiliate Links — DEFERRED

**Goal**: When ready, add affiliate link management.

### Scope (build when un-deferred)
- Affiliate ID/network fields in URL create/edit forms
- Affiliate click tracking in analytics
- Affiliate commission reporting

---

## Appendix: Environment Variables (for dashboard)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No (default `http://localhost:3000`) | API base URL |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_APP_URL` | No (default `http://localhost:5173`) | Landing app URL (for redirects) |

## Appendix: Dependencies to Add

Add to `apps/dashboard/package.json`:

```json
{
  "dependencies": {
    "@linkify/shared": "workspace:*",
    "@supabase/supabase-js": "^2.110.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.4.0",
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.400.0",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-day-picker": "^10.0.1",
    "react-dom": "^19.0.0",
    "react-resizable-panels": "^4.12.2",
    "react-router-dom": "^7.0.0",
    "recharts": "3.8.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.4.0",
    "@fontsource-variable/geist": "^5.2.9"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

## Appendix: Design Tokens

Use the same design tokens from `DESIGN.md` and `PRODUCT.md`:
- Colors: oklch-based palette (primary indigo, neutral gray)
- Typography: Geist Variable
- Dark/light mode support
- Elevation/shadow system
- Spacing scale

Reference the existing `apps/web` components for consistent styling patterns.
