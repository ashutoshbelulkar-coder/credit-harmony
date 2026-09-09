# Master Dictionary Seed — Clean-up Change Register (v1 → v2)

**Input:** `master-dictionary.seed.json` (v13, 855 attributes, 171 pending). **Output:** `master-dictionary.seed.v2.json` (v14, 846 attributes, 0 pending, 13 deprecated with successors). All changes are pre-production seed corrections; `attribute_id` immutability applies from v14 onward.

## 1. Summary of rules applied

| Rule | Count | What it did |
|---|---|---|
| Approve pending | 171 | All 171 pending attributes activated (definition present, governance gates satisfied); `approvedBy = dictionary-steward`, `version = 2` |
| Tradeline placement | 103 | `credit.*` CSDF/CBS contract attributes moved from `person · company` to `credit_facility` |
| AA asset placement | 32 | `asset.*` rows re-pointed from `person` to bank_account / investment_account / insurance_policy by group; overrides for company_name (investment_account, Standard), masked_account_number, balance_datetime, account_subtype, tenure_* (multi-asset) |
| Document placement | 15 | `document.*` rows re-pointed to identity_document / registration_document / address_proof_document; common document fields (document_number, document_type, issue/expiry date, issuing_authority, is_valid, address) apply to all three |
| Cross-asset extension | 13 | currency, status, as_of_date, account_id, provider_id, credit_limit, holder_name, nominee_name, address, email, phone_number, tax_id, pan extended across the asset types where they are meaningful; grouped under **Common asset attributes** |
| Event re-pointing | 5 | `credit.event_*` → adverse_record |
| Event re-pointing | 3 | `enquiry.*` → enquiry |
| Event re-pointing | 6 | ITR deductions/salary → income_tax_filing; AA order_id / trade_rate / transaction_id → new `investment_transaction` (transaction_id also bank_transaction) |
| Cross-event extension | 3 | status, filing_date, normalized_tax_id, consent_id, provider_id extended across event types |
| Relationship attributes | 7 | `id:relationship_type`, `id:relationship_status`, `id:is_primary`, `id:designation`, `id:department`, `p:start_date`, `p:end_date` → valid qualifiers on entity_relationships (person · company) |
| Relationship junk removed | 0 | `id:ir_id`, `id:company_id`, `id:customer_id` (row-key components) and `m:created_at/record_status/schema_version/source_system/updated_at` (duplicates of reserved `_` qualifiers) removed |
| Legacy type removed | 0 | `cust_company` retired as an entity type |
| Grouping | 293 | Every ungrouped attribute assigned a group by target type; 17 groups added (Tax registration, Phone profile, Employment, Bank transactions, Investment transactions, Adverse records, Public records, Disputes, Enquiries, Common asset attributes, …) |
| Grouping | 32 | Source-named group dissolved into Identifiers / Employment / Registration & legal / Location & Address |
| Governance | 15 | Every Sensitive-PII attribute now carries `legalBasisRequired = true` (schema gate) |
| Governance | 3 | Tokenize set on Sensitive-PII identifiers and document numbers (mrz, national_id_no, licence_no) |
| Sensitivity | 1 | `subject.voter_age` Sensitive-PII → PII; `asset.company_name` Sensitive-PII → Standard (listed-company name) |
| Deprecations | 11 | 13 deprecated CBS attributes linked to their successors (11 CSDF tradeline attributes, `reserved._provider_id`, `assets.lender_name`) |
| Definitions | 299 | Source tags (`[AA]`, `[CSDF]`, `[CBS]`, `[ITR]`) stripped; sentence case; 'Legenda' → 'domain' |
| Duplicate id | 1 | second `feature.identity_trust` removed |
| `sources` field | all | Removed from attributes, entity types and enums (Excel-only provenance) |
| Domains | 8 | Codes loaded for GenderDomain, YesNoDomain, AnnualMonthlyDomain, CivilStatusDomain, NewUsedDomain, PaymentPeriodicityDomain, CountryDomain (ISO 3166-1, 249), CurrencyDomain (ISO 4217, 178); 30 CBP-specific domains remain empty |
| Entity types | +3 / −1 | Added registration_document, address_proof_document, investment_transaction; removed cust_company |

## 2. Entity type attribute counts (v2)

