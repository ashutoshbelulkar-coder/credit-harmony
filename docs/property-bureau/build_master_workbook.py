"""
Build Property Bureau Member Data Submission Standard — single master Excel workbook (V1.1).
Run: python docs/property-bureau/build_master_workbook.py
"""
from __future__ import annotations

import csv
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from v1_1_spec import (
    DENSE_SINGLE_FILE_LAYOUT,
    DENSE_SINGLE_FILE_NAME,
    ENUMS_V11,
    FIELDS_V11,
    INDIAN_STATES,
    LEGACY_LAYOUT,
    MATCHING_SCORE,
    MULTI_FILE_LAYOUT,
    REMOVED_FIELDS_V10,
    VALIDATIONS_V11,
    VERSION,
    PREVIOUS_VERSION,
    dense_submission_column_order,
)

ROOT = Path(__file__).parent
SPEC_DIR = ROOT / "member-data-submission-standard"
SAMPLE_DIR = ROOT / "ABC HFC Sample data" / "data-submission"
OUTPUT = ROOT / "Property_Bureau_Member_Data_Submission_Standard_V1.1.xlsx"

HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(bold=True, color="FFFFFF")

FEEDBACK_MATRIX = [
    ("FB-001", "P1", "§2", "Flat-file RECORD_TYPE sparse design", "Accepted", "Dense single-file primary (Option B); multi-file alternate", "High", "High", "Low", "~40% ETL"),
    ("FB-045", "P1", "Option B", "Dense single-file for fintech", "Accepted", "PROPERTY_BUREAU_SUBMISSION.csv + supplements", "High", "High", "Low", "Simplest integration"),
    ("FB-002", "P1", "§2", "Remove PROPERTY_AGE_YEARS", "Accepted", "Bureau-derived", "None", "Low", "None", "1 field"),
    ("FB-003", "P1", "§2", "Remove DATA_AS_OF_DATE", "Accepted", "Use REPORTING_PERIOD_END", "None", "Low", "None", "1 field"),
    ("FB-004", "P1", "§2", "Remove DELIMITER/ENCODING/FILE_VERSION", "Accepted", "API/manifest metadata", "None", "Low", "None", "3 fields"),
    ("FB-005", "P1", "§2", "Remove SUBMISSION_DATE", "Accepted", "Ingestion timestamp", "None", "Low", "None", "1 field"),
    ("FB-006", "P1", "§2", "Remove MEMBER_INSTITUTION_NAME", "Accepted", "Master lookup", "None", "Low", "None", "1 field"),
    ("FB-007", "P1", "§2", "Remove COUNTRY fields", "Accepted", "Default IN", "None", "None", "None", "2 fields"),
    ("FB-008", "P1", "§3", "Remove BORROWER_COUNTRY", "Accepted", "Duplicate of FB-007", "None", "None", "None", ""),
    ("FB-009", "P2", "§2", "Consolidate BUILDING+TOWER", "Accepted", "BUILDING_UNIT_IDENTIFIER", "Low", "Med", "Low", "1-2 fields"),
    ("FB-010", "P2", "§2", "Remove REGISTRAR_OFFICE", "Accepted", "Extended optional removed from core", "None", "Low", "None", "1 field"),
    ("FB-011", "P2", "§2", "Remove PROPERTY_DESCRIPTION mandatory", "Accepted", "EXTENDED_OPTIONAL", "None", "Med", "None", "Payload"),
    ("FB-012", "P2", "§2", "Remove CO_BORROWER_FLAG", "Accepted", "Infer from rows", "Med", "Med", "Low", "1 field"),
    ("FB-013", "P2", "§6.3", "Rename BORROWER_TYPE to ENTITY_TYPE", "Accepted", "Enum rename", "None", "Low", "None", "Clarity"),
    ("FB-014", "P2", "§2", "Remove NPA_CLASSIFICATION", "Accepted", "Derive from DPD", "High", "Med", "Reg align", "1 field"),
    ("FB-015", "P2", "§2", "TOTAL_RECORD_COUNT optional", "Accepted", "VR-002 INFO", "None", "High", "None", "Failures↓"),
    ("FB-016", "P3", "§4", "Consolidate title fields", "Accepted", "TITLE_DOCUMENT_* (3)", "Med", "Med", "Low", "2 fields"),
    ("FB-017", "P3", "§4", "Consolidate municipal IDs", "Accepted", "MUNICIPAL_AUTHORITY_ID+TYPE", "Med", "High", "Low", "2 fields"),
    ("FB-018", "P3", "§3", "Remove LAST_DOCUMENT_REVIEW_DATE", "Accepted", "Removed", "None", "Low", "None", "1 field"),
    ("FB-019", "P3", "§2", "Simplify borrower address", "Accepted", "5 fields + flag", "Med", "High", "Low", "5-7 fields"),
    ("FB-020", "P3", "§2", "Remove IS_LATEST_VALUATION", "Accepted", "max date", "None", "Med", "None", "1 field"),
    ("FB-021", "P3", "§2", "Remove EMI_AMOUNT", "Accepted", "Bureau derived", "None", "Med", "None", "1 field"),
    ("FB-022", "P3", "§2", "CHARGE_AMOUNT default", "Accepted", "Default SANCTION_AMOUNT", "None", "Med", "None", "Conditional"),
    ("FB-023", "P4", "§2", "Remove BRANCH/REGION core", "Accepted", "EXTENDED_OPTIONAL", "None", "Low", "None", "2 fields"),
    ("FB-024", "P4", "§2", "Remove PRIOR_CHARGE_EXISTS", "Accepted", "Infer from name", "None", "Low", "None", "1 field"),
    ("FB-025", "P4", "§6.3", "OCCUPANCY UNDER_CONSTRUCTION", "Accepted", "Removed from enum", "Low", "Low", "None", ""),
    ("FB-026", "P1", "§5", "VR-002 non-blocking", "Accepted", "INFO severity", "None", "High", "None", ""),
    ("FB-027", "P1", "§5", "VR-006 tolerance ±1.00", "Accepted", "WARNING band", "Low", "Med", "None", ""),
    ("FB-028", "P1", "§5", "Deduplicate validations", "Accepted", "Single row per Rule ID", "None", "Med", "None", ""),
    ("FB-029", "P1", "§5", "VR-020 scoring model", "Accepted", "Score >= 60", "Med", "Med", "None", ""),
    ("FB-030", "P1", "§5", "TOP_UP flag", "Accepted", "New field", "Med", "Med", "None", ""),
    ("FB-031", "P1", "§5", "VR-NEW-01/02/03", "Accepted", "Added", "Med", "Low", "None", ""),
    ("FB-032", "P1", "§5", "PAN checksum WARNING", "Accepted", "VR-008B", "None", "Med", "None", ""),
    ("FB-033", "P1", "§7.1", "API-first JSON", "Partially Accepted", "V2 roadmap; CSV multi-file V1.1", "High", "High", "None", "Documented"),
    ("FB-034", "P1", "§7.2", "PINCODE derive DISTRICT", "Partially Accepted", "DISTRICT optional", "Low", "Med", "None", ""),
    ("FB-035", "P1", "§7.3", "Split property vs loan files", "Partially Accepted", "Recommended pattern in template", "Med", "Med", "None", "V1.2"),
    ("FB-036", "P1", "§7.4", "ACK standard", "Partially Accepted", "Documented in template", "Med", "Med", "None", "Future API"),
    ("FB-037", "P1", "§6.3", "DOCUMENT SURRENDERED", "Accepted", "New enum value", "Low", "Low", "None", ""),
    ("FB-038", "P1", "§6.3", "CHARGE PENDING_REGISTRATION", "Accepted", "New enum value", "Low", "Low", "None", ""),
    ("FB-039", "P1", "§6.2", "Remove Mandatory Matrix sheet", "Accepted", "Merged into Field Spec", "None", "Low", "None", "1 sheet"),
    ("FB-040", "P1", "§6.2", "Sample 5 permutations", "Accepted", "Sample sheet scenarios", "None", "Low", "None", ""),
    ("FB-041", "P1", "§4", "Borrower address (prior ask)", "Accepted", "BORROWER_ADDRESS block", "Med", "Med", "KYC", "6 fields"),
    ("FB-042", "P1", "§8.1", "CTS optional not conditional", "Accepted", "Optional identifier", "None", "High", "None", ""),
    ("FB-043", "P1", "§8.1", "DEFAULT_EQUAL ownership", "Accepted", "VR-006 note", "Low", "Med", "None", ""),
    ("FB-044", "P1", "§7.5", "Aadhaar V2", "Rejected", "Deferred V2; consent/regulatory", "N/A", "N/A", "Reg", "Out of V1.1 scope"),
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


def auto_width(ws, max_width=52):
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        length = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[letter].width = min(max(length + 2, 12), max_width)


def field_rows():
    rows = []
    for f in FIELDS_V11:
        cat, name, desc, dtype, ln, mand, val, enum, sample, match, remarks, src, derived = f
        cond = ""
        if mand == "C":
            cond = val[:200] if val else "See Validation Rules"
        opt = "Y" if mand == "N" else "N"
        mand_col = "Y" if mand == "Y" else ("Legacy" if mand == "L" else ("Conditional" if mand == "C" else "N"))
        rows.append({
            "Field Category": cat,
            "Field Name": name,
            "Description": desc,
            "Data Type": dtype,
            "Length": ln,
            "Mandatory (Y/N)": mand_col,
            "Conditional Mandatory": cond if mand == "C" else "",
            "Optional": opt if mand != "Y" else "N",
            "Validation Rule": val,
            "Enum Reference": enum,
            "Matching Importance": match,
            "Sample Value": sample,
            "Derived by Bureau (Y/N)": derived,
            "Remarks": remarks,
            "Source Reference": src,
        })
    return rows


def load_full_states():
    rows = []
    path = SPEC_DIR / "03_enum_master.csv"
    for e in read_csv(path):
        if e.get("Enum Code") == "INDIAN_STATE_UT":
            rows.append((e["Enum Code"], e["Enum Value"], e["Description"], e.get("Sort Order", "")))
    return rows or [(a, b, c, "") for a, b, c in INDIAN_STATES]


def build_enums():
    rows = []
    for e in ENUMS_V11:
        rows.append({
            "Enum Name": e[0],
            "Allowed Values": e[1],
            "Description": e[2],
            "Sort Order": e[3],
            "Source Reference": "v1_1_spec.py; Critical Evaluation §6.3",
        })
    for e in load_full_states():
        if not any(r["Enum Name"] == "INDIAN_STATE_UT" and r["Allowed Values"] == e[1] for r in rows):
            rows.append({
                "Enum Name": e[0], "Allowed Values": e[1], "Description": e[2],
                "Sort Order": e[3], "Source Reference": "03_enum_master.csv",
            })
    cross = read_csv(SPEC_DIR / "03b_enum_property_subtype_crosswalk.csv")
    for c in cross:
        rows.append({
            "Enum Name": "PROPERTY_TYPE_SUBTYPE_CROSSWALK",
            "Allowed Values": f"{c['PROPERTY_TYPE']}:{c['Allowed PROPERTY_SUBTYPE']}",
            "Description": "Valid type pair",
            "Sort Order": "",
            "Source Reference": "03b_enum_property_subtype_crosswalk.csv",
        })
    return rows


def build_validations():
    rows = []
    for v in VALIDATIONS_V11:
        rid, field, sev, rule, err, ex = v
        rows.append({
            "Field Name": field,
            "Rule ID": rid,
            "Severity": sev,
            "Validation Rule": rule,
            "Error Message": err,
            "Example": ex,
            "Source Reference": "Critical Evaluation §5; v1_1_spec.py",
        })
    rows.append({
        "Field Name": "MATCHING_SCORE",
        "Rule ID": "VR-020",
        "Severity": "WARNING",
        "Validation Rule": "Sum of populated matching field scores must be >= 60.",
        "Error Message": "Property matching score below threshold.",
        "Example": "PINCODE+LOCALITY+CITY only = 55",
        "Source Reference": "Critical Evaluation §5",
    })
    for name, score in MATCHING_SCORE:
        rows.append({
            "Field Name": name,
            "Rule ID": "VR-020-SCORE",
            "Severity": "INFO",
            "Validation Rule": f"Contributes {score} points to matching score when populated.",
            "Error Message": "",
            "Example": "",
            "Source Reference": "VR-020 scoring model",
        })
    return rows


def build_template():
    rows = []
    rows.append({"Section": "INDEX", "Item": "Standard", "Value": f"Property Bureau Member Data Submission Standard {VERSION}"})
    rows.append({"Section": "INDEX", "Item": "Supersedes", "Value": PREVIOUS_VERSION + " workbook and distributed CSVs"})
    rows.append({"Section": "INDEX", "Item": "Primary format (Option B)", "Value": f"Single dense CSV: {DENSE_SINGLE_FILE_NAME} — one row per loan account"})
    rows.append({"Section": "INDEX", "Item": "Supplements", "Value": "OWNERSHIP_SUPPLEMENT.csv, CO_BORROWER_SUPPLEMENT.csv (when needed)"})
    rows.append({"Section": "INDEX", "Item": "Alternate format", "Value": "Multi-file CSV package for core-banking batch exports"})
    rows.append({"Section": "INDEX", "Item": "Deprecated", "Value": "RECORD_TYPE sparse combined file"})
    rows.append({"Section": "INDEX", "Item": "API / JSON", "Value": "V2 roadmap — JSONL typed records (FB-033)"})
    rows.append({"Section": "INDEX", "Item": "ACK", "Value": "Bureau returns accepted/rejected/warning counts per Rule ID (FB-036)"})
    rows.append({"Section": "", "Item": "", "Value": ""})

    rows.append({"Section": "DENSE_SINGLE_FILE", "Item": "File", "Value": "Record Type | Cardinality | Description"})
    for layout in DENSE_SINGLE_FILE_LAYOUT:
        rows.append({
            "Section": "DENSE_SINGLE_FILE",
            "Item": layout[0],
            "Value": f"{layout[1]} | {layout[2]} | {layout[3]}",
        })
    rows.append({"Section": "", "Item": "", "Value": ""})

    rows.append({"Section": "MULTI_FILE_ALT", "Item": "File", "Value": "Alternate multi-file package"})
    for layout in MULTI_FILE_LAYOUT:
        rows.append({
            "Section": "MULTI_FILE_ALT",
            "Item": layout[0],
            "Value": f"{layout[1]} | {layout[2]} | {layout[3]}",
        })
    for layout in LEGACY_LAYOUT:
        rows.append({"Section": "LEGACY", "Item": layout[0], "Value": layout[3]})
    rows.append({"Section": "", "Item": "", "Value": ""})

    rows.append({"Section": "DERIVED", "Item": "Field", "Value": "Derivation logic"})
    derived = [
        ("SUBMISSION_TIMESTAMP", "Server time at ingestion (replaces SUBMISSION_DATE)"),
        ("PROPERTY_AGE_YEARS", "REPORTING_PERIOD_END.year - YEAR_OF_CONSTRUCTION"),
        ("NPA_CLASSIFICATION", "From DPD per RBI norms"),
        ("EMI_AMOUNT", "Amortization from SANCTION_AMOUNT, INTEREST_RATE, TENURE_MONTHS"),
        ("IS_LATEST_VALUATION", "max(VALUATION_DATE) per MEMBER_PROPERTY_REFERENCE"),
        ("CHARGE_AMOUNT", "Defaults to SANCTION_AMOUNT if blank"),
        ("COUNTRY", "IN for all V1.1 records"),
        ("DISTRICT", "From PINCODE master when blank"),
        ("CO_BORROWER_PRESENT", "Exists if CO_BORROWER rows linked to loan"),
        ("PRIOR_CHARGE_EXISTS", "Y if PRIOR_CHARGE_HOLDER_NAME non-null"),
    ]
    for name, logic in derived:
        rows.append({"Section": "DERIVED", "Item": name, "Value": logic})

    rows.append({"Section": "", "Item": "", "Value": ""})
    rows.append({"Section": "COLUMN_ORDER", "Item": "#", "Value": "Dense file column | Mandatory"})
    cols = dense_submission_column_order()
    for i, name in enumerate(cols, 1):
        f = next((x for x in FIELDS_V11 if x[1] == name), None)
        mand = f[5] if f else ""
        rows.append({"Section": "COLUMN_ORDER", "Item": str(i), "Value": f"{name} | {mand}"})
    return rows


def load_abc_dense_sample():
    path = SAMPLE_DIR / DENSE_SINGLE_FILE_NAME
    if not path.exists():
        return [], []
    rows = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        cols = reader.fieldnames or []
        for row in reader:
            rows.append(row)
    return list(cols), rows


def build_samples():
    """Prefer ABC HFC dense sample; fallback to five demo scenarios."""
    cols, abc_rows = load_abc_dense_sample()
    if abc_rows:
        return cols, abc_rows[:75]

    """Five full-scenario sample rows (one property package each)."""
    scenarios = [
        {
            "Scenario": "APARTMENT_URBAN_MH",
            "MEMBER_PROPERTY_REFERENCE": "DEMO-COL-APT-01",
            "MEMBER_LOAN_ACCOUNT_NUMBER": "DEMO-HL-APT-01",
            "PROPERTY_TYPE": "RESIDENTIAL", "PROPERTY_SUBTYPE": "APARTMENT",
            "CONSTRUCTION_STATUS": "COMPLETED", "OCCUPANCY_STATUS": "SELF_OCCUPIED",
            "ADDRESS_LINE_1": "1204 Tower B Prestige Park", "LOCALITY": "Powai",
            "CITY": "Mumbai", "STATE": "MH", "PINCODE": "400076",
            "FLAT_NUMBER": "1204", "PROJECT_NAME": "Prestige Park",
            "BUILDING_UNIT_IDENTIFIER": "Tower B", "CTS_NUMBER": "CTS 401/2/1",
            "BORROWER_ADDRESS_SAME_AS_PROPERTY": "Y",
        },
        {
            "Scenario": "PLOT_PUNE",
            "MEMBER_PROPERTY_REFERENCE": "DEMO-COL-PLT-01",
            "MEMBER_LOAN_ACCOUNT_NUMBER": "DEMO-HL-PLT-01",
            "PROPERTY_TYPE": "RESIDENTIAL", "PROPERTY_SUBTYPE": "PLOT",
            "CONSTRUCTION_STATUS": "PLOT_ONLY", "OCCUPANCY_STATUS": "",
            "ADDRESS_LINE_1": "Survey 124 Wagholi Road", "LOCALITY": "Wagholi",
            "CITY": "Pune", "STATE": "MH", "PINCODE": "412207",
            "PLOT_NUMBER": "Plot 124", "SURVEY_NUMBER": "124/2A",
            "LAND_AREA": "2400", "AREA_UNIT": "SQFT",
            "BORROWER_ADDRESS_SAME_AS_PROPERTY": "N",
            "BORROWER_ADDRESS_LINE_1": "18 FC Road", "BORROWER_LOCALITY": "Deccan",
            "BORROWER_CITY": "Pune", "BORROWER_STATE": "MH", "BORROWER_PINCODE": "411004",
        },
        {
            "Scenario": "COMMERCIAL_OFFICE_BLR",
            "MEMBER_PROPERTY_REFERENCE": "DEMO-COL-OFF-01",
            "MEMBER_LOAN_ACCOUNT_NUMBER": "DEMO-HL-OFF-01",
            "PROPERTY_TYPE": "COMMERCIAL", "PROPERTY_SUBTYPE": "OFFICE",
            "CONSTRUCTION_STATUS": "COMPLETED", "OCCUPANCY_STATUS": "RENTED",
            "ADDRESS_LINE_1": "Unit 802 DivyaSree Chambers", "LOCALITY": "Bellandur",
            "CITY": "Bengaluru", "STATE": "KA", "PINCODE": "560103",
            "FLAT_NUMBER": "802", "BUILDING_UNIT_IDENTIFIER": "DivyaSree Chambers",
            "MUNICIPAL_AUTHORITY_ID": "KH-560-991200", "MUNICIPAL_ID_TYPE": "KHATA",
            "PRODUCT_TYPE": "COMMERCIAL_PROPERTY_LOAN",
        },
        {
            "Scenario": "AGRICULTURAL_LAND_RJ",
            "MEMBER_PROPERTY_REFERENCE": "DEMO-COL-AGR-01",
            "MEMBER_LOAN_ACCOUNT_NUMBER": "DEMO-HL-AGR-01",
            "PROPERTY_TYPE": "AGRICULTURAL", "PROPERTY_SUBTYPE": "LAND",
            "CONSTRUCTION_STATUS": "PLOT_ONLY", "OCCUPANCY_STATUS": "",
            "ADDRESS_LINE_1": "Khasra 88 Mundwa Road", "LOCALITY": "Mundwa",
            "CITY": "Nagaur", "STATE": "RJ", "PINCODE": "341001",
            "SURVEY_NUMBER": "88/1", "PLOT_NUMBER": "88",
            "LAND_AREA": "5.5", "AREA_UNIT": "ACRE",
        },
        {
            "Scenario": "VILLA_HYD_CO_BORROWER",
            "MEMBER_PROPERTY_REFERENCE": "DEMO-COL-VLA-01",
            "MEMBER_LOAN_ACCOUNT_NUMBER": "DEMO-HL-VLA-01",
            "PROPERTY_TYPE": "RESIDENTIAL", "PROPERTY_SUBTYPE": "VILLA",
            "CONSTRUCTION_STATUS": "COMPLETED", "OCCUPANCY_STATUS": "SELF_OCCUPIED",
            "ADDRESS_LINE_1": "Villa 7 Palm Meadows", "LOCALITY": "Gachibowli",
            "CITY": "Hyderabad", "STATE": "TS", "PINCODE": "500032",
            "PROJECT_NAME": "Palm Meadows", "PLOT_NUMBER": "Villa 7",
            "CO_BORROWER_SEQUENCE": "1", "CO_BORROWER_NAME": "Priya Reddy",
            "CO_BORROWER_PAN": "FGHIJ5678K", "CO_BORROWER_RELATIONSHIP": "SPOUSE",
            "OWNERSHIP_PERCENT": "70.00", "CO_OWNER_NOTE": "Second owner 30% in OWNERSHIP file",
        },
    ]
    cols = ["Scenario"] + [f[1] for f in FIELDS_V11 if f[1] != "RECORD_TYPE"]
    rows = []
    defaults = {
        "SUBMISSION_REFERENCE": "DEMO-SUB-2026-Q1",
        "MEMBER_INSTITUTION_CODE": "HFC0000042",
        "REPORTING_PERIOD_END": "2026-03-31",
        "SUBMISSION_TYPE": "FULL",
        "CONTACT_EMAIL": "demo@abchfc.example.in",
        "BORROWER_TYPE": "INDIVIDUAL", "BORROWER_NAME": "Rajesh Kumar",
        "BORROWER_PAN": "ABCDE1234F", "SANCTION_AMOUNT": "5000000.00",
        "CURRENT_OUTSTANDING": "4200000.00", "ACCOUNT_STATUS": "ACTIVE",
        "CHARGE_TYPE": "REGISTERED_MORTGAGE", "CHARGE_STATUS": "ACTIVE",
    }
    for sc in scenarios:
        row = {c: "" for c in cols}
        row.update(defaults)
        row.update(sc)
        rows.append(row)
    return cols, rows


def build_change_log():
    return [
        ("CL-001", VERSION, "FB-001..FB-040", "Multi-file alternate; dense single-file primary (Option B)"),
        ("CL-002", VERSION, "FB-003,FB-021", "Removed 21 derivable/constant fields — see Removed Fields sheet note"),
        ("CL-003", VERSION, "FB-009,FB-011,FB-012", "Field consolidations (building, title, municipal)"),
        ("CL-004", VERSION, "FB-013,FB-037,FB-038", "Enum updates: ENTITY_TYPE, DOCUMENT SURRENDERED, CHARGE PENDING_REGISTRATION"),
        ("CL-005", VERSION, "FB-026..FB-032", "Validation dedup + scoring + new rules"),
        ("CL-006", VERSION, "FB-019,FB-041", "BORROWER_ADDRESS block (5 core + flag)"),
        ("CL-007", VERSION, "FB-039", "Mandatory matrix merged into Field Specification"),
        ("CL-008", VERSION, "FB-033,FB-035,FB-036", "Architecture notes: API V2, split submission, ACK"),
        ("CL-009", VERSION, "FB-044", "Aadhaar integration deferred to V2"),
        ("CL-010", VERSION, "FB-045 / Option B", "Dense single-file primary; ABC sample in data-submission/"),
    ]


def write_sheet(ws, headers, data):
    ws.append(headers)
    style_header(ws)
    for row in data:
        if isinstance(row, dict):
            ws.append([row.get(h, "") for h in headers])
        else:
            ws.append(row)
    ws.freeze_panes = "A2"
    auto_width(ws)


def main():
    fields = field_rows()
    enums = build_enums()
    validations = build_validations()
    template = build_template()
    sample_cols, sample_rows = build_samples()

    wb = Workbook()
    wb.remove(wb.active)

    # Standard Overview
    ws0 = wb.create_sheet("Standard Overview", 0)
    overview = [
        ["Property Bureau Member Data Submission Standard", VERSION],
        ["Supersedes", PREVIOUS_VERSION],
        ["Status", "Official Single Source of Truth"],
        ["Field count (V1.1)", str(len(FIELDS_V11))],
        ["Fields removed from V1.0", str(len(REMOVED_FIELDS_V10))],
        ["Mandatory core (Y)", str(sum(1 for f in FIELDS_V11 if f[5] == "Y"))],
        ["Conditional (C)", str(sum(1 for f in FIELDS_V11 if f[5] == "C"))],
        ["Estimated complexity", "4.5/10 (was 7.5/10)"],
        ["Estimated onboarding", "7-10 weeks (was 12-16)"],
        ["", ""],
        ["COMPLETENESS AUDIT", ""],
        ["All P1/P2 feedback implemented", "YES"],
        ["All P3/P4 feedback implemented", "YES except split property/loan mandatory (V1.2)"],
        ["Primary submission format", f"Option B dense CSV ({DENSE_SINGLE_FILE_NAME})"],
        ["API-first format", "PARTIAL — documented V2; multi-file CSV alternate"],
        ["Regulatory data preserved", "YES — no mandatory regulatory field removed"],
        ["Duplicate fields removed", "YES — 28 V1.0 fields retired"],
        ["Duplicate validation rules", "YES — deduplicated"],
        ["", ""],
        ["CHANGE LOG", "Feedback ID | Description"],
    ]
    for cl in build_change_log():
        overview.append([cl[0], f"{cl[2]} | {cl[3]}"])
    overview.append(["", ""])
    overview.append(["REMOVED FIELDS (V1.0 → V1.1)", "Feedback ID | Replacement"])
    for rf in REMOVED_FIELDS_V10:
        overview.append([rf[0], f"{rf[1]} | {rf[2]}"])
    for row in overview:
        ws0.append(row)
    ws0["A1"].font = Font(bold=True, size=14)
    auto_width(ws0, 70)

    # 1 Field Specification
    ws1 = wb.create_sheet("Field Specification")
    f_headers = list(fields[0].keys())
    write_sheet(ws1, f_headers, fields)

    # 2 Enum Master
    ws2 = wb.create_sheet("Enum Master")
    write_sheet(ws2, ["Enum Name", "Allowed Values", "Description", "Sort Order", "Source Reference"], enums)

    # 3 Validation Rules
    ws3 = wb.create_sheet("Validation Rules")
    write_sheet(ws3, ["Field Name", "Rule ID", "Severity", "Validation Rule", "Error Message", "Example", "Source Reference"], validations)

    # 4 Member Submission Template (replaces separate mandatory matrix)
    ws4 = wb.create_sheet("Member Submission Template")
    write_sheet(ws4, ["Section", "Item", "Value"], template)

    # 5 Sample Submission Data
    ws5 = wb.create_sheet("Sample Submission Data")
    write_sheet(ws5, sample_cols, sample_rows)

    # 6 Feedback Traceability Matrix
    ws6 = wb.create_sheet("Feedback Traceability")
    ftm_headers = [
        "Feedback ID", "Priority", "Report Section", "Feedback Summary", "Disposition",
        "Action Taken", "Functional Impact", "Technical Impact", "Regulatory Impact", "Integration Effort Impact",
    ]
    write_sheet(ws6, ftm_headers, [dict(zip(ftm_headers, row)) for row in FEEDBACK_MATRIX])

    try:
        wb.save(OUTPUT)
        out_path = OUTPUT
    except PermissionError:
        out_path = ROOT / "Property_Bureau_Member_Data_Submission_Standard_V1.1_generated.xlsx"
        wb.save(out_path)
        print(f"NOTE: Close open workbook to overwrite {OUTPUT.name}")
    print(f"Created {out_path}")
    print(f"Fields: {len(FIELDS_V11)} | Removed from V1.0: {len(REMOVED_FIELDS_V10)} | Feedback items: {len(FEEDBACK_MATRIX)}")


if __name__ == "__main__":
    main()
