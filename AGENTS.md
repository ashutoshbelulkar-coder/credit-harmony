# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

HCB (Hybrid Credit Bureau) Admin Portal — a React 18 SPA built with Vite, TypeScript, Tailwind CSS, and shadcn/ui. There is no backend; all data comes from static JSON files in `src/data/`. Authentication is mock-only (any email + any non-empty password works; role determined by email prefix).

### Key commands

See `package.json` scripts for the canonical list:

- **Dev server:** `npm run dev` — starts Vite on port 8080
- **Lint:** `npm run lint` — runs ESLint (expect pre-existing warnings/errors in the repo; these are not regressions)
- **Test:** `npm run test` — runs Vitest (currently 1 trivial test)
- **Build:** `npm run build` — production build via Vite

### Non-obvious notes

- The lockfile is `package-lock.json`; use **npm** (not pnpm/yarn/bun) even though `bun.lock` / `bun.lockb` also exist in the repo.
- `npm run lint` exits non-zero due to pre-existing ESLint errors (e.g. `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-empty-object-type`). These are not regressions — do not try to fix them unless specifically asked.
- The Vite dev server binds to `::` (all interfaces) on port **8080** (configured in `vite.config.ts`).
- Mock login credentials: email `admin@hcb.com`, any non-empty password. Prefix `super-admin@` or `admin@` gives Super Admin role.
- No environment variables or `.env` files are needed.
- No Docker, no database, no external services required.
