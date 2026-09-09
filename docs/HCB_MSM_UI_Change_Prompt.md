# HCB Admin Portal — Master Schema Management UI Change Prompt

**Purpose:** Implementation brief for an AI coding assistant (Cursor / Claude Code / equivalent) to make the **static UI changes** that align Master Schema Management (MSM) with the new HBase canonical data model.
**Companion documents:** `MSM_Workflow_Impact_Analysis_v0_2.md` (the "why" — read Sections D and E if anything here is ambiguous); `MasterDataManagementUI.md` (current build); `master-dictionary.seed.json` (mock data, supplied with this prompt).
**Version:** 1.0, 9 Sep 2026.

---

## 0. Read this first — guardrails

You are modifying an existing React SPA. This is a **content-model migration inside the existing MSM shell**, not a redesign.

**In scope (only):**
- `src/pages/data-governance/master-schema/*` — `MasterSchemaRegistryPage`, `MasterModelEditorPage`, `EditableSchemaTreeView`, `NodeProfileEditor`, `TreePathPickerDialog`, `validateTree()` and their local helpers/types.
- `src/data/master-schemas.json` → replaced by `src/data/master-dictionary.seed.json` (supplied).
- The mock API adapter for `/v1/master-schemas` (rename paths as in §9).

**Out of scope — do not touch:**
- Data Management (`src/pages/data-governance/data-management/*`), Schema Mapper / auto-mapping review, Approval Queue internals, Consortium wizard, Product Configurator, `attribute-dictionary.ts`, User/Role management.
- The design system: no new colours, fonts, spacing scales, or third-party UI libraries. Reuse existing components (cards, tables, badges, chip lists, add/remove row tables, dialogs, drawers, skeletons, alerts, segmented controls, resizable split).
- The feature flag `VITE_USE_DATASOURCE_ONBOARDING_FLOW`: leave it; the new MSM runs under the same flag value as the current tree editor.
- Routes: keep `/data-governance/master-schema`, `/new`, `/:id`, `/:id/edit`. Add only what §2 lists.

