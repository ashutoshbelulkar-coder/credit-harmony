# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

HCB (Hybrid Credit Bureau) Admin Portal — a React 18 SPA built with Vite, TypeScript, Tailwind CSS, and shadcn/ui.

**Canonical SPA backend (local dev):** `server/` — **Fastify** + in-memory state seeded from `src/data/*.json`. The Vite dev server proxies `/api` to **http://127.0.0.1:8091** by default. Override the proxy target when starting Vite: `VITE_API_PROXY_TARGET=http://127.0.0.1:8090 npm run dev` (Unix) or set the env var in your shell on Windows.

**Alternate backend:** `backend/` — **Spring Boot** on port **8090** with SQLite (dev) / PostgreSQL (prod). It is **not** the default proxy target; contracts differ (verbs, pagination, RBAC). See `docs/technical/Canonical-Backend.md` and `docs/technical/SPA-Service-Contract-Drift.md`.

When the API is running, use real login: **`admin@hcb.com` / `Admin@1234`** (also `super-admin@hcb.com`, `viewer@hcb.com` with the same password). If `VITE_USE_MOCK_FALLBACK=true` and the API is unreachable, the SPA falls back to mock auth and mock data per service layer.

**Data products:** With the Fastify dev API, **Create product** (`POST /api/v1/products` with `approval_pending`) persists the row and **enqueues** a `type: product` item on `GET /api/v1/approvals` (`metadata.productId`). **Consortiums:** **Create consortium** (`POST /api/v1/consortiums`, default or explicit `approval_pending`) enqueues `type: consortium` (`metadata.consortiumId`). **Register member** (`POST /api/v1/institutions`) enqueues `type: institution` (`metadata.institutionId`); the member list requests **size=200** so new pending rows are included. After submit, the app returns to **`/institutions`** and invalidates institutions + approvals. Use `VITE_USE_MOCK_FALLBACK=false` and `npm run server` so create/queue actions hit the real API.

### Key commands

See `package.json` scripts for the canonical list:

- **Dev server (frontend):** `npm run dev` — starts Vite on port 8080
- **API server (backend):** `npm run server` — `tsx watch server/src/index.ts` on port **8091** (set `PORT` to override)
- **Lint:** `npm run lint` — runs ESLint (expect pre-existing warnings/errors in the repo; these are not regressions)
- **Test:** `npm run test` — runs Vitest
- **Build:** `npm run build` — production build via Vite

### Non-obvious notes

- The lockfile is `package-lock.json`; use **npm** (not pnpm/yarn/bun) even though `bun.lock` / `bun.lockb` also exist in the repo.
- `npm run lint` exits non-zero due to pre-existing ESLint errors (e.g. `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-empty-object-type`). These are not regressions — do not try to fix them unless specifically asked.
- The Vite dev server binds to `::` (all interfaces) on port **8080** (configured in `vite.config.ts`).
- **Production:** set `JWT_SECRET` on the API host; never ship the default dev secret.
- No Docker or external DB required for local dev (API uses in-memory state).
