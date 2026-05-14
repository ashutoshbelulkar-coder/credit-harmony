---
project_name: credit-harmony
user_name: Ashu
date: "2026-04-07"
sections_completed:
  - technology_stack
  - language_rules
  - framework_rules
  - testing_rules
  - quality_rules
  - workflow_rules
  - anti_patterns
status: complete
rule_count: 42
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss. For full product and API behaviour, also read `AGENTS.md` at the repository root._

---

## Technology Stack & Versions

| Area | Stack | Notes |
|------|--------|--------|
| SPA | React 18, TypeScript 5.8, Vite 5.4, Tailwind 3.4 | Dev server **8080**, `host: "::"` |
| UI | shadcn/ui (Radix), `tailwind-merge`, `class-variance-authority` | Merge utility classes with `cn()` carefully (see Quality) |
| Data / forms | TanStack Query 5, React Hook Form, Zod | Validate forms with Zod where the codebase already does |
| Routing | React Router 6 | |
| Backend (canonical) | Spring Boot **3.2.3**, Java **17**, SQLite dev (`backend/data/hcb_platform.db`) | Default API **8090** (`SERVER_PORT` overrides) |
| Legacy API | Fastify in `server/` | **8091** — reference only, not contract owner |
| Tests | Vitest 3, Testing Library, Playwright 1.51 | `vitest/globals` in `tsconfig.app.json` |
| Package manager | **npm** (`package-lock.json`) | Do not switch to pnpm/yarn/bun for this repo |

**Environment / proxy:** Vite proxies `/api` → `VITE_API_PROXY_TARGET` or `http://127.0.0.1:8090`. Use `.env.development` from `.env.development.example`; set `VITE_USE_MOCK_FALLBACK=false` for real API-backed dev.

---

## Critical Implementation Rules

### Language-Specific Rules

- TypeScript is **`strict: false`** with **`noImplicitAny: false`** — do not assume strict-mode guarantees; still write clear types for public APIs and props.
- Path alias: import app code via `@/` → `src/` (see `tsconfig`).
- Prefer `async`/`await` with TanStack Query for server state; avoid ad-hoc `fetch` in components when a service layer or hook already exists.
- Spring/JDBC list endpoints must stay aligned with `backend/src/main/resources/db/create_tables.sql` — column/enum mismatches surface as **500 / ERR_INTERNAL** (see `docs/technical/SPA-Service-Contract-Drift.md`).

### Framework-Specific Rules

- **Canonical API is Spring** under `backend/` — new features and contract fixes belong there unless explicitly scoped to legacy Fastify.
- React Query: invalidate the right query keys after mutations (institutions, approvals, products, etc.); follow existing invalidation patterns in the same feature.
- UI: match existing shadcn patterns (spacing, typography utilities). Use **`tailwind-merge` / `cn()`** so conditional classes do not drop conflicting utilities (e.g. review step value classes — avoid merging in a way that drops `text-body`).
- Status filters and badges: API enums are often **lowercase**; use shared normalizers in `src/lib/status-badges.ts` and related helpers for consistency.
- Empty success bodies: client treats **204** and empty **200** safely — do not assume JSON bodies on approve/reject endpoints.

### Testing Rules

- Unit/component tests: **Vitest** + Testing Library; use `vitest/globals` patterns already in the repo.
- E2E: **Playwright** (`npm run test:e2e`); use `dev:e2e` script when you need proxy + no mock fallback for API-backed flows.
- Prefer testing behaviour and accessibility over snapshot noise; align with existing test file locations next to features or under `src/**/__tests__` as the project already does.

### Code Quality & Style Rules

- ESLint flat config (`eslint.config.js`): `typescript-eslint` recommended; **`@typescript-eslint/no-unused-vars` is off** — rely on intentional naming and cleanup when touching code.
- Do not introduce drive-by fixes for repo-wide ESLint debt unless the task asks for it; `npm run lint` may report pre-existing issues.
- File naming: follow existing patterns (PascalCase for React components, kebab-case for some routes/files — match neighbouring files).
- Keep JSON/catalogue pairs in sync when the task touches them (e.g. SPA `src/data/*.json` vs Spring `backend/src/main/resources/...` — see `AGENTS.md` for which pairs must match).

### Development Workflow Rules

- **npm** for installs; commit lockfile consistency.
- Frontend dev: `npm run dev` (Vite 8080). Backend: `npm run spring:test` / `npm run spring:start` (requires Maven on PATH).
- Route parity checks are heuristic: `npm run check:route-parity` — noisy, not a strict gate.
- SQLite seed windows: if dashboard/monitoring looks empty, machine clock may be outside seeded ranges; DB reset per `AGENTS.md` when schema/enum migrations require it.

### Critical Don't-Miss Rules

- **Member traffic:** Active institution required for many member APIs; non-active states return **403** with `ERR_INSTITUTION_*` — see Global API error dictionary and Data Flow docs.
- **Approval queue:** Spring inserts rows for institutions, products, consortiums, alert rules, schema mappings — metadata ids on approvals must match deep-link expectations.
- **Schema Mapper / Data Products:** Packet catalogue, institution register form, and schema-mapper config have **SPA + classpath** mirrors — update both when changing shapes.
- **Security:** Never ship default JWT secrets in production; document new env vars in the same style as existing `.env.example` files when adding features that need them.
- **Scope:** Implement only what the task requires; avoid unrelated refactors and avoid deleting unrelated comments.

---

## Usage Guidelines

**For AI Agents:**

- Read this file and `AGENTS.md` before implementing features that touch API, auth, or cross-module behaviour.
- Follow all rules here exactly; when in doubt, prefer the more restrictive or contract-aligned option.
- Update this file if you introduce new project-wide patterns that future agents must not miss.

**For Humans:**

- Keep this file lean; prefer linking to `docs/` for long explanations.
- Update when major versions or canonical backend behaviour change.
- Remove rules that become obvious or redundant over time.

Last Updated: 2026-04-07
