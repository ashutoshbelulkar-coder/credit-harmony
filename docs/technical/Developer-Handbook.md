# HCB Admin Portal — Developer Handbook (step-by-step)

**Version:** 2.1.2 | **Date:** 2026-03-31  
**Audience:** Engineers and operators who have never touched this repo before.

This handbook is the **operational source of truth** for running, testing, and troubleshooting the **in-repo prototype** (Vite + React SPA + **Spring Boot** API). It complements the **business** view in the BRD/PRD and the **future production** view in `Production-Backend-Roadmap.md`.

---

## 1. What you are running

| Layer | Technology | Port (default) | Persistence |
|-------|------------|----------------|-------------|
| SPA | Vite + React 18 + TypeScript | **8080** | N/A (static build) |
| **Default API** | **Spring Boot** in `backend/` + JDBC + JPA | **8090** | **SQLite** file (`backend/data/hcb_platform.db` by default; reset via schema/seed on startup in dev) |
| Legacy API | Fastify + in-memory state (`server/`) | **8091** | **Lost on API restart** |

**Canonical local integration:** Vite proxies `/api` to **`http://127.0.0.1:8090`** unless `VITE_API_PROXY_TARGET` overrides. Use **`npm run spring:start`** (or `npm run spring:start` from root via `package.json`) for the Java API.

**Legacy Fastify** on **8091** is for historical comparison and Node-only unit tests — not the default product backend. See `docs/technical/Canonical-Backend.md` and `AGENTS.md`.

---

## 2. Prerequisites (checklist)

1. **Node.js** — LTS (e.g. 20.x or 22.x). Verify: `node -v`
2. **npm** — Use **npm** only (`package-lock.json` is canonical). Verify: `npm -v`
3. **JDK 17** — For Spring Boot. Verify: `java -version`
4. **Maven** — On `PATH`, **or** rely on the repo-local Maven under `.tools/apache-maven-*` (used by `npm run spring:test` / `npm run spring:start` when `mvn` is missing on Windows).
5. **Git** — To clone and diff. Verify: `git --version`
6. **Terminal** — PowerShell, bash, or zsh is fine. On Windows, OneDrive paths work; very long paths can occasionally affect other tools.

**You do not need:** Docker or PostgreSQL for default local dev (SQLite only).

---

## 3. First-time setup (copy-paste order)

```bash
# 1) From the repo root
cd credit-harmony

# 2) Install dependencies (use npm, not pnpm/yarn/bun for this repo)
npm install

# 3) Client + legacy Node tests
npm run test

# 4) Spring Boot regression suite (JUnit / MockMvc + SQLite in-memory where applicable)
npm run spring:test
```

**Expected:** Vitest passes; **`npm run spring:test`** passes (`HcbPlatformApplicationTest`, `DashboardCommandCenterSqliteIntegrationTest`, etc.). If Java/Maven is missing, install JDK 17 or add Maven to `PATH`.

---

## 4. Environment variables (reference)

### Frontend (`VITE_*`)

| Variable | Typical dev value | Meaning |
|----------|-------------------|---------|
| `VITE_API_BASE_URL` | `/api` | Browser calls same origin; Vite **proxies** `/api` to the backend |
| `VITE_API_PROXY_TARGET` | *(unset)* → **`http://127.0.0.1:8090`** | Override proxy target (e.g. `http://127.0.0.1:8091` for legacy Fastify) |
| `VITE_USE_MOCK_FALLBACK` | `true` in `.env.development` | If API errors/unreachable, SPA may use `src/data/*.json` mocks |
| `VITE_SHOW_DEMO_AUTH_UI` | `true` in dev unless set `false` | Demo “forgot password / SSO” style rows on login |

### Spring API (`backend/`)

