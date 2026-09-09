# Product Configurator mock data — analysis and clean-up (v1.0)

Scope: `attribute-dictionary.ts`, `data-products-mock.ts`, `product-management-types.ts`, `productmanagementdemo.json` — the mock data behind the Product Catalogue / Product Configurator BRD surfaces. Cross-referenced against `master-dictionary.seed.v2.json` (canonical dictionary v14, 846 attributes, delivered earlier in this thread) and the existing MSM/DSO impact analyses already on file.

Deliverables produced alongside this document (all attached / saved to the project):

| File | What changed |
|---|---|
| `attribute-dictionary.ts` | Rewritten as a thin loader (types + API only); data moved out to a JSON file so it can be regenerated instead of hand-edited |
| `attribute-dictionary.data.json` | **New.** The actual dictionary content — 19 packets, 716 attributes, projected from canonical v14. Replaces the old hand-typed v12 dictionary (7 packets, ~70 attributes) |
| `product-management-demo.v2.json` | `productmanagementdemo.json` after the fixes and additions below (18 versions / 12 products, was 17 / 11 with one code collision) |
| `data-products-mock.ts` | `source` provenance field removed from `DataPacket`; missing-dependency gap flagged in a header comment |
| `product-management-types.ts` | `populatedBy` provenance field removed from `FieldContractRow` and its two producers |

---

## A. Executive summary

The four files describe **three separate, disconnected data models** that all claim to represent "the product's fields": a hand-written v12 attribute dictionary (~70 attributes, its own ad-hoc IDs), a legacy `PKT_*` packet catalogue with free-text field names that match neither dictionary, and — already present in five of the seventeen product versions — the beginnings of a migration onto canonical, dictionary-backed attribute IDs. None of the three was reconciled against the canonical HBase dictionary (`master-dictionary.seed.v2.json`, v14) built earlier in this engagement.

On top of that structural gap, the demo data itself has one outright bug (two unrelated products sharing product code `PRD_0006`), several TypeScript-interface violations (required fields silently absent from about a third of the version records), and placeholder values standing in for computed ones (`definitionFingerprint: "fp_recomputed"` on every version, which is not a fingerprint of anything).

This pass (1) rebuilds `attribute-dictionary.ts` as a genuine projection of the canonical v14 dictionary — 716 product-packageable attributes across 19 packets, up from ~70 across 7 — with all feed-provenance fields (`sources`, `populatedBy`) removed; (2) fixes the product-code collision and the interface violations; (3) recomputes every `definitionFingerprint` with the real hash function instead of the placeholder string; (4) migrates the five dictionary-aware product versions onto the true v14 attribute IDs, and is explicit — via a new `DICTIONARY_GAP` policy warning on each affected version — about the 25 fields that have no canonical equivalent yet, rather than silently inventing one; (5) adds one fully-canonical new product (`Gig Worker Alt-Data Profile`, PRD_0012) closing a dangling reference in two existing release notes; and (6) leaves the twelve legacy `PKT_*` product versions' field vocabulary untouched, because remapping them safely requires business sign-off this pass cannot manufacture (see section C).

---

## B. What was found

### B.1 Three parallel "product field" vocabularies

| Model | Where | Attribute id style | Attribute count | Status |
|---|---|---|---|---|
| Legacy packet catalogue | `data-products-mock.ts` → `./data-products.json` (not supplied in this batch) | free-text snake_case (`avg_monthly_balance`, `income_stability_score`) | unknown (file not seen) | Backs 12 of 17 `productmanagementdemo.json` versions |
| Product Configurator dictionary v12 | `attribute-dictionary.ts` (as uploaded) | ad-hoc dotted ids (`bank.account_type`, `telco.plan_type`) | ~70 | Backs 5 of 17 versions; never reconciled with the canonical dictionary |
| Canonical HBase dictionary | `master-dictionary.seed.v2.json` | canonical ids (`assets.account_type`, `credit.contract_type`, `subject.primary_mobile`) | 846 (716 product-eligible) | The system of record established by the MSM/DSO work in this project; **this pass aligns the Configurator dictionary to it** |

