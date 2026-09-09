# Master Schema Management — Impact Analysis Against the New Data Model

**Scope:** Master Schema Management workflow only (Data Governance → Master Schema Management: registry, Create / View / Edit editor, attribute profile, lifecycle, approval hand-off). Data Management (subject workspace), Schema Mapper, Product Configurator and Consortium policy are referenced only where they consume the master schema.
**Inputs reviewed:** `MasterDataManagementUI.md` (current build, §§2–6, 9–13); `master_data_model.xlsx` (all 21 sheets); `DATA_DICTIONARY_GUIDE.md`, `README.md`, `IMPLEMENTATION_GUIDE.md`, `canonical_dictionary.schema.json`.
**Status:** v0.2, 9 Sep 2026 — product rulings on F-1 to F-14 applied (Section F is now a decisions register; residual items in F.2).

---

## A. Executive summary

The current Master Schema Management (MSM) workflow authors **one nested tree per source type** (Telecom, Utility, Bank, GST, Custom). Each tree is a DynamoDB-shaped document: OBJECT / ARRAY / FIELD nodes, a PK/SK pair per field, and source-path → target-path mappings held on the master field itself. Lifecycle (draft → pending → active → deprecated) is carried by the **schema** as a whole, and every Save produces a new immutable schema version.

The new data model inverts that shape. There is now **one target-first Canonical Dictionary** (855 rows in the workbook) in which every row is a complete placement instruction for one canonical attribute: `attribute_id`, `canonical_qualifier`, `class`, `target_table`, `applies_to`, `attribute_group`, `data_type`, `sensitivity`, `governance`, `normalization_rule`, `allowed_values`, `definition`, `synonyms`, `status`, `retention_class`, `sources`, `version` and audit metadata. There is **no nesting** (single column family `d`, one flat qualifier namespace per row), **no source-type partition** (a source is a value in `sources`, "data not schema"), and **lifecycle lives on the attribute**, not on a schema. Structure comes from three registry axes — target table (5 core tables), type (`applies_to`: subject / asset / event / feature type) and attribute group — and source-specific structure has moved out of the master entirely into the template layer (`CSDF_Mapping`, `New_Sources_Mapping`), which is Schema Mapper territory.

Overall impact: **high on the authored content model, moderate on the operator experience, low on the page architecture.** What an operator *edits* changes almost completely (most of the current field-profile controls are removed or replaced, and about 12 model attributes have no UI today). What the operator *sees and navigates* can largely stay: the registry pattern, the three-mode editor page, the two-pane layout, the tabs, the blocking-validation alert, the workflow banner, Submit-for-approval into the Approval Queue, Version History and Impact Analysis all survive with re-pointed content. The single most consequential decision is **what a "schema" row in the registry now means**. The recommendation is that it becomes an **entity type** (person, company, bank_account, credit_facility, gst_filing, …) whose attributes are the dictionary rows that apply to it, backed by a flat **Attribute Dictionary** view that is the actual source of truth. That keeps the registry-then-editor shape operators already know while making the flat dictionary — the thing the platform, the mapper and the product configurator actually consume — the real object being governed.

All fourteen open items were ruled on 9 Sep 2026 (Section F). Thirteen adopt the working assumptions as written. The one ruling that changes the layout is **F-1: each attribute keeps its own validation rules, cross-field rules, transformation rules and enrichment rules, using the existing standard functions for now.** This means the rule sections of today's profile editor are retained rather than relocated, and the dictionary record contract must be extended to carry them (the current `canonical_dictionary.schema.json` is closed). Two residual items follow from that ruling (F.2).

---

## B. Current workflow vs. new data model

### B.1 Concept-level comparison

| Concept | Current MSM (DynamoDB tree) | New model (HBase canonical dictionary) | Impact |
|---|---|---|---|
| Unit of governance | A **master schema** = one nested tree per source type | A **canonical attribute** (dictionary row); the dictionary as a whole is versioned (`_model_version`) | Changes — lifecycle moves from schema to attribute |
| Registry row | Source-type schema (Telecom v1.0, Bank v1.2 …) | No direct equivalent. Nearest organising units: subject types (`Subject_Types`), asset / event types (`Entity_Routing`), attribute groups (`Attribute_Groups`) | Changes — registry needs a new row definition (see D) |
| Structure | OBJECT / ARRAY / FIELD nesting; `[*]` item marker; dot paths (`Accounts[*].AccountNumber`) | Flat. Repetition is a **row** (one asset row per account, one event row per transaction), not an array. Multi-valued scalars use `data_type = json` | Changes — tree authoring removed; navigation tree retained as read-only grouping |
| Physical key | PK / SK per field (`FIELD#{name}`) | Row key is per **table** (`Row_Keys` sheet), assembled at write time from IR_Key + type codes + source ids. Attributes carry no key | Removed |
| Source dimension | Schema-level `sourceType` (telecom / utility / bank / gst / custom); per-field Source format (JSON, XML, CSV …), Source path | Per-attribute `sources` (multi-valued: CSDF, AA, BNPL, ITR, Mortgage, ElectoralRoll, Telco, Utility). Format, path and version live in the **template** layer, one template per (source, format, version) | Changes — source becomes a filter facet and a read-mostly field; path/format leave MSM |
| Target dimension | Target path (canonical destination, chosen with the path picker) | `target_table` (enum of 6) + `canonical_qualifier` (`^_?[a-z][a-z0-9_]*$`) + `class` (routing) | Changes — replaced by three explicit controls |
| Where the value goes | Implicit in the tree position | `class` decides physically: Business → `d:` column; Identifier → column + `identifier_index`; Edge → `entity_relationships` row; Feature → `feature_store`; Observation → `entity_events` (event_type = observation); Reserved → `_` qualifier; Payload → `_payload` | Added — new, mandatory, drives conditional rules |
| Grouping | Section (free text, e.g. `BasicInformation`) | `attribute_group` (registry value; shared groups vs type-specific groups; `Attribute_Groups` sheet) | Changes — becomes a controlled pick |
| Data types | STRING · NUMBER · BOOLEAN · DATE · OBJECT · ARRAY | string · long · decimal · boolean · date · timestamp · json · edge | Changes — enum swap; OBJECT/ARRAY gone; `edge` tied to class Edge |
| Personal data | IsPII boolean (→ `masking: partial`) | `sensitivity` (Standard · PII · Sensitive-PII) + `governance {legal_basis_required, special_category, tokenize}` + `retention_class` | Changes — boolean becomes tri-state plus three governance flags and a retention class |
| Semantics | Description; Similar fields (aliases) | `definition` (mandatory before `active`; embedded by the mapper); `synonyms` (grown automatically when a binding is approved) | Changes — same controls, new gating and new provenance |
| Value constraints | Value mode DEFAULT / ENUM (possible values chip list) | `allowed_values`: null · enum array · regex/format string · `domain:<DomainName>` reference to the `Domains` sheet | Changes — three shapes instead of two; domain reference is new |
| Transformations | Business transformations multi-select (ALL_CAPS, TRIM, REPLACE, CONCATENATE …) | `normalization_rule` — free text or rule id (observed values: `trim`, `trim; uppercase`, `DDMMYYYY -> ISO-8601`, `numeric; strip symbols; 2dp`, `tokenize/hash; E.164 if phone` …) | Changes — one field, wider vocabulary |
| Validation | Validation rules (NOT_EMPTY, MAX/MIN_LENGTH, REGEX, UNIQUE + severity), Business validations, Cross-field validations | Not in the dictionary record today (`canonical_dictionary.schema.json` is `additionalProperties: false`) | **Ruling F-1: retained on the attribute.** Dictionary record to be extended with a `rules` block (F.2 R-1) |
| Required | Derived from `NOT_EMPTY` + Error | No per-attribute "required" concept in the dictionary | Unchanged — continues to derive from the NOT_EMPTY + Error rule (F-1) |
| Enrichment | — | — | **Added (F-1):** enrichment rules per attribute, standard functions for now; function catalogue to be defined (F.2 R-2) |
| Lifecycle | Schema status: draft · pending · changes_requested · active · rejected · deprecated | Attribute status: proposed · pending · active · deprecated · rejected, with defined transitions and two schema-enforced gates | Changes — moves to attribute; `changes_requested` has no model equivalent; `proposed` is new |
| Versioning | Immutable schema version per Save (v1.0 → v1.1), field-level diff | Per-attribute integer `version` + dictionary-level version stamped on every HBase row as `_model_version` | Changes — two levels instead of one |
| Identity of a field | Node id + path; rename allowed (rewrites paths) | `attribute_id` (`domain.name`) is **immutable**; rename = deprecate-and-replace | Changes — rename becomes a governed action |
| Downstream consumers | Schema Mapper, Consortium unmask, Approval Queue, Validation Rules, Data Products | Same consumers, but they now key on `attribute_id` / `class` / `sensitivity` rather than tree paths | Interfaces change; modules out of scope here |