| Entity type | Kind | Attributes |
|---|---|---|
| person | subject | 176 |
| company | subject | 156 |
| household | subject | 17 |
| government | subject | 17 |
| device | subject | 25 |
| browser_instance | subject | 20 |
| bank_account | asset | 34 |
| credit_facility | asset | 130 |
| investment_account | asset | 39 |
| insurance_policy | asset | 23 |
| pension_account | asset | 14 |
| identity_document | asset | 26 |
| employment_record | asset | 18 |
| tax_registration | asset | 32 |
| phone_profile | asset | 27 |
| consent | asset | 23 |
| bank_transaction | event | 23 |
| gst_filing | event | 31 |
| income_tax_filing | event | 18 |
| enquiry | event | 21 |
| dispute_record | event | 18 |
| adverse_record | event | 48 |
| crime_record | event | 8 |
| traffic_incident | event | 18 |
| observation | event | 10 |
| card_spend | feature | 20 |
| score | feature | 7 |
| all rows | system | 38 |
| registration_document | asset | 4 |
| address_proof_document | asset | 6 |
| investment_transaction | event | 4 |

## 3. Per-attribute change log

| Attribute id | Change |
|---|---|
| `relationships.department` | relationship qualifier normalised |
| `relationships.designation` | relationship qualifier normalised |
| `relationships.is_primary` | relationship qualifier normalised |
| `relationships.relationship_status` | relationship qualifier normalised |
| `relationships.relationship_type` | relationship qualifier normalised |
| `relationships.end_date` | relationship qualifier normalised |
| `relationships.start_date` | relationship qualifier normalised |
| `asset.account_subtype` | appliesTo: AA asset -> asset type |
| `asset.amc_name` | appliesTo: AA asset -> asset type |
| `asset.amfi_code` | appliesTo: AA asset -> asset type |
| `asset.balance_datetime` | appliesTo: AA asset -> asset type |
| `asset.closing_units` | appliesTo: AA asset -> asset type |
| `asset.company_name` | appliesTo: AA asset -> asset type |
| `asset.cost_value` | appliesTo: AA asset -> asset type |
| `asset.cover_name` | appliesTo: AA asset -> asset type |
| `asset.demat_id` | appliesTo: AA asset -> asset type |
| `asset.drawing_limit` | appliesTo: AA asset -> asset type |
| `asset.equity_category` | appliesTo: AA asset -> asset type |
| `asset.fatca_status` | appliesTo: AA asset -> asset type |
| `asset.isin_description` | appliesTo: AA asset -> asset type |
| `asset.issuer_name` | appliesTo: AA asset -> asset type |
| `asset.last_traded_price` | appliesTo: AA asset -> asset type |
| `asset.lien_units` | appliesTo: AA asset -> asset type |
| `asset.lockin_units` | appliesTo: AA asset -> asset type |
| `asset.masked_account_number` | appliesTo: AA asset -> asset type |
| `asset.nav` | appliesTo: AA asset -> asset type |
| `asset.nav_date` | appliesTo: AA asset -> asset type |
| `asset.next_premium_due_date` | appliesTo: AA asset -> asset type |
| `asset.policy_type` | appliesTo: AA asset -> asset type |
| `asset.premium_payment_years` | appliesTo: AA asset -> asset type |
| `asset.scheme_category` | appliesTo: AA asset -> asset type |
| `asset.scheme_code` | appliesTo: AA asset -> asset type |
| `asset.scheme_option` | appliesTo: AA asset -> asset type |
| `asset.scheme_type` | appliesTo: AA asset -> asset type |
| `asset.sum_insured` | appliesTo: AA asset -> asset type |
| `asset.tenure_months` | appliesTo: AA asset -> asset type |
| `asset.tenure_years` | appliesTo: AA asset -> asset type |
| `asset.ucc` | appliesTo: AA asset -> asset type |
| `asset.uin_number` | appliesTo: AA asset -> asset type |
| `assets.account_id` | appliesTo: cross-asset extension |
| `assets.address` | appliesTo: cross-asset extension |
| `assets.as_of_date` | appliesTo: cross-asset extension |
| `assets.credit_limit` | appliesTo: cross-asset extension |
| `assets.currency` | appliesTo: cross-asset extension |
| `assets.email` | appliesTo: cross-asset extension |
| `assets.holder_name` | appliesTo: cross-asset extension |
| `assets.nominee_name` | appliesTo: cross-asset extension |
| `assets.pan` | appliesTo: cross-asset extension |
| `assets.phone_number` | appliesTo: cross-asset extension |
| `assets.provider_id` | appliesTo: cross-asset extension |
| `assets.status` | appliesTo: cross-asset extension |
| `assets.tax_id` | appliesTo: cross-asset extension |
| `credit.account_status_cbs` | appliesTo: tradeline -> credit_facility |
| `credit.account_type_cbs` | appliesTo: tradeline -> credit_facility |
| `credit.amount_overdue` | appliesTo: tradeline -> credit_facility |
| `credit.asset_classification` | appliesTo: tradeline -> credit_facility |
| `credit.billed_amount` | appliesTo: tradeline -> credit_facility |
| `credit.board_resolution_flag` | appliesTo: tradeline -> credit_facility |
| `credit.card_reference_code` | appliesTo: tradeline -> credit_facility |
| `credit.card_used_flag` | appliesTo: tradeline -> credit_facility |
| `credit.charged_amount` | appliesTo: tradeline -> credit_facility |
| `credit.collateral_type` | appliesTo: tradeline -> credit_facility |
| `credit.collateral_value` | appliesTo: tradeline -> credit_facility |
| `credit.contract_end_actual_date` | appliesTo: tradeline -> credit_facility |
| `credit.contract_end_planned_date` | appliesTo: tradeline -> credit_facility |
| `credit.contract_phase` | appliesTo: tradeline -> credit_facility |
| `credit.contract_request_date` | appliesTo: tradeline -> credit_facility |
| `credit.contract_role` | appliesTo: tradeline -> credit_facility |
| `credit.contract_start_date` | appliesTo: tradeline -> credit_facility |
| `credit.contract_status` | appliesTo: tradeline -> credit_facility |
| `credit.credit_purpose` | appliesTo: tradeline -> credit_facility |
| `credit.current_balance` | appliesTo: tradeline -> credit_facility |
| `credit.date_closed` | appliesTo: tradeline -> credit_facility |
| `credit.date_of_last_payment` | appliesTo: tradeline -> credit_facility |
| `credit.date_opened` | appliesTo: tradeline -> credit_facility |
| `credit.date_reported` | appliesTo: tradeline -> credit_facility |
| `credit.days_past_due` | appliesTo: tradeline -> credit_facility |
| `credit.emi_amount` | appliesTo: tradeline -> credit_facility |
| `credit.event_code` | appliesTo: CSDF negative event -> adverse_record |
| `credit.event_date` | appliesTo: CSDF negative event -> adverse_record |
| `credit.event_detail` | appliesTo: CSDF negative event -> adverse_record |
| `credit.event_status` | appliesTo: CSDF negative event -> adverse_record |
| `credit.event_status_date` | appliesTo: CSDF negative event -> adverse_record |
| `credit.financed_amount` | appliesTo: tradeline -> credit_facility |
| `credit.first_payment_date` | appliesTo: tradeline -> credit_facility |
| `credit.good_brand` | appliesTo: tradeline -> credit_facility |
| `credit.good_registration_number` | appliesTo: tradeline -> credit_facility |
| `credit.good_type` | appliesTo: tradeline -> credit_facility |
| `credit.good_value` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_asset_appraised_value` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_asset_code` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_asset_description` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_asset_location` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_asset_registry_external_link` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_currency` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_customer_type` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_guarantee_type` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_guaranteed_amount` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_guarantor_name` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_provider_guarantee_no` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_provider_subject_no_guarantor` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_validity_end_date` | appliesTo: tradeline -> credit_facility |
| `credit.guarantee_validity_start_date` | appliesTo: tradeline -> credit_facility |
| `credit.holder_liability` | appliesTo: tradeline -> credit_facility |
| `credit.installment_type` | appliesTo: tradeline -> credit_facility |
| `credit.installments_number` | appliesTo: tradeline -> credit_facility |
| `credit.interest_rate` | appliesTo: tradeline -> credit_facility |
| `credit.last_charge_date` | appliesTo: tradeline -> credit_facility |
| `credit.last_payment_amount` | appliesTo: tradeline -> credit_facility |
| `credit.last_payment_date` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject1_name` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject1_provider_subject_no` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject1_role` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject2_name` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject2_provider_subject_no` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject2_role` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject3_name` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject3_provider_subject_no` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject3_role` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject4_name` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject4_provider_subject_no` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject4_role` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject5_name` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject5_provider_subject_no` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject5_role` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject6_name` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject6_provider_subject_no` | appliesTo: tradeline -> credit_facility |
| `credit.linked_subject6_role` | appliesTo: tradeline -> credit_facility |
| `credit.manufacturing_date` | appliesTo: tradeline -> credit_facility |
| `credit.member_id` | appliesTo: tradeline -> credit_facility |
| `credit.member_name` | appliesTo: tradeline -> credit_facility |
| `credit.min_payment_indicator` | appliesTo: tradeline -> credit_facility |
| `credit.min_payment_percentage` | appliesTo: tradeline -> credit_facility |
| `credit.monthly_payment_amount` | appliesTo: tradeline -> credit_facility |
| `credit.new_used_code` | appliesTo: tradeline -> credit_facility |
| `credit.next_payment_amount` | appliesTo: tradeline -> credit_facility |
| `credit.next_payment_date` | appliesTo: tradeline -> credit_facility |
| `credit.next_payment_minimum_payment_due` | appliesTo: tradeline -> credit_facility |
| `credit.original_currency` | appliesTo: tradeline -> credit_facility |
| `credit.outstanding_balance_unbilled` | appliesTo: tradeline -> credit_facility |
| `credit.outstanding_payments_number` | appliesTo: tradeline -> credit_facility |
| `credit.overall_credit_limit` | appliesTo: tradeline -> credit_facility |
| `credit.overdue_days` | appliesTo: tradeline -> credit_facility |
| `credit.overdue_payments_amount` | appliesTo: tradeline -> credit_facility |
| `credit.overdue_payments_number` | appliesTo: tradeline -> credit_facility |
| `credit.ownership_indicator` | appliesTo: tradeline -> credit_facility |
| `credit.payment_history_string` | appliesTo: tradeline -> credit_facility |
| `credit.payment_method` | appliesTo: tradeline -> credit_facility |
| `credit.payment_periodicity` | appliesTo: tradeline -> credit_facility |
| `credit.premium_card` | appliesTo: tradeline -> credit_facility |
| `credit.provider_contract_no` | appliesTo: tradeline -> credit_facility |
| `credit.reorganized_credit_code` | appliesTo: tradeline -> credit_facility |
| `credit.repayment_tenure_months` | appliesTo: tradeline -> credit_facility |
| `credit.sanctioned_amount` | appliesTo: tradeline -> credit_facility |
| `credit.services_lines_number` | appliesTo: tradeline -> credit_facility |
| `credit.settlement_amount` | appliesTo: tradeline -> credit_facility |
| `credit.suit_filed_status` | appliesTo: tradeline -> credit_facility |
| `credit.times_card_used` | appliesTo: tradeline -> credit_facility |
| `credit.transaction_subtype` | appliesTo: tradeline -> credit_facility |
| `credit.write_off_amount` | appliesTo: tradeline -> credit_facility |
| `document.account_ref` | appliesTo: document -> document asset types |
| `document.constituency` | appliesTo: document -> document asset types |
| `document.endorsements` | appliesTo: document -> document asset types |
| `document.epic_no` | appliesTo: document -> document asset types |
| `document.licence_no` | appliesTo: document -> document asset types |
| `document.mrz` | appliesTo: document -> document asset types |
| `document.national_id_no` | appliesTo: document -> document asset types |
| `document.permitted_activities` | appliesTo: document -> document asset types |
| `document.place_of_issue` | appliesTo: document -> document asset types |
| `document.provider_name` | appliesTo: document -> document asset types |
| `document.relation_name` | appliesTo: document -> document asset types |
| `document.statement_period` | appliesTo: document -> document asset types |
| `document.valid_from` | appliesTo: document -> document asset types |
| `document.valid_to` | appliesTo: document -> document asset types |
| `document.vehicle_classes` | appliesTo: document -> document asset types |
| `enquiry.enquiry_amount` | appliesTo: -> enquiry |
| `enquiry.enquiry_member_id` | appliesTo: -> enquiry |
| `enquiry.enquiry_purpose` | appliesTo: -> enquiry |
| `event.deduction_80c` | appliesTo: event re-pointed |
| `event.deduction_80d` | appliesTo: event re-pointed |
| `event.order_id` | appliesTo: event re-pointed |
| `event.salary_section_17_1` | appliesTo: event re-pointed |
| `event.trade_rate` | appliesTo: event re-pointed |
| `event.transaction_id` | appliesTo: event re-pointed |
| `events.consent_id` | appliesTo: cross-event extension |
| `events.provider_id` | appliesTo: cross-event extension |
| `events.status` | appliesTo: cross-event extension |
| `identity.id_number` | group: CSDF (subject) regrouped |
| `identity.id_type` | group: CSDF (subject) regrouped |
| `identity.provider_subject_no` | group: CSDF (subject) regrouped |
| `subject.employment_annual_monthly_indicator` | group: CSDF (subject) regrouped |
| `subject.employment_currency` | group: CSDF (subject) regrouped |
| `subject.employment_datehiredfrom` | group: CSDF (subject) regrouped |
| `subject.employment_datehiredto` | group: CSDF (subject) regrouped |
| `subject.employment_occupation` | group: CSDF (subject) regrouped |
| `subject.employment_occupationstatus` | group: CSDF (subject) regrouped |
| `subject.employment_phone_number` | group: CSDF (subject) regrouped |
| `subject.employment_psic` | group: CSDF (subject) regrouped |
| `subject.employment_tin` | group: CSDF (subject) regrouped |
| `subject.id_1_expirydate` | group: CSDF (subject) regrouped |
| `subject.id_1_issuecountry` | group: CSDF (subject) regrouped |
| `subject.id_1_issued_by` | group: CSDF (subject) regrouped |
| `subject.id_1_issuedate` | group: CSDF (subject) regrouped |
| `subject.id_2_expirydate` | group: CSDF (subject) regrouped |
| `subject.id_2_issuecountry` | group: CSDF (subject) regrouped |
| `subject.id_2_issued_by` | group: CSDF (subject) regrouped |
| `subject.id_2_issuedate` | group: CSDF (subject) regrouped |
| `subject.id_3_expirydate` | group: CSDF (subject) regrouped |
| `subject.id_3_issuecountry` | group: CSDF (subject) regrouped |
| `subject.id_3_issued_by` | group: CSDF (subject) regrouped |
| `subject.id_3_issuedate` | group: CSDF (subject) regrouped |
| `subject.legal_constitution` | group: CSDF (subject) regrouped |
| `subject.office_location_type` | group: CSDF (subject) regrouped |
| `subject.sole_trader_1_country` | group: CSDF (subject) regrouped |
| `subject.sole_trader_1_identification_number` | group: CSDF (subject) regrouped |
| `subject.sole_trader_1_identification_type` | group: CSDF (subject) regrouped |
| `subject.sole_trader_2_country` | group: CSDF (subject) regrouped |
| `subject.sole_trader_2_identification_number` | group: CSDF (subject) regrouped |
| `subject.sole_trader_2_identification_type` | group: CSDF (subject) regrouped |
| `credit.account_status_cbs` | supersededBy linked |
| `credit.account_type_cbs` | supersededBy linked |
| `credit.amount_overdue` | supersededBy linked |
| `credit.current_balance` | supersededBy linked |
| `credit.date_closed` | supersededBy linked |
| `credit.date_of_last_payment` | supersededBy linked |
| `credit.date_opened` | supersededBy linked |
| `credit.days_past_due` | supersededBy linked |
| `credit.emi_amount` | supersededBy linked |
| `credit.repayment_tenure_months` | supersededBy linked |
| `credit.sanctioned_amount` | supersededBy linked |
| `asset.demat_id` | governance: legalBasisRequired set |
| `asset.ucc` | governance: legalBasisRequired set |
| `asset.uin_number` | governance: legalBasisRequired set |
| `docsubj.licence_no` | governance: legalBasisRequired set |
| `docsubj.national_id_no` | governance: legalBasisRequired set |
| `document.licence_no` | governance: legalBasisRequired set |
| `document.licence_no` | governance: tokenize set |
| `document.mrz` | governance: legalBasisRequired set |
| `document.mrz` | governance: tokenize set |
| `document.national_id_no` | governance: legalBasisRequired set |
| `document.national_id_no` | governance: tokenize set |
| `subject.aadhaar_vid` | governance: legalBasisRequired set |
| `subject.dob` | governance: legalBasisRequired set |
| `subject.imei` | governance: legalBasisRequired set |
| `subject.national_id` | governance: legalBasisRequired set |
| `subject.pan` | governance: legalBasisRequired set |
| `subject.passport_no` | governance: legalBasisRequired set |
| `subject.ssn` | governance: legalBasisRequired set |
| `subject.voter_age` | sensitivity corrected |

Approvals (171), group assignments (293) and definition clean-ups (299) are not listed individually; filter the v2 JSON on `version == 2` for the approved set.