None of `productmanagementdemo.json`'s 17 versions referenced the canonical dictionary before this pass. The five versions that looked "modern" (`dictionaryVersion: "v12"`, `subjectScope`, `eventStreamToggles` present) were actually referencing the *old* Configurator dictionary, not the canonical one — `v12` and the canonical dictionary's `v14` are different vocabularies, not different versions of the same one.

**Recommendation:** treat `attribute-dictionary.ts`/`.data.json` (now v14-aligned) as the single field vocabulary for anything product-facing, and retire the free-text `PKT_*` catalogue once its field-by-field mapping to canonical ids is worked through with the product owner (see C.1). Two parallel "field contract" models is a real defect in a system whose stated success metric is a single borrower/attribute view — the same discipline applies internally to the Configurator's own demo data.

### B.2 `attribute-dictionary.ts` — sources removed, coverage expanded

The old dictionary hand-typed ~70 attributes across 7 packets (`subject`, `credit_facility`, `bank_account`, `telco_profile`, `identity_document`, `gst_registration`, `cross_asset_analytics`) and carried a `sources: string[]` field naming CSDF/AA/BNPL on every attribute plus a `populatedBy: string[]` on every packet — exactly the kind of feed-provenance detail the earlier canonical-dictionary clean-up established should stay Excel-only and never reach a product-facing surface.

This pass replaces it with a **projection of the canonical dictionary** (`attribute-dictionary.data.json`, generated by a small, re-runnable script rather than hand-typed):

- **716 attributes** across **19 packets** — `subject`, 12 asset packets (`bank_account`, `credit_facility`, `investment_account`, `insurance_policy`, `pension_account`, `identity_document`, `employment_record`, `tax_registration`, `phone_profile`, `consent`, `registration_document`, `address_proof_document`), 5 standalone event-derived packets (`credit_enquiry`, `dispute_record`, `adverse_record`, `crime_record`, `traffic_incident`), and `cross_asset_analytics`.
- Only `Business`, `Identifier` and `Feature` class attributes are included — `Reserved` (platform/system columns), `Edge` (relationship-graph attributes) and `Observation` (free-form event escape hatch) are governance/graph concerns, not product-packageable fields, and are deliberately excluded.
- Only `person`/`company` subject attributes are projected into the `subject` packet. `household`, `government`, `device` and `browser_instance` are canonical subject types too (61 eligible attributes) but are out of scope for lending-product packaging today — flagged as a follow-up, not silently dropped or silently included.
- `sources`/`populatedBy` are gone entirely — not emptied, removed from the type.
- `dataType`, `sensitivity`, `status`, `class`, `definition` and `supersededBy` are taken verbatim from the canonical dictionary, so a lifecycle change made in the Master Schema Management module (e.g. approving a pending attribute, deprecating one) is reflected here on the next regeneration instead of drifting.

**Judgment calls made in the projection** (documented in the file header, repeated here for visibility):
- Event entity types without a natural parent asset (`enquiry`, `dispute_record`, `adverse_record`, `crime_record`, `traffic_incident`) were given their own standalone packet rather than nested as an event stream.
- `gst_filing` and `income_tax_filing` events were nested under `tax_registration`; `bank_transaction` under `bank_account`; `investment_transaction` under `investment_account`.
- `SNAPSHOT` vs `TRENDED` mode is inferred (event-nested ⇒ `TRENDED`; else name-hint heuristic) because the canonical dictionary doesn't carry a mode field — same heuristic already used elsewhere in `product-management-types.ts` (`inferAttributeMode`), reused here for consistency rather than inventing a second heuristic.
- Packet-level `subjectScopes` (e.g. `pension_account`/`employment_record`/`phone_profile` → `INDIVIDUAL` only) are asserted, not derived from the data — the canonical dictionary scopes attributes to *entity types*, not to individual-vs-company at the packet level. Worth a product-owner sanity check.

