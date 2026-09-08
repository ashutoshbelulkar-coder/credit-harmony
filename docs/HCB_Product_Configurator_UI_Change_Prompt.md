# HCB Admin Portal — Product Configurator UI Changes (Data-Model Alignment)

**Purpose of this prompt:** Produce static UI screens (Figma / HTML mockups) for the changes to the HCB Product Configurator required by the new master data model. Only the *contract* side of product authoring changes. The *configuration* side (coverage scope, soft/hard enquiry, trended/retro, business metadata) and every lifecycle/approval surface stay exactly as they are today. Treat everything in §2 as frozen.

**Tone and conventions:** Enterprise admin portal, dense but scannable, CRIF house palette already in use in the demo environment. Reuse existing components (wizard stepper, cards, tabs, badges, side-panel live preview). Do not invent new navigation.

---

## 1. Context the designer needs (read once)

### 1.1 What a product is
A **data product** is a governed, versioned definition of what a subscriber institution receives when it enquires on a subject (an individual or a company). It has two halves:

| Half | Contents | Editable after publish? |
|---|---|---|
| **Contract** (versioned, immutable) | Subject scope, data packets, the attributes inside each packet, the subject-identity fields | No — requires a new version |
| **Configuration** (editable in place) | Name, description, tags, business unit, segment, billing item code, coverage scope, allow soft / allow hard with footprint settings, allow trended / allow retro with ceilings | Yes — direct edit, audited, no version change |

This prompt changes how the **contract** is authored and displayed. It does not change how the configuration is authored or displayed.

### 1.2 The new vocabulary (replaces "packet catalogue")
Products are now composed from a **canonical attribute dictionary**. Key facts the UI must reflect:

- **Packet = asset type.** A packet is a source data type: Bank account, Credit facility, Telco / phone profile, GST registration, Identity document, Employment record, Insurance policy, Investment account, Consent, etc. Packets are derived from the dictionary; the operator does not create them.
- **Events are nested inside their parent packet.** Bank transactions belong to Bank account; GST filings belong to GST registration; repayment history and payment events belong to Credit facility. An event stream is never a standalone packet — it appears as a switchable sub-section inside its parent packet.
- **Subject-as-reported packet** (replaces the old "Customer Profile system block"). There is no merged "golden" profile. The platform stores one subject record **per provider** (name, date of birth, addresses, contacts, identifiers as that provider reported them). This packet is always included, non-removable; its attributes are configurable. In the enquiry response it is an **array**, one entry per provider.
- **Provider vs source.** `provider_id` = the institution that originated the data (e.g. HDFC Bank). `source_id` = the channel it arrived through (e.g. an Account Aggregator). Anywhere the UI shows "who contributed this", show the **provider**; source is lineage detail only.
- **Attributes carry metadata the UI must surface as badges:**
  - `sensitivity`: Standard · PII · Sensitive-PII
  - `special_category` (health / biometric) — a stricter subset of Sensitive-PII
  - `status`: active (selectable) · pending (not yet servable) · deprecated (retired; superseded by X)
  - `data_type`: string · long · decimal · boolean · date · timestamp · json
  - `mode` (derived, not authored): Snapshot · Trended-capable
  - `sources`: which feeds populate it today (e.g. CSDF, AA, BNPL) — shown as "Populated by …"
  - `class`: Business · Identifier · Edge · Feature · Observation (Reserved and Payload never appear)
- **Features (derived attributes).** Platform-computed values (scores, bands, flags, ratios). Two display rules:
  1. A feature computed from **one** asset type is shown *inside that packet* under a "Derived" sub-group (e.g. *Max DPD* inside Credit facility).
  2. A feature computed **across** asset types appears in a separate always-last packet called **Cross-asset analytics**, and each attribute shows the asset types it is computed from (e.g. *Risk tier — based on: Credit facility, Bank account, Telco*).