| Variable / property | Default | Meaning |
|---------------------|---------|---------|
| `SERVER_PORT` | `8090` | Spring listen port |
| `HCB_DB_PATH` | `./data/hcb_platform.db` | SQLite file (relative to `backend/` working directory when set in dev) |
| `HCB_JWT_SECRET` | Dev fallback in `application.yml` | **Set a strong secret in any real deployment** |
| `HCB_DEV_SYNC_SEED_PASSWORDS` | `true` | Dev-only: re-encode known seed passwords with the live `PasswordEncoder` (`DevAuthDataBootstrap`) |

### Legacy Fastify (`server/`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `8091` | Fastify listen port |
| `JWT_SECRET` | Dev default in code | Set a strong secret in any real deployment |

---

## 5. Run the application (supported modes)

### Mode A — Frontend only (mock data)

Use when you only need UI and static JSON.

```bash
npm run dev
```

Open `http://localhost:8080`. With `VITE_USE_MOCK_FALLBACK=true`, many screens work if the API is down.

**Note — Master Schema Management (mock fallback):** The Master Schema pages under **`/data-governance/master-schema`** can run without the API. Seed data comes from `src/data/master-schemas.json`. In mock-fallback mode, the **Fields** tab may **derive** the displayed field inventory from `schema.rawJson.definitions.*.properties` (when present) so large schemas (e.g. Telco) show their full field set even if the seed `fields[]` list is smaller.

### Mode B — Full stack (**recommended** — Spring + SPA)

**Terminal 1 — Spring API**

```bash
npm run spring:start
```

Wait until the process logs that Tomcat is listening on **8090**.

**Terminal 2 — SPA**

```bash
VITE_USE_MOCK_FALLBACK=false npm run dev
```

**Sanity check:** Log in with **`admin@hcb.com` / `Admin@1234`**. Open **Dashboard** and **Institutions**; Network tab should show **`/api/v1/dashboard/*`** and **`/api/v1/institutions`** returning **200** (not **500**). Command-center **member** / pipeline labels use **legal institution name** first (see **API-UI-Parity-Matrix** *Institution display labels*).

**Schema Mapper (Data Governance wizard, Validation Rules, Data Products Configure):** Same stack — **`npm run spring:start`** on **8090** and **`VITE_USE_MOCK_FALLBACK=false`**. You do **not** need **`npm run server`** for these flows. Keep **`src/data/schema-mapper.json`** aligned with **`backend/src/main/resources/config/schema-mapper.json`** (same idea as packet catalogue sync). Optional LLM: set **`OPENAI_API_KEY`**; turn off structured mapping with **`hcb.schema-mapper.llm-enabled=false`**. Integration coverage: **`SchemaMapperSqliteIntegrationTest`** (`npm run spring:test`).

### Mode C — Legacy Fastify (comparison only)

**Terminal 1:** `npm run server` (or `npm run server:legacy`) — **8091**  
**Terminal 2:** `VITE_API_PROXY_TARGET=http://127.0.0.1:8091 VITE_USE_MOCK_FALLBACK=false npm run dev`

---

## 6. Seeded test accounts (Spring SQLite seed)

| Email | Password | Notes |
|-------|----------|-------|
| `admin@hcb.com` | `Admin@1234` | Primary admin for local testing |
| `super-admin@hcb.com` | `Admin@1234` | Alternate super-admin |
| `viewer@hcb.com` | `Admin@1234` | Low-privilege smoke test |

**Do not** use these credentials outside isolated dev environments.

---

## 7. Testing (what runs and what it proves)

### Commands

```bash
npm run test                 # Vitest — client + server (Node) projects
npm run spring:test          # Maven — Spring Boot tests (uses `.tools` Maven on Windows if needed)
npm run check:route-parity   # Heuristic Fastify vs Spring /api/v1 path scan (smoke only)
```

### Vitest projects (`vitest.config.ts`)