### B.2 What stays, what changes — by surface

| Surface | Unchanged | Changed | Added | Removed / deprecated |
|---|---|---|---|---|
| Sidebar & routes | Location under Data Governance; `/data-governance/master-schema`, `/new`, `/:id`, `/:id/edit` | Meaning of `:id` (entity type instead of source-type schema) | Flat dictionary route or tab (`/data-governance/master-schema/attributes`) | — |
| Registry page | Title, KPI-card row, search, status filter, 10-row pagination, View/Edit actions, empty/loading/error states, mock fallback | Row = entity type; columns; KPI definitions; status semantics | Scope switch (Entity types ▸ Attribute Dictionary); facet filters (table, class, sensitivity, source, status) | Source Type Name column as the primary identity |
| Editor page chrome | Back arrow, ID line, Create/Save/Edit/Submit buttons, workflow banner, blocking-validation alert, six tabs | Banner reflects attribute-level counts; validation rules re-pointed | "Deprecate & replace", "Reinstate", "Send for revision" actions | — |
| Tree tab | Two-pane resizable split; select-to-edit; hover actions; delete confirm | Left pane becomes a grouped attribute navigator (Group → Attribute) instead of an authored OBJECT/ARRAY/FIELD tree | Status chip and class icon per attribute; "Shared attribute" indicator | Add root Object/Array; `[*]` marker; inline rename; path rewriting |
| Field profile | Save-profile-then-page-Save pattern; card header code badge; chip lists; add/remove row tables; **Validation rules, Business validations, Business transformations, Cross-field validations and DEFAULT value blocks (Ruling F-1)** | Identity, placement, type, sensitivity controls (see C) | Class, Target table, Applies to, Attribute group, Governance flags, Retention class, Sources, Lifecycle block, **Enrichment rules** | PK, SK, Section, Field path, Source format, Source path, Target path, IsPII boolean |
| Container editor | — | — | Group / type header panel (read-only manifest facts) | OBJECT/ARRAY container editor, Source/Destination mapping |
| Overview tab | Left metadata + right governance summary layout | Metadata fields (entity type, table, class/subtype, IR keys, group manifest, nature) | Row-key layout (read-only), retention summary | Source type (telecom/utility/bank/gst/custom) |
| JSON View | Tab and behaviour | Payload becomes the array of dictionary records for the type — identical to `canonical_dictionary.json` entries | — | `{ name, sourceType, description, tree }` shape |
| Version History | Table pattern | Rows are attribute-level changes plus dictionary releases | Dictionary version column | Schema-version increments per Save |
| Impact Analysis | Three-card pattern | Keyed on attribute_id / entity type | Sources card (which feeds populate the type) | — |
| Approvals tab | Timeline pattern | Events are per attribute (or per submission batch) | Reviewer decision per attribute | — |
| Approval Queue | Type `schema_master`, deep link | Item payload = set of attributes, not a tree diff | Per-attribute approve/reject inside one item | — |

---

## C. Attribute and flow impact analysis

### C.1 Dictionary record fields → operator workflow

Legend for "Today": **✓** supported as-is · **≈** exists under another name / shape · **✗** absent.