### 1.3 New rules the screens must express
| Rule | UI consequence |
|---|---|
| **Subject scope** — a product declares Individual / Company / Both | New control at the top of Step 2. Filters which packets and attributes are offered. Contract field, shown on Review, Overview and Data Contract. |
| **Defaults on adding a packet** — Standard and PII attributes pre-selected; Sensitive-PII and special-category **unchecked, opt-in** | Locked/opt-in visual on those rows; inline governance note on selection. |
| **Product sensitivity is derived**, not authored: High if any selected attribute is Sensitive-PII or special-category; Medium if any PII; Low otherwise | Live badge in the wizard header and on Review; recomputes on every change; never an editable field. |
| **Minimum reconciliation key** — the Subject-as-reported packet must include at least one identifier, OR name + date of birth where the jurisdiction allows it | Inline requirement panel on the Subject packet; blocks Continue/Submit until satisfied. |
| **Only `active` attributes are selectable** | Pending and deprecated hidden by default behind a "Show unavailable" toggle; when shown, greyed with reason. |
| **Dictionary version binding** — a product version binds to the dictionary version it was authored against | Shown as read-only text on Review and Overview: "Dictionary v12". |
| **Non-empty contract** — at least one packet with at least one included attribute, beyond the Subject packet | Existing validation, re-worded. |

---

## 2. DO NOT CHANGE (frozen surfaces)

Reproduce these exactly as in the current demo build; they are included in the deliverable only where they appear alongside changed elements.

- Product Catalogue list, saved views (All / Active / Pending my approval / Deprecated with consumers / Drafts), product cards, search, Run test entry.
- Wizard **Step 1 — Basics & metadata** (name, description, business unit, segment, billing item code, release note, tags, effective start).
- Wizard **Step 3 — Retrieval** (coverage scope; allow trended / allow retro with max history months). One additive advisory only — see §3.4.
- Wizard **Step 4 — Enquiry impact** (allow soft / allow hard; per-impact store footprint + visibility).
- Live preview **Request** pane and the Preview-as control (LATEST / TRENDED / RETRO).
- Edit-configuration surface for published products.
- Product detail tabs **Subscribers**, **Versions**, **Audit**; the Overview's configuration summary (enquiry settings, retrieval, metadata, release note).
- Submit / withdraw / abandon dialogs; approval outcome surfaces.
- The five-step stepper itself: (1) Basics & metadata · (2) Data packets · (3) Retrieval · (4) Enquiry impact · (5) Review.

---

## 3. CHANGED / NEW SCREENS

### 3.1 Wizard Step 2 — "Data packets & attributes" (full redesign)

**Layout:** three-column working area beneath the stepper, with the existing live-preview side panel on the far right unchanged in position.

```
┌──────────────────────────────────────────────────────────────────────────────┬─────────────┐
│ Step 2 · Data packets & attributes                 Sensitivity: ● Medium     │ Live preview│
│ Subject scope  (●) Individual  ( ) Company  ( ) Both        Dictionary v12   │ Request     │
├──────────────────┬───────────────────────────────────────────────────────────┤ Response    │
│ PACKETS          │ ATTRIBUTES — Credit facility                              │             │
│ [search]         │ [search attributes]   ☐ Show unavailable   Select: all / none │         │
│ ▣ Subject as     │ ▾ Account (11 of 11)                                      │             │
│   reported  ●    │   ☑ contract_type        ENUM   Standard  CSDF            │             │
│ ── Assets ──     │   ☑ outstanding_balance  DEC    Standard  CSDF  Trended   │             │
│ ☑ Credit facility│   ☑ overdue_days         LONG   Standard  CSDF  Trended   │             │
│   ↳ Repayment    │ ▾ Dates (4 of 4) …                                        │             │
│     history  ☑   │ ▾ Derived (1 of 1)                                        │             │
│ ☑ Bank account   │   ☑ dpd_max  ƒ  DEC  Standard   computed from this packet │             │
│   ↳ Transactions │ ▾ Identifiers (0 of 1)                                    │             │
│     ☐            │   ☐ 🔒 account_number   STR  Sensitive-PII  opt-in        │             │
│ ☐ Telco profile  │                                                           │             │
│ ☐ GST registr.   │                                                           │             │
│ ☐ Identity doc   │                                                           │             │
│ ☐ …              │                                                           │             │
│ ── Analytics ──  │                                                           │             │
│ ☐ Cross-asset    │                                                           │             │
│   analytics      │                                                           │             │
├──────────────────┴───────────────────────────────────────────────────────────┤             │
│ Contract summary: 3 packets · 28 attributes · 2 Sensitive-PII · Subject key ✔│             │
│                                            [Save draft]  [Back]  [Continue →]│             │
└──────────────────────────────────────────────────────────────────────────────┴─────────────┘
```

