# User journeys — HCB Admin Portal

**Phase:** UX & Design  
**Conventions:** Stages use **operator language**; friction points call out **API/policy** reality where the UI must educate.

---

## Journey 1 — Member registration → active

| Stage | Operator action | System truth | Friction / mitigation |
|-------|-----------------|--------------|------------------------|
| 1 | Start **Register member** from sidebar | Geography-driven form metadata | Long forms → sectioned layout; required vs optional clear |
| 2 | Submit registration | `POST /institutions` persists row + **enqueues approval** | User understands row exists before approval ([PRD governance semantics](../PRD-BRD-HCB-Admin-Portal.md)) |
| 3 | Approver acts on queue | Approve/reject/request changes → **204** | Empty success handled; list refresh + invalidation |
| 4 | Member becomes **active** | Enables traffic APIs per policy | **403** if not active — surface state before member calls |

**UX principles:** State-first; link from queue item to institution detail.

---

## Journey 2 — Data product create → approved

| Stage | Operator action | System truth | Friction / mitigation |
|-------|-----------------|--------------|------------------------|
| 1 | Create product, select packets | Catalogue order; source-type rows | One **Configure** per source-type group; modal switcher for multiple packets |
| 2 | Configure raw/derived | `packetConfigs` per packet; paths from schema + catalogue | Help users see **packet scope** vs whole registry |
| 3 | Submit | `approval_pending` enqueues **product** approval | Prioritization in queue (MoSCoW in PRD) |
| 4 | Approve | Product state updates | Deep link from `metadata.productId` |

---

## Journey 3 — Schema mapping → approval

| Stage | Operator action | System truth | Friction / mitigation |
|-------|-----------------|--------------|------------------------|
| 1 | Ingest / define source | Wizard metadata API | No inline fake paths; loading/error when metadata fails |
| 2 | Mapping job completes | Async job ~400ms + heuristics/LLM | Set expectations on duration; optional OpenAI |
| 3 | Review PII / mappings | PATCH `containsPii` etc. | Yes/No PII control per field |
| 4 | Submit for approval | Queue type `schema_mapping` | Deep link `mappingId` |
| 5 | Approve | Updates mapping + registry JSON | Validator alignment with backend |

---

## Journey 4 — Batch failure triage

| Stage | Operator action | System truth | Friction / mitigation |
|-------|-----------------|--------------|------------------------|
| 1 | Open batch monitoring | List filters (status, institution, date) | Consistent lowercase status keys (`src/lib/status-badges.ts`) |
| 2 | Open job detail | `phases`/`stages`/`flowSegments` when phase logs exist | Legacy flat `stages` when not — UI should not pretend depth exists |
| 3 | Retry | `POST …/retry` may require **active** institution | Explain gate before retry |
| 4 | Escalate | Link to institution + mapping if data issue | Reduces Slack archaeology |

---

## Friction themes (cross-journey)

1. **Approvals are decisions** — metadata must answer “what am I changing?”  
2. **State vs intent** — especially institution **active** and API enablement.  
3. **Environment** — mock vs Spring must be obvious in dev/demo.  
4. **Bureau vocabulary** — avoid retail-banking defaults.

---

## Cross-references

- [personas.md](./personas.md)  
- [wireframes.md](./wireframes.md)  
- [Data-Flow-Diagram.md](../technical/Data-Flow-Diagram.md)
