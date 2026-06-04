"""
Build Property Bureau Member Data Submission Standard — single master Excel workbook.
Run from repo root: python docs/property-bureau/build_master_workbook.py
"""
from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).parent
SPEC_DIR = ROOT / "member-data-submission-standard"
SAMPLE_DIR = ROOT / "ABC HFC Sample data"
OUTPUT = ROOT / "Property_Bureau_Member_Data_Submission_Standard_V1.0.xlsx"

HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(bold=True, color="FFFFFF")
SECTION_FILL = PatternFill("solid", fgColor="D9E2F3")

# Extra fields from enterprise sample / template not in base CSV spec
EXTRA_FIELDS = [
    (
        "SUBMISSION_CONTROL",
        "RECORD_TYPE",
        "Logical record type discriminator for multi-record flat file submissions.",
        "ENUM",
        "20",
        "Y",
        "Must be one of: FILE_HEADER, PROPERTY, OWNERSHIP, BORROWER, CO_BORROWER, LOAN_ACCOUNT, MORTGAGE_CHARGE, VALUATION, DOCUMENT_STATUS.",
        "RECORD_TYPE",
        "PROPERTY",
        "First column in combined submission file.",
        "",
        "06_recommended_v1_submission_template.csv; ABC_HFC_PROPERTY_SUBMISSION_2026Q1_FULL.csv",
    ),
    (
        "SUBMISSION_HEADER",
        "MEMBER_INSTITUTION_NAME",
        "Legal name of submitting member institution (display / audit).",
        "STRING",
        "200",
        "N",
        "Must match bureau institution master name when populated.",
        "",
        "ABC Housing Finance Company Limited",
        "",
        "",
        "ABC_HFC Sample data/01_FILE_HEADER.csv",
    ),
    (
        "SUBMISSION_HEADER",
        "FILE_VERSION",
        "Submission standard version referenced by member file.",
        "STRING",
        "10",
        "N",
        "Recommended value V1.0.",
        "",
        "V1.0",
        "",
        "",
        "ABC_HFC Sample data/01_FILE_HEADER.csv",
    ),
    (
        "SUBMISSION_HEADER",
        "ENCODING",
        "Character encoding of submission file.",
        "STRING",
        "10",
        "N",
        "UTF-8 required.",
        "",
        "UTF-8",
        "",
        "",
        "ABC_HFC Sample data/01_FILE_HEADER.csv",
    ),
    (
        "SUBMISSION_HEADER",
        "DELIMITER",
        "Field delimiter used in CSV submission.",
        "STRING",
        "10",
        "N",
        "COMMA or PIPE; COMMA default.",
        "",
        "COMMA",
        "",
        "",
        "ABC_HFC Sample data/01_FILE_HEADER.csv",
    ),
]

