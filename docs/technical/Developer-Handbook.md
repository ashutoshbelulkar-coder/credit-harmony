# HCB Admin Portal — Developer Handbook (step-by-step)

**Version:** 1.0.0 | **Date:** 2026-03-29  
**Audience:** Engineers and operators who have never touched this repo before.

This handbook is the **operational source of truth** for running, testing, and troubleshooting the **in-repo prototype** (Vite + React SPA + Fastify dev API). It complements the **business** view in the BRD/PRD and the **future production** view in `Production-Backend-Roadmap.md`.

---

## 1. What you are running

| Layer | Technology | Port (default) | Persistence |
|-------|------------|----------------|-------------|
| SPA | Vite + React 18 + TypeScript | **8080** | N/A (static build) |
| Dev API | Fastify + in-memory state seeded from `src/data/*.json` | **8091** | **Lost on API restart** |

The README and older diagrams sometimes mention **Spring Boot** or **port 8090**. **This repository’s runnable backend is Fastify on 8091** unless you wire a different host.

---

## 2. Prerequisites (checklist)

1. **Node.js** — LTS (e.g. 20.x or 22.x). Verify: `node -v`
2. **npm** — Use **npm** only (`package-lock.json` is canonical). Verify: `npm -v`
3. **Git** — To clone and diff. Verify: `git --version`
4. **Terminal** — PowerShell, bash, or zsh is fine. On Windows, prefer paths **without** spaces for fewer tooling edge cases (this project works from OneDrive paths, but long paths can occasionally bite other tools).

**You do not need:** Docker, PostgreSQL, or Java/Maven **for the in-repo dev API**.

---

## 3. First-time setup (copy-paste order)

```bash
# 1) From the repo root
cd credit-harmony

# 2) Install dependencies (use npm, not pnpm/yarn/bun for this repo)
npm install

# 3) Run automated tests (validates Node + TypeScript + test harness)
npm run test
```

**Expected:** All Vitest projects pass (**client** jsdom + **server** node). If anything fails, fix tests or environment before relying on manual QA.

---

## 4. Environment variables (reference)

### Frontend (`VITE_*`)

| Variable | Typical dev value | Meaning |
|----------|-------------------|---------|
| `VITE_API_BASE_URL` | `/api` | Browser calls same origin; Vite **proxies** `/api` to the dev API |
| `VITE_API_PROXY_TARGET` | *(unset)* → `http://127.0.0.1:8091` | Override proxy target if API runs elsewhere |
| `VITE_USE_MOCK_FALLBACK` | `true` in `.env.development` | If API errors/unreachable, SPA may use `src/data/*.json` mocks |
| `VITE_SHOW_DEMO_AUTH_UI` | `true` in dev unless set `false` | Shows demo “forgot password / SSO” style rows on login; **production builds default to hidden** unless explicitly `true` |

### API (`server`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `8091` | Fastify listen port |
| `JWT_SECRET` | Dev default in code | **Set a strong secret in any real deployment** |

---

## 5. Run the application (two supported modes)

### Mode A — Frontend only (mock data)

Use when you only need UI and static JSON.

```bash
npm run dev
```

Open `http://localhost:8080` (or the URL Vite prints). With `VITE_USE_MOCK_FALLBACK=true`, many screens still work if the API is down.

### Mode B — Full stack (recommended for “real” behaviour)

**Terminal 1 — API**

```bash
npm run server
```

Wait until the process logs that it is listening on **8091**.

**Terminal 2 — SPA**

```bash
npm run dev
```

**Sanity check:** Log in with a seeded account (see §6). Open **Institutions** and confirm list loads from HTTP (Network tab should show `/api/v1/institutions`).

---

## 6. Seeded test accounts (dev API)

| Email | Password | Notes |
|-------|----------|-------|
| `admin@hcb.com` | `Admin@1234` | Primary admin for local testing |
| `super-admin@hcb.com` | `Admin@1234` | Alternate super-admin |
| `viewer@hcb.com` | `Admin@1234` | Low-privilege smoke test |

**Do not** use these credentials outside isolated dev environments.

---

## 7. Testing (what runs and what it proves)

### Command

```bash
npm run test
```

### Vitest projects (`vitest.config.ts`)

| Project | Environment | Glob | Purpose |
|---------|-------------|------|---------|
| `client` | jsdom | `src/**/*.{test,spec}.{ts,tsx}` | Pure calcs, `api-client`, React components, auth context |
| `server` | node | `server/**/*.test.ts` | Fastify **integration** via `app.inject()` — **no open port** |

### Key files (do not guess — look here)

