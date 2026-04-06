# User research — HCB Admin Portal

**Document:** Discovery Phase 1  
**Method:** Party Mode synthesis (Maya lead empathy + Mary JTBD alignment)  
**Status:** Qualitative synthesis grounded in product domain (`AGENTS.md`, implemented modules)

---

## 1. Research scope

This artifact summarizes **operator and governance personas** for the HCB Admin Portal. It is **not** a substitute for primary interviews; it encodes **explicit hypotheses** for validation (surveys, usability sessions, production analytics).

**Out of scope for this portal (by design):** End-borrower journeys; retail credit-applicant UX.

---

## 2. Personas

### Persona A — Operations & approvals lead (“gatekeeper”)

| Dimension | Detail |
|-----------|--------|
| **Goals** | Clear queues; defensible decisions; nothing stuck between “submitted” and “live.” |
| **Frustrations** | Mixed entity types in one queue without context; mental cross-reference across members, products, mappings; audit anxiety when request → outcome is fuzzy. |
| **Highs** | Approving work that unblocks a member; visible status transitions. |
| **Lows** | Reject/request-changes without crisp rationale; tool feels like a ticket pile rather than an owned workflow. |

### Persona B — Data / integration owner (“mapper”)

| Dimension | Detail |
|-----------|--------|
| **Goals** | Trustworthy field lineage; alignment between source types, packets, and derived fields; fewer surprises when feeds change. |
| **Frustrations** | Fragmentation across registry, packet configuration, validation rules; drift signals discovered late or in the wrong surface; LLM/heuristic suggestions that feel opaque. |
| **Highs** | Mapping “closes” and downstream checks stay green—model matches reality. |
| **Lows** | Silent mismatch (path, PII flag) found only after external challenge. |

### Persona C — Consortium / member lifecycle manager (“relationship thread”)

| Dimension | Detail |
|-----------|--------|
| **Goals** | Clear consortium membership; submit vs subscribe; only **active** members in traffic that matters. |
| **Frustrations** | Registration feels generic vs **participation** choices; **403** on APIs when status is “almost active” but not quite—opaque in UI. |
| **Highs** | End-to-end onboarding with registration number, geography, compliance docs aligned to policy. |
| **Lows** | Explaining blocks to members when UI under-surfaces **institution state** vs **product readiness**. |

### Persona D — Monitoring & batch operator (“pulse”)

| Dimension | Detail |
|-----------|--------|
| **Goals** | One place for job health, phases, errors, retries. |
| **Frustrations** | Flat job lists without narrative; retry semantics that depend on hidden rules (e.g. `institution_id` on job). |
| **Highs** | Batch console reads as a story: phases, segments, error samples. |
| **Lows** | “Failed” without usable samples or stage—triage becomes guesswork. |

---

## 3. Pain point matrix

| Pain | Evidence (domain) | Impact |
|------|-------------------|--------|
| Approval items disconnected from the **thing** being approved | Queue mixes institutions, products, consortiums, mappings, alert rules—different metadata and effects | **High** |
| Schema work fragmented across registry, packets, raw/derived, rules | Mapper, catalogue, source-type fields, ingest/drift | **High** |
| Institution **state** vs **eligibility** easy to misread | Active required for submission/enquiry/batch retry; structured `ERR_INSTITUTION_*` | **High** |
| Governance / drift reactive unless in context | Drift alerts, quality views, mapping completion | **Medium** |
| Batch triage without rich console | Multi-phase logs when present vs flat legacy shape | **High** |
| Consortium model vs generic admin | Subscribers, dual-role, geography-driven registration | **Medium** |
| MFA / captcha friction | Privileged login paths | **Medium** |
| Mock vs live API splits trust | `VITE_USE_MOCK_FALLBACK` | **Low–Medium** (dev-heavy) |

---

## 4. UX principles (from research)

1. **Approvals are decisions, not rows** — Show entity type, stable ids, lifecycle state, minimum context to act without four other modules.
2. **Traceability beats dashboards** — Inspectable links: mapping ↔ registry ↔ packet config ↔ batch/governance signals.
3. **State-first, action-second** — Surface institution status and eligibility before launch/retry/API-adjacent actions, not only error codes after the fact.
4. **Bureau-native information scent** — Language: **member**, **consortium**, **data product**, **schema artefact**, **job**—not generic retail banking patterns.
5. **Progressive disclosure** — Default to the narrative operators need; depth (logs, samples, mapper detail) one deliberate click away.

---

## 5. Open questions (before PRD sign-off)

Sample of discovery questions to resolve with stakeholders (expanded in Party Mode — Carson):

1. Primary **hero user** per workflow—and who must not be blocked by others’ UX?
2. Minimum **audit story**: which events logged, retained, tied to identity per action?
3. Which decisions are **irreversible** after approval—and does the product reflect that?
4. Definition of **ready for production** for products and schema mappings?
5. **SLAs** for queues and async mapper—what the UI **promises** vs **displays**?
6. **Failure modes** that must be first-class (API down, MFA, institution not active)?
7. **Escalation path** when work is stuck—should the portal surface it?
8. **Regulatory copy** constraints—what must the UI not imply?
9. **Mock vs real API** for UAT—risk if stakeholders confuse environments?
10. **Day-one ops**—runbooks, ownership, dashboards in vs out of portal?

---

## 6. Next validation steps

- Task-based usability sessions per persona (scripted: approval, register member, schema submit, batch triage).  
- Instrument **first-time success** and **repeat error rate** on golden paths.  
- Align copy with [Global-API-Error-Dictionary.md](../technical/Global-API-Error-Dictionary.md) for explainable blocks.

---

## 7. Cross-references

- Personas (PRD): [PRD-BRD-HCB-Admin-Portal.md §4](../PRD-BRD-HCB-Admin-Portal.md)  
- Design guidelines: [design-guidelines.md](../design-guidelines.md)
