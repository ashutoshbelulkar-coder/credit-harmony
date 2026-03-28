# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

HCB (Hybrid Credit Bureau) Admin Portal — a React 18 SPA built with Vite, TypeScript, Tailwind CSS, and shadcn/ui. A **local development API** lives in `server/` (Fastify + in-memory state seeded from `src/data/*.json`). The Vite dev server proxies `/api` to that backend (default **http://127.0.0.1:8091** — override with `VITE_API_PROXY_TARGET` if needed).

When the API is running, use real login: **`admin@hcb.com` / `Admin@1234`** (also `super-admin@hcb.com`, `viewer@hcb.com` with the same password). If `VITE_USE_MOCK_FALLBACK=true` and the API is unreachable, the SPA falls back to mock auth and mock data per service layer.

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