| # | Model field | What it represents and why it matters | Today | Required UI response | Dependencies / conditional behaviour |
|---|---|---|---|---|---|
| 1 | `attribute_id` | Immutable dotted key `domain.name` (e.g. `credit.outstanding_balance`). Templates and bindings key on it; rename = deprecate-and-replace | ≈ node id / code badge | Show in the card header (replaces `BASICINFORMATION_COMPANYNAME` badge). Auto-derived on create from a **domain prefix** + qualifier; editable only while status is `proposed`/`pending` and never after first `active`. Uniqueness validated (Error) | Domain prefixes observed: `subject`, `assets`/`asset`, `events`/`event`, `credit`, `feature`, `reserved`, `document`, `docsubj`, `relationships`/`rel`, `observation`, `identity`, `enquiry`. The prefix vocabulary is not a controlled list in the workbook (see F-6). One duplicate exists today (`feature.identity_trust` ×2) — the validator must catch this |
| 2 | `canonical_qualifier` | The HBase column name under family `d`. Regex `^_?[a-z][a-z0-9_]*$`; `_` prefix reserved for system qualifiers | ≈ Field name | Rename **Field name → Canonical qualifier**; enforce the regex inline; block `_` prefix unless class = Reserved. Not unique on its own (43 qualifiers repeat across tables, e.g. `pan`, `dob`, `gstin`); uniqueness is per `(target_table, qualifier)` — surface a warning, not an error, when a qualifier already exists elsewhere, with a link to the existing rows | Locked once `active` (rename = deprecate-and-replace) |
| 3 | `class` | The **routing** decision: Business · Identifier · Edge · Reserved · Payload · Observation · Feature. Decides what the writer physically does | ✗ | New mandatory select, placed first in the profile because it drives everything below it | Identifier ⇒ auto-adds "feeds identifier_index" behaviour; if Sensitive-PII ⇒ `tokenize = true`. Edge ⇒ `data_type` locked to `edge`; physical destination is `entity_relationships`. Feature ⇒ `target_table = feature_store`, `retention_class = feature_score`, `sources` disabled (platform-computed). Observation ⇒ `target_table = entity_events`, `applies_to = observation`. Reserved ⇒ `_` prefix, `target_table = all`, `retention_class = system`, read-only for non-platform roles. Payload ⇒ no qualifier written; no current rows use it |
| 4 | `target_table` | Which HBase table the value lands in: entity_master · entity_assets · entity_events · entity_relationships · feature_store · all | ≈ Target path (path picker) | Replaces Target path with a select. Pre-filled from the entity type being edited (a bank_account attribute is `entity_assets`) and locked in that context | Coupled to class (row 3) and to `applies_to` (row 5): the type vocabulary is table-specific. See F-2 for the Edge inconsistency |
| 5 | `applies_to` | The subject / asset / event / feature types an attribute is valid for (`person · company`, `bank_account`, `gst_filing`, `all rows`). Shared attributes list several types | ✗ (implicit in which schema the field lives in) | New multi-select, constrained by the target table's type vocabulary. This is what makes one attribute appear under several entity types in the navigator. Editing it from within one entity type must show the "shared with …" consequence | Vocabulary must be a registry (subject types from `Subject_Types`; asset/event types from `Entity_Routing`; `all rows` for Reserved; feature domains such as `card_spend`, `score`). Observed values also include `cust_company` and `observation` — see F-3. Product Configurator relies on this population (memory: `applies_to` population is in review) |
| 6 | `attribute_group` | Registry grouping: shared (Identifiers, Name, Contact, Location & Address, Classification & Segmentation, Temporal & Lifecycle, Consent & Privacy, Provenance/Lineage, Governance, Quality & Confidence, Relationships) or type-specific (Biographical, Credit / tradeline, Device hardware …). Documentation + filtering, not physical | ≈ Section (free text) | Replace Section with a select sourced from `Attribute_Groups` (+ "Add group" for stewards). Becomes the first level of the left-pane navigator | 320 rows are ungrouped today (267 of them `active`) — the navigator needs an "Ungrouped" bucket and the registry should flag it as a completeness KPI |
| 7 | `column_family` | Constant `d` | ✗ | Do not show as an editable control; one line in the Overview "Physical placement" panel | — |
| 8 | `data_type` | Logical type for validation/serialisation: string · long · decimal · boolean · date · timestamp · json · edge | ≈ Data type (STRING/NUMBER/BOOLEAN/DATE/OBJECT/ARRAY) | Swap the enum. `json` is the replacement for multi-valued scalars (e.g. `subject.aliases`, `subject.former_names`) — the help text should say so, because operators used to reach for ARRAY | `edge` only with class Edge (and vice-versa). Locked once `active` (type change is a semantic change → revision or replace) |
| 9 | `sensitivity` | Standard · PII · Sensitive-PII. Drives masking, tokenisation, access, and the consortium unmask allow-list | ≈ IsPII boolean | Replace the switch with a three-way segmented control. Sensitive-PII must render the governance block expanded | Sensitive-PII ⇒ `governance.legal_basis_required = true` is **schema-enforced**; UI auto-sets and locks it. Six Sensitive-PII rows today carry no governance flags at all (`subject.dob`, `document.mrz`, `document.national_id_no`, `document.licence_no`, `asset.company_name`, `subject.voter_age`) — they will fail the schema gate on export; the validator should surface this as a blocking error on those rows |
| 10 | `governance` | `{legal_basis_required, special_category, tokenize}` — handling obligations. Special category (health, biometric, religion, sexual orientation) needs a documented purpose or the value is quarantined at mapping | ✗ | Three checkboxes in a "Governance" sub-card, with explanatory copy. `tokenize` is auto-suggested for Identifier + Sensitive-PII | `special_category = true` ⇒ `retention_class` should be `special_category` (all five current rows follow this) and the attribute cannot go `active` without `legal_basis_required` |
| 11 | `normalization_rule` | Transform applied at write (`trim`, `trim; uppercase`, `DDMMYYYY -> ISO-8601`, `ISO-8601 date (YYYY-MM-DD)`, `numeric; strip symbols; 2dp`, `integer`, `true/false`, `tokenize/hash; E.164 if phone`) | ≈ Business transformations multi-select (ALL_CAPS, ALL_LOWERCASE, TRIM, REPLACE, CONCATENATE) | Replace with a **combobox**: pick from the 11 observed rule ids or type a free-text rule. Default suggested from data_type (date → ISO-8601 date; decimal → numeric 2dp) | REPLACE and CONCATENATE have no model equivalent; they are source-side template transforms. Drop from MSM |
| 12 | `allowed_values` | null · enum array · regex/format string · `domain:<Name>` | ≈ Value mode DEFAULT / ENUM | Extend Value mode to four options: **Unconstrained · Enum list · Format (regex) · Domain reference**. Domain reference picks from the `Domains` sheet names (38 domains) | A coded attribute whose domain has no loaded codes must stay `pending` ("Promote coded fields" operation). 15 pending rows are in exactly this state. UI: show domain fill status (0 / n codes) next to the reference and block activation while it is empty. Default value (current DEFAULT mode) has no model field — see F-1 |
| 13 | `definition` | Human/semantic definition; the mapper **embeds** it for semantic matching; required non-empty before `active` | ≈ Description | Rename to Definition; mark "required before activation"; show a seed-quality hint when the text is name-derived (709 of 855 definitions are seed-level, e.g. "amc name. [AA]"). This is the highest-value steward input in the model | Blocking error on activation when empty (schema gate) |
| 14 | `synonyms` | Known source aliases; grow automatically when a binding is approved in the mapper | ≈ Similar fields chip list | Keep the chip list, rename to Synonyms / source aliases, and mark entries added by the mapper as system-added (read-only chips) vs steward-added | Blank is correct only when the source name equals the canonical |
| 15 | `status` | proposed · pending · active · deprecated · rejected, with transitions: proposed → pending / rejected; pending → active / rejected; active → deprecated / pending (revision); deprecated → active (reinstated); rejected → terminal (reopen → proposed) | ≈ schema status | Move the badge and workflow banner to the **attribute** level; entity-type level shows counts. `changes_requested` has no model state — see F-4. `proposed` rows originate from the auto-mapper and must be visibly distinguished | Only `active` is writable. **Sending an active attribute for revision removes it from the write path** (bound values quarantine to `_payload`) — the UI must warn before allowing it |
| 16 | `retention_class` | Retention / tiering bucket: credit_account · credit_enquiry · feature_score · kyc_identity · consent_record · transaction_event · special_category · system · standard (durations set by legal/compliance in `Retention_Policy`) | ✗ | New select (recommended, default `standard`), with a read-only tooltip of the policy row (hot window, expiry action, legal-hold sensitivity) | Feature ⇒ feature_score; Reserved ⇒ system; special_category ⇒ special_category; Credit / tradeline group ⇒ credit_account (observed, not enforced) |
| 17 | `sources` | Named feeds that populate the attribute (CSDF, AA, BNPL, ITR, Mortgage, ElectoralRoll, Telco, Utility). "Add a source = add a value here, never a column" | ≈ schema-level Source type | Read-mostly chip list on the attribute, populated by source onboarding; stewards may add/remove. Becomes a **facet filter** on the registry and the primary replacement for the old source-type partition | 535 rows have no source today (canonical attributes no current feed populates — the `Source_Coverage` "gap" view). Disabled for class Feature |
| 18 | `version` | Monotonic integer per entry | ≈ schema version | Show in the lifecycle block; increment on every saved change to the attribute | Distinct from the dictionary version (`_model_version`) — see F-5 |
| 19 | `created_at / updated_at / approved_by` | Audit trail | ≈ Version History "Created by" | Lifecycle block + Approvals tab | — |

