# Property Bureau — Member Data Submission

## Single source of truth

**[Property_Bureau_Member_Data_Submission_Standard_V1.0.xlsx](./Property_Bureau_Member_Data_Submission_Standard_V1.0.xlsx)**

Official consolidated workbook for member institution onboarding and periodic collateral data submission. Contains all six required sheets:

| # | Sheet | Content |
|---|--------|---------|
| 1 | Field Specification | Master data dictionary (107 fields) with source lineage |
| 2 | Enum Master | All enums + property type crosswalk + record types |
| 3 | Validation Rules | File- and field-level rules with error messages |
| 4 | Mandatory vs Optional Matrix | Mandatory, conditional, and optional flags |
| 5 | Member Submission Template | V1 single-file CSV layout for Banks / HFCs / NBFCs |
| 6 | Sample Submission Data | ABC HFC realistic sample (75 properties, all permutations) |

## Regenerate workbook

```bash
python docs/property-bureau/build_master_workbook.py
```

Requires `openpyxl`. Merges specification CSVs and ABC HFC sample data automatically.

## Superseded artifacts

The following folders contain **source/generator files only** — do not distribute CSVs to members; use the Excel workbook above:

- `member-data-submission-standard/` — spec generators and build inputs
- `ABC HFC Sample data/` — sample generator and build inputs