**Header strip**
- Step title.
- **Subject scope** radio: Individual / Company / Both. Default Individual. Changing it after packets are selected shows a confirm dialog: "Changing subject scope will remove N attributes that don't apply to the new scope. Continue?"
- **Sensitivity** badge (Low / Medium / High) — read-only, recomputed live. Tooltip: "Derived from the highest-sensitivity attribute in this contract."
- **Dictionary version** read-only text.

**Left column — Packets list**
- Grouped headings: **Subject** (one item), **Assets**, **Analytics**.
- Subject-as-reported: pre-checked, checkbox disabled, lock icon, tooltip "Always included — attributes configurable". Status dot turns red until the reconciliation-key rule is met, green once met.
- Asset packets: checkbox + label + count "(n of m attributes)". Below each checked packet, indented **event sub-toggles** ("↳ Repayment history", "↳ Transactions", "↳ Filings") — only visible when the parent is checked; unchecked by default.
- Packets not applicable to the current subject scope are hidden (not disabled).
- **Cross-asset analytics** packet at the bottom under Analytics; when checked, its attribute list shows an extra "Based on" column.
- Search filters packet labels. Selected packet row is highlighted; clicking it loads the right column.
- Hover on a packet shows a tooltip with its one-line description and "Populated by: CSDF, AA".

**Right column — Attributes for the selected packet**
- Toolbar: attribute search; "Show unavailable" toggle (off by default); "Select all / Select none" (acts on selectable rows only).
- Attributes grouped in collapsible sections by attribute group (Account, Dates, Amounts, Identifiers, Derived, Events…). Section header shows "(selected of total)". Event sections appear only if the event sub-toggle is on, headed e.g. "Transactions (event stream)".
- Row anatomy, left to right: checkbox · attribute label (technical qualifier in muted mono beneath, e.g. `outstanding_balance`) · type chip · sensitivity chip · "Populated by" chips · mode chip (Trended only where applicable) · info icon (opens definition popover).
- **Sensitive-PII rows:** unchecked by default, lock icon before the label, chip reads "Sensitive-PII · opt-in". On check, an inline note slides open beneath the row: *"Sensitive-PII. Served tokenised. The consuming institution must hold a legal basis for this field. Product sensitivity will become High."* Special-category rows add: *"Special category — state the documented purpose in your business justification at submission."*
- **Derived (ƒ) rows:** small ƒ glyph; sub-text "computed from this packet". In Cross-asset analytics: "Based on: Credit facility, Bank account, Telco profile".
- **Unavailable rows (only when toggle on):** greyed, no checkbox, right-aligned reason chip: "Pending approval — not yet servable" or "Deprecated — superseded by outstanding_balance".

**Subject-as-reported packet — special panel**
When this packet is selected in the left column, the right column opens with a **requirement panel** above the attribute list:

```
┌ Reconciliation key ─────────────────────────────────────────────────┐
│ ✖ Not met.  Include at least one identifier (PAN, national ID,      │
│   passport…) OR full name + date of birth.                          │
│   Identifiers are Sensitive-PII and must be opted in explicitly.    │
└─────────────────────────────────────────────────────────────────────┘
```
Turns green ("✔ Met — full_name + dob") when satisfied. Attribute groups here: Name, Biographical, Contact, Address, Identifiers (all locked/opt-in), Provider (read-only rows `provider_id`, `reported_at` — always included, shown with a "system" chip, no checkbox).

**Footer**
- Contract summary line: packets · attributes · Sensitive-PII count · reconciliation key state.
- Continue is disabled with a tooltip listing unmet rules: reconciliation key; non-empty contract; subject scope selected.

**Empty state (no packet selected on the right):** illustration + "Select a packet on the left to choose its attributes."

**States to render for this step:** (a) fresh draft, nothing selected; (b) three packets selected incl. one event stream, reconciliation key unmet; (c) same with key met and one Sensitive-PII opted in (sensitivity High, inline note open); (d) Show-unavailable on, with one pending and one deprecated row visible; (e) subject scope = Both (packets list shows both person- and company-only packets with a small "Ind" / "Co" tag on packets that apply to only one); (f) Cross-asset analytics packet selected with the "Based on" column.