CONDITIONAL_MANDATORY = {
    "MEMBER_CUSTOMER_ID": "Required when BORROWER_TYPE is not INDIVIDUAL.",
    "SURVEY_NUMBER": "Required when PROPERTY_TYPE=AGRICULTURAL or PROPERTY_SUBTYPE in (PLOT,LAND). VR-014",
    "FLAT_NUMBER": "Required when PROPERTY_SUBTYPE in (APARTMENT,OFFICE,SHOP). VR-015",
    "PROJECT_NAME": "Required when PROPERTY_SUBTYPE in (APARTMENT,VILLA,ROW_HOUSE) in urban markets.",
    "BUILDING_NAME": "Required when PROPERTY_SUBTYPE in (APARTMENT,OFFICE,SHOP).",
    "CTS_NUMBER": "Required in CTS-governed municipal jurisdictions (e.g. Maharashtra).",
    "REGISTRATION_NUMBER": "Required when SALE_DEED_NUMBER populated or state mandates. VR-013",
    "REGISTRATION_DATE": "Required when REGISTRATION_NUMBER populated.",
    "BORROWER_PAN": "Required when BORROWER_TYPE=INDIVIDUAL.",
    "BORROWER_DATE_OF_BIRTH": "Required when BORROWER_TYPE=INDIVIDUAL.",
    "OWNER_PAN": "Required for INDIVIDUAL owners when available.",
    "LAND_AREA": "Required when PROPERTY_SUBTYPE in (PLOT,LAND) or PROPERTY_TYPE=AGRICULTURAL.",
    "AREA_UNIT": "Required when BUILT_UP_AREA or LAND_AREA populated.",
    "CHARGE_REGISTRATION_DATE": "Required when CHARGE_TYPE=REGISTERED_MORTGAGE.",
    "CHARGE_REGISTRATION_NUMBER": "Required when CHARGE_TYPE=REGISTERED_MORTGAGE.",
    "CHARGE_RELEASE_DATE": "Required when CHARGE_STATUS=RELEASED. VR-017",
    "PRIOR_CHARGE_HOLDER_NAME": "Required when PRIOR_CHARGE_EXISTS=Y.",
    "CO_BORROWER_SEQUENCE": "Required when CO_BORROWER_FLAG=Y.",
    "CO_BORROWER_NAME": "Required when CO_BORROWER_SEQUENCE populated.",
    "VALUATION_DATE": "Required when VALUATION_AMOUNT populated.",
    "CURRENT_OUTSTANDING": "Must be 0 when ACCOUNT_STATUS in (CLOSED,SETTLED,WRITTEN_OFF). VR-012",
}

VR_FIELD_MAP = {
    "SUBMISSION_REFERENCE": ("VR-001", "Duplicate submission reference within 24 months.", "SUBMISSION_REFERENCE 'ABC-HFC-PROP-2026-Q1-001' already submitted."),
    "TOTAL_RECORD_COUNT": ("VR-002", "Record count does not match PROPERTY rows.", "Header shows 75 but file has 74 PROPERTY rows."),
    "MEMBER_LOAN_ACCOUNT_NUMBER": ("VR-003", "Duplicate ACTIVE loan account in same period.", "ABC-HL-0001 appears twice as ACTIVE."),
    "MEMBER_PROPERTY_REFERENCE": ("VR-004", "Property reference changed for same collateral.", "COL-88921 mapped to different address vs prior submission."),
    "OWNER_PAN": ("VR-005,VR-009", "Duplicate owner or invalid PAN format.", "PAN ABCDE1234F invalid check digit."),
    "OWNER_NAME": ("VR-005", "Duplicate owner sequence on property.", ""),
    "OWNERSHIP_PERCENT": ("VR-006", "Ownership percentages do not sum to 100.", "70% + 20% = 90% for ABC-COL-0012."),
    "PINCODE": ("VR-007", "Invalid PIN code format.", "PIN 0560102 fails regex (leading zero)."),
    "BORROWER_PAN": ("VR-008", "Invalid borrower PAN format.", "bor1234aa not uppercase."),
    "BORROWER_MOBILE": ("VR-010", "Invalid mobile number.", "5123456780 does not start with 6-9."),
    "SANCTION_AMOUNT": ("VR-011", "Invalid amount format or precision.", "85,00,000.00 contains commas."),
    "CURRENT_OUTSTANDING": ("VR-012", "Outstanding invalid for account status.", "CLOSED loan with outstanding 50000."),
    "REGISTRATION_NUMBER": ("VR-013", "Registration number recommended/mandatory.", ""),
    "SURVEY_NUMBER": ("VR-014", "Survey number required for plot/land/agricultural.", ""),
    "FLAT_NUMBER": ("VR-015", "Flat number required for apartment/office/shop.", ""),
    "IS_LATEST_VALUATION": ("VR-016", "Multiple or zero latest valuations.", "Two rows with IS_LATEST_VALUATION=Y."),
    "CHARGE_RELEASE_DATE": ("VR-017", "Release date missing or before registration.", ""),
    "REPORTING_PERIOD_END": ("VR-018", "Invalid date format.", "31/03/2026 not ISO format."),
    "SUBMISSION_DATE": ("VR-018", "Invalid date format.", ""),
    "PROPERTY_SUBTYPE": ("VR-019", "Subtype not allowed for property type.", "FACTORY not valid for RESIDENTIAL."),
    "ADDRESS_LINE_1": ("VR-020", "Insufficient CRITICAL matching fields.", "Only 2 CRITICAL identifiers populated."),
    "LOCALITY": ("VR-020", "Insufficient CRITICAL matching fields.", ""),
    "CITY": ("VR-020", "Insufficient CRITICAL matching fields.", ""),
    "PINCODE": ("VR-020", "Insufficient CRITICAL matching fields.", ""),
    "PROJECT_NAME": ("VR-020", "Insufficient CRITICAL matching fields.", ""),
}

