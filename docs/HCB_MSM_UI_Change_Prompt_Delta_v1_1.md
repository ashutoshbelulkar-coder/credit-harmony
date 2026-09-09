# HCB MSM UI Change Prompt — Delta v1.1 (seed v2 clean-up)

**Apply on top of** `HCB_MSM_UI_Change_Prompt.md` v1.0. Only the items below change; everything else in v1.0 stands. Replace `src/data/master-dictionary.seed.json` with `master-dictionary.seed.v2.json` (rename to the same path).

## 1. Data contract (§3)

1. Remove `sources: string[]` from `CanonicalAttribute` and `EntityType`, and `enums.sources`. Do not render, filter, or count sources anywhere.
2. `dictionaryVersion` is now `"v14"`.
3. `supersededBy` is populated on all 13 deprecated attributes; render it as a link in the Lifecycle block and show a **Supersedes** back-link on the successor.
4. New entity types in the seed: `registration_document`, `address_proof_document` (assets), `investment_transaction` (event). `cust_company` no longer exists — keep the `legacy` badge code path but expect zero rows.
5. `attributeGroups[]` now has 53 entries including **Common asset attributes** (Shared, all asset types). Read the navigator's group order from this array; Ungrouped will be empty.
6. `domains[]`: 8 domains carry `codes[]` (Country 249, Currency 178, Gender, YesNo, AnnualMonthly, CivilStatus, NewUsed, PaymentPeriodicity); 30 remain empty.

## 2. Registry (§4)

7. Entity types view: 31 rows. Remove the **Coverage gaps** KPI and the Sources column/chips/filter from both views. Dictionary-view KPI row becomes **Attributes · Active · Pending approval · Deprecated**.
8. Dictionary view columns: drop **Sources**; add **Applies to** count badge (`+n`) since shared attributes now list up to 12 types.

## 3. Editor (§5, §6)

9. Attributes tab navigator: shared attributes (`appliesTo.length > 1`) are now common under asset types — keep the shared icon, and add a tooltip listing the other types (already specified) **plus** a "Shared (n)" filter chip at the top of the navigator.
10. Profile §6.6 **Sources** section: remove entirely.
11. Profile §6.3 **Allowed values → Domain**: fill status now reads `{codes.length} codes loaded` or **Codes not loaded** (amber). Activation gate **G2 becomes a Warning, not an Error**: "Domain codes not loaded — values will be stored as raw codes until the domain is populated." All coded attributes in the seed are active.
12. Overview tab governance summary: remove the Sources chips; keep counts by status, sensitivity mix, retention classes.
13. Impact Analysis tab: drop the **sources** card (back to the three cards apis · products · institutions).
14. JSON View export shape: no `sources` key.

## 4. Validation (§8)

15. Remove **I2** (no source populates the attribute).
16. Change **G2** severity to Warning (see item 11).
17. Expected first-load results with seed v2: **zero Errors, zero Warnings from W2**, 0 pending, 13 deprecated. **I1** (seed-level definition) still fires on roughly 640 short definitions — keep it Info. If any Error appears on first load, the seed was not replaced.

## 5. Mock API (§9)

18. Drop the `sources` filter parameter from `GET /v1/master-dictionary/attributes`.

## 6. Acceptance checklist (§14) — replace items 1, 2, 6, 8

- **1.** Registry shows **31** entity types grouped by kind; no Legacy badge is visible.
- **2.** Attribute dictionary lists **846** rows; Status filter has five values; the Pending filter returns 0 rows; Deprecated returns 13, each with a Superseded-by link.
- **6.** Open `subject.gender` → Allowed values shows **GenderDomain · 4 codes loaded**. Open `credit.contract_type` → **ContractTypeDomain · Codes not loaded** (amber) and the attribute is still active; Send for revision → Approve shows warning G2 but succeeds.
- **8.** First load: blocking alert is empty; Completeness KPI shows only I1 (seed-level definition) counts.
- **Add 15.** Open `assets.currency` (or any attribute in **Common asset attributes**): Applies to lists ≥ 5 asset types; the navigator shows it under bank_account, credit_facility, investment_account, pension_account and insurance_policy with the shared icon.
- **Add 16.** No UI text, column, filter, chip, or JSON key mentions "source" or "sources" except the Version History "changed by" values and the Register-entity-type helper copy.

## 7. Unchanged from v1.0 (do not touch)

Guardrails (§0), routes (§2), Rules block placeholders with `data-placeholder="R-2"` (§6.7), lifecycle actions (§7), Domains drawer (§10), attribute picker (§11), Register entity type (§12), roles (§13), deferred list (§15).
