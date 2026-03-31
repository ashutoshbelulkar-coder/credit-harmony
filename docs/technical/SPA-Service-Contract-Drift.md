# SPA service layer vs Spring Boot — contract drift

**Date:** 2026-03-31  
**Audience:** Engineers switching `VITE_API_PROXY_TARGET` to the Java API or merging backends.

The SPA [`src/lib/api-client.ts`](../../src/lib/api-client.ts) and [`src/services/`](../../src/services/) target the **Fastify** dev API (`server/src/index.ts`). The following deltas apply when using **`backend/` (Spring)** without adapters.

| Topic | Fastify (SPA default) | Spring (`backend/`) | Action if using Spring |
|-------|------------------------|------------------------|-------------------------|
| Port (default) | 8091 | 8090 | Set `VITE_API_PROXY_TARGET` |
| Institution update | `PATCH /api/v1/institutions/:id` | `PUT /api/v1/institutions/:id` | Add `PUT` in client or add `PATCH` on server |
| Institution list page | `{ content, totalElements, totalPages, page, size }` | Spring `Page` JSON (`content`, `totalElements`, …) | Verify field names match or map in `fetchInstitutions` |
| Institution list `role` query | Fastify filters by **`role=dataSubmitter`** / **`role=subscriber`** (`isDataSubmitter` / `isSubscriber`). Used by consortium wizard (**subscriber**), **Validation Rules** applicable members (**dataSubmitter**), and similar pickers. | Spring **`GET /api/v1/institutions`** may ignore **`role`** — consortium wizard still filters **`isSubscriber`** client-side | Add `role` to Spring list API or keep client filter |
| User deactivate | `POST /api/v1/users/:id/deactivate` | `DELETE /api/v1/users/:id` (soft delete) | Align route + client |
| User PATCH | Full patch for roles, institution, names | Partial (`UserController` patch subset) | Extend Spring or narrow client |
| JWT roles in payload | e.g. `"Super Admin"`, `"Viewer"` | Often `ROLE_SUPER_ADMIN` style | Align `AuthContext` / guards |
| GET `/api/v1/roles` | Each row includes `permissions` as section×action matrix (Fastify in-memory) | JPA `Role` entity: `id`, `roleName`, `description`, `createdAt` only — **no** matrix JSON | SPA applies `mergeRolePermissionsFromApi`; persist matrix in Spring if the portal must be DB-authoritative for RBAC |
| Monitoring KPIs | `MonitoringKpis` from seed / computed | `MonitoringController` uses DB column names / windows | Normalize DTO or map in `fetchMonitoringKpis` |
| Institution sub-resources | consent, api-access, billing PATCH, product subscriptions, consortium memberships, documents | Subset implemented; some read-only or missing | Port missing routes or stub UI |
| Member Overview charts | `GET /api/v1/institutions/:id/overview-charts` (member-scoped 30d aggregates) | **Not implemented** on `InstitutionController` | Add JDBC/service aggregates or hide chart cards when proxying Spring |
| Consortiums API | **`GET/POST/PATCH …/consortiums`** — public consortium JSON is **`id`, `name`, `status`, `membersCount`, `dataVolume`, `description`, `createdAt`**; **`type`**, **`purpose`**, **`governanceModel`** stripped on read and ignored on write; **`GET …/consortiums/:id/members`** returns **`id`, `institutionId`, `institutionName`, `joinedAt`** (no **`role`**); **`members`** on create/patch is **`{ institutionId }[]`**; **`activeConsortiums`** in form-metadata is **`{ id, name }`**; institution **`consortium-memberships`** omits **`consortiumType`** (still includes **`memberRole`** for the institution↔consortium link) | Spring **`ConsortiumController`** list/detail may still expose extra DB columns (`type`, `governanceModel`, etc.); **`member_role`** remains in **`consortium_members`** table but is **not** returned on **`GET …/consortiums/{id}/members`** (aligned with Fastify). | Align remaining Spring DTOs or map in client |
| Register member — wizard metadata | `GET /api/v1/institutions/form-metadata?geography=` returns **`registerForm`** (Step 1 field layout, enums, single/multi) plus **`institutionTypes`**, **`activeConsortiums`**, **`requiredComplianceDocuments`** (**`null`** skips compliance step); **`POST /api/v1/institutions?geography=`** validates against that geography’s form; optional **`consortiumIds`** when subscriber | **Not implemented** | Add geography-scoped form config + compliance checklist + **`POST`** validation and consortium membership rules |
| Product packet catalogue | `GET /api/v1/products/packet-catalog` → `{ options }` from **`data-products.json`** (includes **`derivedFields`**) | Same route on **`ProductController`**; body from **`catalog/product-packet-catalog.json`** — **must stay in sync** with **`src/data/data-products.json`** `productCatalogPacketOptions` | Update both JSON sources when the catalogue changes |
| RBAC | Bearer present → allow | `@PreAuthorize` per route | Enforce same rules in Fastify or test Spring-only |
| **Schema Mapper Agent** | `GET/POST/PATCH … /api/v1/schema-mapper/*`, **`GET …/wizard-metadata`** (Step 1 dropdowns), async mapping worker, `metadata.mappingId` on approvals | **Not implemented** on Spring track | Port or BFF; SPA uses real routes only when proxying Fastify |

**Authoritative Fastify surface:** hand-maintained snapshot [openapi-hcb-fastify-snapshot.yaml](./openapi-hcb-fastify-snapshot.yaml) and live [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md).

**Recommendation:** Treat Fastify as the **SPA contract** until OpenAPI is generated from one server and the client is generated or manually aligned; then migrate Spring to match or add a thin BFF.