### C.2 Registry-level structures the workflow must expose

| Model sheet | What it defines | Impact on MSM |
|---|---|---|
| `Subject_Types` | The six subject types (`_entity_type`: person, company, household, government, device, browser_instance) with subject class (HUMAN, LEGAL_ENTITY, COLLECTIVE, DIGITAL, ASSET, UNKNOWN), subtype examples, **IR resolution keys**, **attribute-group manifest** and nature (deterministic / probabilistic). Plus the five-step recipe "How to add a new subject type" (register type + class/subtype → declare group manifest → define IR keys → add type-specific qualifiers pending → approved; no DDL) | This is the closest thing the model has to a "schema": a subject type is a manifest of groups. It becomes the **registry row for subject types** and the **Overview tab content** of the editor. "Create New Schema" for a subject type = the five-step recipe. IR resolution keys are new metadata with no home today |
| `Entity_Routing` | Asset types (bank_account, credit_facility, investment_account, insurance_policy, pension_account, identity_document, employment_record, tax_registration, phone_profile, consent), event types (bank_transaction, gst_filing, income_tax_filing, enquiry, dispute_record, adverse_record, observation …), feature routes, and the boundary test (own IR_Key + resolved → subject; owned not resolved → asset; dated occurrence → event) | Supplies the **asset and event type rows** for the registry and the vocabulary for `applies_to` under entity_assets / entity_events. The boundary test is the help text an operator needs when registering a new type |
| `Attribute_Groups` | 29 groups, scope (Shared / Specific / Shared-reserved), applies-to and description | Source for the `attribute_group` select and the navigator's first level. Shared groups appear under every type in their applies-to list; the UI must make clear that editing a shared attribute edits it everywhere |
| `Documents` | A document is an asset (`identity_document`, `registration_document`, `address_proof_document` rows in entity_assets) **and** a contributor to the subject. A document field is **two dictionary rows** (e.g. `document.passport_no` Business/entity_assets and `docsubj.passport_no` Identifier/entity_master) | New workflow decision: when a steward creates an identifier-type attribute on a document asset, offer "Also contribute to subject as Identifier" which creates the paired `docsubj.*` row. Without this, the operator must know the two-row convention |
| `Reserved_Qualifiers` | 39 `_`-prefixed qualifiers carried on every row (38 present as dictionary rows) (`_source_id`, `_provider_id`, `_consent_id`, `_valid_from`, `_record_status`, `_model_version`, `_retention_class`, `_legal_hold_id` …) set by Ingest / Mapping / Onboarding / Governance / Compute | Show as a read-only "System (reserved)" group in the navigator under every type. Not steward-editable; no Create for class Reserved outside a platform-admin role |
| `Domains` | Code → label reference layer (37 domains, empty scaffold to fill from CBP). `allowed_values = domain:<name>` points here. When a domain is filled, flip linked attributes pending → active | A small **Domains** sub-surface (or drawer) is needed to load / view codes; the attribute profile links to it. Not a dictionary attribute, so it must not be modelled as one |
| `Retention_Policy` | Class matrix (hot window, total retention, version depth, expiry action, legal-hold sensitivity, mechanism) — placeholders to ratify | Read-only reference behind the Retention class control. Not authored in MSM |
| `Row_Keys`, `Tables`, `Operations`, `Lineage`, `Format_Versioning` | Physical build spec | Read-only reference on the Overview tab ("Physical placement"). No authoring |
| `Attribute_Catalog`, `CSDF_Mapping`, `New_Sources_Mapping`, `CSDF_Domains`, `Source_Coverage` | Source → canonical bindings (template layer) and the derived coverage matrix | **Out of MSM.** These are Schema Mapper / data-source-onboarding artefacts. MSM only shows their effect: `sources` chips and an Impact "Sources" card. `Source_Coverage` should back a coverage KPI (attributes with no feed) |
| `Dictionary_Schema` §3 invariants | Only active writable; attribute_id immutable; Identifier → identifier_index; Edge → relationships; Feature → feature_store; special-category gate; dedup before pending; stamp version; observation escape hatch | Each becomes either a validator rule (Section E.6) or a piece of guidance copy |

### C.3 Current UI elements with no model counterpart

