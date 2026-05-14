# UX personas — HCB Admin Portal

**Phase:** UX & Design (Party Mode: Sally lead, Freya, Saga)  
**Relationship to PRD:** Expands [PRD-BRD §4](../PRD-BRD-HCB-Admin-Portal.md) with **bureau-operator** empathy detail from [../01-discovery/user-research.md](../01-discovery/user-research.md).

---

## Persona summary

| ID | Name | Archetype | Day in the life |
|----|------|-----------|-----------------|
| **P1** | **Asha** | Operations & approvals lead | Clears approval queue; coordinates with members on rejections; owns “why is this pending?” |
| **P2** | **Ben** | Data / integration owner | Schema mapper, registry, validation rules, PII flags; proves lineage to compliance |
| **P3** | **Chloe** | Consortium / member lifecycle | Registers institutions; manages consortium participation; tracks **active** vs pending |
| **P4** | **Dev** | Monitoring & batch operator | Watches batches, retries, enquiry/API monitoring; uses batch console narrative |

---

## P1 — Asha (operations & approvals)

**Quote:** “I don’t approve **tickets**—I approve **institutions, products, and mappings**.”

| Field | Detail |
|-------|--------|
| **Goals** | Fast, defensible decisions; zero items stuck without owner; audit-ready trail |
| **Pain** | Queue rows without entity context; switching screens to understand impact |
| **Behaviours** | Lives in Approvals + Institutions; uses deep links from queue metadata |
| **UX must-haves** | Entity type badge, stable ids, current lifecycle state, primary action with clear consequence |

---

## P2 — Ben (mapper / governance)

**Quote:** “If I can’t explain the path from raw feed to derived field, I can’t sign.”

| Field | Detail |
|-------|--------|
| **Goals** | Single story across registry, packets, raw/derived, validation, PII |
| **Pain** | Tab sprawl; drift discovered late; opaque LLM suggestions |
| **Behaviours** | Schema Mapper wizard, packet config modal, governance pages |
| **UX must-haves** | Traceability links; inspectable field lists; honest loading/error states |

---

## P3 — Chloe (member lifecycle)

**Quote:** “Active means something specific here—not ‘we’re ready when you are.’”

| Field | Detail |
|-------|--------|
| **Goals** | Correct geography, roles, consortium, compliance docs; smooth path to **active** |
| **Pain** | Generic forms; surprise **403** when institution not active for traffic |
| **Behaviours** | Registration wizard; institutions list; consortium screens |
| **UX must-haves** | State visible on hub screens; plain language for gating; registration number read-only + server-assigned pattern understood |

---

## P4 — Dev (monitoring & batches)

**Quote:** “Tell me **where** in the pipeline it broke, not just that it failed.”

| Field | Detail |
|-------|--------|
| **Goals** | Phase/stage/error samples; safe retry; institution context on job |
| **Pain** | Flat lists; failures without samples; hidden retry rules |
| **Behaviours** | Batch monitoring, job detail, filtering by institution/status |
| **UX must-haves** | Progressive disclosure: summary → phases → logs/samples |

---

## WDS alignment (Freya / Saga)

- **Strategy before decoration:** Persona pain maps to **approval traceability** and **state clarity**, not cosmetic refresh.  
- **Saga domain:** Product brief / trigger map artefacts (if using WDS) should reference **`project-context.md`** and this persona set for consistency.

---

## Cross-references

- [user-journeys.md](./user-journeys.md)  
- [wireframes.md](./wireframes.md)  
- [design-guidelines.md](../design-guidelines.md)
