# Property Bureau — Member Data Submission

## Single source of truth (V1.1)

**[Property_Bureau_Member_Data_Submission_Standard_V1.1.xlsx](./Property_Bureau_Member_Data_Submission_Standard_V1.1.xlsx)**

Optimized per *Property_Bureau_Submission_Standard_Critical_Evaluation.docx* (June 2026). Supersedes V1.0 workbook and all distributed CSV artifacts.

| Sheet | Purpose |
|-------|---------|
| Standard Overview | Version, completeness audit, change log, removed fields |
| Field Specification | 94 fields (incl. optional enrichment) — mandatory, conditional, derived, source lineage |
| Enum Master | Consolidated enums incl. ENTITY_TYPE, MUNICIPAL_ID_TYPE |
| Validation Rules | Deduplicated rules with severity (ERROR/WARNING/INFO) |
| Member Submission Template | **Option B:** dense `PROPERTY_BUREAU_SUBMISSION.csv` + supplements |
| Sample Submission Data | ABC HFC 75-row dense sample (from `ABC HFC Sample data/data-submission/`) |
| Feedback Traceability | 44 feedback items mapped to actions |

## Regenerate

```bash
cd docs/property-bureau
python build_master_workbook.py
```

Requires `openpyxl`.

## V1.1 highlights

- **~12% fewer core fields** than V1.0 (107 → 94 incl. enrichment); **28 fields retired**
- **Dense single-file CSV (Option B)** — one row per loan; multi-file is alternate
- **21 fields removed** (derivable, constant, or redundant) — bureau computes at ingestion
- **Borrower address** simplified (5 fields + same-as-property flag)
- **Matching** uses score model (≥60) vs binary 3-CRITICAL rule

## Build inputs (not for distribution)

- `v1_1_spec.py` — canonical V1.1 field/enum/validation definitions
- `member-data-submission-standard/` — V1.0 CSV sources (see SUPERSEDED.md)
- `ABC HFC Sample data/` — sample generator (see SUPERSEDED.md)

## Superseded

- `Property_Bureau_Member_Data_Submission_Standard_V1.0.xlsx` — retain for audit only