### 3.2 Live preview — Response pane (regenerated content, same panel)
Same panel, same tabs. The **Response** JSON now mirrors the packet structure:

- `customerProfile` becomes `subjectAsReported: [ { providerId, reportedAt, fullName, dateOfBirth, … }, … ]` — two entries in the sample.
- One key per selected packet, camel-cased from the packet: `creditFacilities: [ {...} ]`, `bankAccounts: [ {..., transactions: [ ... ] } ]` (event stream nested inside the parent), `telcoProfiles: [...]`.
- `analytics: { crossAsset: { riskTier: "B", basedOn: ["credit_facility","bank_account","phone_profile"] } }` only when the Cross-asset analytics packet is selected.
- Each asset entry carries `providerId` and `sourceId` as the first two keys.
- Only included attributes appear. Sensitive-PII values render tokenised, e.g. `"accountNumber": "tok_7f3a…"`.
- TRENDED preview: trended-capable attributes render as `{ "series": [ {"period":"2026-06","value":…}, … ] }` inside the same entry; RETRO adds `retrievalAnchor: "AS_OF 2026-06-15"` — unchanged behaviour.

Render two samples: LATEST with three packets; TRENDED with the Credit facility repayment history nested.

### 3.3 Wizard Step 5 — Review (content changes only)
Keep the existing card layout. Replace the "Packets" card with a **Contract** card:

- Subject scope · Dictionary version · Sensitivity badge (derived) with the reason line, e.g. "High — 1 Sensitive-PII attribute (pan)".
- Per-packet accordion: packet name, "n attributes", event streams included, Sensitive-PII count; expand to list attributes as compact chips.
- Subject-as-reported: shows reconciliation key state.
- Cross-asset analytics listed last with "Based on" per attribute.
- Fingerprint (opaque hash, monospace) unchanged.

Configuration cards (Retrieval, Enquiry impact, Metadata) unchanged.

### 3.4 Wizard Step 3 — Retrieval (one additive advisory)
When *Allow trended retrieval* is switched on and the contract contains no Trended-capable attribute or event stream, show a non-blocking info banner beneath the toggle: *"No trended-capable attributes are included in this contract yet. Trended retrieval will return latest values only until you add an event stream or trended attribute in Step 2."* Nothing else changes.

### 3.5 Product detail — Data Contract tab (redesign)
Replaces the flat field table.

- Header: Version selector (existing) · Subject scope · Dictionary version · Sensitivity badge · Fingerprint (copyable).
- Grouped table, one section per packet in contract order, Subject-as-reported first, Cross-asset analytics last. Section header: packet name, attribute count, event streams included, "Populated by" chips.
- Columns: Attribute (label + mono qualifier) · Attribute ID (mono, e.g. `credit.outstanding_balance`) · Type · Sensitivity · Mode · Populated by · Notes (ƒ derived / based-on list / tokenised).
- Filter chips above the table: All · PII · Sensitive-PII · Trended · Derived.
- Rows for attributes that have since been deprecated in the dictionary show an amber "Deprecated in dictionary v14 — superseded by …" chip (published contract is unchanged; this is the policy-warning surface).
- Download as CSV action (existing pattern).

### 3.6 Product detail — Traceability tab (reframe)
Same left-to-right flow diagram component, new lanes:

**Providers → Packets → Attributes → Product version → Consumers**

- Providers lane: named provider institutions (read-only from Member Management). Where a provider delivers via a channel, show the channel as a small sub-label ("via CRIF Connect"), not as its own node.
- Packets lane: one node per packet; event streams shown as a nested pill on the parent node.
- Clicking a packet node opens the side sheet with that packet's attribute list (existing "inspect packet fields" behaviour).
- Consumers lane unchanged (read-only).

### 3.7 Product detail — Overview tab (two additive rows)
In the existing metadata block add **Subject scope** and **Dictionary version**. The composed-packets summary card lists packets with attribute counts and event-stream indicators. Everything else unchanged.

### 3.8 Compare versions (content changes)
Existing split view. The **Contract delta** section now diffs at attribute level, grouped by packet:
- Added attributes (green), removed (red), packet added/removed, event stream toggled, subject scope changed, reconciliation key change, sensitivity change (e.g. Medium → High).
- Configuration delta section unchanged.

