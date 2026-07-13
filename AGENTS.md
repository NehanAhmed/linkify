# linkify — monorepo agent guide

## Workspace layout

```
linkify/
├── pnpm-workspace.yaml           ← workspace definition
├── package.json                  ← root scripts (forward via --filter)
├── pnpm-lock.yaml                ← single lockfile for all packages
├── .env                          ← shared env vars (loaded by dotenv in apps)
├── .github/workflows/ci.yml      ← CI pipeline
├── .husky/                       ← git hooks (root-level)
├── .lintstagedrc.json            ← pre-commit checks
├── apps/
│   ├── api/                      ← Express 5 + TypeScript backend (@linkify/api)
│   └── web/                      ← React 19 + Vite + Tailwind v4 + shadcn/ui frontend (@linkify/web)
└── packages/
    └── shared/                   ← future shared types/utils (@linkify/shared)
```

## Naming conventions

| Artifact | Package name | Directory |
|---|---|---|
| Backend app | `@linkify/api` | `apps/api/` |
| Frontend app | `@linkify/web` | `apps/web/` |
| Shared library | `@linkify/shared` | `packages/shared/` |

- **`apps/*`** — deployable applications (have a `start` or `dev` script, compiled to `dist/`)
- **`packages/*`** — library packages consumed by apps (no `start` script, re-exported via `main`/`types`)

## Commands (run from workspace root)

All root scripts forward to `@linkify/api` via `pnpm --filter`. This keeps the CLI the same as before the monorepo conversion.

| Action | Command | What it does |
|---|---|---|
| **Dev server** | `pnpm dev` | Hot-reload backend via `nodemon` + `tsx` |
| **Production start** | `pnpm start` | Runs compiled `apps/api/dist/index.js` |
| **Build** | `pnpm build` | `tsc` — compiles TypeScript to CommonJS |
| **Typecheck** | `pnpm typecheck` | `tsc --noEmit` — type-check without emitting |
| **Run tests** | `pnpm test` | `vitest run` — runs all test files |
| **Watch tests** | `pnpm test:watch` | `vitest` — interactive watch mode |
| **DB push** | `pnpm db:push` | `drizzle-kit push` — sync schema to database |
| **DB generate** | `pnpm db:generate` | `drizzle-kit generate` — create migration files |
| **DB studio** | `pnpm db:studio` | `drizzle-kit studio` — open Drizzle Studio UI |
| **DB seed** | `pnpm db:seed` | Runs `src/jobs/seedPlans.ts` to seed plan data |

### Running commands for a specific package

```bash
pnpm --filter @linkify/api <script>     # run script in api package
pnpm --filter @linkify/web dev          # run dev script in web package
```

### Adding deps to a package

```bash
pnpm --filter @linkify/api add <dep>              # production dep
pnpm --filter @linkify/api add -D <dep>            # dev dep
pnpm --filter @linkify/shared add <dep>            # shared lib dep
pnpm --filter @linkify/web add @linkify/shared     # workspace dep (app imports local package)
```

## DB workflow

1. Set `DATABASE_URL` in `.env` (workspace root)
2. Define/update tables in `apps/api/src/db/schema.ts`
3. Run `pnpm db:push` to sync schema to Neon/Postgres
4. Import `db` from `../db` to query (relative from within `apps/api/src/`)

## Architecture

### Backend (`apps/api/`)

- **Express 5** + **TypeScript**, compiled to CommonJS (`apps/api/dist/`)
- Entry: `apps/api/src/index.ts` → loads root `.env` via dotenv (`path.resolve(__dirname, '../../.env')`), then starts HTTP server
- App: `apps/api/src/app.ts` — Express app instance, `express.json()` middleware only
- DB: `apps/api/src/db/index.ts` exports `db` (Drizzle ORM + Neon HTTP driver)
- Schema: `apps/api/src/db/schema.ts` — `pgTable` definitions
- Drizzle Kit config: `apps/api/drizzle.config.ts` (reads `DATABASE_URL` from env)

---

## Adding a new app

Example: adding a React frontend to `apps/web/`.

### 1. Create the app

```bash
mkdir -p apps/web
```

### 2. Create `apps/web/package.json`

```json
{
  "name": "@linkify/web",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@linkify/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^7.0.2",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vitest": "^4.1.10"
  }
}
```

Use `"workspace:*"` for any `@linkify/*` dependency — pnpm resolves this to the local package.

### 3. Add root-level script shortcuts (optional)

Edit root `package.json` to add forwarding scripts:

```json
{
  "scripts": {
    "web:dev": "pnpm --filter @linkify/web dev",
    "web:build": "pnpm --filter @linkify/web build",
    "web:typecheck": "pnpm --filter @linkify/web typecheck"
  }
}
```

### 4. Add `tsconfig.json` at `apps/web/tsconfig.json`

