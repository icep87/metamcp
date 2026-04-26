## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Repo structure

Turborepo monorepo with pnpm workspaces:
- `apps/backend` — Express 5 + tRPC + Drizzle ORM, ESM, Node >=18
- `apps/frontend` — Next.js 15 (App Router), React 19, Tailwind 4, tRPC client
- `packages/trpc` — shared tRPC router types
- `packages/zod-types` — shared Zod schemas
- `packages/eslint-config`, `packages/typescript-config` — shared tooling configs

## Commands

All from repo root via pnpm + turbo:

```
pnpm dev            # requires .env.local; starts all apps via turbo
pnpm build          # turbo build (respects dep order: packages → apps)
pnpm lint           # turbo lint (--max-warnings 0 enforced)
pnpm lint:fix       # auto-fix lint
pnpm format         # prettier over **/*.{ts,tsx,md}
pnpm check-types    # turbo check-types (tsc --noEmit on frontend; tsc on backend)
```

Backend-only commands (run from `apps/backend/`):
```
pnpm test           # vitest run (unit tests)
pnpm test:watch     # vitest interactive
pnpm db:generate:dev   # drizzle-kit generate using .env.local
pnpm db:migrate:dev    # drizzle-kit migrate using .env.local
pnpm db:generate       # uses .env (production)
pnpm db:migrate        # uses .env (production)
```

## Environment setup

- Copy `example.env` → `.env.local` for local dev
- `DATABASE_URL` is required; backend uses Postgres via Drizzle ORM
- `BETTER_AUTH_SECRET` must be set
- `APP_URL` / `NEXT_PUBLIC_APP_URL` default to `http://localhost:12008`
- Frontend runs on port **12008** (hardcoded in `next dev --port 12008`)
- `TRANSFORM_LOCALHOST_TO_DOCKER_INTERNAL=true` rewrites localhost URLs to `host.docker.internal` inside Docker

## Database / migrations

- Schema: `apps/backend/src/db/schema.ts`
- Migrations live in `apps/backend/drizzle/` (SQL files, committed)
- To add a column: edit schema → `pnpm db:generate:dev` → `pnpm db:migrate:dev`
- Never hand-edit migration SQL files

## Docker

```
pnpm dev:docker          # docker-compose.dev.yml — full stack with hot reload
pnpm dev:docker:down     # stop
pnpm dev:docker:clean    # stop + remove volumes
```

Production: `docker-compose.yml` / `Dockerfile`

## Architecture notes

- tRPC is the API layer between frontend and backend; shared types live in `packages/trpc`
- Auth is handled by `better-auth` on the backend (`apps/backend/src/auth.ts`)
- Bootstrap configuration (users, API keys, namespaces, endpoints) is driven entirely by `BOOTSTRAP_*` env vars on startup — no seed scripts
- `BOOTSTRAP_API_KEYS`, `BOOTSTRAP_NAMESPACES`, `BOOTSTRAP_ENDPOINTS` accept JSON arrays (see `example.env` for shape)

## Lint / type-check order

CI runs: `lint → check-types`. Fix lint warnings before type errors; `--max-warnings 0` makes any ESLint warning a failure.

## Shared packages

`@repo/trpc`, `@repo/zod-types`, `@repo/eslint-config`, `@repo/typescript-config` are workspace packages referenced via `workspace:*`. Build order is handled by turbo's `"dependsOn": ["^build"]`.