### 3.9 Catalogue card (one indicator, additive)
The existing policy-warning flag now also triggers when any attribute in the representative version has been deprecated in the dictionary. Tooltip text: "Contract references a deprecated attribute — review before next version." No layout change.

---

## 4. Sample data for realistic mockups

Use these packets and attributes so screens look like the real dictionary.

**Subject scope: Individual.**

| Packet | Populated by | Attribute groups & sample attributes |
|---|---|---|
| **Subject as reported** (always on) | CSDF, AA, BNPL | Name: full_name (PII), first_name, last_name · Biographical: dob (PII), gender (PII) · Contact: mobile (PII), email (PII) · Address: address_line, city, postal_code, country · Identifiers 🔒: pan, national_id, passport_no (all Sensitive-PII, opt-in) · Provider (system): provider_id, reported_at |
| **Credit facility** | CSDF | Account: contract_type (ENUM), contract_status (ENUM), contract_role · Amounts: financed_amount (DEC), outstanding_balance (DEC, Trended), overdue_payments_amount (DEC, Trended), monthly_payment_amount · Counters: overdue_days (LONG, Trended), installments_number · Dates: contract_start_date, contract_end_actual_date, last_payment_date · Derived ƒ: dpd_max · Identifiers 🔒: account_number (Sensitive-PII) · Event stream ↳ Repayment history: period, amount_paid, dpd, payment_status |
| **Bank account** | AA, CSDF | Account: account_type, account_subtype, currency, current_balance (Trended), drawing_limit · Dates: balance_datetime · Identifiers 🔒: account_number, ifsc · Event stream ↳ Transactions: txn_date, amount, type, narration, balance_after |
| **Telco profile** | (none yet) | Line: connection_type, plan_type, tenure_months, bill_amount (Trended), payment_status, days_past_due (Trended) · Derived ƒ: identity_trust, score |
| **Identity document** | CSDF | document_type, issue_date, expiry_date, issuing_authority · 🔒 document_number (Sensitive-PII) · 🔒 photo_ref (special category) |
| **Cross-asset analytics** | computed | risk_tier — based on Credit facility, Bank account, Telco profile · income_band (pending — unavailable) · segment · age_band |

**Unavailable examples (for the Show-unavailable state):** `bureau_score` (Pending approval — not yet servable); `current_balance` in Credit facility (Deprecated — superseded by outstanding_balance).

**Sensitivity walk-through to depict:** packets Subject + Credit facility + Bank account with defaults → **Medium**. Opt in `pan` → **High**, reconciliation key ✔ Met.

---

### 4.1 Sample subject and providers (use on every populated screen)

All values are synthetic. One subject, five providers, three channels.

| | Value |
|---|---|
| Subject | Rohan Mehta · Individual · DOB 14 Mar 1988 · Pune, Maharashtra, IN |
| IR key (display) | `IR-7c2f…91e4` |

| Provider (`provider_id`) | Channel (`source_id`) | Packet(s) contributed | Account / asset id |
|---|---|---|---|
| HDFC Bank | CRIF Connect (Account Aggregator) | Bank account + Transactions | XXXX-XXXX-4417 |
| ZestMoney | Direct submission (CSDF) | Credit facility + Repayment history | ZM-77401 |
| Bajaj Finance | Direct submission (CSDF) | Credit facility + Repayment history | BFL-1029384 |
| Airtel | Direct submission (CSDF) | Telco profile | AIR-98220-01 |
| Airtel | Direct submission (CSDF) | Subject as reported | — |

Every provider also contributes a **Subject-as-reported** row; use HDFC Bank, ZestMoney and Airtel as the three visible entries (they report the name slightly differently — this is the point of per-provider rows):

| provider_id | reported_at | full_name | dob | mobile | address_line, city, postal_code | identifiers reported |
|---|---|---|---|---|---|---|
| HDFC Bank | 2026-08-31 | Rohan S Mehta | 1988-03-14 | +91 98XXX XX210 | 14 Kalyani Nagar Rd, Pune, 411006 | pan `tok_9a1c…` |
| ZestMoney | 2026-08-15 | Rohan Mehta | 1988-03-14 | +91 98XXX XX210 | Flat 302 Trinity Towers, Pune, 411006 | pan `tok_9a1c…`, national_id `tok_4e07…` |
| Airtel | 2026-07-30 | ROHAN SURESH MEHTA | — | +91 98XXX XX210 | 14 Kalyani Nagar Road, Pune, 411006 | — |

