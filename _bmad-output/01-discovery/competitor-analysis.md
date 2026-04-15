# Competitor & market analysis — HCB Admin Portal

**Document:** Discovery Phase 1  
**Purpose:** Position the **Hybrid Credit Bureau Admin Portal** vs generic enterprise and credit-infra alternatives; inform PRD prioritization and non-goals.

---

## 1. Market definition

**Category:** Administrative and governance **control planes** for **credit bureau** or **credit-data exchange** operators—covering **member institutions**, **data products**, **schema/mapping governance**, **approvals**, **operational monitoring**, and **batch/API pipelines**.

**Not in scope:** Consumer credit report front-ends, core scoring engines, or pure CRIF/Equifax bureau cores (this product **integrates with** such engines rather than replacing them per [PRD-BRD-HCB-Admin-Portal.md](../PRD-BRD-HCB-Admin-Portal.md)).

---

## 2. Competitive categories

| Category | Examples (illustrative) | Strengths | Gaps vs HCB operator needs |
|----------|-------------------------|-----------|----------------------------|
| **Generic ITSM / ticketing** | ServiceNow, Jira Service Management | Workflow, assignment, SLAs | Weak **entity-centric** linkage to bureau artefacts (institution id, mapping id, product id); audit story is ticket-centric not **config-centric** |
| **Integration / iPaaS** | MuleSoft, Boomi, Zapier-enterprise | Connectors, orchestration | Not a **governed bureau product catalogue** or **approval queue** for regulatory-adjacent artefacts |
| **Data catalog / governance** | Collibra, Alation, Informatica | Lineage, policy | Rarely ships **institution lifecycle**, **consortium membership**, **batch execution console**, **credit-domain** approvals out of the box |
| **Observability stacks** | Datadog, Grafana, ELK | Metrics, logs, traces | Disconnected from **who approved what** and **which mapping is live** in the same UX |
| **Vertical “lending ops”** | LOS/LMS admin modules | Credit workflow | Often **lender-centric**, not **bureau network**-centric (multi-member, consortium, dual-role) |
| **In-house spreadsheets + scripts** | — | Flexible | **No enforced gates**, version chaos, **audit fragility**, operational risk |

**Positioning statement:** HCB Admin Portal is a **domain-specific operations hub** for running a **hybrid bureau network**—not a generic ticket system or a standalone data catalog.

---

## 3. Differentiators (to protect in roadmap)

1. **Unified approval queue** with typed metadata (`institutionId`, `productId`, `consortiumId`, `mappingId`, `alertRuleId`) and deep links into screens ([AGENTS.md](../../AGENTS.md)).
2. **Catalogue-driven** data products and packet configuration aligned to **Schema Mapper** source types and **classpath/SPA JSON parity** requirements.
3. **Geography-driven** institution registration with **Spring-assigned** registration numbers when omitted—reducing spreadsheet-driven master data.
4. **Batch execution console** with multi-phase detail when backend provides phase logs (vs flat legacy shape).
5. **Explicit institution state** gating member traffic APIs (`active` vs `pending` / `suspended`) with documented error codes.
6. **Canonical Spring API** on `/api/v1` with **legacy Fastify** explicitly non-contract—reduces “works in demo” drift.

---

## 4. Competitive risks

| Risk | Mitigation |
|------|------------|
| **Feature parity** with generic ITSM expectations (custom fields, SLAs on every queue) | Document **non-goals**; invest in **bureau-specific** metadata and exports instead of becoming ServiceNow |
| **Build vs buy** for data catalog | Double down on **schema mapper + drift + validation rules** integration; link to external catalog only if enterprise requires |
| **Regulatory narrative** | Avoid claiming certification; map features to **audit artefacts** (logs, approvals, versioning) in PRD |
| **Multi-region / multi-bureau** | Track [Multi-Tenant-Target-Architecture.md](../technical/Multi-Tenant-Target-Architecture.md) and BRD multi-country goals |

---

## 5. Market gap summary

See [problem-statement.md](./problem-statement.md) §4 for the **generic tools vs integrated HCB** matrix. This section answers **“who else sells something adjacent”**; the gap table answers **“why not use them.”**

---

## 6. Assumptions (competitive intel)

- **East African fintech** context and CRIF-adjacent positioning per existing PRD/BRD are **directional** for roadmap narrative; live competitive pricing and feature matrices require dedicated market research ([bmad-market-research](.cursor/skills) / primary intel).
- **Open banking** portals and **regulator** reporting tools are **adjacent** but not direct substitutes for **internal bureau operator** workflows.

---

## 7. Cross-references

- Business context: [BRD-Hybrid-Credit-Bureau-Admin-Portal.md](../BRD-Hybrid-Credit-Bureau-Admin-Portal.md)  
- Production backend roadmap: [technical/Production-Backend-Roadmap.md](../technical/Production-Backend-Roadmap.md)
