# `@/data` imports in `src/pages` — audit

**Date:** 2026-03-31  
**Purpose:** Track pages that import mock modules or JSON directly (bypasses `clientMockFallbackEnabled`). Use this list to prioritize moving types, labels, and datasets behind APIs or shared pure modules (e.g. [`src/lib/consortium-ui.ts`](../../src/lib/consortium-ui.ts)).

## Inventory

| Page | Import source | Notes |
|------|---------------|--------|
| `monitoring/BatchExecutionConsole.tsx` | `batch-console.json`, `monitoring-mock` | Types + mock catalogue **`batchConsoleByBatchId`** for **`BATCH-*`** ids; when the parent passes API-shaped **`BatchConsoleData`** from **`resolveBatchConsoleData`**, the console renders structured phases/stages from Spring **`GET /v1/batch-jobs/:id/detail`**. |
| `monitoring/DataSubmissionBatchSection.tsx` | `monitoring-mock`, `institutions-mock` | **`useBatchJobs`**, **`useBatchKpis`**, **`useBatchCharts`**, **`useBatchDetail`** (detail drawer / execution console). **`resolveBatchConsoleData`** ([`src/lib/batch-console-from-api.ts`](../../src/lib/batch-console-from-api.ts)) maps **`GET …/:id/detail`** (`phases` / `stages` / `flowSegments` / `logs` / `errorSamples`) when **`batch_phase_logs`** exist; otherwise legacy flat **`stages`** merge; mock keys still apply for static **`BATCH-*`** batch ids. |
| `agents/*` | `agents-mock`, `data-products-mock`, JSON | Out of product scope for backend wiring |
| `monitoring/alert-engine/*` | `alert-engine-mock` | Types + seed-shaped data |
| `consortiums/ConsortiumWizardPage.tsx` | `consortiums-mock` | Policy/member row types only; consortium + members from API. **Member picker:** `GET /v1/institutions?role=subscriber&size=200`, **`allowMockFallback: false`** (subscribers and dual-role only). |
| `consortiums/ConsortiumListPage.tsx` | **`@/lib/consortium-ui` only** (done) | List data from API |
| `consortiums/ConsortiumDetailPage.tsx` | `consortiums-mock` | Contribution mocks |
| `user-management/UsersListPage.tsx` | `user-management-mock` | Types only |
| `institution-tabs/*` | `institution-extensions-mock`, `institutions-mock`, `institution-tabs.json`, `reporting.json` | Tabs / billing types |
| `RegisterInstitution.tsx` | *(none — wizard lists from API)* | **`GET /v1/institutions/form-metadata?geography=`**: **`registerForm.sections`** (Step 1 driven by server config; dev file `institution-register-form.json`), plus `institutionTypes`, **`activeConsortiums`**, **`requiredComplianceDocuments`**. Mock fallback resolves the same shape client-side from types + consortiums when the API is unreachable |
| `data-products/*` | `data-products-mock` | Catalogue context; **`derivedFields`** live on each **`productCatalogPacketOptions`** row (JSON / **`GET /v1/products/packet-catalog`**). **ProductFormPage** passes **`catalogOptions`** into **`PacketConfigModal`** with **`packetIds[]`** per source-type row; modal loads **raw** paths and **registry Sources** from **`GET /v1/schema-mapper/schemas/source-type-fields`** and **`GET /v1/schema-mapper/schemas?sourceType=`** (`useSourceTypeFields`, **`useSchemaRegistryList`**) — see [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md) |
| `InstitutionList.tsx` | — | API-only list; lifecycle badge classes from `status-badges.ts` |
| `monitoring/*` | `monitoring-mock`, `institutions-mock` | Filters, types, drawers |
| `reporting/reporting-store.ts` | `reporting.json` | Report type filter metadata |
| `data-governance/*` | `data-governance-mock`, `schema-mapper-mock` (fallback when API unreachable), `institutions-mock` (unused by Validation Rules member picker — uses **`GET /v1/institutions?role=dataSubmitter`**) | Governance UI; **Schema Mapper wizard Step 1** uses **`GET /v1/schema-mapper/wizard-metadata`** for Source Type + Data Category (no raw REST path shown as footnote copy under the control); **Validation Rules** expression fields from **`GET /v1/schema-mapper/schemas/source-type-fields`** (see API-UI parity matrix) |

## Priority (API-first)

1. **P0 — Done:** Monitoring layout KPI banners → `GET /monitoring/kpis` via `useMonitoringKpis`.
2. **P1:** Monitoring — **Data Submission Live Request** table filters use **`InstitutionFilterSelect`** + API (`DataSubmissionApiSection`); toolbar uses the same pattern. Remaining **`institutions-mock`** usage is mainly for display name resolution on rows until unified with query cache — resolution uses **`institutionDisplayLabel`** (legal **`name`** first, then **`tradingName`**), aligned with Spring dashboard labels.
3. **P1:** Consortium wizard — keep mock for static option lists until `GET /config/consortiums` or similar exists.
4. **P2:** `InstitutionList` — move `statusStyles` to a shared module or API-driven config. **`RegisterInstitution` institution types:** done — API **`form-metadata`** + seed `institutions.json` `institutionTypes`.

Regenerate this table periodically:

`rg 'from ["']@/data/' src/pages --glob '*.{tsx,ts}'`