### 4.2 Sample products (for catalogue, detail and compare screens)

| Field | PRD_0006 · Retail Cashflow Plus | PRD_0009 · Telco Payment Lite | PRD_0011 · SME Trade Screen |
|---|---|---|---|
| Subject scope | Individual | Individual | Company |
| Business unit / Segment | Retail Lending / Thin-file retail | Consumer Digital / Gig workers | Commercial Lending / SME |
| Billing item code | HCB-RCP-006 | HCB-TPL-009 | HCB-STS-011 |
| Tags | cashflow, bnpl, thin-file | telco, lite | gst, kyb, trade |
| Packets | Subject as reported · Credit facility (+ Repayment history) · Bank account (+ Transactions) · Cross-asset analytics | Subject as reported · Telco profile | Subject as reported · GST registration (+ Filings) · Identity document |
| Attributes (count) | 34 | 12 | 21 |
| Sensitive-PII opted in | pan, account_number (bank) | — | document_number |
| Sensitivity (derived) | High | Medium | High |
| Reconciliation key | ✔ pan | ✔ full_name + dob | ✔ document_number |
| Coverage / Soft / Hard | Network · Soft (no footprint) · Hard (footprint, All network) | Network · Soft only | Consortium · Hard (footprint, Vertical) |
| Trended / Retro | 12 m / 6 m | 6 m / off | off / 12 m |
| Dictionary version | v12 | v12 | v11 |
| Representative version / status | v2 Active (v1 Deprecated, 18 consumers) | v1 Active | v3 Draft (v2 Active) |
| Fingerprint (display) | `fp_3e9a17c04b8d` | `fp_a07d55e21c90` | `fp_c4419b0e77a2` |
| Release note (latest) | "Adds bank transactions stream and cross-asset risk tier." | "Initial contract." | "Adds GST filing regularity attributes." |

Use **PRD_0006 v2** as the product under edit in all Step 2 / Review / preview mockups, and **PRD_0006 v1 → v2** for the compare screen.

### 4.3 Sample live-preview Response — LATEST (PRD_0006 v2)

