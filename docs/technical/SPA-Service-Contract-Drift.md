# SPA service layer vs Spring Boot — contract drift

**Date:** 2026-03-29  
**Audience:** Engineers switching `VITE_API_PROXY_TARGET` to the Java API or merging backends.

The SPA [`src/lib/api-client.ts`](../../src/lib/api-client.ts) and [`src/services/`](../../src/services/) target the **Fastify** dev API (`server/src/index.ts`). The following deltas apply when using **`backend/` (Spring)** without adapters.

| Topic | Fastify (SPA default) | Spring (`backend/`) | Action if using Spring |
|-------|------------------------|------------------------|-------------------------|
| Port (default) | 8091 | 8090 | Set `VITE_API_PROXY_TARGET` |
| Institution update | `PATCH /api/v1/institutions/:id` | `PUT /api/v1/institutions/:id` | Add `PUT` in client or add `PATCH` on server |
| Institution list page | `{ content, totalElements, totalPages, page, size }` | Spring `Page` JSON (`content`, `totalElements`, …) | Verify field names match or map in `fetchInstitutions` |
| User deactivate | `POST /api/v1/users/:id/deactivate` | `DELETE /api/v1/users/:id` (soft delete) | Align route + client |
| User PATCH | Full patch for roles, institution, names | Partial (`UserController` patch subset) | Extend Spring or narrow client |
| JWT roles in payload | e.g. `"Super Admin"`, `"Viewer"` | Often `ROLE_SUPER_ADMIN` style | Align `AuthContext` / guards |
| GET `/api/v1/roles` | Each row includes `permissions` as section×action matrix (Fastify in-memory) | JPA `Role` entity: `id`, `roleName`, `description`, `createdAt` only — **no** matrix JSON | SPA applies `mergeRolePermissionsFromApi`; persist matrix in Spring if the portal must be DB-authoritative for RBAC |
| Monitoring KPIs | `MonitoringKpis` from seed / computed | `MonitoringController` uses DB column names / windows | Normalize DTO or map in `fetchMonitoringKpis` |
| Institution sub-resources | consent, api-access, billing PATCH, product subscriptions, consortium memberships, documents | Subset implemented; some read-only or missing | Port missing routes or stub UI |
| RBAC | Bearer present → allow | `@PreAuthorize` per route | Enforce same rules in Fastify or test Spring-only |

**Authoritative Fastify surface:** hand-maintained snapshot [openapi-hcb-fastify-snapshot.yaml](./openapi-hcb-fastify-snapshot.yaml) and live [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md).

**Recommendation:** Treat Fastify as the **SPA contract** until OpenAPI is generated from one server and the client is generated or manually aligned; then migrate Spring to match or add a thin BFF.
