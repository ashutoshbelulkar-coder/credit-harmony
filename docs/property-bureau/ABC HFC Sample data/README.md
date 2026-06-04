# ABC HFC — V1.1 Sample Submission Package

Synthetic sample for **ABC Housing Finance Company Limited** (`HFC0000042`).  
Aligned with **Property Bureau Member Data Submission Standard V1.1** (Option B — dense single file).

> All data is fictional. Do not use for credit decisions.

## Primary package (`data-submission/`)

| File | Rows | Description |
|------|------|-------------|
| **`PROPERTY_BUREAU_SUBMISSION.csv`** | **75** | **Primary file** — one row per loan account; all V1.1 fields on each row |
| `OWNERSHIP_SUPPLEMENT.csv` | ~11 | Extra co-owners (when ownership ≠ 100% single owner) |
| `CO_BORROWER_SUPPLEMENT.csv` | ~7 | Additional co-borrowers beyond first inline row |
| `00_SUBMISSION_MANIFEST.csv` | 3 | Package inventory |

### Coverage

- 20+ cities across India (MH, KA, TN, TS, DL, HR, UP, WB, GJ, RJ, MP, KL, …)
- Property types: RESIDENTIAL, COMMERCIAL, INDUSTRIAL, AGRICULTURAL, MIXED_USE
- Account statuses: ACTIVE, CLOSED, SETTLED, RESTRUCTURED, WRITTEN_OFF
- V1.1 fields: `BUILDING_UNIT_IDENTIFIER`, `MUNICIPAL_AUTHORITY_ID`, `TITLE_DOCUMENT_NUMBER`, `BORROWER_ADDRESS_SAME_AS_PROPERTY`, etc.

## Regenerate

```bash
cd "docs/property-bureau/ABC HFC Sample data"
python generate_sample_submission.py
```

Then refresh the master workbook:

```bash
cd docs/property-bureau
python build_master_workbook.py
```

## Legacy files (parent folder)

Older multi-file CSVs (`01_FILE_HEADER.csv` … `ABC_HFC_PROPERTY_SUBMISSION_2026Q1_FULL.csv`) are **V1.0 format** — retained for reference only. Use **`data-submission/`** for V1.1.

## Official standard

[Property_Bureau_Member_Data_Submission_Standard_V1.1.xlsx](../Property_Bureau_Member_Data_Submission_Standard_V1.1.xlsx)
