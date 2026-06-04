# Property Bureau — Member Data Submission Standard (V1.0)

**Status:** Draft for member institution distribution  
**Scope:** Member-origin property and mortgage collateral data only  
**Excluded:** Bureau-generated IDs, risk scores, matching outputs, CERSAI fields, APIs, UI, reports

## Package contents (Excel-ready)

| File | Purpose |
|------|---------|
| `01_complete_data_dictionary.csv` | Full data dictionary (all columns) |
| `02_field_specification.csv` | Official field specification table (same content; primary sharing artifact) |
| `03_enum_master.csv` | All enumerated value sets |
| `03b_enum_property_subtype_crosswalk.csv` | Valid PROPERTY_TYPE ↔ PROPERTY_SUBTYPE pairs |
| `04_validation_rules.csv` | File- and record-level validation rules |
| `05_mandatory_optional_matrix.csv` | Mandatory vs optional quick reference |
| `06_recommended_v1_submission_template.csv` | V1 logical record layout |
| `06b_v1_flat_file_column_order.csv` | Recommended column order for flat CSV submission |
| `07_property_matching_fields_priority.csv` | Matching-focused fields sorted by importance |
| `08_sample_record_values.csv` | Sample values for all fields (single reference row) |

Open any `.csv` in Microsoft Excel or Google Sheets (UTF-8 with BOM).

## V1 submission model

Members submit a **comma-separated UTF-8 file** with:

1. **FILE_HEADER** — one row (batch metadata)
2. **PROPERTY** — one row per collateral
3. **OWNERSHIP** — one or more rows per property (owners)
4. **BORROWER** + **LOAN_ACCOUNT** + **MORTGAGE_CHARGE** — loan linkage
5. **VALUATION** / **DOCUMENT_STATUS** — optional but recommended

Link keys (member-controlled only):

- `MEMBER_INSTITUTION_CODE` — bureau onboarding code
- `MEMBER_PROPERTY_REFERENCE` — stable property key
- `MEMBER_LOAN_ACCOUNT_NUMBER` — stable loan key
- `SUBMISSION_REFERENCE` — batch idempotency key

## Matching importance

Fields marked **CRITICAL** or **HIGH** in `MATCHING_IMPORTANCE` support cross-institution property resolution. Rule **VR-020** requires at least three **CRITICAL** identifiers per property record.

## Regeneration

```bash
python docs/property-bureau/member-data-submission-standard/generate_spec.py
```

## Version history

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-06-04 | Initial member submission standard |
