# AgriSense AI

AgriSense AI helps farmers and agronomists manage farm context and generate practical, climate-aware crop advisories.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/agrisense/src/App.tsx` — frontend routes, authenticated shell, farm and advisory flows
- `artifacts/agrisense/src/index.css` — field-notebook visual system and responsive layout
- `artifacts/api-server/src/routes/` — auth, dashboard, farm, and advisory API routes
- `artifacts/api-server/src/lib/advisory.ts` — Gemini generation with a conservative fallback
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and validation
- `lib/db/src/schema/agrisense.ts` — users, farms, and advisory persistence

## Architecture decisions

- Session authentication uses an HttpOnly JWT cookie signed with `SESSION_SECRET`; the brief explicitly requested JWT + bcrypt.
- Farm and advisory queries always include the authenticated user ID for application-level tenant isolation.
- AI generation uses the direct `GEMINI_API_KEY` path with a safe deterministic fallback when Gemini is unavailable.
- The frontend uses generated Orval hooks from the OpenAPI contract rather than handwritten request types.

## Product

Users can register and sign in, create multiple farm profiles, submit a three-step advisory intake, view structured crop recommendations with confidence scores, browse advisory history, and regenerate reports.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- Use `pnpm --filter @workspace/db run push` after changing `lib/db/src/schema/`.
- Artifact builds need workflow-provided `PORT` and `BASE_PATH`; use the managed workflow for the normal preview.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