### B.3 `productmanagementdemo.json` — structural defects (fixed)

1. **Product-code collision.** `ver_rcp_v1`/`ver_rcp_v2` ("Retail Cashflow Plus") and `ver_bnpl_v1` ("BNPL First-Purchase Pack") both carried `productCode: "PRD_0006"` — two unrelated products sharing an identifier the type system treats as the product's primary key. Meanwhile `PRD_0010` was unused (the sequence jumps `PRD_0009` → `PRD_0011`). **Fixed:** Retail Cashflow Plus reassigned to `PRD_0010`.
2. **Missing required fields.** `DemoProductVersion` (in `product-management-types.ts`) declares `subjectScope`, `dictionaryVersion` and `eventStreamToggles` as required, non-optional fields — the twelve legacy `PKT_*` versions omitted all three. It also declares `definitionFingerprint`, `deprecationWindowDays`, `deprecationNoticeAt`, `outputPorts` and `fieldContract` as required — the five dictionary-aware versions omitted all of those (empty arrays or absent). Either the interface is wrong or roughly a third to two-thirds of the sample data violates its own type contract; this pass assumes the interface is right and backfills the data. **Fixed:** every version now carries all 27 fields the interface requires.
3. **Placeholder fingerprints.** All 17 versions carried the literal string `"fp_recomputed"` for `definitionFingerprint` — not a hash of anything, just a marker. `computeDefinitionFingerprint()` already exists in `product-management-types.ts` and is unused by the mock data. **Fixed:** every version's fingerprint is now the real output of that function (reimplemented in Python for the batch regeneration, verified to match the TS algorithm's char-code/bit-shift hash exactly).
4. **`enquiryConfig` shape drift.** Twelve versions use the legacy flat shape (`impactType`/`storeFootprint`/`footprintVisibility` at the top level); five use the newer `{ scope, soft, hard }` shape that `normalizeEnquiryConfig()` in `data-products-mock.ts` exists specifically to migrate. Both shapes are individually valid (the migration function handles it) — flagged here so it's a known, not accidental, inconsistency; not changed, since forcing all 17 onto one shape wasn't asked for and the migration function already covers it at read time.
5. **Suspicious duplicate.** `ver_sts_v2` and `ver_sts_v3` ("SME Trade Screen") have byte-identical `packetConfigs` (same `selectedFields` and `selectedDerivedFields`, including `feature.gst_filing_regularity` present in *both*), yet v3's `releaseNote` claims "Adds GST filing regularity attributes" as if it were new in v3. Either v3's release note is wrong, or a field that was meant to be added is missing from its `packetConfigs`. **Not fixed** — this is a business-content question (what did v3 actually add?), not a mechanical one; flagged for the product owner rather than guessed at.

### B.4 Dictionary migration of the five canonical-style versions — 25 genuine gaps found

Migrating `ver_rcp_v1`, `ver_rcp_v2`, `ver_tpl_v1`, `ver_sts_v2`, `ver_sts_v3` from the old v12 ids onto true canonical v14 ids (packet rename `gst_registration`→`tax_registration`, `telco_profile`→`phone_profile`; per-field id remap) succeeded for most fields, but **25 distinct fields have no canonical v14 equivalent at all** — not a naming difference, a real content gap:

