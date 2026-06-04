"""
Generate ABC HFC V1.1 dense single-file sample submission + optional supplements.
Output: data-submission/ folder (primary member package)

Run: python generate_sample_submission.py
"""
from __future__ import annotations

import csv
import random
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from v1_1_spec import DENSE_SINGLE_FILE_NAME, dense_submission_column_order  # noqa: E402

OUT = Path(__file__).parent / "data-submission"
random.seed(20260331)

MEMBER_CODE = "HFC0000042"
SUBMISSION_REF = "ABC-HFC-PROP-2026-Q1-001"
REPORTING_END = "2026-03-31"
CONTACT = "collateral.data@abchfc.example.in"
RECORD_COUNT = 75

LOCATIONS = [
    ("Mumbai", "Mumbai City", "MH", "400001", "Fort", 18.9322, 72.8311, True, False),
    ("Mumbai", "Mumbai Suburban", "MH", "400076", "Powai", 19.1176, 72.9060, True, False),
    ("Pune", "Pune", "MH", "411014", "Koregaon Park", 18.5362, 73.8958, True, False),
    ("Thane", "Thane", "MH", "400601", "Ghodbunder Road", 19.2183, 72.9781, True, False),
    ("Nagpur", "Nagpur", "MH", "440010", "Dharampeth", 21.1458, 79.0882, False, False),
    ("Bengaluru", "Bengaluru Urban", "KA", "560102", "HSR Layout", 12.9116, 77.6389, False, True),
    ("Bengaluru", "Bengaluru Urban", "KA", "560066", "Whitefield", 12.9698, 77.7500, False, True),
    ("Chennai", "Chennai", "TN", "600028", "Adyar", 13.0067, 80.2572, False, False),
    ("Hyderabad", "Hyderabad", "TS", "500032", "Gachibowli", 17.4401, 78.3489, False, False),
    ("New Delhi", "New Delhi", "DL", "110017", "Saket", 28.5244, 77.2066, False, False),
    ("Gurugram", "Gurugram", "HR", "122002", "Sector 29", 28.4595, 77.0266, False, False),
    ("Noida", "Gautam Buddha Nagar", "UP", "201301", "Sector 62", 28.6270, 77.3649, False, False),
    ("Kolkata", "Kolkata", "WB", "700019", "Park Street", 22.5510, 88.3530, False, False),
    ("Ahmedabad", "Ahmedabad", "GJ", "380015", "Navrangpura", 23.0300, 72.5601, False, False),
    ("Jaipur", "Jaipur", "RJ", "302001", "C-Scheme", 26.9124, 75.7873, False, False),
    ("Indore", "Indore", "MP", "452001", "Vijay Nagar", 22.7196, 75.8577, False, False),
    ("Kochi", "Ernakulam", "KL", "682016", "Kakkanad", 9.9816, 76.2999, False, False),
    ("Chandigarh", "Chandigarh", "CH", "160017", "Sector 17", 30.7333, 76.7794, False, False),
    ("Patna", "Patna", "BR", "800001", "Boring Road", 25.5941, 85.1376, False, False),
    ("Visakhapatnam", "Visakhapatnam", "AP", "530003", "Dwaraka Nagar", 17.6868, 83.2185, False, False),
]

FIRST = ["Rajesh", "Priya", "Amit", "Sneha", "Vikram", "Anita", "Suresh", "Kavita", "Rahul", "Deepa"]
LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Singh", "Kumar", "Gupta", "Mehta", "Verma", "Kulkarni"]
PROJECTS = ["Prestige Lakeside Habitat", "Godrej Platinum", "Lodha Palava", "Brigade Utopia", "Embassy Lake Terraces"]
COMPANIES = [
    ("Sunrise Traders LLP", "LLP", "AABCS1234L"),
    ("Greenfield Developers Pvt Ltd", "PRIVATE_LIMITED", "AABCG5678M"),
]