| Current control | Model position | Recommendation |
|---|---|---|
| PK / SK | No per-attribute key; row keys are per table | Remove. Show the table's row-key layout read-only on Overview |
| OBJECT / ARRAY nodes, `[*]` marker, add-root, inline rename with path rewriting | No nesting; repetition = rows; `json` for multi-valued scalars | Remove authoring; retain a read-only grouped navigator |
| Field path / Source path / Target path + path picker | Source path belongs to the template; target = table + qualifier | Remove the three path controls. Re-purpose `TreePathPickerDialog` as an **Attribute picker** (search across the dictionary by qualifier, definition, synonyms) for cross-references such as "superseded by" |
| Source format (JSON, XML, CSV …) | Template axis `(source, format, version)` | Remove from MSM |
| Section | `attribute_group` | Replace with controlled select |
| Display name | Absent (`additionalProperties: false`) | See F-7 |
| IsPII | `sensitivity` + governance | Replace |
| Validation rules (NOT_EMPTY, MIN/MAX_LENGTH, REGEX, UNIQUE, severity, message) | Absent from the record | **Retain on the attribute (Ruling F-1)**; record contract extended (R-1) |
| Business validations (MANDATORY_CHECK, FORMAT_CHECK, DOMAIN_CHECK, RANGE_CHECK) | Partly implied by `allowed_values` (format / domain) | **Retain (F-1)**; FORMAT_CHECK / DOMAIN_CHECK should read from `allowed_values` rather than duplicate it |
| Business transformations (ALL_CAPS, ALL_LOWERCASE, TRIM, REPLACE, CONCATENATE) | `normalization_rule` (free text / rule id) | **Retain as the attribute's transformation rules (F-1)**, standard functions for now. `normalization_rule` in the export is derived from the selected functions so there is one source of truth (R-2) |
| Cross-field validations | Absent | **Retain (F-1)**; the referenced field becomes an `attribute_id` chosen with the attribute picker, constrained to the same target table / type |
| Value mode DEFAULT (default value) | Absent | **Retain (F-1)** as part of the attribute's rules block |
| Enrichment rules (new) | Absent | **Add (F-1)** — same add/remove-row pattern as validation rules; standard function list to be defined (R-2) |
| Schema-level Source type | `sources` per attribute | Replace with facet + chips |
| Schema status `changes_requested` | Absent | See F-4 |

---

## D. Recommended workflow

### D.1 Organising principle

Keep the two-level shape the operator already knows — **registry → editor** — but re-define the levels:

| Level | Today | Recommended | Why |
|---|---|---|---|
| Registry row | Source-type schema | **Entity type**, grouped by target table: Subjects (person, company, household, government, device, browser_instance), Assets (bank_account, credit_facility, identity_document …), Events (bank_transaction, gst_filing, adverse_record …), Features (feature groups), System (reserved) | Matches how the model, the Product Configurator (packet = asset type) and the writer think. Gives the registry a bounded number of rows (about 30) rather than 855 (29 distinct `applies_to` values today) |
| Second view | — | **Attribute Dictionary** — the flat list of all dictionary rows with facets (table, type, class, group, sensitivity, status, source). This is the review queue (`status = pending`, 171 rows today), the coverage view and the source of truth | The model's own operations (§4 of the guide) are all filter recipes over the flat list |
| Editor | Tree of one schema | Entity type page: grouped attribute navigator (left) + attribute profile (right) | Preserves the two-pane interaction and the Save-profile / Save-page pattern |
| Lifecycle | Per schema | Per attribute; the entity type shows aggregates and submits a **batch** of pending attributes | Faithful to the model without making the operator approve 855 things one by one |

### D.2 End-to-end operator journey

**Create (new attribute — the common case)**

1. Data Governance → Master Schema Management → open the entity type (e.g. Assets ▸ bank_account) → **Add attribute** (in the left pane, under a group or "Ungrouped").
2. Profile opens in the right pane with placement pre-filled: `target_table = entity_assets`, `applies_to = [bank_account]`, `class = Business`, status `pending`.
3. Operator completes Identity (qualifier → attribute_id preview), Placement (class; adjust applies_to if shared), Type & format (data_type, normalization rule, allowed values), Semantics (definition, synonyms), Sensitivity & governance (sensitivity; governance flags; retention class).
4. **Save profile** runs the dedup check against existing canonicals (name + definition + synonym similarity) and shows near-duplicates ("`net_income` already exists in Financial profile — open it instead?") before accepting.
5. Page-level **Save** persists; the attribute stays `pending` and is *not* writable. The workflow banner on the type reads "3 attributes pending approval".

**Create (new entity type — the rare case)**

"Create New Schema" becomes **Register entity type**, a short guided form following the model's five-step recipe: table (subject / asset / event / feature group) → `_entity_type` code, subject class & subtype (subjects only) → IR resolution keys (subjects only; free-text list until IR contract lands) → attribute-group manifest (checkbox list of shared + specific groups) → nature (deterministic / probabilistic). Creating the type creates no physical objects (no DDL — the Overview sheet is explicit); it creates the registry entry and lands the operator in the empty editor to add type-specific attributes.

**Configure**

The profile is one card, sectioned in dependency order so earlier choices constrain later ones:

| Section | Controls | Conditional behaviour |
|---|---|---|
| Identity | Canonical qualifier · Attribute id (derived, editable pre-activation) | `_` prefix only for Reserved; locked after activation |
| Placement | Class · Target table · Applies to · Attribute group | Class drives table/type/retention defaults (C.1 row 3); Applies-to vocabulary depends on table; "Shared with n types" badge |
| Type & format | Data type · Normalization rule · Allowed values (Unconstrained / Enum / Format / Domain) | `edge` ⇔ Edge; Domain shows fill status and blocks activation while empty |
| Semantics | Definition · Synonyms | Definition required before activation; system-added synonyms read-only |
| Sensitivity & governance | Sensitivity · Legal basis required · Special category · Tokenize · Retention class | Sensitive-PII locks legal-basis on; Identifier + Sensitive-PII suggests tokenize; special category forces retention special_category |
| Sources | Feed chips | Disabled for Feature; otherwise steward-editable, mapper-populated |
| Lifecycle | Status badge · Version · Created/updated/approved by · Superseded by / Supersedes | Actions depend on status (below) |
| Rules (Ruling F-1) | Validation rules (rule · severity · value / pattern · message) · Business validations · Cross-field validations (attribute picker · rule · severity) · Transformation rules (standard functions) · Enrichment rules (standard functions) · Default value | Same add/remove-row and multi-select components as today. Cross-field target limited to attributes of the same target table / type. FORMAT_CHECK / DOMAIN_CHECK pre-filled from `allowed_values`. Rules travel with the attribute through pending → active and are part of the approval diff |

**Validate**

