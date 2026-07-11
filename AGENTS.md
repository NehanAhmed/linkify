# linkify — agent guide

## Commands

| Action | Command |
|---|---|
| Dev server (hot reload) | `pnpm dev` |
| Build | `pnpm start` (runs `dist/index.js`) |
| DB push (sync schema) | `pnpm db:push` |
| DB generate (migration) | `pnpm db:generate` |
| Drizzle Studio | `pnpm db:studio` |
| Run tests | `pnpm test` |
| Watch tests | `pnpm test:watch` |
| Typecheck | `pnpm typecheck` |

## Architecture

- **Express 5** + **TypeScript** backend, compiled to CommonJS (`dist/`)
- Entry: `src/index.ts` → loads `.env` via dotenv, then starts HTTP server
- App: `src/app.ts` — Express app instance, `express.json()` middleware only
- DB: `src/db/index.ts` exports `db` (Drizzle ORM + Neon HTTP driver)
- Schema: `src/db/schema.ts` — define `pgTable` exports here
- Drizzle Kit config: `drizzle.config.ts` (reads `DATABASE_URL` from env)

## DB workflow

1. Set `DATABASE_URL` in `.env`
2. Define tables in `src/db/schema.ts`
3. Run `pnpm db:push` to create/update tables
4. Import `db` from `@/db` (or `../db`) to query

## Package manager

pnpm 10. Always use `pnpm` (not npm/yarn).