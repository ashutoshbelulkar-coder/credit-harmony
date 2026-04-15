# Product Requirements Document (PRD) v1 — HCB Admin Portal

**Document type:** Consolidated PRD (hybrid: Amazon PR/FAQ clarity, Google-style structure, Lean prioritization)  
**Version:** 1.0 (doc-system)  
**Date:** 2026-04-07  
**Status:** Active — **canonical narrative detail** remains in [PRD-BRD-HCB-Admin-Portal.md](../PRD-BRD-HCB-Admin-Portal.md) (v2.16+); this file avoids duplication by **indexing** and **decision-ready summaries**.

**Owners (Party Mode):** John (PM), Paige (Tech Writer)

---

## 1. Executive summary

The **Hybrid Credit Bureau (HCB) Admin Portal** is a **React 18 + Vite** SPA with a **canonical Spring Boot** API (`/api/v1`, default port **8090**), providing a **single pane** for bureau operators to manage **member institutions**, **consortiums**, **data products** (packet catalogue + configuration), **schema mapping** and governance, **approvals**, **monitoring**, **reporting**, **alerts/SLA**, **batch jobs**, and **user/RBAC** administration.

**Legacy Fastify** (`server/`, port **8091**) is **reference-only**; production contract is **Spring** ([Canonical-Backend.md](../technical/Canonical-Backend.md)).

---

## 2. Problem statement

See [../01-discovery/problem-statement.md](../01-discovery/problem-statement.md).  
**One-line:** Operators need a **governed, observable** control plane for bureau **configuration**, **approval**, and **production health**—not disconnected tickets and spreadsheets.

---

## 3. Goals & success metrics (OKRs / KPIs)

### 3.1 Objectives (examples — align to business)

| Objective | Key results (measurable) |
|-----------|---------------------------|
| **O1 — Faster safe onboarding** | Reduce time from **registration** to **active** member; reduce first-time failure rate on registration + approval path |
| **O2 — Governed change** | % of material changes flowing through **approval queue** with correct **metadata** and audit trail |
| **O3 — Operational clarity** | Mean time to understand **batch failure** (phases, samples); reduction in escalations due to “unknown state” |
| **O4 — Contract fidelity** | Reduction in **500/ERR_INTERNAL** from list APIs; reduction in SPA/API **field drift** ([SPA-Service-Contract-Drift.md](../technical/SPA-Service-Contract-Drift.md)) |

### 3.2 KPIs (from BRD — targets in master PRD)

| KPI | Target (reference) |
|-----|-------------------|
| Institution onboarding cycle | ↓ vs baseline (PRD cites **40%** reduction goal) |
| Mapping accuracy | **≥97%** auto-mapping accuracy goal (BRD) |
| SLA breach detection | **<60s** (BRD) |
| Audit coverage | **100%** critical actions (BRD intent) |

---

## 4. User personas

| Persona | Role | Primary jobs |
|---------|------|--------------|
| Super Admin | Full administration | Users, system config, destructive ops |
| Bureau Admin | Institutions, governance, monitoring | Onboarding, approvals, products |
| Analyst | Read-heavy + governance tools | Dashboards, schema/mapping, reports |
| API User | Integration | Keys, programmatic access patterns |
| Viewer | Read-only | Executive/overview |

**Deep dive:** [PRD-BRD §4](../PRD-BRD-HCB-Admin-Portal.md), [../03-ux/personas.md](../03-ux/personas.md).

---

## 5. User journeys

**Golden paths (non-exhaustive):**

1. **Login** → optional **MFA** → dashboard ([AGENTS.md](../../AGENTS.md) test accounts).  
2. **Register member** → **approval queue** → approve/reject/request changes → **active** (enables traffic APIs per policy).  
3. **Create data product** → **packet configure** → approval pending → approval action.  
4. **Schema mapper** → mapping job → **submit for approval** → approval queue → mapping state update.  
5. **Batch job** → **detail** with phases/logs/error samples when available → retry rules per institution.

