# Problem statement — HCB Admin Portal

**Document:** Discovery Phase 1  
**Product:** Hybrid Credit Bureau (HCB) Admin Portal  
**Audience:** Platform operators, compliance, data governance, bureau operations  
**Sources:** Party Mode synthesis (Mary, Maya, Carson, Dr. Quinn) + repository context (`AGENTS.md`, `PRD-BRD-HCB-Admin-Portal.md`)

---

## 1. Core problem

Hybrid credit bureaus must orchestrate **members, data contracts, and regulatory controls** across consortiums and products. Operators cannot safely run day-to-day work from disconnected tickets and spreadsheets: **who may submit what**, **which mappings and products are approved**, and **what is failing in the pipeline** must stay **traceable and consistent**.

Without a single operational surface, teams **duplicate effort**, **miss approval gates**, **misalign schema and packet configuration with source types**, and **cannot explain** batch failures, drift, or enquiry status to members and auditors.

**Problem statement (operator-facing):** Maintain a **governed, observable bureau platform**—members, data products, schema mappings, and monitoring—without losing control between **configuration**, **approval**, and **production health**.

---

## 2. Jobs-To-Be-Done (JTBD)

| Persona | JTBD |
|--------|------|
| **Platform admin** | When a **new member or consortium** must join or change participation, I want to **register and route them through approval** with correct geography, roles, and consortium linkage, so I can **onboard subscribers without breaking access rules or duplicating institutional records**. |
| **Platform admin** | When **new or changed data products** are proposed, I want to **create products, attach source-type and packet setup, and queue approval**, so I can **ship standardized bureau offerings without ad-hoc spreadsheets defining “what we sell.”** |
| **Compliance / analyst** | When **schema mappings and rules** are created or revised, I want to **configure registry, raw/derived fields, validation, and PII-related attributes and submit for approval**, so I can **evidence that data definitions and controls are reviewed before production use**. |
| **Compliance / analyst** | When **auditors or internal review** ask how data moved or what failed, I want to **reconstruct activity, approvals, and operational status** from the same system, so I can answer **“who approved what”** and **“what happened when”** without stitching email and tickets. |
| **Operations** | When **pipelines, batches, or member traffic** misbehave, I want to **see job phases, errors, and monitoring signals in one place**, so I can **triage quickly, retry or escalate with context**, and keep **active** institutions unblocked. |
| **Operations** | When the **approval queue** grows across institutions, products, consortiums, mappings, and alert rules, I want to **approve, reject, or request changes with clear entity linkage**, so I can **clear the queue without losing which artifact each item refers to**. |

---

## 3. Root cause hypotheses (testable)

| ID | Hypothesis | How to validate |
|----|------------|-----------------|
| **H1 — Config parity** | SPA catalogue / form JSON and Spring classpath resources **diverge** → users complete UI steps the API rejects or that enqueue wrong metadata. | Diff coverage; failed POST/PATCH rates by endpoint; contract tests. |
| **H2 — Workflow visibility** | Users cannot predict **approval → entity state → downstream permissions**. | Time-to-first-successful action; repeat attempts; abandonment proxies. |
| **H3 — Environment fidelity** | Mock / legacy vs Spring behaviour causes **false confidence**. | Defect rate when toggling `VITE_USE_MOCK_FALLBACK` or switching backends. |
| **H4 — Data/time alignment** | Dashboards / monitoring look empty or inconsistent when **seed windows** or filters don’t match reality. | KPI variance vs seeded bands; filter usage. |
| **H5 — Contract clarity** | UI lists and DB-backed endpoints diverge (**pagination caps, enum casing, 204 bodies**). | 500 rate on list endpoints; client error logs. |

---

## 4. Market gap (why generic tools fail)

| Generic approach | Gap | HCB admin intent |
|------------------|-----|------------------|
| **Ticketing** | Tracks tasks, not **bureau entities** (institution id, product id, mapping id); weak native linkage to live config and runtime status. | **Entity-centric queues** and **deep links** into the right screen. |
| **Spreadsheets** | No enforced workflow; schema/packet catalogue misalignment; weak audit history. | **Structured forms** and **catalogue-driven** product/packet configuration. |
| **Ad hoc scripts / DB edits** | High risk; weak segregation of duties; poor explainability. | **API-backed** paths with **approval gates** and **observable** outcomes. |
| **Separate monitoring dashboards** | Disconnected from who was approved, which mapping is live, which institution is active. | **Unified** operational health **in context** of members, jobs, governance. |
| **Generic IAM shells** | Identity without bureau workflows (MFA, approvals, schema mapper, roles). | **Role-aware** access aligned to bureau operations. |

---

## 5. Alternative framings (discovery lenses)

| Lens | One-line problem |
|------|------------------|
| **Coordination** | Ops, compliance, and engineering each have a different source of truth; the portal fails when handoffs don’t line up. |
| **Trust & audit** | The product fails if actions aren’t **attributable, replayable, explainable**. |
| **Latency & throughput** | Queues and async jobs stall when **blockers are invisible**. |
| **Compliance-as-design** | The UI must encode **policy** so users cannot “almost” comply—errors early, aligned with API contracts. |
| **Cognitive load** | The portal fails when **density and language** don’t match mental models (member vs product vs mapper vs monitoring). |

---

## 6. Explicit assumptions

1. At least one jurisdiction expects **traceable approval** of material changes to **member participation**, **credit-related products**, and **data definitions**; the product supports that posture but does not certify legal compliance by itself.
2. **Consortiums** and **institutions** are first-class; operators act **on behalf of the bureau**, not as retail end-users of credit reports.
3. Members **submit** data through defined **pipelines / batches / APIs**; operational value depends on **institution state** (e.g. active) and **mapping correctness**.
4. **Humans** (or delegated roles) **approve** queued items; automation may assist but does not replace accountable decisions for modeled queue types.
5. **One admin portal + API** is the **system of record** for configured artefacts and operational visibility; legacy Fastify / heavy mock fallback are **non-contract** for production decisions.
6. **MFA and optional captcha** reflect production-grade login; enterprise SSO/SCIM are **not established** by this document alone.
7. Primary persona is **internal operations and oversight**, not borrowers.

---

## 7. Risk of “UI-only” fixes

Polish without **workflow truth**, **data contract alignment**, and **environment behaviour** increases **false certainty**, **hides failure modes**, raises **rework cost**, and leaves **approvals and monitoring** brittle.

---

## 8. Success signals (leading indicators)

| Signal | Why it matters |
|--------|----------------|
| Lower **first-time task failure rate** (e.g. register → list → approval → active) | Workflows + contracts + roles are achievable. |
| Drop in **repeated API errors** for the same task | Fixes are structural. |
| Shorter time from **intent** to **confirmed backend state** | End-to-end coherence. |
| Fewer **mock vs real** divergence incidents | Environment fidelity managed as risk. |
| Fewer **500s** on list endpoints from DDL/schema drift | Data/system alignment under control. |

---

## 9. Cross-references

- Canonical product depth: [PRD-BRD-HCB-Admin-Portal.md](../PRD-BRD-HCB-Admin-Portal.md)  
- Developer/agent rules: [AGENTS.md](../../AGENTS.md)  
- Service contract drift: [technical/SPA-Service-Contract-Drift.md](../technical/SPA-Service-Contract-Drift.md)