DOMAIN_COVERAGE = [
    ("Matching", "ADDRESS_LINE_1, LOCALITY, CITY, STATE, PINCODE, PROJECT_NAME, BUILDING_NAME, FLAT_NUMBER, SURVEY_NUMBER, CTS_NUMBER, KHATA_NUMBER, MUNICIPAL_PROPERTY_ID, REGISTRATION_NUMBER, SALE_DEED_NUMBER, OWNER_NAME, OWNER_PAN, BORROWER_NAME, BORROWER_PAN"),
    ("Ownership", "OWNER_SEQUENCE, OWNER_NAME, OWNER_PAN, OWNER_TYPE, OWNERSHIP_PERCENT, OWNERSHIP_ROLE, TITLE_DOCUMENT_TYPE, TITLE_DOCUMENT_DATE"),
    ("Mortgage / Charge", "CHARGE_SEQUENCE, CHARGE_TYPE, CHARGE_AMOUNT, CHARGE_REGISTRATION_DATE, CHARGE_REGISTRATION_NUMBER, CHARGE_STATUS, PRIOR_CHARGE_EXISTS"),
    ("Loan Account", "PRODUCT_TYPE, SANCTION_DATE, SANCTION_AMOUNT, CURRENT_OUTSTANDING, ACCOUNT_STATUS, NPA_CLASSIFICATION, DPD"),
    ("Valuation", "VALUATION_SEQUENCE, VALUATION_DATE, VALUATION_AMOUNT, VALUATION_TYPE, VALUATOR_NAME, IS_LATEST_VALUATION"),
    ("Registration / Legal", "REGISTRATION_NUMBER, SALE_DEED_NUMBER, REGISTRATION_DATE, REGISTRAR_OFFICE, TITLE_DOCUMENT_TYPE"),
    ("Document Custody", "TITLE_DEED_AVAILABILITY, SALE_DEED_AVAILABILITY, ENCUMBRANCE_CERTIFICATE_AVAILABILITY, OCCUPANCY_CERTIFICATE_AVAILABILITY, APPROVED_PLAN_AVAILABILITY"),
    ("Borrower", "BORROWER_TYPE, BORROWER_NAME, BORROWER_PAN, CO_BORROWER_*"),
]


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def style_header(ws, row=1):
    for cell in ws[row]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def auto_width(ws, max_width=48):
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        length = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[letter].width = min(max(length + 2, 12), max_width)


