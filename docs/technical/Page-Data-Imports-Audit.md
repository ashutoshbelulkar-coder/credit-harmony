# `@/data` imports in `src/pages` — audit

**Date:** 2026-03-29  
**Purpose:** Track pages that import mock modules or JSON directly (bypasses `clientMockFallbackEnabled`). Use this list to prioritize moving types, labels, and datasets behind APIs or shared pure modules (e.g. [`src/lib/consortium-ui.ts`](../../src/lib/consortium-ui.ts)).

## Inventory

| Page | Import source | Notes |
|------|---------------|--------|
| `monitoring/BatchExecutionConsole.tsx` | `batch-console.json`, `monitoring-mock` | Types + fallbacks |
| `monitoring/DataSubmissionBatchSection.tsx` | `monitoring-mock`, `institutions-mock` | Hybrid API + mock |
| `agents/*` | `agents-mock`, `data-products-mock`, JSON | Out of product scope for backend wiring |
| `monitoring/alert-engine/*` | `alert-engine-mock` | Types + seed-shaped data |
| `consortiums/ConsortiumWizardPage.tsx` | `consortiums-mock` | Purposes, governance models, wizard defaults |
| `consortiums/ConsortiumListPage.tsx` | **`@/lib/consortium-ui` only** (done) | List data from API |
| `consortiums/ConsortiumDetailPage.tsx` | `consortiums-mock` | Contribution mocks |
| `user-management/UsersListPage.tsx` | `user-management-mock` | Types only |
| `institution-tabs/*` | `institution-extensions-mock`, `institutions-mock`, `institution-tabs.json`, `reporting.json` | Tabs / billing types |
| `RegisterInstitution.tsx` | `institutions-mock` | `institutionTypes` |
| `data-products/*` | `data-products-mock` | Catalogue context |
| `InstitutionList.tsx` | `institutions-mock` | `statusStyles` |
| `monitoring/*` | `monitoring-mock`, `institutions-mock` | Filters, types, drawers |
| `reporting/reporting-store.ts` | `reporting.json` | Report type filter metadata |
| `data-governance/*` | `data-governance-mock`, `schema-mapper-mock`, `institutions-mock` | Governance UI |

## Priority (API-first)

1. **P0 — Done:** Monitoring layout KPI banners → `GET /monitoring/kpis` via `useMonitoringKpis`.
2. **P1:** Monitoring API/batch/inquiry sections — institution filter from `useInstitutions` instead of `institutions-mock` where feasible.
3. **P1:** Consortium wizard — keep mock for static option lists until `GET /config/consortiums` or similar exists.
4. **P2:** `InstitutionList` / `RegisterInstitution` — move `statusStyles` / `institutionTypes` to a types+constants module or API-driven config.

Regenerate this table periodically:

`rg 'from ["']@/data/' src/pages --glob '*.{tsx,ts}'`
