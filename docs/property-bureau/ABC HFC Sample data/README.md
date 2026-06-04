# ABC HFC — Property Bureau Sample Submission (Q1 2026)

Synthetic **member data submission** package for **ABC Housing Finance Company Limited** (`MEMBER_INSTITUTION_CODE`: `HFC0000042`).  
Complies with [Member Data Submission Standard V1.0](../member-data-submission-standard/README.md).

> **Disclaimer:** All names, PANs, mobiles, emails, and addresses are fictional test data. Do not use for production or credit decisions.

## Package contents

| File | Records | Description |
|------|---------|-------------|
| `00_SUBMISSION_MANIFEST.csv` | 10 | File inventory and row counts |
| `01_FILE_HEADER.csv` | 1 | Batch metadata (`SUBMISSION_TYPE=FULL`) |
| `02_PROPERTY_MASTER.csv` | **75** | Collateral across 40+ Indian cities |
| `03_OWNERSHIP.csv` | 85 | Primary + co-owners (30% co-ownership on ~11 properties) |
| `04_BORROWER.csv` | 75 | Individuals and non-individual borrowers |
| `05_CO_BORROWER.csv` | 15 | Spouse / family / business partner |
| `06_LOAN_ACCOUNT.csv` | 75 | ACTIVE, CLOSED, SETTLED, RESTRUCTURED, WRITTEN_OFF |
| `07_MORTGAGE_CHARGE.csv` | 79 | FIRST_CHARGE, REGISTERED_MORTGAGE, PARI_PASSU, etc. |
| `08_VALUATION.csv` | 75 | Market / fair / distress valuations |
| `09_DOCUMENT_STATUS.csv` | 75 | Document custody attestation |
| `ABC_HFC_PROPERTY_SUBMISSION_2026Q1_FULL.csv` | 416 | **Combined** multi-record file (all types) |

## Coverage highlights

- **Geography:** 40 location profiles — MH, KA, TN, TS, DL, HR, UP, WB, GJ, RJ, MP, KL, PB, BR, JH, OD, AS, UK, GA, AP, CH
- **Property types:** RESIDENTIAL, COMMERCIAL, INDUSTRIAL, AGRICULTURAL, MIXED_USE
- **Subtypes:** APARTMENT, VILLA, ROW_HOUSE, PLOT, OFFICE, SHOP, WAREHOUSE, FACTORY, LAND
- **Matching keys:** CTS (Maharashtra), Khata (Karnataka), survey numbers (rural/agri), municipal PID, registration numbers
- **Borrower types:** INDIVIDUAL, PRIVATE_LIMITED, LLP, PARTNERSHIP
- **Area units:** SQFT, SQM, ACRE, GUNTHA, BIGHA

## Link keys

| Key | Example |
|-----|---------|
| `SUBMISSION_REFERENCE` | `ABC-HFC-PROP-2026-Q1-001` |
| `MEMBER_PROPERTY_REFERENCE` | `ABC-COL-0001` … `ABC-COL-0075` |
| `MEMBER_LOAN_ACCOUNT_NUMBER` | `ABC-HL-0001` … `ABC-HL-0075` |

## Regeneration

```bash
python "docs/property-bureau/ABC HFC Sample data/generate_sample_submission.py"
```

## Submission reference

- **Reporting period end:** 2026-03-31  
- **Submission date:** 2026-04-15  
- **Contact:** collateral.data@abchfc.example.in