| File | What it validates |
|------|-------------------|
| `server/src/api.integration.test.ts` | Login, refresh, authz on institutions, **POST institutions** → list + `GET /approvals?type=institution`, dashboard metrics, approvals, users PATCH, **audit-logs** (seeded list, filters, **PATCH institution asserts `INSTITUTION_UPDATE` audit growth**), alert-rule lifecycle, reports POST, products list, **POST products** → `type=product`, **POST consortiums** → `type=consortium`, batch retry/cancel, consortium members, institution memberships/subscriptions, **roles GET/POST/PATCH/DELETE** |
| `server/src/test-helpers.ts` | Shared `loginAsAdmin` / `authHeaders` for integration tests |
| `src/test/lib/api-client.test.ts` | HTTP helper behaviour (errors, refresh) |
| `src/test/calc/*.test.ts` | KPI/date/batch calculations |
| `src/test/components/*.test.tsx` | Critical list/queue UI |
| `src/test/auth/AuthContext.test.tsx` | Session / refresh behaviour |
| `src/test/lib/feature-flags.test.ts` | Demo UI flags stay consistent |

### Watch mode

```bash
npm run test:watch
```

### End-to-end (Playwright)

One browser test drives login + navigation with **`VITE_USE_MOCK_FALLBACK=false`** against a spawned Fastify (8091) and Vite (4173). First time only:

```bash
npx playwright install
npm run test:e2e
```

See `playwright.config.ts` and `e2e/critical-flows.spec.ts`.

### Coverage (optional)

```bash
npm run test -- --coverage
```

---

## 8. Manual API checks (curl)

Use **8091** for the in-repo API (not 8090).

```bash
# Login
curl -s -X POST http://127.0.0.1:8091/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@hcb.com\",\"password\":\"Admin@1234\"}"

# Then call a protected route (PowerShell: set $env:TOKEN first)
curl -s http://127.0.0.1:8091/api/v1/institutions?page=0^&size=5 ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

On bash, replace `^` with `\` for line continuation.

---

## 9. Troubleshooting (symptom → fix)

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Login fails / empty data with API “up” | SPA still on mock fallback | Set `VITE_USE_MOCK_FALLBACK=false` for that shell/session; restart Vite |
| `401` on every API call | API not running or wrong proxy target | Run `npm run server`; check `vite.config.ts` proxy and `VITE_API_PROXY_TARGET` |
| `ECONNREFUSED` in browser Network tab | Nothing on 8091 | Start API; confirm firewall allows loopback |
| CORS errors in dev | Calling API origin directly from browser without proxy | Use `/api` relative URLs + Vite dev server (default setup) |
| Tests pass locally but CI fails | Node version mismatch or missing `npm ci` | Align Node LTS; run `npm ci` in CI |
| Integration tests flaky | **Unlikely** — server tests share one in-memory state file-wide | Keep mutation tests in `describe.sequential` order; avoid parallel server projects |

---

## 10. Documentation map (which doc to read when)

| Question | Document |
|----------|----------|
| Business scope, compliance framing | `docs/BRD-Hybrid-Credit-Bureau-Admin-Portal.md` |
| Product requirements detail | `docs/PRD-BRD-HCB-Admin-Portal.md` |
| **Which UI actions hit which API** | `docs/technical/API-UI-Parity-Matrix.md` |
| Test strategy + Spring-target tables (aspirational) | `docs/technical/Testing-Plan.md` |
| Post-prototype backend plan | `docs/technical/Production-Backend-Roadmap.md` |
| ADRs | `docs/technical/Technical-Decision-Log.md` |
| Global API errors (target envelope + codes) | `docs/technical/Global-API-Error-Dictionary.md` |
| Idempotency / retries / async jobs | `docs/technical/Idempotency-And-Retries.md` |
| Multi-tenant SaaS (target) | `docs/technical/Multi-Tenant-Target-Architecture.md` |
| AI agents / prompts / HITL (target) | `docs/technical/AI-Governance-Framework.md` |
| OpenAPI snapshot (validate with `npm run openapi:validate`) | `docs/technical/openapi-hcb-fastify-snapshot.yaml` |
| Repo scripts and stack summary | `README.md` |

**Important:** `Testing-Plan.md` mixes **target** Spring/JUnit scenarios with **implemented** Vitest/Fastify coverage. Always read the section titled **“Implemented tests in this repository”** for ground truth on what CI actually runs today.

---

## 11. Prototype honesty (avoid false confidence)

- **In-memory API** — Restart clears mutations; this is **not** a production persistence model.
- **RBAC** — The dev API checks authentication (JWT) broadly; **fine-grained role denial** may differ from future Spring policies. Treat parity matrix + integration tests as **contract smoke**, not a full authz proof.
- **OpenAPI** — Not yet published as a frozen contract; integration tests document behaviour in code.

When demoing to stakeholders, say explicitly: **“This is a working UI prototype with a dev API; production will use durable storage and stricter security controls per the roadmap.”**

---

## 12. Release checklist (minimal)

- [ ] `npm run test` — all green
- [ ] `npm run openapi:validate` — OpenAPI snapshot parses (CI runs this)
- [ ] `npm run build` — SPA builds
- [ ] Spot-check login + one mutating flow (e.g. alert rule edit) against running API
- [ ] Confirm `VITE_SHOW_DEMO_AUTH_UI` / copy matches the environment (prod vs demo)

---

*End of Developer Handbook v1.0.0*