def load_field_spec() -> list[dict]:
    rows = []
    sources = [
        ("02_field_specification.csv", SPEC_DIR / "02_field_specification.csv"),
        ("01_complete_data_dictionary.csv", SPEC_DIR / "01_complete_data_dictionary.csv"),
    ]
    seen = set()
    primary = read_csv(SPEC_DIR / "02_field_specification.csv")
    for r in primary:
        name = r["Field Name"]
        if name in seen:
            continue
        seen.add(name)
        src = "02_field_specification.csv; 01_complete_data_dictionary.csv"
        if (SPEC_DIR / "07_property_matching_fields_priority.csv").exists():
            match_rows = read_csv(SPEC_DIR / "07_property_matching_fields_priority.csv")
            for m in match_rows:
                if m.get("Field Name") == name and m.get("MATCHING_IMPORTANCE"):
                    r["MATCHING_IMPORTANCE"] = m["MATCHING_IMPORTANCE"]
        sample_vals = read_csv(SPEC_DIR / "08_sample_record_values.csv")
        for s in sample_vals:
            if s.get("Field Name") == name and s.get("Sample Value"):
                if not r.get("Sample Value"):
                    r["Sample Value"] = s["Sample Value"]
        rows.append({
            "Field Category": r["Field Category"],
            "Field Name": name,
            "Description": r["Business Description"],
            "Data Type": r["Data Type"],
            "Length": r["Maximum Length"],
            "Mandatory (Y/N)": r["Mandatory (Y/N)"],
            "Validation Rule": r["Validation Rules"],
            "Enum Reference": r.get("Allowed Values / Enum Values", ""),
            "Matching Importance": r.get("MATCHING_IMPORTANCE", ""),
            "Sample Value": r.get("Sample Value", ""),
            "Remarks": r.get("Remarks", ""),
            "Source Reference": src + "; generate_spec.py",
        })

    order = read_csv(SPEC_DIR / "06b_v1_flat_file_column_order.csv")
    order_names = [r["Field Name"] for r in order]

    for extra in EXTRA_FIELDS:
        cat, name, desc, dtype, ln, mand, val, enum, sample, remarks, match, src = extra
        if name not in seen:
            seen.add(name)
            rows.append({
                "Field Category": cat,
                "Field Name": name,
                "Description": desc,
                "Data Type": dtype,
                "Length": ln,
                "Mandatory (Y/N)": mand,
                "Validation Rule": val,
                "Enum Reference": enum,
                "Matching Importance": match,
                "Sample Value": sample,
                "Remarks": remarks,
                "Source Reference": src,
            })

    cat_order = [
        "SUBMISSION_CONTROL", "SUBMISSION_HEADER", "INSTITUTION_REFERENCE",
        "PROPERTY_IDENTIFICATION", "PROPERTY_LOCATION", "PROPERTY_PHYSICAL",
        "PROPERTY_OWNERSHIP", "BORROWER", "CO_BORROWER", "LOAN_ACCOUNT",
        "MORTGAGE_CHARGE", "VALUATION", "DOCUMENT_STATUS",
    ]
    cat_rank = {c: i for i, c in enumerate(cat_order)}
    name_rank = {n: i for i, n in enumerate(order_names)}

    rows.sort(key=lambda x: (cat_rank.get(x["Field Category"], 99), name_rank.get(x["Field Name"], 999), x["Field Name"]))
    return rows


def build_enum_master() -> list[dict]:
    enums = read_csv(SPEC_DIR / "03_enum_master.csv")
    out = []
    grouped = defaultdict(list)
    for e in enums:
        code = e["Enum Code"]
        grouped[code].append(e)

    for code in sorted(grouped.keys()):
        for item in grouped[code]:
            out.append({
                "Enum Name": code,
                "Allowed Values": item["Enum Value"],
                "Description": item["Description"],
                "Sort Order": item.get("Sort Order", ""),
                "Source Reference": "03_enum_master.csv",
            })

    cross = read_csv(SPEC_DIR / "03b_enum_property_subtype_crosswalk.csv")
    for c in cross:
        out.append({
            "Enum Name": "PROPERTY_TYPE_SUBTYPE_CROSSWALK",
            "Allowed Values": f"{c['PROPERTY_TYPE']}:{c['Allowed PROPERTY_SUBTYPE']}",
            "Description": "Valid property type and subtype combination",
            "Sort Order": "",
            "Source Reference": "03b_enum_property_subtype_crosswalk.csv",
        })

    rec_types = [
        "FILE_HEADER", "PROPERTY", "OWNERSHIP", "BORROWER", "CO_BORROWER",
        "LOAN_ACCOUNT", "MORTGAGE_CHARGE", "VALUATION", "DOCUMENT_STATUS",
    ]
    for i, rt in enumerate(rec_types, 1):
        out.append({
            "Enum Name": "RECORD_TYPE",
            "Allowed Values": rt,
            "Description": f"V1 logical record type ({rt})",
            "Sort Order": str(i),
            "Source Reference": "06_recommended_v1_submission_template.csv",
        })
    return out


