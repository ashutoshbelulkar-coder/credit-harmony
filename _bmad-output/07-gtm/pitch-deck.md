# Pitch deck — HCB Admin Portal (narrative outline)

**Phase:** GTM & narrative (Party Mode: Caravaggio lead)  
**Format:** Slide-by-slide **outline** for building in Slides / Keynote / Figma — not rendered deck assets.

---

## Slide 1 — Title

**Hybrid Credit Bureau Admin Portal**  
*One control plane for members, products, mappings, and operations.*

**Subtitle:** Governed onboarding · Unified approvals · Observable pipelines

---

## Slide 2 — The problem

- Bureau operators juggle **spreadsheets, tickets, and ad hoc scripts** for **member lifecycle**, **data products**, and **schema governance**.  
- **No single source of truth** for “what’s approved,” “what’s live,” and “what failed” for **auditors** and **member support.”  
- **Credit-domain complexity** (consortiums, dual-role institutions, packet catalogues) does not fit generic ITSM.

**Visual suggestion:** Split diagram — chaos left vs single pane right.

---

## Slide 3 — Who it’s for

| Audience | Value |
|----------|--------|
| **Bureau operations** | Faster, safer onboarding and queue clearance |
| **Compliance** | Approvals + audit trails tied to **entities**, not tickets |
| **Data governance** | Schema mapper + drift + validation in one story |
| **Engineering** | Canonical **Spring API**, OpenAPI, integration tests |

---

## Slide 4 — Solution

- **React** SPA + **Spring Boot** API — production contract on `/api/v1`.  
- **Unified approval queue** — institutions, products, consortiums, schema mappings, alert rules.  
- **Catalogue-driven** data products aligned to **Schema Mapper** source types.  
- **Batch execution console** — phased detail when backend provides logs.

---

## Slide 5 — Why now

- **Regulatory pressure** on traceability of data definitions and member participation.  
- **Network effects** — more members and alternate data sources increase coordination cost without an operator hub.  
- **Technical readiness** — JWT, MFA, RBAC, integration test harness in repo.

---

## Slide 6 — Business impact (from BRD / PRD — directional)

- Shorter **onboarding cycle**; fewer **manual mapping** hours.  
- Faster **incident detection** for SLA and batch failures.  
- **Audit readiness** — activity logs and approval metadata.

*(Replace with customer-specific numbers when available.)*

---

## Slide 7 — Differentiators

1. **Entity-centric approvals** with stable metadata ids.  
2. **Bureau-native** workflows vs generic banking admin.  
3. **Contract-first** docs — OpenAPI + parity matrix + Spring integration tests.

---

## Slide 8 — Roadmap teaser

- Deeper **multi-tenant** and **integration** tracks — see [Production-Backend-Roadmap](../technical/Production-Backend-Roadmap.md).  
- **Consumer** and **multi-bureau** items in master PRD — position as phase 2+.

---

## Slide 9 — Ask / CTA

- **Pilot:** geography + one consortium + two institution types.  
- **Success criteria:** first **end-to-end** registration → approval → active → monitored traffic **without** spreadsheet shadow processes.

---

## Speaker notes (Caravaggio style)

- Open with **one painful true story** (operator clearing approvals at 7pm).  
- **3-second rule** on slide 2: audience must get “fragmentation tax” instantly.  
- End on **pilot scope** — big enough to prove value, small enough to win.

---

## Cross-references

- [storytelling.md](./storytelling.md)  
- [competitor-analysis.md](../01-discovery/competitor-analysis.md)
