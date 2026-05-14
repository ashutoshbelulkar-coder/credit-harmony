# User stories — HCB Admin Portal

**Phase:** Delivery  
**Format:** Title, description, **Gherkin** acceptance criteria, edge cases, dependencies, priority.  
**Broader catalogue:** [../User stories/](../User%20stories/) EPIC files.

---

## Story template

| Field | Description |
|-------|-------------|
| **Title** | Short outcome-oriented phrase |
| **Description** | As a … I want … so that … |
| **Acceptance criteria** | Gherkin **Given / When / Then** |
| **Edge cases** | Negative paths, permissions, env |
| **Dependencies** | APIs, epics, data |
| **Priority** | P0 / P1 / P2 |

---

## US-01 — Approve institution registration

**Description:** As an **approver**, I want to **approve a pending institution** from the queue so that **the member can progress toward active status**.

**Acceptance criteria:**

```gherkin
Given I am logged in with approval permissions
And an approval queue item exists with type "institution" and metadata.institutionId
When I POST /api/v1/approvals/{id}/approve with a valid JWT
Then the response status is 204
And subsequent GET /api/v1/institutions includes the institution with updated lifecycle state
```

**Edge cases:** Invalid id (404); insufficient role (403); double-submit idempotency expectations per client.

**Dependencies:** EPIC-08, EPIC-02, Spring `ApprovalQueueService`.

**Priority:** P0

---

## US-02 — Register member with geography metadata

**Description:** As a **bureau admin**, I want to **load geography-specific registration fields** so that **create payloads match backend validation**.

**Acceptance criteria:**

```gherkin
Given VITE_INSTITUTION_REGISTER_GEOGRAPHY is set consistently for SPA
When I open /institutions/register
Then GET /api/v1/institutions/form-metadata?geography=<id> drives visible sections
And POST /api/v1/institutions?geography=<id> omits registrationNumber when blank
And Spring assigns a registration number when omitted
```

**Edge cases:** API down + mock fallback builds form client-side; validation mismatch Spring vs Fastify.

**Dependencies:** EPIC-02, `institution-register-form.json` parity.

**Priority:** P0

---

## US-03 — Configure packet group in data product

**Description:** As a **product owner**, I want to **configure all packets in a source-type row** in one modal so that **packetConfigs persist per packet**.

**Acceptance criteria:**

```gherkin
Given I am editing a product with multiple packets sharing a source type
When I open Configure on that row
Then I can switch Packet tabs for each catalogue id in order
And saving persists packetConfigs for every selected packet in the group
```

**Edge cases:** Single packet (no switcher); schema registry empty; API errors on source-type-fields.

**Dependencies:** EPIC-04, packet-catalog sync.

**Priority:** P1

---

## US-04 — Schema mapping submit for approval

**Description:** As a **mapper**, I want to **submit a mapping for approval** so that **governance records the change before production use**.

**Acceptance criteria:**

```gherkin
Given a completed mapping exists
When I submit for approval
Then a new approvals item exists with type schema_mapping and metadata.mappingId
And the approval queue deep link opens the mapper with that id context
```

**Edge cases:** Mapping still pending job; concurrent edits; LLM disabled vs enabled.

**Dependencies:** EPIC-05, EPIC-08.

**Priority:** P1

---

## US-05 — Batch job detail with phases

**Description:** As an **operator**, I want to **see phases and error samples** when logged so that **I can triage without raw DB access**.

**Acceptance criteria:**

```gherkin
Given batch_phase_logs exist for job id
When I GET /api/v1/batch-jobs/{id}/detail
Then the response includes phases, stages, flowSegments, logs, errorSamples in camelCase
```

**Edge cases:** Legacy response with flat stages only; empty error samples; retry requires active institution.

**Dependencies:** EPIC-14.

**Priority:** P1

---

## US-06 — View Master Schema fields from schema JSON

**Description:** As a **data governance analyst**, I want to **open a master schema and see its full field inventory** so that **I can review field definitions without manually reading raw JSON**.

**Acceptance criteria:**

```gherkin
Given the Master Schema detail page is opened for a schema (e.g. /data-governance/master-schema/:id)
When I click the "Fields" tab
Then I see a table of fields derived from the schema content
And the table is scrollable for large schemas
And required fields are marked as "Yes" when the underlying schema marks them required
```

**Edge cases:** Schema JSON has no `definitions` or no `properties` (show empty state); schema contains union types (e.g. `["string","null"]`) and still renders a sensible data type; very large schemas remain usable via scroll.

**Dependencies:** EPIC-06 (Master Schema Management UI), mock/seed master schema JSON (`src/data/master-schemas.json`), mock fallback service layer (`master-schema.service.ts`).

**Priority:** P1

---

## Coverage note

Add stories per module by cloning the template; link each story ID to **test cases** in [../06-quality/test-cases.md](../06-quality/test-cases.md).

---

## Cross-references

- [epics.md](./epics.md)  
- [Testing-Plan.md](../technical/Testing-Plan.md)