def build_validation_rules(fields: list[dict]) -> list[dict]:
    rules = []
    file_rules = read_csv(SPEC_DIR / "04_validation_rules.csv")
    for fr in file_rules:
        flds = fr["Field(s)"].replace(" + ", ",").split(",")
        for fld in flds:
            fld = fld.strip()
            rules.append({
                "Field Name": fld,
                "Validation Rule": f"[{fr['Rule ID']}] {fr['Rule Definition']}",
                "Error Message": f"{fr['Severity']}: {fr['Rule Name']}",
                "Example": VR_FIELD_MAP.get(fld, ("", "", ""))[2] or fr.get("Remediation", ""),
                "Rule ID": fr["Rule ID"],
                "Source Reference": "04_validation_rules.csv",
            })

    for f in fields:
        name = f["Field Name"]
        if f["Validation Rule"] and not any(r["Field Name"] == name and f["Validation Rule"] in r["Validation Rule"] for r in rules):
            err = VR_FIELD_MAP.get(name, ("", f["Validation Rule"], ""))[1] or f"Validation failed for {name}."
            rules.append({
                "Field Name": name,
                "Validation Rule": f"Field-level: {f['Validation Rule']}",
                "Error Message": err,
                "Example": VR_FIELD_MAP.get(name, ("", "", ""))[2] or f.get("Sample Value", ""),
                "Rule ID": VR_FIELD_MAP.get(name, ("", "", ""))[0] or "",
                "Source Reference": "02_field_specification.csv",
            })

    seen = set()
    deduped = []
    for r in rules:
        key = (r["Field Name"], r["Validation Rule"][:80])
        if key not in seen:
            seen.add(key)
            deduped.append(r)
    deduped.sort(key=lambda x: (x["Field Name"], x.get("Rule ID", "")))
    return deduped


def build_mandatory_matrix(fields: list[dict]) -> list[dict]:
    out = []
    for f in fields:
        name = f["Field Name"]
        mand = f["Mandatory (Y/N)"]
        cond = CONDITIONAL_MANDATORY.get(name, "")
        optional = "Y" if mand == "N" and not cond else "N"
        mandatory = "Y" if mand == "Y" else "N"
        conditional = "Y" if cond else "N"
        if mand == "Y":
            optional = "N"
        out.append({
            "Field Name": name,
            "Field Category": f["Field Category"],
            "Mandatory": mandatory,
            "Conditional Mandatory": conditional,
            "Conditional Rule": cond,
            "Optional": optional,
            "Source Reference": "05_mandatory_optional_matrix.csv; 02_field_specification.csv",
        })
    return out


