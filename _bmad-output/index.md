# HCB documentation index

**Project:** credit-harmony — Hybrid Credit Bureau (HCB) Admin Portal  
**Last updated:** 2026-04-07  
**Purpose:** Single entry point for **structured product documentation** (discovery → GTM). Deep technical references remain under `docs/technical/` and existing PRD/BRD.

---

## How to read this library

1. Start with **Discovery** if you need **why** and **personas**.  
2. Use **PRD v1** for **decision-ready summaries**; use **PRD-BRD** for **full depth**.  
3. **Architecture** points to OpenAPI and system diagrams — **do not** fork the API spec.  
4. **Delivery** links to existing **EPIC** files — the authoritative epic list.  
5. **Quality** summarizes strategy; **Testing Plan** remains the **case ID** source of truth.

---

## Folder map

| Phase | Folder | Contents |
|-------|--------|----------|
| **1 — Discovery** | [01-discovery](./01-discovery/) | Problem statement, user research, competitor analysis |
| **2 — PRD** | [02-prd](./02-prd/) | PRD v1 (summary + pointers) |
| **3 — UX** | [03-ux](./03-ux/) | Personas, journeys, wireframe intent |
| **4 — Architecture** | [04-architecture](./04-architecture/) | System design, API spec anchor |
| **5 — Delivery** | [05-delivery](./05-delivery/) | Epics index, user stories (Gherkin samples) |
| **6 — Quality** | [06-quality](./06-quality/) | Test strategy, traceability to Testing Plan |
| **7 — GTM** | [07-gtm](./07-gtm/) | Pitch outline, storytelling |

---

## Canonical documents (pre-existing)

| Document | Role |
|----------|------|
| [PRD-BRD-HCB-Admin-Portal.md](./PRD-BRD-HCB-Admin-Portal.md) | Full PRD + BRD + modules |
| [BRD-Hybrid-Credit-Bureau-Admin-Portal.md](./BRD-Hybrid-Credit-Bureau-Admin-Portal.md) | Business requirements |
| [User stories/INDEX.md](./User%20stories/INDEX.md) | Epic index |
| [openapi/hcb-platform-api.yaml](./openapi/hcb-platform-api.yaml) | **Canonical** OpenAPI 3.1 |
| [technical/Testing-Plan.md](./technical/Testing-Plan.md) | Test inventory & traceability IDs |
| [AGENTS.md](../AGENTS.md) (repo root) | AI/dev agent rules |

---

## Quick links — new structure

- [01-discovery/problem-statement.md](./01-discovery/problem-statement.md)  
- [01-discovery/user-research.md](./01-discovery/user-research.md)  
- [01-discovery/competitor-analysis.md](./01-discovery/competitor-analysis.md)  
- [02-prd/prd-v1.md](./02-prd/prd-v1.md)  
- [03-ux/personas.md](./03-ux/personas.md)  
- [03-ux/user-journeys.md](./03-ux/user-journeys.md)  
- [03-ux/wireframes.md](./03-ux/wireframes.md)  
- [04-architecture/system-design.md](./04-architecture/system-design.md)  
- [04-architecture/api-specs.yaml](./04-architecture/api-specs.yaml)  
- [05-delivery/epics.md](./05-delivery/epics.md)  
- [05-delivery/user-stories.md](./05-delivery/user-stories.md)  
- [06-quality/test-strategy.md](./06-quality/test-strategy.md)  
- [06-quality/test-cases.md](./06-quality/test-cases.md)  
- [07-gtm/pitch-deck.md](./07-gtm/pitch-deck.md)  
- [07-gtm/storytelling.md](./07-gtm/storytelling.md)

---

## Party Mode — Phase 1 agents

Discovery synthesis led by: **Mary** (BA), **Maya** (design thinking), **Carson** (brainstorming), **Dr. Quinn** (problem solving). Subsequent phases consolidated with **John, Paige, Sally, Freya, Saga, Winston, Amelia, Murat, Caravaggio, Sophia** role ownership as specified in your execution model.

---

## Maintenance

- When **OpenAPI** changes, edit **`docs/openapi/hcb-platform-api.yaml`** only; keep **`04-architecture/api-specs.yaml`** pointer accurate.  
- When **epics** change, update **`User stories/INDEX.md`** and **`05-delivery/epics.md`** links.  
- Avoid duplicating PRD §6 screen specs — **link** to PRD-BRD instead.