- `subject.provider_id`, `subject.reported_at` — these exist in canonical, but as `Reserved`-class system columns (audit/lineage metadata), not product-exposable `Business`/`Identifier` attributes. The old dictionary treated them as ordinary visible fields; the canonical model treats them as internal. **This is a modelling question for the product owner**, not a dictionary omission: should "which institution reported this / when" be exposed to a subscribing lender at all?
- `credit.contract_type`, `credit.repayment_period`, `credit.amount_paid`, `credit.repayment_dpd`, `credit.repayment_payment_status` — the old dictionary modelled a `repayment_history` event stream on `credit_facility` (period-level DPD/payment records); **the canonical dictionary has no equivalent event stream** — credit-facility attributes in the canonical model are all point-in-time (`credit.overdue_days`, `credit.days_past_due` etc. exist, but nothing period-by-period). This looks like a genuine canonical-dictionary gap worth raising back against the MSM work: lenders that want a repayment-history trend line (a very standard bureau product shape) currently have nowhere to put it.
- `bank.current_balance`, `bank.txn_date/amount/type/narration` — `bank_account` in the canonical model has `balance_datetime` (a timestamp) and event-side transaction fields under `entity_events`/`bank_transaction`, but no field carries the account's current balance value, and the transaction fields use different qualifiers (`amount`, `date`, `category`, `transaction_type`) than the old dictionary assumed. Likely a naming exercise more than a true gap — worth a quick confirm rather than a schema change.
- `telco.connection_type`, `telco.plan_type`, `telco.tenure_months`, `telco.bill_amount`, `telco.payment_status`, `telco.days_past_due`, `feature.telco_score` — this is the largest real gap. The canonical dictionary's `phone_profile` asset type is entirely **fraud/social-risk oriented** (`network_operator`, `sim_type`, `fraud_flag`, `fraud_network`, `identity_risk`, `social_risk`, `underwriting_score` — 21 attributes total) and has **no telecom billing/payment-behaviour attributes at all**. "Telco Payment Lite" — a product explicitly about bill payment consistency for gig-worker affordability — cannot be rebuilt on the canonical dictionary as it stands today. **Recommendation:** raise an attribute-group addition ("Telecom billing", under `phone_profile`) with the MSM/dictionary-governance workstream; this is exactly the kind of gap the Data Governance module's proposal workflow exists to catch.
- `gst.legal_name`, `gst.registration_status`, `gst.turnover_band`, `gst.filing_period`, `gst.delay_days`, `feature.gst_filing_regularity` — the canonical model folds GST registration/filing attributes into `tax_registration`, but under different qualifiers than the old GST-specific dictionary used (e.g. no direct `turnover_band` enum, filing fields use `filing_frequency`/`filing_status`/`return_period` rather than `filing_period`/`delay_days`). Likely reconcilable with a short mapping session, not a schema gap.

Rather than guess at any of these, each affected version now carries an explicit `policyWarnings` entry (`code: "DICTIONARY_GAP"`) naming exactly which fields are unresolved and why, and those fields were left on their pre-migration id (not silently dropped, not silently invented) so the contract still renders in a UI while the gap is visible. `fieldContract` rows for these fields carry a placeholder `description` pointing back at the warning.

### B.5 Catalogue breadth

Two release notes reference successor products that were never created: `ver_devlite_v1`'s note says "migrate to Instant Alt-Data or BNPL packs" and `ver_gigleg_v1`'s says "superseded by Gig Worker Alt-Data Profile" — neither `Instant Alt-Data` nor `Gig Worker Alt-Data Profile` existed as a product. This pass adds **`Gig Worker Alt-Data Profile` (PRD_0012, `ver_gigalt_v1`)**, built entirely on the new canonical dictionary (`subject` + `phone_profile` fraud/social-risk fields + `cross_asset_analytics`), with zero `DICTIONARY_GAP` warnings — both as the missing successor and as a clean demonstration of what a fully-canonical product contract looks like once the v14 gaps above are closed. `Instant Alt-Data` was **not** invented, since nothing in the source data indicates what it should contain; that dangling reference is left for the product owner to either build out or remove from the two release notes.

### B.6 `data-products-mock.ts` and `product-management-types.ts`