```json
{
  "enquiryId": "ENQ-2026-251-0007",
  "status": "SUCCESS",
  "enquiryType": "HARD",
  "subjectFound": true,
  "products": [
    {
      "enquiryItemId": "ENQ-2026-251-0007-006",
      "productId": "PRD_0006",
      "productName": "Retail Cashflow Plus",
      "productVersionServed": 2,
      "outcome": "SERVED",
      "dataScope": "LATEST",
      "retrievalAnchor": "CURRENT",
      "subjectAsReported": [
        { "providerId": "HDFC Bank", "sourceId": "CRIF Connect", "reportedAt": "2026-08-31",
          "fullName": "Rohan S Mehta", "dateOfBirth": "1988-03-14", "mobile": "+91 98XXX XX210",
          "addressLine": "14 Kalyani Nagar Rd", "city": "Pune", "postalCode": "411006", "country": "IN",
          "pan": "tok_9a1c7f…" },
        { "providerId": "ZestMoney", "sourceId": "CSDF", "reportedAt": "2026-08-15",
          "fullName": "Rohan Mehta", "dateOfBirth": "1988-03-14", "mobile": "+91 98XXX XX210",
          "addressLine": "Flat 302 Trinity Towers", "city": "Pune", "postalCode": "411006", "country": "IN",
          "pan": "tok_9a1c7f…" }
      ],
      "creditFacilities": [
        { "providerId": "ZestMoney", "sourceId": "CSDF", "accountNumber": "tok_2b8e…",
          "contractType": "BNPL", "contractStatus": "ACTIVE", "contractRole": "BORROWER",
          "financedAmount": 60000.00, "outstandingBalance": 18450.00, "overduePaymentsAmount": 0.00,
          "monthlyPaymentAmount": 5000.00, "overdueDays": 0, "installmentsNumber": 12,
          "contractStartDate": "2025-11-05", "lastPaymentDate": "2026-08-05", "dpdMax": 0,
          "repaymentHistory": [
            { "period": "2026-08", "amountPaid": 5000.00, "dpd": 0, "paymentStatus": "PAID" },
            { "period": "2026-07", "amountPaid": 5000.00, "dpd": 0, "paymentStatus": "PAID" },
            { "period": "2026-06", "amountPaid": 5000.00, "dpd": 4, "paymentStatus": "PAID_LATE" }
          ] },
        { "providerId": "Bajaj Finance", "sourceId": "CSDF", "accountNumber": "tok_77c1…",
          "contractType": "PERSONAL_LOAN", "contractStatus": "ACTIVE", "contractRole": "BORROWER",
          "financedAmount": 250000.00, "outstandingBalance": 142300.00, "overduePaymentsAmount": 8900.00,
          "monthlyPaymentAmount": 8900.00, "overdueDays": 31, "installmentsNumber": 36,
          "contractStartDate": "2024-09-20", "lastPaymentDate": "2026-07-20", "dpdMax": 31,
          "repaymentHistory": [
            { "period": "2026-08", "amountPaid": 0.00, "dpd": 31, "paymentStatus": "OVERDUE" },
            { "period": "2026-07", "amountPaid": 8900.00, "dpd": 0, "paymentStatus": "PAID" }
          ] }
      ],
      "bankAccounts": [
        { "providerId": "HDFC Bank", "sourceId": "CRIF Connect", "accountNumber": "tok_5d2a…", "ifsc": "tok_c93b…",
          "accountType": "SAVINGS", "currency": "INR", "currentBalance": 46210.55, "drawingLimit": 0.00,
          "balanceDatetime": "2026-08-31T23:59:00+05:30",
          "transactions": [
            { "txnDate": "2026-08-28", "amount": 85000.00, "type": "CREDIT", "narration": "SALARY AUG26 ACME TECH", "balanceAfter": 51210.55 },
            { "txnDate": "2026-08-05", "amount": -5000.00, "type": "DEBIT", "narration": "UPI ZESTMONEY EMI", "balanceAfter": 12340.00 },
            { "txnDate": "2026-08-03", "amount": -18500.00, "type": "DEBIT", "narration": "NEFT RENT KALYANI", "balanceAfter": 17340.00 }
          ] }
      ],
      "analytics": {
        "crossAsset": {
          "riskTier":  { "value": "B", "basedOn": ["credit_facility", "bank_account"] },
          "segment":   { "value": "SALARIED_THIN_FILE", "basedOn": ["credit_facility", "bank_account"] },
          "ageBand":   { "value": "35-44", "basedOn": ["subject"] }
        }
      }
    }
  ],
  "completedAt": "2026-09-08T11:42:17Z",
  "footprintCreated": true
}
```

### 4.4 Sample live-preview Response — TRENDED (window 6 months, excerpt)

Trended-capable attributes render as a series inside the same entry; everything else stays scalar.

```json
"creditFacilities": [
  { "providerId": "Bajaj Finance", "sourceId": "CSDF", "contractType": "PERSONAL_LOAN",
    "dataScope": "TRENDED", "window": { "months": 6, "from": "2026-03", "to": "2026-08" },
    "outstandingBalance": { "latest": 142300.00, "series": [
      { "period": "2026-03", "value": 178650.00 }, { "period": "2026-04", "value": 171400.00 },
      { "period": "2026-05", "value": 164150.00 }, { "period": "2026-06", "value": 156900.00 },
      { "period": "2026-07", "value": 149650.00 }, { "period": "2026-08", "value": 142300.00 } ] },
    "overdueDays": { "latest": 31, "series": [
      { "period": "2026-03", "value": 0 }, { "period": "2026-04", "value": 0 }, { "period": "2026-05", "value": 0 },
      { "period": "2026-06", "value": 0 }, { "period": "2026-07", "value": 0 }, { "period": "2026-08", "value": 31 } ] }
  }
]
```

### 4.5 Sample Data Contract rows (PRD_0006 v2, Credit facility section)