`validateTree()` becomes `validateDictionary()` over the attributes of the type (and, on activation, the schema gates). Errors block Save; warnings do not. Rules in E.6.

**Save**

Page-level Save writes the changed attributes (each bumps its own `version`), records a Version History entry per attribute, and leaves the dictionary version untouched. Nothing becomes writable on Save.

**Submit for approval → Approve**

Submit for approval enqueues one `schema_master` Approval Queue item per entity type containing all its `pending` (and `proposed`) attributes with a per-attribute diff. The approver opens the item (deep link unchanged), reviews per attribute, and approves / rejects each. Approval flips the attribute to `active` only if the schema gates pass (definition present; Sensitive-PII ⇒ legal basis; domain loaded if referenced). Approval of the batch is the moment the platform's `canonical_dictionary.json` is regenerated and a new dictionary version is cut (F-5).

**Edit**

| Attribute status | Editable in place | Requires "Send for revision" (→ pending, leaves write path) | Requires "Deprecate & replace" |
|---|---|---|---|
| proposed / pending | Everything | — | — |
| active | Definition, synonyms, attribute group, sources, applies_to (additive), allowed values (additive enum codes), normalization rule wording | Sensitivity downgrade, governance flags, retention class, data type, class, target table, removal of an applies_to value | Qualifier or attribute_id change |
| deprecated | Definition (to note the successor) | — | — |
| rejected | Nothing (reopen → proposed) | — | — |

This split was ratified under F-8. Rule edits on an active attribute (validation, cross-field, transformation, enrichment) are in-place edits: they change how values are checked or shaped, not where the attribute is placed, so they do not pull the attribute out of the write path.

**Manage**

Registry-level actions on the Attribute Dictionary: bulk approve (with gate checks), deprecate with superseded-by, reinstate, reopen rejected, load domain codes then "Promote coded attributes", and view coverage gaps (attributes with no source). Entity-type-level: retire a type (all its type-specific attributes deprecated), edit the group manifest, edit IR resolution keys.

---

## E. UI changes required

### E.1 Registry page (`MasterSchemaRegistryPage`)