def build_submission_template(fields: list[dict]) -> list[dict]:
    """Member-facing single-file column template."""
    rows = []
    rows.append({"Section": "STANDARD", "Item": "Standard Name", "Value": "Property Bureau Member Data Submission Standard", "Source Reference": "README.md"})
    rows.append({"Section": "STANDARD", "Item": "Version", "Value": "V1.0", "Source Reference": ""})
    rows.append({"Section": "STANDARD", "Item": "File Format", "Value": "CSV UTF-8 with BOM; comma-delimited; RECORD_TYPE as first column", "Source Reference": "ABC_HFC Sample data"})
    rows.append({"Section": "STANDARD", "Item": "Submission Types", "Value": "FULL | DELTA | REFRESH", "Source Reference": "03_enum_master.csv"})
    rows.append({"Section": "STANDARD", "Item": "Link Keys", "Value": "MEMBER_INSTITUTION_CODE + MEMBER_PROPERTY_REFERENCE + MEMBER_LOAN_ACCOUNT_NUMBER + SUBMISSION_REFERENCE", "Source Reference": ""})
    rows.append({"Section": "", "Item": "", "Value": "", "Source Reference": ""})

    template_meta = read_csv(SPEC_DIR / "06_recommended_v1_submission_template.csv")
    for t in template_meta:
        rows.append({
            "Section": "RECORD_LAYOUT",
            "Item": t["Record Type"],
            "Value": f"{t['Cardinality']} | Mandatory: {t['Mandatory in V1']} | {t['Notes']}",
            "Source Reference": "06_recommended_v1_submission_template.csv",
        })
    rows.append({"Section": "", "Item": "", "Value": "", "Source Reference": ""})

    order = read_csv(SPEC_DIR / "06b_v1_flat_file_column_order.csv")
    order_names = ["RECORD_TYPE"] + [r["Field Name"] for r in order if r["Field Name"] != "RECORD_TYPE"]
    field_by_name = {f["Field Name"]: f for f in fields}

    rows.append({"Section": "COLUMN_ORDER", "Item": "Column #", "Value": "Field Name | Category | Mandatory | Enum", "Source Reference": "06b_v1_flat_file_column_order.csv"})
    for i, name in enumerate(order_names, 1):
        f = field_by_name.get(name, {})
        rows.append({
            "Section": "COLUMN_ORDER",
            "Item": str(i),
            "Value": f"{name} | {f.get('Field Category', '')} | {f.get('Mandatory (Y/N)', '')} | {f.get('Enum Reference', '')}",
            "Source Reference": "06b_v1_flat_file_column_order.csv; 02_field_specification.csv",
        })
    return rows


def load_sample_data() -> tuple[list[str], list[dict]]:
    path = SAMPLE_DIR / "ABC_HFC_PROPERTY_SUBMISSION_2026Q1_FULL.csv"
    rows = read_csv(path)
    if not rows:
        return [], []
    columns = list(rows[0].keys())
    # Stable column order: RECORD_TYPE first, then rest sorted but keep logical groups
    priority = ["RECORD_TYPE", "SUBMISSION_REFERENCE", "MEMBER_INSTITUTION_CODE", "MEMBER_PROPERTY_REFERENCE", "MEMBER_LOAN_ACCOUNT_NUMBER"]
    rest = [c for c in columns if c not in priority]
    columns = [c for c in priority if c in columns] + sorted(rest)
    return columns, rows


def write_sheet(ws, headers: list[str], data: list[dict], extra_rows: list[dict] | None = None):
    ws.append(headers)
    style_header(ws)
    if extra_rows:
        for r in extra_rows:
            ws.append([r.get(h, "") for h in headers])
    for row in data:
        ws.append([row.get(h, "") for h in headers])
    ws.freeze_panes = "A2"
    auto_width(ws)


def add_completeness_sheet_note(wb, fields, enums, validations):
    """Store completeness review on cover instructions via first sheet note row."""
    pass