**Behavioural rules:**
- Static UI: all state is in memory + the seed JSON; persist to `localStorage` under `hcb_msm_v2_*` only for the filter state and the in-memory dictionary (so a refresh keeps edits during a demo).
- Keep every existing empty / loading / error / retry state and the mock-first fallback behaviour.
- Keep the E2E assertions in `e2e/datasource-onboarding.spec.ts` green: registry heading **Master Schema Management** and `/master-schema/new` shows **Create Master Data Model** with **Tree / JSON View / Approvals** tabs. (The tab labelled "Tree" is renamed **Attributes** in the UI — update the spec's tab assertion accordingly, nothing else in the spec.)
- Do not invent business rules. Where this prompt says "placeholder", use the list given and mark it with a `data-placeholder="R-2"` attribute so it can be found later.
- Do not "improve" copy, layout, or flows beyond what is specified. If something is unclear, implement the simplest reading and leave a `// TODO(MSM-v2): <question>` comment.

---

## 1. Mental model (what changed)

| Before (DynamoDB tree) | After (HBase canonical dictionary) |
|---|---|
| One nested schema per source type (Telecom, Bank, GST…) | One flat **Attribute Dictionary** (855 rows). No nesting. |
| OBJECT / ARRAY / FIELD nodes, `[*]`, dot paths, PK/SK | Each attribute is a flat record: placement (`class`, `targetTable`, `appliesTo`, `attributeGroup`) + type + semantics + sensitivity/governance + lifecycle + rules |
| Lifecycle on the schema | Lifecycle on the **attribute** (`proposed → pending → active → deprecated / rejected`) |
| Registry row = source-type schema | Registry row = **entity type** (person, company, bank_account, gst_filing…) — a *view* over the dictionary filtered by `appliesTo` |
| Source type = schema partition | `sources` = chips on the attribute; a filter facet |

Keep: page shape, tabs, two-pane editor, Save-profile-then-Save-page, blocking-validation alert, workflow banner, Submit for approval → Approval Queue (`schema_master`).

---

## 2. Routes and modes

| Route | Mode | Heading |
|---|---|---|
| `/data-governance/master-schema` | Registry — **Entity types** tab (default) | Master Schema Management |
| `/data-governance/master-schema?view=dictionary` | Registry — **Attribute dictionary** tab | Master Schema Management |
| `/data-governance/master-schema/new` | Register entity type (create) | Create Master Data Model |
| `/data-governance/master-schema/:entityType` | View entity type | `{displayName}` |
| `/data-governance/master-schema/:entityType/edit` | Edit entity type | `Edit: {displayName}` |
| `/data-governance/master-schema/:entityType?attribute=:attributeId` | View/Edit with an attribute pre-selected | as above |

`:id` becomes `:entityType` (e.g. `bank_account`). Breadcrumb: `Data Governance → Master Schema Management → {Create schema | displayName | Edit: displayName}` — unchanged pattern.

---

## 3. Data contract (from `master-dictionary.seed.json`)

Load the seed once into an in-memory store. Shapes (TypeScript, add to the MSM types file):

```ts
type ClassName = 'Business'|'Identifier'|'Edge'|'Reserved'|'Payload'|'Observation'|'Feature';
type TargetTable = 'entity_master'|'entity_assets'|'entity_events'|'entity_relationships'|'feature_store'|'all';
type DataType = 'string'|'long'|'decimal'|'boolean'|'date'|'timestamp'|'json'|'edge';
type Sensitivity = 'Standard'|'PII'|'Sensitive-PII';
type AttrStatus = 'proposed'|'pending'|'active'|'deprecated'|'rejected';
type RetentionClass = 'credit_account'|'credit_enquiry'|'feature_score'|'kyc_identity'|'consent_record'|'transaction_event'|'special_category'|'system'|'standard';

interface AllowedValues { kind: 'enum'; values: string[] } | { kind: 'format'; pattern: string } | { kind: 'domain'; domain: string };

interface AttributeRules {                       // Ruling F-1 — rules travel with the attribute
  validation: { rule: 'NOT_EMPTY'|'MAX_LENGTH'|'MIN_LENGTH'|'REGEX'|'UNIQUE'; severity: 'Error'|'Warning'|'Info'; value?: number; pattern?: string; message: string }[];
  businessValidations: ('MANDATORY_CHECK'|'FORMAT_CHECK'|'DOMAIN_CHECK'|'RANGE_CHECK')[];
  crossField: { attributeId: string; rule: 'EQUALS'|'NOT_EQUALS'|'GREATER_THAN'|'LESS_THAN'|'GREATER_OR_EQUAL'|'LESS_OR_EQUAL'|'REQUIRED_IF'|'FORBIDDEN_IF'|'SAME_AS'|'DIFFERENT_FROM'; severity: 'Error'|'Warning'|'Info' }[];
  transformations: ('ALL_CAPS'|'ALL_LOWERCASE'|'TRIM'|'REPLACE'|'CONCATENATE')[];   // placeholder list, R-2
  enrichment: { function: string; params?: Record<string,string>; message?: string }[]; // placeholder, empty list, R-2
  defaultValue: string | null;
}

interface CanonicalAttribute {
  attributeId: string;            // immutable once active, e.g. "credit.outstanding_balance"
  canonicalQualifier: string;     // ^_?[a-z][a-z0-9_]*$
  class: ClassName; targetTable: TargetTable; columnFamily: 'd';
  appliesTo: string[];            // entity type codes
  attributeGroup: string | null;
  dataType: DataType;
  sensitivity: Sensitivity;
  governance: { legalBasisRequired: boolean; specialCategory: boolean; tokenize: boolean };
  normalizationRule: string | null;
  allowedValues: AllowedValues | null;
  definition: string; synonyms: string[];
  status: AttrStatus; retentionClass: RetentionClass; sources: string[];
  displayName: string;            // UI-only (Ruling F-7) — never in the JSON View export
  version: number; createdAt: string; updatedAt: string; approvedBy: string | null;
  supersededBy: string | null;    // attributeId of the successor when deprecated
  rules: AttributeRules;
}

interface EntityType {
  entityType: string; targetTable: TargetTable; kind: 'subject'|'asset'|'event'|'feature'|'system';
  displayName: string; description: string;
  attributeCount: number; pendingCount: number; sources: string[]; groups: string[]; lastUpdated: string;
  // subjects only:
  subjectClass?: string; subtypeExamples?: string[]; irResolutionKeys?: string[]; groupManifest?: string[]; nature?: string;
  legacy?: boolean; note?: string;
}
```

The seed also carries `attributeGroups[]`, `domains[]` (all with `codes: []` — deliberately empty), `retentionPolicy[]`, `rowKeys[]`, `enums` (all select lists, including the placeholder rule lists) and `dictionaryVersion: "v13"`. Read select options from `enums`; do not hard-code them twice.

**Derived, not stored:** an entity type's attributes = `attributes.filter(a => a.appliesTo.includes(entityType))`. Reserved (`class = 'Reserved'`, `appliesTo = ['all rows']`) attributes appear under **every** entity type in a pinned read-only group.

The seed intentionally contains defects the validator must surface (§8): one duplicate `attributeId` (`feature.identity_trust__dup`), six `Sensitive-PII` rows with `legalBasisRequired = false`, 320 rows with `attributeGroup = null`, and one legacy entity type `cust_company` (`legacy: true`).

---

## 4. Registry page (`MasterSchemaRegistryPage`)

Keep the page skeleton: title, subtitle, primary action, KPI card row, filter row, table, pagination (10 rows), skeleton loading, retry error card, empty state.

**Header**
- Title: **Master Schema Management** (unchanged).
- Subtitle: *Central registry of entity types and the canonical attribute dictionary.*
- Primary button: **Register entity type** → `/new`. Secondary button (outline): **Add attribute** → opens the attribute-create drawer (§6) with no entity type pre-filled.
- Dictionary version pill next to the title: `Dictionary v13` (from seed).

**Scope switch** — a segmented control under the header: **Entity types** · **Attribute dictionary**. Persist in `?view=`.

### 4.1 Entity types view

KPI cards (four): **Entity types** · **Active attributes** · **Pending approval** · **Completeness issues** (count of attributes with no `attributeGroup` or seed-level definition — see §8 Info rules). Tooltip on Completeness: *Ungrouped or seed-level definitions.*

Table columns:

| Column | Content |
|---|---|
| Entity type | `displayName` + muted `code: {entityType}`; kind badge (Subject / Asset / Event / Feature / System); for subjects also `subjectClass` muted |
| Target table | monospace `targetTable` |
| Attributes | `{active} active · {pending} pending` (computed) |
| Groups | count, tooltip lists group names |
| Sources | chips (max 3, then `+n`) |
| Last updated | `en-IN` `dd MMM yyyy`; hidden below `md` |
| Actions | **View** · **Edit** |

Group rows by kind with a section header row (Subjects, Assets, Events, Features, System). `legacy: true` rows get a warning badge **Legacy** with `note` as tooltip.

Filters: search (entity type name/code), kind select (All · Subject · Asset · Event · Feature · System), target-table select. **No status filter here** — entity types have no lifecycle.

Empty state copy: *No entity types match the current filters.*

### 4.2 Attribute dictionary view

KPI cards: **Attributes** · **Active** · **Pending approval** · **Coverage gaps** (attributes with `sources.length === 0`, excluding class Feature and Reserved).

Table columns: Attribute id (monospace) · Qualifier · Class · Table · Applies to (chips, max 2 then `+n`) · Group · Sensitivity (badge: Standard muted, PII info, Sensitive-PII warning) · Status (badge, §7) · Sources (chips) · Updated. Row click → `/:firstAppliesTo?attribute=:attributeId` (for `all rows`, open the first subject type).

Filters (all persisted in `localStorage` key `hcb_msm_v2_dict_filters`): search (matches `attributeId`, `canonicalQualifier`, `definition`, `synonyms`), Status (All · Proposed · Pending · Active · Deprecated · Rejected), Table, Class, Sensitivity, Source, Group. Filters are ANDed.

Bulk actions (checkbox column, only visible in this view, mutating roles only): **Approve selected** (runs the activation gates in §8; shows a result dialog listing which passed/failed and why) · **Deprecate selected** (dialog asks for optional successor via attribute picker) · **Reject selected** (pending/proposed only).

---

## 5. Editor page (`MasterModelEditorPage`)

Same three modes (create / view / edit), same chrome.

**Left chrome:** back arrow → registry, title (`displayName`), muted `code: {entityType} · {targetTable}`.

**Right actions (unchanged positions):**

| Action | When | Behaviour |
|---|---|---|
| **Create** | Register-entity-type mode | Creates the entity type record; navigates to view |
| **Save** | Edit | Persists all changed attributes (each `version++`, `updatedAt`), writes Version History rows; disabled while blocking errors exist |
| **Edit** | View | → `/edit` |
| **Submit for approval** | View + Edit, existing type | Label: *Submit {n} pending attributes*; disabled when `n === 0`. Creates one Approval Queue item of type `schema_master` (mock: push to the existing approval mock store) with payload `{ entityType, dictionaryVersion, attributes: [{attributeId, version, diff}] }` |

**Workflow banner** — replace the single-status banner with a counts banner using the same component: `{active} active · {pending} pending · {proposed} proposed · {deprecated} deprecated`. Tone: default when nothing pending; **warning** when any pending/proposed; **destructive** when any attribute has `status === 'pending'` **and** `version > 1` (an active attribute sent for revision — it is out of the write path). Destructive copy: *{n} previously active attribute(s) are under revision and are not currently writable.*

**Blocking-validation alert** — unchanged component; lines are `{attributeId} — {message}`, max six + remainder.

### 5.1 Tabs

Tab order and names: **Attributes** (was Tree, default) · **Overview** · **JSON View** · **Version History** · **Impact Analysis** · **Approvals**.

#### Attributes tab — left pane (`EditableSchemaTreeView` → `AttributeNavigator`)

Keep the resizable split and the stacked layout below `lg`. The left pane is now a **grouped list**, not an authored tree:

- Level 1: attribute group (from `attributeGroups[]`, in seed order), then **Ungrouped** (attributes with `attributeGroup === null`), then a pinned **System (reserved)** group at the bottom (class Reserved). Group header row shows count and a chevron; groups are collapsible; expand state remembered per entity type in `localStorage`.
- Level 2: attribute row — class icon (Business: braces; Identifier: key; Edge: link; Feature: sparkle; Observation: pulse; Reserved: lock; use existing icon set), `displayName`, monospace qualifier, data-type badge, sensitivity dot (none / info / warning), status chip, and a small **shared** icon when `appliesTo.length > 1` (tooltip lists the other types).
- **Add attribute** button on every group header (not on System) → opens the profile pane with a new draft attribute pre-filled: `targetTable` from the entity type, `appliesTo = [entityType]`, `attributeGroup` = that group, `class = 'Business'`, `status = 'pending'`, `columnFamily = 'd'`, `sensitivity = 'Standard'`, `retentionClass = 'standard'`, `dataType = 'string'`, `rules` empty.
- Row hover actions: context menu (⋯) with **Send for revision** (active only), **Deprecate & replace** (active only), **Reinstate** (deprecated only), **Reject** (proposed/pending), **Reopen** (rejected), **Delete** (proposed/pending only, confirm dialog: *Delete {attributeId}? This attribute has never been active.*).
- Remove entirely: Add root dropdown, Object/Array creation, `[*]`, inline rename, path rewriting, container delete warning.
- Selecting a **group header** shows the group panel in the right pane (§5.3). Selecting an attribute shows the profile (§6).
- Empty state (entity type with no attributes): dashed card *No attributes yet* with a single **+ Add attribute**.
- No selection: *Select an attribute from the list to view or edit its profile.* (same component as today).

#### Overview tab

Two-column layout as today.

Left — **Entity type metadata**:

| Field | Create | Edit | View |
|---|---|---|---|
| Display name | Editable | Editable | Disabled |
| Entity type code | Editable (`^[a-z][a-z0-9_]*$`) | Locked | Locked |
| Kind / Target table | Select (Subject→entity_master, Asset→entity_assets, Event→entity_events, Feature→feature_store) | Locked | Locked |
| Subject class (subjects only) | Select: HUMAN · LEGAL_ENTITY · COLLECTIVE · DIGITAL · ASSET · UNKNOWN | Editable | Disabled |
| Subtype examples (subjects only) | Chip list | Editable | Disabled |
| IR resolution keys (subjects only) | Chip list (free text) | Editable | Disabled |
| Group manifest | Multi-select from `attributeGroups[]` | Editable | Disabled |
| Nature (subjects only) | Select: Deterministic · Probabilistic · Composite / probabilistic · Deterministic / probabilistic · Probabilistic / decaying | Editable | Disabled |
| Description | Editable | Editable | Disabled |

Remove: Source type select, Version field.

Right — **Governance summary** card: attribute counts by status (five badges), sensitivity mix (three counts), retention classes in use (chips), sources (chips), plus a read-only **Physical placement** sub-card: `Column family: d`, and the row-key layout for this entity type's table from `rowKeys[]` (monospace). Helper text: *Save records a new version of each changed attribute. Submit for approval routes pending attributes to the Approval Queue.*

#### JSON View tab

Pretty-printed array of this entity type's attributes in **export shape**: snake_case keys exactly as `canonical_dictionary.json` (`attribute_id`, `canonical_qualifier`, `class`, `target_table`, `column_family`, `applies_to`, `attribute_group`, `data_type`, `sensitivity`, `governance{legal_basis_required,special_category,tokenize}`, `normalization_rule`, `allowed_values` (string `domain:<name>` / pattern string / array / null), `definition`, `synonyms`, `status`, `retention_class`, `sources`, `version`, `rules`). **Omit `displayName`, `createdAt`, `updatedAt`, `approvedBy`, `supersededBy`** (UI/audit-only). Add a **Copy** button (existing pattern).

#### Version History tab

Table: Attribute id · Version · Change · Changed by · Changed at · Dictionary version. "Change" is `status: pending → active`, or a field-level summary `definition, synonyms (2 added)`. Filter input by attribute id. Seed has no history; empty copy *No prior versions.* Every Save appends one row per changed attribute; every approval batch appends a single row `Dictionary version cut: v13 → v14` and increments `dictionaryVersion` (Ruling F-5).

#### Impact Analysis tab

Four cards: **apis** · **products** · **institutions** · **sources**. The first three keep today's mock content keyed by entity type (use empty lists if none). **sources** = union of `sources` across the type's attributes. Empty copy unchanged: *No linked {bucket}.*

#### Approvals tab

Timeline as today; events are per attribute: `submitted`, `approved`, `rejected`, `revision requested`, `deprecated`, `reinstated`, with actor and comment. Empty: *No approval events recorded.*

### 5.3 Group panel (replaces the container editor)

When a group header is selected: read-only card with group name, scope (Shared / Specific / Shared (reserved)), applies-to, description (from `attributeGroups[]`), attribute count, and the copy *Attributes are managed in the list. Add attribute adds to this group.* No editable fields.

---

## 6. Attribute profile editor (`NodeProfileEditor` → `AttributeProfileEditor`)

One scrollable card in the right pane, sections in this order. **Save profile** at the bottom writes to the in-memory store; page-level **Save** persists. Card header: `displayName` (editable inline in edit mode), monospace `attributeId` badge (replaces the `BASICINFORMATION_COMPANYNAME` code badge), status chip, `v{version}`.

Lock rule: fields marked **L** are read-only when `status === 'active'` or `'deprecated'`; attempting to change them shows an inline note with two buttons **Send for revision** / **Deprecate & replace** (§7). Fields marked **A** are editable in place on active attributes.

### 6.1 Identity
| Control | Notes |
|---|---|
| Display name **A** | Text. UI-only; not exported |
| Canonical qualifier **L** | Text, live regex `^_?[a-z][a-z0-9_]*$`. `_` prefix allowed only when class = Reserved. Inline warning (not error) when another attribute in a different table already uses the qualifier: *Also used by {attributeId}* with a link |
| Attribute id **L** | Derived `{prefix}.{qualifier}` where prefix = subject / assets / events / relationships / feature / reserved by target table & class (document rows keep `document.` / `docsubj.`); editable text while status is proposed/pending; must be unique |

### 6.2 Placement
| Control | Notes |
|---|---|
| Class **L** | Select from `enums.class`. **First control in this section; drives the rest.** Changing it after other fields are set → confirm dialog *Changing class resets dependent placement fields.* Effects: Identifier → shows helper *Also indexed in identifier_index*; Edge → `dataType` forced to `edge`, helper *Lands in entity_relationships (edge)* under Target table; Feature → `targetTable = feature_store`, `retentionClass = feature_score`, Sources disabled; Observation → `targetTable = entity_events`, `appliesTo = ['observation']`; Reserved → qualifier must start with `_`, `targetTable = all`, `retentionClass = system`, entire profile read-only unless role is Super Admin; Payload → helper *Stored in _payload, unpromoted* |
| Target table **L** | Select from `enums.targetTable`; pre-filled and locked to the entity type's table when opened from an entity type (except class Feature/Reserved rules above) |
| Applies to **L** (additive **A**) | Multi-select of entity type codes filtered by target table (`entity_master` → subjects; `entity_assets` → assets; `entity_events` → events; `feature_store` → feature types; `all` → `all rows`). On active attributes, adding is allowed in place; removing requires revision. Summary line *Shared with: {other types}* when > 1. Inline note when edited from an entity type: *This attribute is shared — changes apply to every listed type.* |
| Attribute group **A** | Select from `attributeGroups[]` + **Ungrouped**; free-text "Add group…" option that appends to the in-memory group list |

### 6.3 Type & format
| Control | Notes |
|---|---|
| Data type **L** | Select from `enums.dataType`; `edge` only when class = Edge (and vice-versa). Helper under `json`: *Use json for multi-valued scalars (aliases, former names). Repeating records are rows, not arrays.* |
| Normalization rule **A** | Combobox: options from `enums.normalizationRules`, free text allowed. Suggest default by data type: date → `ISO-8601 date (YYYY-MM-DD)`, timestamp → `ISO-8601 datetime / epoch millis`, decimal → `numeric; strip symbols; 2dp`, long → `integer`, boolean → `true/false`, string → `trim` |
| Allowed values **A** | Segmented: **Unconstrained · Enum list · Format (regex) · Domain reference**. Enum → chip list (required non-empty). Format → text. Domain → select from `domains[]`; shows `{codes.length} of ? codes loaded` and a **Open domain** link (§10). While codes are empty, show info *Attribute cannot be activated until the domain is loaded.* |

### 6.4 Semantics
| Control | Notes |
|---|---|
| Definition **A** | Textarea, char count. Helper *Required before activation. The mapper embeds this text for semantic matching.* Quality hint chip **Seed-level** when the definition ends with a bracketed source tag like `[AA]`/`[CBS]` or is ≤ 4 words |
| Synonyms / source aliases **A** | Chip list. Chips present in the seed render as system-added (muted, not removable); steward-added chips are removable |

### 6.5 Sensitivity & governance
| Control | Notes |
|---|---|
| Sensitivity **L** (upgrade **A**) | Three-way segmented Standard · PII · Sensitive-PII. Upgrading (Standard→PII→Sensitive-PII) is allowed in place; downgrading on an active attribute requires revision |
| Legal basis required | Checkbox; **auto-checked and disabled** when Sensitivity = Sensitive-PII or Special category is checked |
| Special category | Checkbox; when checked, sets Retention class to `special_category` (user may override, warning shown) |
| Tokenize | Checkbox; auto-suggested (checked, still editable) when class = Identifier and Sensitivity = Sensitive-PII |
| Retention class **L** | Select from `enums.retentionClass`; tooltip shows the matching `retentionPolicy[]` row (hot window, expiry action, legal-hold sensitive) |

### 6.6 Sources
Chip list from `enums.sources`, multi-select. Disabled with helper *Features are platform-computed, not source-contributed* when class = Feature. Disabled for class Reserved.

### 6.7 Rules (Ruling F-1 — placeholders, `data-placeholder="R-2"`)
Reuse today's components unchanged in shape:

| Block | Component | Notes |
|---|---|---|
| Validation rules | Add/remove row table: Rule · Severity · Value · Pattern · Message | Rule from `enums.placeholderValidationRules`; Value required for MAX/MIN_LENGTH; Pattern required for REGEX |
| Business validations | Multi-select | From `enums.placeholderBusinessValidations`. When Allowed values is Format → pre-tick FORMAT_CHECK; Domain → pre-tick DOMAIN_CHECK (still editable) |
| Cross-field validations | Add/remove row table: Attribute · Rule · Severity | Attribute chosen with the **Attribute picker** (§11), restricted to attributes with the same `targetTable` and overlapping `appliesTo`; Rule from `enums.crossFieldRules` |
| Transformation rules | Multi-select | From `enums.placeholderTransformations` |
| Enrichment rules | Add/remove row table: Function · Parameters · Message | Function select is populated from `enums.placeholderEnrichment` (empty) — render the table with the empty-select state and helper *Standard enrichment functions to be defined (R-2).* |
| Default value | Text input | Free text |

Rule blocks are **A** (editable in place on active attributes).

### 6.8 Lifecycle (read-only block)
Status chip · Version · Created / Updated / Approved by · **Supersedes / Superseded by** (attribute links when set) · Origin badge **Auto-mapper** when `status === 'proposed'`.

**Save profile** validation: run §8 rules for this attribute; Error blocks Save profile; Warnings/Info show inline. On first save of a new attribute run the dedup check (§8) and show the near-duplicate dialog before accepting.

---

## 7. Lifecycle actions and status badges

| Status | Badge | Allowed actions |
|---|---|---|
| proposed | Info, with Auto-mapper origin | Edit all · Submit (→ pending) · Reject · Delete |
| pending | Warning | Edit all · Approve (gates) · Reject · Delete (only if `version === 1`) |
| active | Success | Edit **A** fields · Send for revision · Deprecate & replace |
| deprecated | Muted, reduced opacity | Edit definition only · Reinstate |
| rejected | Destructive | Reopen (→ proposed) |

Action behaviours (all open a confirm dialog with a mandatory comment field — reuse the existing change-comment dialog):

- **Send for revision** (active → pending): dialog is **destructive** tone: *Sending {attributeId} for revision removes it from the write path. Values bound to it will be quarantined to _payload until it is re-approved.* Unlocks **L** fields.
- **Deprecate & replace** (active → deprecated): dialog lets the user pick a successor via the attribute picker **or** *Create successor from a copy* (creates a new pending attribute cloned from this one with `attributeId` cleared for editing and `supersededBy` wired both ways).
- **Reinstate** (deprecated → active): runs activation gates.
- **Approve** (pending/proposed → active): runs activation gates (§8); on failure shows the failing gate(s) and does nothing.
- **Reject** (proposed/pending → rejected) and **Reopen** (rejected → proposed): comment only.

There is **no `changes_requested` state** (Ruling F-4). "Request changes" from the Approval Queue is a comment event on a pending attribute.

---

## 8. Validation (`validateTree()` → `validateDictionary()`)

Run over the attributes of the current entity type on every change; page-level Save is disabled while any **Error** exists. Activation gates run on Approve / Reinstate / bulk approve.

| # | Rule | Severity | When |
|---|---|---|---|
| V1 | Duplicate `attributeId` across the dictionary | Error | always |
| V2 | Duplicate `(targetTable, canonicalQualifier)` | Error | always |
| V3 | Qualifier fails `^_?[a-z][a-z0-9_]*$` | Error | always |
| V4 | `_` prefix with class ≠ Reserved, or Reserved without `_` | Error | always |
| V5 | class Edge ⇔ dataType edge violated | Error | always |
| V6 | class Feature with targetTable ≠ feature_store | Error | always |
| V7 | class Observation with targetTable ≠ entity_events | Error | always |
| V8 | Missing class / targetTable / dataType / sensitivity / status / qualifier / attributeId | Error | always |
| V9 | Sensitivity Sensitive-PII with `legalBasisRequired !== true` | Error | always |
| V10 | `specialCategory` true with `legalBasisRequired !== true` | Error | always |
| V11 | `appliesTo` contains a code not in `entityTypes[]` | Error | always |
| V12 | Validation rule parameter missing (MAX/MIN_LENGTH value, REGEX pattern, Enum list empty) | Error | always |
| V13 | Cross-field rule references an attribute with a different `targetTable`, no overlapping `appliesTo`, or status ≠ active | Error | always |
| V14 | Edit attempted on an **L** field of an active/deprecated attribute | Error with CTA | on edit |
| G1 | Activation with empty `definition` | Error | gate |
| G2 | Activation with `allowedValues.kind === 'domain'` and that domain has `codes.length === 0` | Error | gate |
| W1 | Near-duplicate: another attribute whose qualifier, definition or a synonym is within a small edit distance of this one (use a simple normalised-string similarity ≥ 0.85) | Warning (dialog on first save) | create |
| W2 | `attributeGroup === null` | Warning | always |
| W3 | Qualifier reused in another table | Warning | always |
| I1 | Seed-level definition (rule in §6.4) | Info | always |
| I2 | `sources` empty (class ≠ Feature/Reserved) | Info | always |

Message format `{attributeId} — {message}`. Delete the old tree rules (duplicate node id, sibling names, FIELD-has-children, OBJECT dataType, ARRAY `[*]`, path catalog checks) and the Zod path schemas; keep the Zod checks for rule parameters and enum lists.

Expected on first load of the seed: V1 ×1 (`feature.identity_trust__dup`), V9 ×6, W2 ×320, I1 ≈ 700. These must be visible, not suppressed.

---

## 9. Mock API adapter

Rename the mock-first client paths and keep the fallback behaviour (401/403/network → seed):

| Old | New |
|---|---|
| `GET /v1/master-schemas` | `GET /v1/master-dictionary/entity-types` and `GET /v1/master-dictionary/attributes?…filters` |
| `GET /v1/master-schemas/:id` | `GET /v1/master-dictionary/entity-types/:entityType` (returns type + its attributes) |
| `POST /v1/master-schemas` | `POST /v1/master-dictionary/entity-types` |
| `PUT /v1/master-schemas/:id` | `PUT /v1/master-dictionary/attributes` (batch of changed attributes) |
| submit | `POST /v1/master-dictionary/entity-types/:entityType/submit` |
| — | `POST /v1/master-dictionary/attributes/:attributeId/{approve|reject|revise|deprecate|reinstate|reopen}` |
| — | `GET /v1/master-dictionary/domains`, `PUT /v1/master-dictionary/domains/:domainName/codes` |

All are mock in this build; the Spring OpenAPI does not expose them (same situation as today).

---

## 10. Domains drawer (new, Ruling F-11)

Opened from Allowed values → **Open domain**, and from a **Domains** link in the registry header (outline button, next to Add attribute). Right-side drawer (existing drawer component):

- Header: domain name, `{n} codes`, list of attributes using it (`usedBy`, as links).
- Table: Code · Label · Description; **Add row**; **Import CSV** (file input; parse `code,label,description`; static — in memory only).
- Footer: **Save codes** (mutating roles). After save, show a toast *{n} attributes referencing {domain} can now be activated.*

---

## 11. Attribute picker (`TreePathPickerDialog` → `AttributePickerDialog`)

Same dialog shell, same search box. Searches `attributeId`, `canonicalQualifier`, `displayName`, `definition`, `synonyms` (fuzzy). Rows show attribute id, qualifier, class, table, status. Accepts an optional `filter` predicate (used by cross-field rules and Deprecate & replace). Remove leaf-only mode and the paste-a-path affordance.

---

## 12. Register entity type flow (`/new`)

Single-page form (no wizard) using the Overview tab's Create column (§5.1), with the boundary-test helper text above it: *Has its own IR key and is resolved → Subject. Owned by a subject, not independently resolved → Asset. A dated occurrence → Event. Platform-computed values → Feature.* Create validates: unique code, regex, kind chosen, at least one group in the manifest. On success navigate to `/:entityType` (view) with the empty-attributes state.

---

## 13. Roles

Mutating roles as today: Super Admin, Bureau Admin, Data Admin, Compliance Officer. Others: read-only banner, all mutations disabled. Class Reserved attributes and the System group are editable only by Super Admin.

---

## 14. Acceptance checklist (self-verify before finishing)

1. Registry loads from seed; Entity types view shows 29 rows grouped by kind; `cust_company` shows the Legacy badge.
2. Attribute dictionary view lists 855 rows; filters AND together; Status filter has exactly five values and no "Changes Requested".
3. `/bank_account` opens; navigator groups attributes with Ungrouped and pinned System (reserved); reserved rows are read-only.
4. Adding an attribute from a group pre-fills placement per §5.1; changing Class to Edge forces `dataType = edge` and shows the entity_relationships helper.
5. Setting Sensitivity to Sensitive-PII auto-checks and disables Legal basis required.
6. Allowed values → Domain reference shows `0 of ? codes loaded`; Approve on that attribute fails gate G2 with a visible reason; after adding codes in the Domains drawer, Approve succeeds and the status chip turns active.
7. On an active attribute, editing Qualifier shows the lock note with **Send for revision** / **Deprecate & replace**; Send for revision shows the destructive quarantine dialog and turns the workflow banner destructive.
8. First load shows the expected V1 / V9 errors and W2 / I1 counts in the blocking alert and Completeness KPI; Save is disabled while V errors exist on the open type.
9. Submit for approval creates one `schema_master` item listing the pending attributes; the Approval Queue's **Open in Master Schema Management** deep link resolves to `/:entityType`.
10. JSON View output for `person` validates structurally against the shape in §5.1 (snake_case, no `displayName`).
11. Version History gains one row per changed attribute on Save and one "Dictionary version cut" row on approval; the header pill increments to v14.
12. All Rules blocks render with the placeholder lists and carry `data-placeholder="R-2"`; Enrichment shows the empty-select helper.
13. No file outside `src/pages/data-governance/master-schema/*`, `src/data/master-dictionary.seed.json`, the MSM mock adapter, and the one E2E tab assertion was modified (`git diff --stat` to confirm).
14. `e2e/datasource-onboarding.spec.ts` passes with the tab label updated to Attributes.

---

## 15. Things explicitly deferred (do not build)

Real API integration; the R-1 schema extension in the workbook/exports; the R-2 standard-function catalogue; Approval Queue per-attribute review UI (the queue item is created; its detail panel is unchanged); Consortium unmask policy re-pointing to `sensitivity`; Product Configurator dictionary binding; the golden `__ir` row (out of scope — never shown).