- `DataPacket.source: string` (a bare feed-name field) removed; `dataSubmitterInstitutionIds` kept, since it identifies contributing *institutions* (legitimate billing/consortium metadata) rather than an internal feed-format name.
- `FieldContractRow.populatedBy?: string[]` removed, along with its two producers in `buildFieldContractFromPackets()` (both always emitted `[]` or `["computed"]` — dead weight, never carrying real provenance).
- `dataproductsmock.ts` imports `./data-products.json`, a file **not included in this upload batch** and structurally distinct from `productmanagementdemo.json` (it backs the older `DataPacket`/`ConfiguredProduct`/`packetMockData` model referenced by `getMockPayloadForPacket()` etc., which `productmanagementdemo.json`'s `ProductManagementDemoState` shape does not use at all). This could not be reconciled or regenerated without seeing it — flagged in a header comment in the delivered file rather than guessed at. **Recommendation:** decide whether this legacy model is still load-bearing anywhere in the UI; if the five (now generalised) canonical-dictionary product versions are the direction of travel, this file and its JSON dependency are candidates for retirement rather than reconciliation.

---

## C. Open items for the product owner

| # | Item | Why it can't be resolved mechanically |
|---|---|---|
| C.1 | Field-by-field mapping of the 12 legacy `PKT_*` product versions onto canonical v14 ids | Their field names (`income_stability_score`, `mobile_recharge_consistency`, `discretionary_income_score`, …) don't correspond 1:1 to anything in either the old or new dictionary — several look like they should be `Feature`-class derived scores that don't exist yet in the canonical dictionary. Needs a product-owner mapping session, not a rename. |
| C.2 | Should `provider_id`/`reported_at` be product-exposable? | Canonical model treats them as internal (`Reserved` class); old Configurator dictionary exposed them as ordinary fields. A governance/product call, not a data-modelling one. |
| C.3 | Add a period-level repayment-history event stream to `credit_facility` | Real content gap in the canonical dictionary (v14) surfaced by trying to migrate "Retail Cashflow Plus". Recommend routing through the MSM change process already established in this project. |
| C.4 | Add telecom billing/payment-behaviour attributes to `phone_profile` | Same as C.3 — the canonical `phone_profile` type only covers fraud/social-risk signals today; a genuine bill-payment product can't be built on it. |
| C.5 | Reconcile GST qualifier names (`turnover_band`, `filing_period`, `delay_days`) against `tax_registration`'s actual filing-event qualifiers | Likely a short mapping exercise, not a schema gap — listed separately from C.3/C.4 because it doesn't look like missing content, just a naming mismatch. |
| C.6 | `ver_sts_v3`'s release note vs. its (identical-to-v2) field list | Data-quality inconsistency in the source file — see B.3.5. Needs the actual intended v3 field addition, or a corrected release note. |
| C.7 | Retire or reconcile `data-products.json` / `data-products-mock.ts` | Not supplied in this batch; see B.6. |
| C.8 | Build or remove the "Instant Alt-Data" reference | Dangling mention in `ver_devlite_v1`'s release note; see B.5. |

---

## D. Verification

- `attribute-dictionary.data.json`: 716 attributes / 19 packets confirmed via script re-run; every `id` unique; every attribute's `packetId` resolves to a defined packet.
- `product-management-demo.v2.json`: all 18 versions carry all 27 `DemoProductVersion`-required fields (previously 5 of 17 were missing 5 fields each, 12 of 17 missing 3 each); `(productCode, version)` uniqueness holds; `packetIds` matches the packet ids declared in `packetConfigs` for every version; every `subscriptions[].pinnedVersionId`, `dependencies[].fromId`, `notifications[].versionId` and `auditEvents[].versionId` resolves to an existing version id; `definitionFingerprint` recomputed for all 18 with the real hash function (one legitimate collision remains — `ver_sts_v2`/`ver_sts_v3`, see C.6 — left as evidence of the underlying data issue rather than papered over with a fake unique value).
- New product `ver_gigalt_v1`: confirmed zero unresolved field ids against the v14 projection.

---

*Prepared as part of the Hybrid Credit Bureau canonical-dictionary workstream. Builds on `master-dictionary.seed.v2.json`, `MSM_Workflow_Impact_Analysis_v0_1.md`, and `HCB_MSM_UI_Change_Prompt_Delta_v1_1.md` already on file in this project.*