| Project | Environment | Glob | Purpose |
|---------|-------------|------|---------|
| `client` | jsdom | `src/**/*.{test,spec}.{ts,tsx}` | Pure calcs, `api-client`, React components, auth context |
| `server` | node | `server/**/*.test.ts` | Legacy Fastify helpers / gates — **no** full HTTP integration (removed); see Spring tests |

### Spring Boot (`npm run spring:test`)

| Class | What it validates |
|-------|-------------------|
| `HcbPlatformApplicationTest` | Login, health, protected routes, packet-catalog, form-metadata, etc. (H2 in-memory; **`hcb.schema-mapper.enabled=false`** — no `schema_mapper_*` DDL in that profile) |
| `DashboardCommandCenterSqliteIntegrationTest` | **`GET /api/v1/dashboard/command-center`** against **real SQLite** DDL + seed (`create_tables.sql` / `seed_data.sql`) — catches JDBC/SQL issues H2-only tests miss |
| `SchemaMapperSqliteIntegrationTest` | **`/api/v1/schema-mapper/*`** on SQLite + full DDL; JWT, wizard-metadata, ingest, mapping job to **`needs_review`**; LLM off |
| `RouteParitySqliteIntegrationTest` | **`GET /api/v1/data-ingestion/drift-alerts`**, **`POST /api/v1/api-keys`**, **`POST /api/v1/users/:id/deactivate`**, plus **`GET`** smoke for **`/consortiums`**, **`/products`**, **`/reports`**, **`/sla-configs`**, **`/alert-rules`**, **`/users`**, **`/audit-logs`** on SQLite + seed |
| `MonitoringAlertSqliteIntegrationTest` | Monitoring + alert-incidents JDBC endpoints on SQLite + seed |
| `ApprovalQueueSqliteIntegrationTest` | **`GET /api/v1/approvals`** **`metadata`**, product + alert-rule enqueue, **`POST …/approve`** and **`…/reject`** **204** on SQLite + seed |

### Key client files

| File | What it validates |
|------|-------------------|
| `src/test/lib/api-client.test.ts` | HTTP helper behaviour (errors, refresh); **204** / empty success body → **`undefined`** (no JSON parse on empty) |
| `src/test/calc/*.test.ts` | KPI/date/batch calculations |
| `src/test/components/*.tsx` | Critical list/queue UI |

### Watch mode

```bash
npm run test:watch
```

### End-to-end (Playwright)

Install browsers once: `npx playwright install`, then **`npm run test:e2e`**. The project is configured to exercise the app against a **live API** (typically **Spring** on **8090** + Vite on **4173** when `VITE_USE_MOCK_FALLBACK=false`); confirm `playwright.config.ts` for the exact webServer command.

### Coverage (optional)

```bash
npm run test -- --coverage
```

---

## 8. Manual API checks (curl)

Use **8090** for the **default** Spring API.

**PowerShell (line continuation `^`):**

