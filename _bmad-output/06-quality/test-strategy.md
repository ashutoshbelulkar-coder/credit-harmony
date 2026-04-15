# Test strategy — HCB Admin Portal

**Phase:** Quality (Party Mode: Murat)  
**Canonical detail:** [../technical/Testing-Plan.md](../technical/Testing-Plan.md) (v3.0.7+) — **ground truth** for suite inventory and traceability IDs.

---

## 1. Risk-based approach

| Risk area | Test depth | Rationale |
|-----------|------------|-----------|
| **Auth / session / MFA** | High — integration + client | Wrong access affects all modules |
| **Approval queue + 204 bodies** | High — api-client + Spring integration | Empty success must not break JSON parse |
| **Institution gates** (`ERR_INSTITUTION_*`) | High — Vitest `institutionTrafficGate` | Wrong state → 403 on traffic |
| **JDBC list APIs vs DDL** | High — `RouteParitySqliteIntegrationTest`, schema-aligned GETs | Mismatch → 500 / ERR_INTERNAL |
| **Register form parity** | High — server + client unit + Spring metadata | Geography and validation drift |
| **Schema mapper** | Medium–High — SQLite integration when mapper enabled | Async jobs, source-type-fields 400 |
| **UI components** | Medium — RTL on critical paths | Not full E2E matrix in CI |
| **E2E Playwright** | On-demand — `npm run test:e2e` | Higher flake cost; use for releases |

---

## 2. Automation pyramid

```
        ┌─────────────┐
        │  E2E (few)  │
        └──────┬──────┘
       ┌───────┴───────┐
       │ Integration   │  Spring Boot + SQLite/H2; Vitest server
       └───────┬───────┘
      ┌────────┴────────┐
      │ Unit / component │  Vitest client + server unit
      └─────────────────┘
```

**Commands:** `npm run test` (Vitest), `npm run spring:test` (JUnit), `npm run test:e2e` (Playwright).

---

## 3. Functional vs non-functional

| Type | Coverage |
|------|----------|
| **Functional** | Route parity, approval flows, register validation, mapper metadata, dashboard JDBC on SQLite |
| **Security** | JWT, role denial (audit logs for VIEWER), no secrets in login response (see Testing-Plan tables) |
| **Performance** | Load/scale — out of default CI; targets in PRD/BRD for prod |
| **Contract** | API-UI parity matrix; OpenAPI in `docs/openapi/` |

---

## 4. Environment strategy

| Environment | Purpose |
|-------------|---------|
| **Local Spring + SQLite** | Canonical dev; integration tests mirror |
| **VITE_USE_MOCK_FALLBACK=false** | Real API paths for SPA manual verification |
| **Legacy Fastify** | Comparison only — not contract owner |

---

## 5. Quality gates (suggested)

1. **PR:** `npm run test` green; `npm run spring:test` green for touched backend.  
2. **Release:** `npm run test:e2e` on critical path subset; smoke Spring + seeded users.  
3. **Contract change:** Update [API-UI-Parity-Matrix.md](../technical/API-UI-Parity-Matrix.md) + TDL if needed.

---

## 6. Flake and debt policy

- **Flakiness** = priority defect for E2E; for unit/integration, fix or quarantine with owner.  
- **Pre-existing ESLint** failures — do not block unrelated PRs unless task includes lint ([AGENTS.md](../../AGENTS.md)).

---

## Cross-references

- [test-cases.md](./test-cases.md)  
- [Developer-Handbook.md](../technical/Developer-Handbook.md)