PROPERTY_PROFILES = [
    ("RESIDENTIAL", "APARTMENT", 28), ("RESIDENTIAL", "VILLA", 8), ("RESIDENTIAL", "ROW_HOUSE", 5),
    ("RESIDENTIAL", "PLOT", 4), ("COMMERCIAL", "OFFICE", 6), ("COMMERCIAL", "SHOP", 5),
    ("INDUSTRIAL", "WAREHOUSE", 4), ("INDUSTRIAL", "FACTORY", 3),
    ("AGRICULTURAL", "LAND", 5), ("AGRICULTURAL", "PLOT", 3), ("MIXED_USE", "SHOP", 1),
]
ACCOUNT_STATUSES = [("ACTIVE", 58), ("CLOSED", 6), ("SETTLED", 4), ("RESTRUCTURED", 4), ("WRITTEN_OFF", 3)]
CHARGE_TYPES = ["FIRST_CHARGE", "REGISTERED_MORTGAGE", "EQUITABLE_MORTGAGE", "SECOND_CHARGE", "PARI_PASSU"]
DOC_AVAIL = ["AVAILABLE", "NOT_AVAILABLE", "PENDING", "NOT_APPLICABLE"]
OCCUPANCY = ["SELF_OCCUPIED", "RENTED", "VACANT"]
CONSTRUCTION = [("COMPLETED", 70), ("UNDER_CONSTRUCTION", 20), ("PLOT_ONLY", 10)]

COLUMNS = dense_submission_column_order()


def pan(seed: int) -> str:
    L = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    return f"{L[seed%24]}{L[(seed//3)%24]}{L[(seed//7)%24]}{L[(seed//11)%24]}{L[(seed//13)%24]}{1000+(seed%8999)}{L[(seed//17)%24]}"


def mobile(seed: int) -> str:
    return f"9{700000000 + (seed % 299999999):09d}"[-10:]


def wcsv(path: Path, cols: list[str], rows: list[dict]):
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)