**Screen-level requirements:** [PRD-BRD §6](../PRD-BRD-HCB-Admin-Portal.md).

---

## 6. Features (MoSCoW)

| Priority | Capability |
|----------|------------|
| **Must** | Auth + MFA; institutions + registration wizard; consortiums; approvals; products + packet catalogue; schema mapper; monitoring; dashboard; users/RBAC; audit logs (role-gated); batch console; Spring-backed list APIs aligned to DDL |
| **Should** | Drift alerts; reporting; alert rules/SLA; API keys; data governance dashboards |
| **Could** | Enhanced multi-tenant features per [Multi-Tenant-Target-Architecture.md](../technical/Multi-Tenant-Target-Architecture.md); additional integrations on roadmap in PRD |

---

## 7. Functional requirements

**Source of truth:** [PRD-BRD-HCB-Admin-Portal.md](../PRD-BRD-HCB-Admin-Portal.md) §3, §6, §14–15 (modules, screens, APIs, models).  
**API parity matrix:** [API-UI-Parity-Matrix.md](../technical/API-UI-Parity-Matrix.md).

**Non-negotiable behaviours:**

- Approvals return **204** empty success; client must not require JSON body ([AGENTS.md](../../AGENTS.md)).  
- Institution **active** gate for member traffic; structured **403** + `ERR_INSTITUTION_*`.  
- Catalogue JSON **sync** between SPA and Spring classpath for products, institution forms, schema-mapper seed ([AGENTS.md](../../AGENTS.md)).

---

## 8. Non-functional requirements

| Area | Requirement |
|------|----------------|
| **Performance** | BRD targets (e.g. **P95 ≤ 200ms** API, **99.9%** uptime) — validate per environment |
| **Security** | JWT, MFA, optional Turnstile; role-based access; `JWT_SECRET` in prod |
| **Reliability** | SQLite dev; PostgreSQL prod; Hikari pool sizing for JDBC+JPA coexistence (AGENTS) |
| **Observability** | Audit logs; actuator health; batch phase logs when implemented |
| **Compatibility** | **npm** + `package-lock.json`; Vite proxy to Spring |

---

## 9. Assumptions & constraints

- **Assumptions:** Listed in [../01-discovery/problem-statement.md](../01-discovery/problem-statement.md) §6.  
- **Constraints:** No Docker required for local dev; seed data time windows affect dashboard KPIs; lint may have pre-existing failures (AGENTS).

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| SPA/API contract drift | Parity matrix, integration tests, TDL process ([Technical-Decision-Log.md](../technical/Technical-Decision-Log.md)) |
| Mock fallback confusion | Env flags documented; `VITE_USE_MOCK_FALLBACK=false` for real API dev |
| Legacy Fastify confusion | Docs and AGENTS state **Spring canonical** |
| DDL mismatch | JDBC queries must match `create_tables.sql` |

---

## 11. PR/FAQ — “Working backwards” snapshot

**Press release (internal):** Bureau operators can **onboard members**, **configure and approve** data products and schema mappings, and **triage batch and monitoring** from one audited platform backed by a **single canonical API**.

**FAQ:**  
- *Why Spring?* Contract owner for `/api/v1`, persistent DB, approval semantics.  
- *Why is Fastify still in repo?* Legacy comparison and tests—not production truth.  
- *Why empty approval responses?* 204 success — clients use shared api-client patterns.

---

## 12. Document control

| Artifact | Location |
|----------|----------|
| Full PRD + BRD + modules | [PRD-BRD-HCB-Admin-Portal.md](../PRD-BRD-HCB-Admin-Portal.md) |
| BRD-only | [BRD-Hybrid-Credit-Bureau-Admin-Portal.md](../BRD-Hybrid-Credit-Bureau-Admin-Portal.md) |
| Discovery | [../01-discovery/](../01-discovery/) |