Extend a root base config if one exists, or self-contained:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### 5. Add `tsconfig.json` base at root (optional but recommended)

If you have 2+ packages that share tsconfig settings, create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Then each package extends it:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  }
}
```

### 6. Update `.lintstagedrc.json`

```json
{
  "apps/api/src/**/*.ts": [
    "bash -c 'pnpm typecheck'"
  ],
  "apps/web/src/**/*.{ts,tsx}": [
    "bash -c 'pnpm --filter @linkify/web typecheck'"
  ]
}
```

### 7. Update CI if needed

For a frontend, you'd add a build step or a separate job. The CI is at `.github/workflows/ci.yml`.

### 8. Run install

```bash
pnpm install
```

---

## Adding a new shared package

Example: adding `@linkify/shared` to `packages/shared/`.

### 1. Create the package directory

```bash
mkdir -p packages/shared/src
```

### 2. Create `packages/shared/package.json`

```json
{
  "name": "@linkify/shared",
  "private": true,
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
    "vitest": "^4.1.10"
  }
}
```

- `main` and `types` point directly to TypeScript source — no build step needed. pnpm workspace resolves the source at dev time.
- If the package needs to be compiled (e.g., published to npm or used by a bundler that doesn't handle TS), add a `build` script.

### 3. Create `packages/shared/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src"]
}
```

### 4. Wire it as a dependency

In the consuming app's `package.json`:

```json
{
  "dependencies": {
    "@linkify/shared": "workspace:*"
  }
}
```

Then run:

```bash
pnpm install
```

### 5. Import from the shared package

```ts
// in apps/api/src/ or apps/web/src/
import { SomeType } from '@linkify/shared'
```

---

## Root `package.json` conventions

| Field | Convention |
|---|---|
| `name` | `"linkify"`, `"private": true` |
| `scripts` | Only forwarding scripts via `pnpm --filter`. No package-specific logic. |
| `dependencies` | **Always empty.** Every package manages its own deps. |
| `devDependencies` | Only repo-level tooling: `husky`, `lint-staged`. Never package-level deps. |
| `pnpm.onlyBuiltDependencies` | Keeps native build deps allowed (`bcrypt`, `esbuild`). Update when a new native dep is added. |

---

## When to add Turborepo

Turborepo is **not needed now** — pnpm's `--filter` is sufficient for a single active package.

### Trigger conditions

Add Turborepo when **two or more packages need ordered builds**, e.g.:

1. `@linkify/shared` exports types that `@linkify/api` and `@linkify/web` both consume
2. `@linkify/web` needs `@linkify/api`'s types or a generated client

### What to change

**Install:**
```bash
pnpm add -D -w turbo
```

**Create `turbo.json` at root:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Update root `package.json` scripts to use `turbo run`:**
```json
{
  "scripts": {
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "dev": "turbo run dev",
    "db:generate": "pnpm --filter @linkify/api db:generate",
    "db:push": "pnpm --filter @linkify/api db:push"
  }
}
```

**Add a `turbo.json` reference in CI**: if CI existed before turbo, update `.github/workflows/ci.yml`:
```yaml
- run: pnpm turbo build --filter=@linkify/web...
```

**Remove `--filter` from root scripts for tasks covered by turbo** — turbo infers the dependency graph from the workspace.

---

## Docker

### Current setup

- `docker-compose.yml` at root — context is `.`, dockerfile is `apps/api/Dockerfile`
- Dockerfile is workspace-aware: copies `pnpm-workspace.yaml`, root `package.json`, and `apps/api/package.json` before `pnpm install`
- Builds only `@linkify/api` via `pnpm --filter`
- CMD: `node apps/api/dist/index.js`

### Adding a new service to Docker Compose

When `apps/web/` is ready, add a second service:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "5173:5173"
```

---

## CI pipeline

`.github/workflows/ci.yml` currently runs:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm typecheck
- run: pnpm test
- run: pnpm build
```

When new packages are added, these commands automatically cover them (root scripts forward via `pnpm --filter`). If you need to add per-package steps (e.g., a lint step for the frontend), add them explicitly:

```yaml
- name: Typecheck web
  run: pnpm --filter @linkify/web typecheck
- name: Lint web
  run: pnpm --filter @linkify/web lint
```

---

## Design System

Two authoritative source files for visual design:

- **`PRODUCT.md`** — brand register, user segments, positioning, design principles (minimal, coherent, restrained, reliable, considered)
- **`DESIGN.md`** — color tokens (oklch), typography (Geist Variable), elevation, component specs, do's/don'ts

Changes to the visual identity must update both files in sync. The `.impeccable/design.json` sidecar is the machine-readable equivalent.

## Package manager

pnpm 10. Always use `pnpm` (not npm/yarn). The lockfile is `pnpm-lock.yaml` at workspace root.