def build_dense_rows():
    status_pool = []
    for s, c in ACCOUNT_STATUSES:
        status_pool.extend([s] * c)
    random.shuffle(status_pool)

    profile_pool = []
    for pt, st, c in PROPERTY_PROFILES:
        profile_pool.extend([(pt, st)] * c)
    while len(profile_pool) < RECORD_COUNT:
        profile_pool.extend(profile_pool[: RECORD_COUNT - len(profile_pool)])
    random.shuffle(profile_pool)

    dense = []
    ownership_supp = []
    coborrower_supp = []

    for i in range(1, RECORD_COUNT + 1):
        seq = f"{i:04d}"
        loc = LOCATIONS[(i - 1) % len(LOCATIONS)]
        city, district, state, pincode, locality, lat, lon, use_cts, use_khata = loc
        pt, pst = profile_pool[i - 1]
        prop_ref = f"ABC-COL-{seq}"
        loan_no = f"ABC-HL-{seq}"

        fn, ln = FIRST[i % len(FIRST)], LAST[(i * 3) % len(LAST)]
        name = f"{fn} {ln}"
        is_co = i % 17 == 0
        if is_co:
            bor_name, bor_type, bor_pan = COMPANIES[i % len(COMPANIES)]
            bor_dob, bor_mobile = "", ""
        else:
            bor_name, bor_type, bor_pan = name, "INDIVIDUAL", pan(i * 97)
            bor_dob = f"{1965 + (i % 35)}-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}"
            bor_mobile = mobile(i)

        acct = status_pool[i - 1]
        sanction = round(random.uniform(25, 450) * 100000, 2)
        outstanding = 0.0 if acct in ("CLOSED", "SETTLED", "WRITTEN_OFF") else round(sanction * random.uniform(0.35, 0.98), 2)
        sdt = date(2018 + (i % 7), (i % 12) + 1, min(28, (i % 25) + 1))
        disb = sdt + timedelta(days=random.randint(15, 90))
        reg_date = sdt - timedelta(days=random.randint(30, 800))

        building = f"Tower {chr(65 + (i % 5))}" if pst in ("APARTMENT", "OFFICE", "SHOP") else ""
        tower = f"Block {(i % 4) + 1}" if pst == "APARTMENT" else ""
        building_unit = f"{building} {tower}".strip()
        project = PROJECTS[i % len(PROJECTS)] if pst in ("APARTMENT", "VILLA", "ROW_HOUSE") else ""

        muni_val = ""
        muni_type = ""
        if use_khata:
            muni_val, muni_type = f"KH-{pincode[:3]}-{800000 + i}", "KHATA"
        elif i % 4 == 0:
            muni_val, muni_type = f"PID-{state}-{88000 + i}", "PID"
        elif i % 7 == 0:
            muni_val, muni_type = f"PT-{state}-{9900000 + i}", "PTIN"

        if pst in ("PLOT", "LAND"):
            const = "PLOT_ONLY"
        else:
            const = random.choices(
                [c[0] for c in CONSTRUCTION], weights=[c[1] for c in CONSTRUCTION], k=1
            )[0]
        occ = "" if const in ("PLOT_ONLY", "UNDER_CONSTRUCTION") else random.choice(OCCUPANCY)

        same_addr = "Y" if i % 3 != 0 else "N"
        owner_pct = "70.00" if i % 7 == 0 else "100.00"

        row = {c: "" for c in COLUMNS}
        row.update({
            "SUBMISSION_REFERENCE": SUBMISSION_REF,
            "MEMBER_INSTITUTION_CODE": MEMBER_CODE,
            "REPORTING_PERIOD_END": REPORTING_END,
            "SUBMISSION_TYPE": "FULL",
            "CONTACT_EMAIL": CONTACT,
            "TOTAL_RECORD_COUNT": str(RECORD_COUNT),
            "MEMBER_LOAN_ACCOUNT_NUMBER": loan_no,
            "MEMBER_PROPERTY_REFERENCE": prop_ref,
            "MEMBER_CUSTOMER_ID": f"ABC-CIF-{100000 + i}",
            "PROPERTY_TYPE": pt,
            "PROPERTY_SUBTYPE": pst,
            "CONSTRUCTION_STATUS": const,
            "OCCUPANCY_STATUS": occ,
            "ADDRESS_LINE_1": f"{10 + (i % 200)}, {locality} Main Road",
            "LOCALITY": locality,
            "CITY": city,
            "DISTRICT": district,
            "STATE": state,
            "PINCODE": pincode,
            "FLAT_NUMBER": str(100 + (i % 900)) if pst in ("APARTMENT", "OFFICE", "SHOP") else "",
            "PLOT_NUMBER": f"Plot {i}" if pst in ("PLOT", "LAND", "VILLA", "ROW_HOUSE", "WAREHOUSE", "FACTORY") else "",
            "SURVEY_NUMBER": f"{100 + (i % 400)}/{chr(65 + (i % 3))}" if pt == "AGRICULTURAL" or pst in ("PLOT", "LAND") else (f"{200 + i}/1" if i % 5 == 0 else ""),
            "CTS_NUMBER": f"CTS {400 + i}/{(i % 8) + 1}/1" if use_cts and pst in ("APARTMENT", "OFFICE", "SHOP", "VILLA") else "",
            "PROJECT_NAME": project,
            "BUILDING_UNIT_IDENTIFIER": building_unit,
            "MUNICIPAL_AUTHORITY_ID": muni_val,
            "MUNICIPAL_ID_TYPE": muni_type,
            "TITLE_DOCUMENT_TYPE": "SALE_DEED",
            "TITLE_DOCUMENT_NUMBER": f"REG/{reg_date.year}/{100000 + i}",
            "TITLE_DOCUMENT_DATE": reg_date.isoformat(),
            "BUILT_UP_AREA": f"{round(random.uniform(450, 3500), 2)}" if pst not in ("LAND", "PLOT") else "",
            "LAND_AREA": f"{round(random.uniform(1200, 25000), 2)}" if pst in ("LAND", "PLOT", "VILLA") or pt == "AGRICULTURAL" else "",
            "AREA_UNIT": "SQFT" if pt != "AGRICULTURAL" else random.choice(["ACRE", "GUNTHA", "BIGHA"]),
            "YEAR_OF_CONSTRUCTION": str(2005 + (i % 18)),
            "NUMBER_OF_FLOORS": str(5 + (i % 25)) if pst in ("APARTMENT", "OFFICE") else "",
            "OWNER_SEQUENCE": "1",
            "OWNER_NAME": bor_name if not is_co else name,
            "OWNER_PAN": bor_pan if not is_co else pan(i * 97),
            "OWNER_TYPE": bor_type,
            "OWNERSHIP_PERCENT": owner_pct,
            "OWNERSHIP_ROLE": "PRIMARY_OWNER",
            "BORROWER_TYPE": bor_type,
            "BORROWER_NAME": bor_name,
            "BORROWER_PAN": bor_pan,
            "BORROWER_DATE_OF_BIRTH": bor_dob,
            "BORROWER_MOBILE": bor_mobile,
            "BORROWER_EMAIL": f"{fn.lower()}.{ln.lower()}{i}@email.example.in",
            "BORROWER_ADDRESS_SAME_AS_PROPERTY": same_addr,
            "PRODUCT_TYPE": "HOME_LOAN" if pt == "RESIDENTIAL" and pst != "PLOT" else ("PLOT_LOAN" if pst in ("PLOT", "LAND") else "COMMERCIAL_PROPERTY_LOAN"),
            "SANCTION_DATE": sdt.isoformat(),
            "DISBURSEMENT_DATE": disb.isoformat(),
            "SANCTION_AMOUNT": f"{sanction:.2f}",
            "CURRENT_OUTSTANDING": f"{outstanding:.2f}",
            "INTEREST_RATE": f"{8.25 + (i % 40) * 0.05:.4f}",
            "ACCOUNT_STATUS": acct,
            "ACCOUNT_STATUS_DATE": REPORTING_END,
            "TENURE_MONTHS": str(120 + (i % 180)),
            "DPD": "0" if acct == "ACTIVE" else ("120" if acct == "WRITTEN_OFF" else "0"),
            "TOP_UP": "N",
            "CHARGE_SEQUENCE": "1",
            "CHARGE_TYPE": CHARGE_TYPES[i % len(CHARGE_TYPES)],
            "CHARGE_AMOUNT": "",
            "CHARGE_REGISTRATION_DATE": (disb + timedelta(days=30)).isoformat() if CHARGE_TYPES[i % len(CHARGE_TYPES)] == "REGISTERED_MORTGAGE" else "",
            "CHARGE_REGISTRATION_NUMBER": f"CHG/{disb.year}/{60000 + i}" if i % 2 == 0 else "",
            "CHARGE_STATUS": "RELEASED" if acct == "CLOSED" else "ACTIVE",
            "CHARGE_RELEASE_DATE": REPORTING_END if acct == "CLOSED" else "",
            "PRIOR_CHARGE_HOLDER_NAME": "XYZ National Bank" if CHARGE_TYPES[i % len(CHARGE_TYPES)] == "SECOND_CHARGE" else "",
            "VALUATION_SEQUENCE": "1",
            "VALUATION_DATE": f"2025-{(i % 12) + 1:02d}-15",
            "VALUATION_AMOUNT": f"{round(sanction * random.uniform(1.15, 1.55), 2):.2f}",
            "VALUATION_TYPE": random.choice(["MARKET_VALUE", "FAIR_VALUE"]),
            "VALUATOR_NAME": "Knight Frank India Pvt Ltd",
            "TITLE_DEED_AVAILABILITY": DOC_AVAIL[i % 4],
            "SALE_DEED_AVAILABILITY": DOC_AVAIL[(i + 1) % 4],
            "ENCUMBRANCE_CERTIFICATE_AVAILABILITY": DOC_AVAIL[(i + 2) % 4],
            "OCCUPANCY_CERTIFICATE_AVAILABILITY": "NOT_APPLICABLE" if pst in ("LAND", "PLOT") else DOC_AVAIL[(i + 3) % 4],
            "APPROVED_PLAN_AVAILABILITY": DOC_AVAIL[i % 3] if const != "PLOT_ONLY" else "NOT_APPLICABLE",
            "LATITUDE": f"{lat + (i % 10) * 0.001:.6f}",
            "LONGITUDE": f"{lon + (i % 10) * 0.001:.6f}",
            "BRANCH_CODE": f"BR-{state}-{1 + (i % 12):03d}",
            "REGION_CODE": f"REG-{state}",
            "PROPERTY_DESCRIPTION": f"{2 + (i % 3)} BHK collateral in {city}" if pst == "APARTMENT" else "",
            "ADDRESS_LINE_2": f"Near {locality} Market" if i % 3 == 0 else "",
            "LANDMARK": f"Opposite {locality} Bus Stand" if i % 2 == 0 else "",
        })

        if same_addr == "N" and bor_type == "INDIVIDUAL":
            row["BORROWER_ADDRESS_LINE_1"] = f"{20 + i}, FC Road"
            row["BORROWER_LOCALITY"] = "Central"
            row["BORROWER_CITY"] = city
            row["BORROWER_STATE"] = state
            row["BORROWER_PINCODE"] = pincode if i % 4 else "411004"

        if i % 5 == 0 and not is_co:
            row["CO_BORROWER_SEQUENCE"] = "1"
            row["CO_BORROWER_NAME"] = f"{FIRST[(i + 3) % len(FIRST)]} {ln}"
            row["CO_BORROWER_PAN"] = pan(i * 211)
            row["CO_BORROWER_RELATIONSHIP"] = random.choice(["SPOUSE", "PARENT", "SIBLING"])

        if i % 7 == 0:
            ownership_supp.append({
                "MEMBER_PROPERTY_REFERENCE": prop_ref,
                "OWNER_SEQUENCE": "2",
                "OWNER_NAME": f"{FIRST[(i + 5) % len(FIRST)]} {LAST[(i + 7) % len(LAST)]}",
                "OWNER_PAN": pan(i * 131),
                "OWNER_TYPE": "INDIVIDUAL",
                "OWNERSHIP_PERCENT": "30.00",
                "OWNERSHIP_ROLE": "CO_OWNER",
            })

        if i % 11 == 0 and i % 5 != 0:
            coborrower_supp.append({
                "MEMBER_LOAN_ACCOUNT_NUMBER": loan_no,
                "CO_BORROWER_SEQUENCE": "2",
                "CO_BORROWER_NAME": f"{FIRST[(i + 9) % len(FIRST)]} {ln}",
                "CO_BORROWER_PAN": pan(i * 311),
                "CO_BORROWER_RELATIONSHIP": "SIBLING",
            })

        dense.append(row)

    return dense, ownership_supp, coborrower_supp


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    dense, own_supp, co_supp = build_dense_rows()

    wcsv(OUT / DENSE_SINGLE_FILE_NAME, COLUMNS, dense)
    wcsv(OUT / "OWNERSHIP_SUPPLEMENT.csv",
         ["MEMBER_PROPERTY_REFERENCE", "OWNER_SEQUENCE", "OWNER_NAME", "OWNER_PAN", "OWNER_TYPE", "OWNERSHIP_PERCENT", "OWNERSHIP_ROLE"],
         own_supp)
    wcsv(OUT / "CO_BORROWER_SUPPLEMENT.csv",
         ["MEMBER_LOAN_ACCOUNT_NUMBER", "CO_BORROWER_SEQUENCE", "CO_BORROWER_NAME", "CO_BORROWER_PAN", "CO_BORROWER_RELATIONSHIP"],
         co_supp)

    manifest = [
        {"File": DENSE_SINGLE_FILE_NAME, "Format": "V1.1 Dense (Option B)", "Rows": str(len(dense)), "Description": "Primary — one row per loan account"},
        {"File": "OWNERSHIP_SUPPLEMENT.csv", "Format": "Supplement", "Rows": str(len(own_supp)), "Description": "Additional property owners"},
        {"File": "CO_BORROWER_SUPPLEMENT.csv", "Format": "Supplement", "Rows": str(len(co_supp)), "Description": "Additional co-borrowers"},
    ]
    wcsv(OUT / "00_SUBMISSION_MANIFEST.csv", list(manifest[0].keys()), manifest)

    print(f"Created {OUT}/")
    print(f"  {DENSE_SINGLE_FILE_NAME}: {len(dense)} rows x {len(COLUMNS)} columns")
    print(f"  OWNERSHIP_SUPPLEMENT.csv: {len(own_supp)} rows")
    print(f"  CO_BORROWER_SUPPLEMENT.csv: {len(co_supp)} rows")


if __name__ == "__main__":
    main()