| Attribute | Attribute ID | Type | Sensitivity | Mode | Populated by | Notes |
|---|---|---|---|---|---|---|
| Contract type `contract_type` | `credit.contract_type` | ENUM | Standard | Snapshot | CSDF | domain: ContractTypeDomain |
| Contract status `contract_status` | `credit.contract_status` | ENUM | Standard | Snapshot | CSDF | |
| Financed amount `financed_amount` | `credit.financed_amount` | DECIMAL | Standard | Snapshot | CSDF | |
| Outstanding balance `outstanding_balance` | `credit.outstanding_balance` | DECIMAL | Standard | Trended | CSDF | |
| Overdue days `overdue_days` | `credit.overdue_days` | LONG | Standard | Trended | CSDF | |
| Contract start date `contract_start_date` | `credit.contract_start_date` | DATE | Standard | Snapshot | CSDF | |
| Max DPD `dpd_max` | `feature.dpd_max` | LONG | Standard | Snapshot | computed | ƒ derived from this packet |
| Account number `account_number` | `credit.account_number` | STRING | Sensitive-PII | Snapshot | CSDF | tokenised · opted in |
| ↳ Repayment history · Period `period` | `credit.repayment_period` | STRING | Standard | Trended | CSDF | event stream |
| ↳ Repayment history · Amount paid `amount_paid` | `credit.amount_paid` | DECIMAL | Standard | Trended | CSDF | event stream |
| Current balance `current_balance` | `credit.current_balance` | DECIMAL | Standard | — | — | ⚠ Deprecated in dictionary v13 — superseded by outstanding_balance (show only on the "deprecated chip" state) |

### 4.6 Sample compare data (PRD_0006 v1 → v2)

| Dimension | v1 | v2 | Rendering |
|---|---|---|---|
| Subject scope | Individual | Individual | unchanged |
| Packets | Subject · Credit facility · Bank account | + Cross-asset analytics | packet added (green) |
| Event streams | Repayment history | + Transactions on Bank account | stream toggled on (green) |
| Attributes added | — | bank: `drawing_limit`, `balance_datetime`; analytics: `risk_tier`, `segment`, `age_band` | green rows |
| Attributes removed | credit: `current_balance` | — | red row, note "deprecated" |
| Sensitive-PII | pan | pan, account_number (bank) | amber "opt-in added" |
| Sensitivity | Medium… | High | badge change highlighted |
| Reconciliation key | full_name + dob | pan | changed |
| Fingerprint | `fp_9b03e5d1a2f7` | `fp_3e9a17c04b8d` | changed |
| **Configuration delta** | Trended 6 m | Trended 12 m | unchanged section style |

### 4.7 Sample catalogue cards (three states)

| Card | Status badge | Subscribers | Updated | Tags | Flag |
|---|---|---|---|---|---|
| PRD_0006 Retail Cashflow Plus · v2 | Active | 27 | 08 Sep 2026 | cashflow · bnpl · thin-file | ⚠ Contract references a deprecated attribute |
| PRD_0009 Telco Payment Lite · v1 | Active | 9 | 21 Aug 2026 | telco · lite | — |
| PRD_0011 SME Trade Screen · v3 | Draft | 4 (v2) | 08 Sep 2026 | gst · kyb · trade | — |

## 5. Deliverables checklist

| # | Screen | States |
|---|---|---|
| 1 | Step 2 — Data packets & attributes | a–f as listed in §3.1 |
| 2 | Step 2 — Subject-as-reported panel | key unmet; key met via name+dob; key met via pan (High) |
| 3 | Step 2 — Sensitive-PII opt-in inline note | Sensitive-PII; special-category |
| 4 | Step 2 — Subject-scope change confirm dialog | — |
| 5 | Live preview Response | LATEST (3 packets, nested transactions); TRENDED |
| 6 | Step 3 — trended advisory banner | shown |
| 7 | Step 5 — Review, Contract card | collapsed; one packet expanded |
| 8 | Product detail — Data Contract tab | default; filtered to Sensitive-PII; with a deprecated-attribute chip |
| 9 | Product detail — Traceability tab | with one "via channel" provider |
| 10 | Product detail — Overview additions | — |
| 11 | Compare versions — contract delta | attribute-level diff incl. sensitivity change |
| 12 | Catalogue card — policy-warning tooltip | — |

Also supply: a component sheet for the new chips (type, sensitivity, special-category, populated-by, mode, ƒ derived, system, pending, deprecated, Ind/Co scope tags) and the lock/opt-in row treatment.

## 6. Out of scope for this brief
Lifecycle actions (activate, deprecate, deactivate, archive), approval-queue screens, subscriber/entitlement screens, Run-test inputs and result screens, Data Source Onboarding / dictionary maintenance screens, and any change to the request envelope in the live preview.