```powershell
curl -s -X POST http://127.0.0.1:8090/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@hcb.com\",\"password\":\"Admin@1234\"}"

curl -s "http://127.0.0.1:8090/api/v1/dashboard/command-center?range=30d" ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

On bash, replace `^` with `\` for line continuation.

---

## 9. Troubleshooting (symptom → fix)

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Login fails / empty data with API “up” | SPA still on mock fallback | Set `VITE_USE_MOCK_FALLBACK=false`; restart Vite |
| `401` on every API call | API not running or wrong proxy target | Run `npm run spring:start`; check `vite.config.ts` and `VITE_API_PROXY_TARGET` |
| `ECONNREFUSED` in browser Network tab | Nothing on **8090** | Start Spring; confirm firewall allows loopback |
| `500` on `/api/v1/dashboard/command-center` | Stale SQLite file vs code (rare) or backend bug | Run `npm run spring:test`; delete/regenerate dev DB if schema drifted; see `Testing-Plan.md` |
| `500` / `ERR_INTERNAL` on list routes (`/consortiums`, `/products`, `/users`, `/audit-logs`, `/reports`, `/sla-configs`, `/alert-rules`) | Outdated backend binary or DB file vs **`create_tables.sql`** | Pull latest; run **`npm run spring:test`**; stop Spring, delete **`backend/data/hcb_platform.db`** (and **`-shm`/`-wal`**), restart so **`spring.sql.init`** reapplies schema + seed — see [Technical-Decision-Log.md](./Technical-Decision-Log.md) **TDL-018** |
| Batch Execution Console shows no phases / sparse tree for a **numeric** job id | That job has no **`batch_phase_logs`** rows (legacy seed) | Expected: API returns legacy flat **`stages`** only. For a full demo tree use seeded job **`999901`** or insert phases/stages per **`create_tables.sql`** |
| `403` on **`GET /api/v1/audit-logs`** | Role **`VIEWER`** is excluded in **`SecurityConfig`** for that path | Use **`ANALYST`**, **`BUREAU_ADMIN`**, **`SUPER_ADMIN`**, or **`API_USER`**; or extend **`SecurityConfig`** if product requires viewer access |
| CORS errors in dev | Calling API origin directly from browser without proxy | Use `/api` relative URLs + Vite dev server (default setup) |
| Tests pass locally but CI fails | Node/Java version mismatch | Align JDK 17 + Node LTS; use `npm ci` in CI |

---

## 10. Documentation map (which doc to read when)

| Question | Document |
|----------|----------|
| Business scope, compliance framing | `docs/BRD-Hybrid-Credit-Bureau-Admin-Portal.md` |
| Product requirements detail | `docs/PRD-BRD-HCB-Admin-Portal.md` |
| **Which UI actions hit which API** | `docs/technical/API-UI-Parity-Matrix.md` |
| **Spring ↔ SPA route checklist** | `docs/technical/Spring-SPA-Route-Inventory.md` |
| Test strategy + Spring tables | `docs/technical/Testing-Plan.md` |
| Canonical backend (Spring vs Fastify) | `docs/technical/Canonical-Backend.md` |
| Contract gaps closing toward Spring | `docs/technical/SPA-Service-Contract-Drift.md` |
| Post-prototype backend plan | `docs/technical/Production-Backend-Roadmap.md` |
| ADRs | `docs/technical/Technical-Decision-Log.md` |
| Global API errors | `docs/technical/Global-API-Error-Dictionary.md` |
| AI agents / HITL (target) | `docs/technical/AI-Governance-Framework.md` |
| Repo scripts and stack summary | `README.md` |
| Cursor / agent defaults | `AGENTS.md` |

**Note:** `Testing-Plan.md` includes both **implemented** suites and **target** scenarios — read **“Implemented tests in this repository”** for CI ground truth.

---

## 11. Prototype honesty (avoid false confidence)

- **SQLite (dev)** — Durable file under `backend/data/`; schema + seed re-run on startup in default dev profile — not production HA.
- **Legacy Fastify** — In-memory; restart clears mutations.
- **RBAC** — Spring enforces method-level roles on many routes; treat parity matrix + tests as **smoke**, not a full authz audit.
- **OpenAPI** — Snapshot YAML may lag Spring; integration tests and controllers are authoritative for behaviour.

When demoing: **“Working admin UI with Spring JWT API on SQLite in dev; production uses PostgreSQL and hardened secrets per the roadmap.”**

---

## 12. Release checklist (minimal)

- [ ] `npm run test` — all green  
- [ ] `npm run spring:test` — all green  
- [ ] `npm run openapi:validate` — OpenAPI snapshot parses (if CI runs it)  
- [ ] `npm run build` — SPA builds  
- [ ] Spot-check login + Dashboard + one mutating flow against **Spring** on **8090**  
- [ ] Confirm `VITE_SHOW_DEMO_AUTH_UI` / copy matches the environment (prod vs demo)

---

*End of Developer Handbook v2.1.2*