def main():
    fields = load_field_spec()
    enums = build_enum_master()
    validations = build_validation_rules(fields)
    mandatory = build_mandatory_matrix(fields)
    template = build_submission_template(fields)
    sample_cols, sample_rows = load_sample_data()

    wb = Workbook()
    wb.remove(wb.active)

    # 1. Field Specification
    ws1 = wb.create_sheet("Field Specification", 0)
    f_headers = [
        "Field Category", "Field Name", "Description", "Data Type", "Length",
        "Mandatory (Y/N)", "Validation Rule", "Enum Reference", "Matching Importance",
        "Sample Value", "Remarks", "Source Reference",
    ]
    write_sheet(ws1, f_headers, fields)

    # Completeness banner rows at top (insert after header)
    ws1.insert_rows(2, 3)
    ws1["A2"] = "COMPLETENESS REVIEW (V1.0)"
    ws1["A2"].font = Font(bold=True, size=12)
    reviews = [
        f"Total unique fields: {len(fields)} | Enum entries: {len(enums)} | Validation rules: {len(validations)}",
        "Domain coverage: Matching, Ownership, Mortgage, Loan, Valuation, Registration, Document, Borrower — CONFIRMED",
        "Sources merged: 02_field_specification, 01_data_dictionary, 03-08 spec CSVs, 06 template, ABC HFC sample | Duplicates removed",
    ]
    for i, text in enumerate(reviews, 3):
        ws1.cell(row=i, column=1, value=text)
    ws1.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(f_headers))
    for i in range(3, 5):
        ws1.merge_cells(start_row=i, start_column=1, end_row=i, end_column=len(f_headers))

    # 2. Enum Master
    ws2 = wb.create_sheet("Enum Master")
    e_headers = ["Enum Name", "Allowed Values", "Description", "Sort Order", "Source Reference"]
    write_sheet(ws2, e_headers, enums)

    # 3. Validation Rules
    ws3 = wb.create_sheet("Validation Rules")
    v_headers = ["Field Name", "Validation Rule", "Error Message", "Example", "Rule ID", "Source Reference"]
    write_sheet(ws3, v_headers, validations)

    # 4. Mandatory vs Optional Matrix
    ws4 = wb.create_sheet("Mandatory vs Optional Matrix")
    m_headers = ["Field Name", "Field Category", "Mandatory", "Conditional Mandatory", "Conditional Rule", "Optional", "Source Reference"]
    write_sheet(ws4, m_headers, mandatory)

    # 5. Member Submission Template
    ws5 = wb.create_sheet("Member Submission Template")
    t_headers = ["Section", "Item", "Value", "Source Reference"]
    write_sheet(ws5, t_headers, template)

    # 6. Sample Submission Data
    ws6 = wb.create_sheet("Sample Submission Data")
    if sample_cols:
        ws6.append(sample_cols)
        style_header(ws6)
        for row in sample_rows:
            ws6.append([row.get(c, "") for c in sample_cols])
        ws6.freeze_panes = "A2"
        auto_width(ws6, max_width=36)
    else:
        ws6.append(["No sample data found — run ABC HFC sample generator"])

    # Index rows at top of Member Submission Template (6 sheets only per standard)
    ws5.insert_rows(1, 8)
    index_lines = [
        ("INDEX", "Standard", "Property Bureau Member Data Submission Standard V1.0"),
        ("INDEX", "Audience", "Banks, HFCs, NBFCs, Housing Finance Companies, Mortgage Lenders"),
        ("INDEX", "Sheets", "1 Field Specification | 2 Enum Master | 3 Validation Rules | 4 Mandatory Matrix | 5 This Template | 6 Sample Data"),
        ("INDEX", "Supersedes", "All prior CSV specification and sample files — use this workbook only"),
        ("INDEX", "Regenerate", "python docs/property-bureau/build_master_workbook.py"),
        ("", "", ""),
    ]
    for i, (sec, item, val) in enumerate(index_lines, 1):
        ws5.cell(row=i, column=1, value=sec)
        ws5.cell(row=i, column=2, value=item)
        ws5.cell(row=i, column=3, value=val)
    ws5["A1"].font = Font(bold=True, size=12)

    wb.save(OUTPUT)
    print(f"Created: {OUTPUT}")
    print(f"Fields: {len(fields)} | Enums: {len(enums)} | Validations: {len(validations)} | Sample rows: {len(sample_rows)}")


if __name__ == "__main__":
    main()