| Element | Change | Rationale |
|---|---|---|
| Subtitle | "Central registry of entity types and the canonical attribute dictionary" | Source-type framing is gone |
| Primary button | "Create New Schema" → **Register entity type**; secondary **Add attribute** (opens the flat view's create) | Two distinct creation intents now |
| Scope switch (new) | Tabs or segmented control: **Entity types** · **Attribute dictionary** | Bounded registry vs flat truth |
| KPI cards | Entity types view: Entity types · Active attributes · Pending approval (171) · Ungrouped / undefined (completeness). Dictionary view: same counts scoped by filters, plus Coverage gaps (no source) | Pending approval is the model's own review queue; the completeness KPI surfaces the 320 ungrouped and 709 seed definitions |
| Table (Entity types) | Columns: Type (code + subject class / table badge) · Target table · Attributes (active / pending) · Groups · Sources · Last updated · Actions (View · Edit) | Replaces Source Type Name / Version / Number of Fields / Status |
| Table (Attribute dictionary) | Columns: Attribute id · Qualifier · Class · Table · Applies to · Group · Sensitivity · Status · Sources · Updated | Every column is one of the guide's filter recipes |
| Filters | Search (qualifier, definition, synonyms); Status (proposed, pending, active, deprecated, rejected); facets Table · Class · Sensitivity · Source · Group | `changes_requested` removed pending F-4 |
| Status semantics | Entity type has **no lifecycle badge**; it shows attribute counts. Status filter applies to attributes | A type is a manifest, not a versioned object |

### E.2 Editor page chrome (`MasterModelEditorPage`)

| Element | Change |
|---|---|
| Title / ID line | Entity type display + `_entity_type` code + target table; `ID:` becomes the type code |
| Create / Save | Unchanged behaviour; enabled state driven by `validateDictionary()` |
| Submit for approval | Unchanged placement; label shows count ("Submit 3 pending attributes"); disabled when none pending |
| Workflow banner | From single status to counts: "12 active · 3 pending · 1 deprecated"; turns warning when any attribute is pending, destructive when any active attribute is under revision (out of the write path) |
| Blocking-validation alert | Unchanged component; messages now `{attribute_id} — {message}` |
| New actions (attribute context menu) | Send for revision (with quarantine warning) · Deprecate & replace (opens attribute picker for the successor, pre-fills a copy) · Reinstate · Reject / Reopen |

### E.3 Tabs

| Tab | Change |
|---|---|
| Tree → **Attributes** | Left pane: navigator grouped **Attribute group → attribute**, each row with class icon, data-type badge, sensitivity dot, status chip, "shared" indicator. A pinned read-only **System (reserved)** group at the bottom. Add attribute button per group. No add-root / object / array; no inline rename; delete only for `proposed`/`pending` (active → deprecate). Right pane: attribute profile (D.2 Configure) or, when a group header is selected, the group's description and scope (replacing the container editor) |
| Overview | Left: `_entity_type`, target table, subject class & subtype (subjects), nature, IR resolution keys (subjects), group manifest (chips). Right: governance summary — attribute counts by status, sensitivity mix, retention classes in use, and a read-only "Physical placement" block (row-key layout from `Row_Keys`, column family `d`). Source type select removed; Description retained as type description |
| JSON View | Emits the array of dictionary records for the type in the exact `canonical_dictionary.json` shape (validated against `canonical_dictionary.schema.json`). This tab becomes more useful than today: it is a literal preview of the export |
| Version History | Rows: attribute id · version · status change · changed by · change summary (field diff) · dictionary version (when cut). Filter by attribute |
| Impact Analysis | Cards: APIs · Products (keyed on attribute_id — the configurator binds a product version to a dictionary version) · Institutions · **Sources** (feeds that populate this type, from `sources`) |
| Approvals | Timeline per attribute event; attributed to the reviewer, role Schema Steward |

### E.4 Attribute profile editor (`NodeProfileEditor` → `AttributeProfileEditor`)

Field-by-field mapping is in C.1; layout in D.2. Component-level notes:

- Reuse the existing card, chip list, add/remove row and Save-profile patterns; only the controls inside change.
- **Class** must be the first control after Identity because it drives defaults and locks in the sections below. Changing class after values are set should prompt before resetting dependent fields.
- **Applies to** shows a "Shared with: person, company" summary line and, when edited from within an entity type, an inline note that the change affects every listed type.
- **Allowed values → Domain** renders the domain name, fill status (`0 of ? codes loaded`) and a link to the Domains drawer.
- **Definition** shows a quality hint (seed-level vs authored) and a character count; blocking on activation only.
- **Lifecycle** block replaces the PK/SK header area.
- **Rules** sections reuse today's components unchanged in shape: the validation-rule row table, the business-validation and transformation multi-selects, and the cross-field row table (its Field path picker becomes the attribute picker). Enrichment rules are a fourth row table with the same Rule · Parameters · Message columns, populated from the standard-function list once it is defined (R-2).
- The `TreePathPickerDialog` is retained as **AttributePickerDialog** for "superseded by / supersedes" and any future cross-reference. Search covers attribute_id, qualifier, definition and synonyms; leaf-only mode is no longer needed.

### E.5 Removed screens / components

Container editor (OBJECT/ARRAY), the array `[*]` rule and its copy, add-root dropdown, inline rename with path rewriting, delete-container confirm ("descendants and attached profiles"), path picker in leaf-only mode, source-format select. The delete confirm survives only for pending/proposed attributes.

### E.6 Validation rules (`validateDictionary()`)

| Rule | Severity | Source in model |
|---|---|---|
| Duplicate `attribute_id` | Error | Dictionary_Schema (unique, immutable) |
| Duplicate `(target_table, canonical_qualifier)` | Error | Implied by single-family placement |
| Qualifier fails `^_?[a-z][a-z0-9_]*$` | Error | Schema |
| `_` prefix with class ≠ Reserved, or Reserved without `_` | Error | Reserved-qualifier contract |
| Class Edge without data_type `edge` (or vice-versa) | Error | Schema invariants |
| Class Feature with target_table ≠ feature_store | Error | Invariant "Feature → feature_store" |
| Class Observation with target_table ≠ entity_events | Error | Observation escape hatch |
| Missing class / target_table / data_type / sensitivity / status | Error | Schema `required` |
| Sensitive-PII without `legal_basis_required = true` | Error | Schema `allOf` gate |
| `special_category = true` without `legal_basis_required` | Error | Special-category gate |
| Activation with empty definition | Error (on approve) | Schema gate |
| Activation with `domain:<X>` whose domain has no codes | Error (on approve) | Domains sheet, "Promote coded fields" |
| Near-duplicate name/definition/synonym with an existing attribute | Warning (on create) | Dedup-before-pending |
| No attribute_group | Warning | Completeness |
| Seed-level definition | Info | README caution |
| No source populates the attribute | Info | Source_Coverage gap |
| `applies_to` value not in the type registry | Error | Subject_Types / Entity_Routing |
| Edit to an active attribute's locked field | Error with "Send for revision / Deprecate & replace" CTA | attribute_id immutable; active → pending (revision) |
| Rule parameters incomplete (MAX/MIN_LENGTH without value, REGEX without pattern, ENUM without values) | Error | Existing Zod checks, retained (F-1) |
| Cross-field rule references an attribute outside the same target table / type, or a non-active attribute | Error | New — replaces the path-catalog check |

Existing rules that disappear: duplicate node id, duplicate sibling name, FIELD-has-children, OBJECT dataType, ARRAY `[*]` child, and the Zod checks on paths (the rule-parameter and ENUM checks stay).

---

## F. Decisions register and residual items

### F.1 Rulings (Ashutosh, 9 Sep 2026)

| # | Question | Why it matters | Assumption proposed | Effect on the UI | Ruling |
|---|---|---|---|---|---|
| F-1 | **Where do validation rules, cross-field rules, required-ness and default values live?** The dictionary record is closed (`additionalProperties: false`) and carries only `normalization_rule` and `allowed_values` | Determines whether the rule sections of today's profile editor are deleted or relocated | Rules owned by the Validation Rules module, read-only in MSM | — | **Not adopted.** Each attribute carries its own validation rules, cross-field rules, transformation rules and enrichment rules, as before; standard functions for now. Rule sections stay in the profile (D.2, E.4); dictionary record to be extended (R-1); enrichment function list to be defined (R-2) |
| F-2 | **What does `target_table` mean on `Edge` rows?** `Dictionary_Schema` says "table the value lands in", and the invariant says Edge → `entity_relationships`, but 19 of 21 Edge rows carry `entity_master` / `entity_events` / `entity_assets` (the record the edge *arrives on*) | The Placement section cannot enforce a rule the data contradicts | Treat `target_table` on Edge rows as the arrival record; the physical destination is always `entity_relationships` and is shown as derived text | Placement shows "Lands in: entity_relationships (edge)" beneath the target-table select for class Edge; validator does not force `entity_relationships` | Agreed — assumption adopted as ruled |
| F-3 | **Controlled vocabulary for `applies_to`.** Values mix subject types, asset types, event types, feature domains (`card_spend`, `score`), `all rows`, `observation` and one legacy label (`cust_company`) | The multi-select needs a source of truth; the registry rows depend on it | Build the vocabulary from `Subject_Types` + `Entity_Routing` types + `all rows`; treat `card_spend`, `score`, `observation` as feature/event types; flag `cust_company` for reconciliation with `company` | Type registry becomes an admin-editable list; validator errors on unknown values | Agreed — assumption adopted as ruled |
| F-4 | **Is `changes_requested` retained?** The model's state machine has no such state (a reviewer either approves, rejects, or the steward revises) | Approval Queue UI already offers Request changes | Map Request changes to `pending` + reviewer comment (no status change); drop the `changes_requested` filter value | Status filter loses one value; Approvals tab shows the comment event | Agreed — assumption adopted as ruled |
| F-5 | **Versioning granularity.** The model has per-attribute `version` and a dictionary-level `_model_version` stamped on every row; the configurator binds product versions to a dictionary version (v12). Who cuts a dictionary version and when? | Drives Version History content, the Submit/approve flow, and Product Configurator dependency | A dictionary version is cut automatically when an approval batch lands (any attribute changes status), and can also be cut manually ("Publish dictionary") | Adds a Dictionary version indicator on the registry, a column in Version History, and a Publish action for stewards | Agreed — assumption adopted as ruled |
| F-6 | **`attribute_id` domain prefix.** The prefix set is inconsistent (`asset` vs `assets`, `event` vs `events`, `rel` vs `relationships`, `docsubj`) and not defined in the workbook | The UI must derive `attribute_id` on create | Derive prefix from target table + class (`subject.`, `assets.`, `events.`, `relationships.`, `feature.`, `reserved.`, `document.` / `docsubj.` for the document two-row case) and allow steward override pre-activation | Prefix rules become a small config; existing inconsistent ids are left untouched (immutable) | Agreed — assumption adopted as ruled |
| F-7 | **Display name.** Present in every current screen; absent from the dictionary record | Operators and the Product Configurator show human labels | Keep Display name as a **UI-side label** stored outside the dictionary record (or propose adding `display_name` to the schema, which changes the export contract) | Field stays in the Identity section, marked "not exported" until the schema ruling | Agreed — assumption adopted as ruled |
| F-8 | **Which edits to an active attribute are in-place vs revision vs replace?** The model allows active → pending (revision) and mandates deprecate-and-replace for renames, but is silent on the middle ground | Revision takes the attribute out of the write path (quarantine) — a production-affecting act | The split proposed in D.2 Edit | Determines field lock states and which action the CTA offers | Agreed — assumption adopted as ruled |
| F-9 | **Feature attributes need a `feature_group` and Identifier attributes need an `identifier_type` code** for their row / index keys; neither is in the dictionary record | Writers need them; the UI would otherwise show an incomplete placement | Assume `attribute_group` doubles as `feature_group` for Feature rows and the qualifier doubles as `identifier_type` until engineering confirms | If confirmed, no new control; if not, two conditional fields appear in Placement | Agreed — assumption adopted as ruled |
| F-10 | **Proposed-status attributes** come from the auto-mapper (Schema Mapper). Are they created in MSM's store directly, or handed over on submission? | Determines whether MSM shows `proposed` rows and who can edit them | They appear in MSM's dictionary view as `proposed`, editable by stewards, and pass through `pending` before approval | Adds a `proposed` status chip and an "origin: auto-mapper" indicator | Agreed — assumption adopted as ruled |
| F-11 | **Domains management.** `Domains` is an empty scaffold; who loads codes and where? | Blocks activation of 15 coded attributes and the CSDF coded fields | A lightweight Domains drawer in MSM (view codes, upload CSV) owned by stewards | Adds screen #14 (Domains drawer) to the inventory | Agreed — assumption adopted as ruled |
| F-12 | **Golden `__ir` row.** Prior ruling: golden record is out of scope; only per-provider contributions are stored | Physical-placement copy | Do not surface `__ir` anywhere in MSM | Overview "Physical placement" describes contributory rows only | Agreed — assumption adopted as ruled |
| F-13 | **Export count mismatch.** README states 594 attributes in `canonical_dictionary.json`; the workbook holds 855 rows (854 unique ids) | Whichever is loaded is what the mapper sees | The workbook is the truth and the JSON is stale | Regenerate exports before seeding the UI mock data | Agreed — assumption adopted as ruled |
| F-14 | **Data-quality defects in the seed** that the validator will flag on first load: 1 duplicate id (`feature.identity_trust`), 6 Sensitive-PII rows without governance flags, 320 ungrouped rows, 709 seed definitions | First-run experience will show hundreds of warnings | Ship them as warnings/info, with the 7 hard errors visible in the registry KPI | Completeness KPI and filters exist from day one | Agreed — assumption adopted as ruled |

### F.2 Residual items arising from the rulings

| # | Item | Owner | Why it is open | Proposed handling |
|---|---|---|---|---|
| R-1 | **Extend the dictionary record contract** to carry per-attribute rules. `canonical_dictionary.schema.json` is closed; the F-1 ruling requires a `rules` block (validation, business validation, cross-field, transformation, enrichment, default value) on each entry, which also changes `canonical_dictionary.json` / `.csv` and the workbook's `Dictionary_Schema` sheet | Data-model owner + engineering | Export contract and CI validation gate change; the mapper and writer must ignore or honour the block | Add `rules` as an optional object in the schema; regenerate exports; MSM's JSON View validates against the extended schema |
| R-2 | **Standard-function catalogue** for transformation and enrichment rules. Today's transformation list is ALL_CAPS, ALL_LOWERCASE, TRIM, REPLACE, CONCATENATE; the model's `normalization_rule` vocabulary is 11 free-text ids (`trim`, `trim; uppercase`, `DDMMYYYY -> ISO-8601`, …); no enrichment function exists in either source | Product (Ashutosh) | Two overlapping transformation vocabularies would create two sources of truth; enrichment has no seed list | Define one standard-function list covering both; derive `normalization_rule` in the export from the selected transformation functions; enrichment functions start as an empty, admin-extensible list |

---

## G. Final recommendation

Treat this as a **content-model migration inside the existing MSM shell**, not a redesign. Keep the registry → editor → two-pane profile shape, the six tabs, the Create/Save/Submit chrome, the blocking-validation alert, the Approval Queue hand-off and the mock-first build pattern. Replace what is authored inside that shell.

Key design decisions:

1. **Registry row = entity type; truth = flat Attribute Dictionary.** Entity types (subjects, assets, events, feature groups, system) give operators a bounded, familiar list that also matches the Product Configurator's packet model; the flat dictionary view is where review, coverage and bulk lifecycle actions happen.
2. **Lifecycle moves to the attribute.** Entity types carry counts, not a status. Submit-for-approval batches a type's pending attributes into one `schema_master` item with per-attribute decisions. `proposed` is added; `changes_requested` is retired (pending F-4).
3. **The profile editor is rebuilt around placement.** Class → Target table → Applies to → Group come first because they drive everything else; PK/SK, paths, source format and the nesting model are removed. Sensitivity becomes tri-state with governance flags and retention class; Description becomes a gated Definition; Similar fields become Synonyms with mapper provenance; Value mode gains Format and Domain reference.
4. **Immutability and quarantine are made visible.** `attribute_id` and qualifier lock on activation; rename is a "Deprecate & replace" action that keeps the successor link; sending an active attribute for revision warns that it leaves the write path.
5. **Source-side structure leaves MSM.** Paths, formats, templates and per-source coverage belong to Schema Mapper / data-source onboarding; MSM shows only `sources` chips, a Sources impact card and a coverage-gap KPI.
6. **Validation is the schema, made interactive.** `validateDictionary()` encodes the JSON-schema gates and the Dictionary_Schema invariants as blocking errors, and the model's own quality cautions (ungrouped, seed definitions, no source) as warnings and info.
7. **Rules stay with the attribute (Ruling F-1).** Validation, cross-field, transformation and enrichment rules are authored in the profile using today's components and travel with the attribute through approval; the dictionary record contract is extended to carry them (R-1) and one standard-function catalogue replaces the two transformation vocabularies (R-2). All other open items (F-2 to F-14) are closed on the working assumptions.

Suggested sequencing: close R-1 and R-2 with the data-model owner (they fix the profile's rules block and the export contract); then rebuild the profile editor and navigator; then the registry scope switch and KPIs; then the approval-batch payload with the Approval Queue team; then the Domains drawer and Register-entity-type flow.
