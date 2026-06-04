"""
Generate ABC HFC enterprise property bureau sample submission (75 collateral records).
Run: python generate_sample_submission.py
"""
from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

OUT = Path(__file__).parent
random.seed(20260331)

MEMBER_CODE = "HFC0000042"
INSTITUTION_NAME = "ABC Housing Finance Company Limited"
SUBMISSION_REF = "ABC-HFC-PROP-2026-Q1-001"
REPORTING_END = "2026-03-31"
SUBMISSION_DATE = "2026-04-15"
RECORD_COUNT = 75

# (city, district, state, pincode, locality, region_code, branch_prefix, lat, lon, use_cts, use_khata)
LOCATIONS = [
    ("Mumbai", "Mumbai City", "MH", "400001", "Fort", "WEST-01", "BR-MUM", 18.9322, 72.8311, True, False),
    ("Mumbai", "Mumbai Suburban", "MH", "400076", "Powai", "WEST-01", "BR-MUM", 19.1176, 72.9060, True, False),
    ("Pune", "Pune", "MH", "411014", "Koregaon Park", "WEST-01", "BR-PUN", 18.5362, 73.8958, True, False),
    ("Thane", "Thane", "MH", "400601", "Ghodbunder Road", "WEST-01", "BR-THA", 19.2183, 72.9781, True, False),
    ("Nagpur", "Nagpur", "MH", "440010", "Dharampeth", "WEST-02", "BR-NGP", 21.1458, 79.0882, False, False),
    ("Bengaluru", "Bengaluru Urban", "KA", "560102", "HSR Layout", "SOUTH-01", "BR-BLR", 12.9116, 77.6389, False, True),
    ("Bengaluru", "Bengaluru Urban", "KA", "560066", "Whitefield", "SOUTH-01", "BR-BLR", 12.9698, 77.7500, False, True),
    ("Mysuru", "Mysuru", "KA", "570001", "Vijayanagar", "SOUTH-01", "BR-MYS", 12.2958, 76.6394, False, True),
    ("Chennai", "Chennai", "TN", "600028", "Adyar", "SOUTH-02", "BR-MAA", 13.0067, 80.2572, False, False),
    ("Coimbatore", "Coimbatore", "TN", "641002", "RS Puram", "SOUTH-02", "BR-CJB", 11.0056, 76.9661, False, False),
    ("Hyderabad", "Hyderabad", "TS", "500032", "Gachibowli", "SOUTH-03", "BR-HYD", 17.4401, 78.3489, False, False),
    ("Secunderabad", "Hyderabad", "TS", "500003", "Secunderabad", "SOUTH-03", "BR-HYD", 17.4399, 78.4983, False, False),
    ("New Delhi", "New Delhi", "DL", "110001", "Connaught Place", "NORTH-01", "BR-DEL", 28.6315, 77.2167, False, False),
    ("New Delhi", "South Delhi", "DL", "110017", "Saket", "NORTH-01", "BR-DEL", 28.5244, 77.2066, False, False),
    ("Gurugram", "Gurugram", "HR", "122002", "Sector 29", "NORTH-02", "BR-GGN", 28.4595, 77.0266, False, False),
    ("Faridabad", "Faridabad", "HR", "121002", "Sector 15", "NORTH-02", "BR-FBD", 28.4089, 77.3178, False, False),
    ("Noida", "Gautam Buddha Nagar", "UP", "201301", "Sector 62", "NORTH-03", "BR-NOI", 28.6270, 77.3649, False, False),
    ("Lucknow", "Lucknow", "UP", "226001", "Hazratganj", "NORTH-03", "BR-LKO", 26.8467, 80.9462, False, False),
    ("Kolkata", "Kolkata", "WB", "700019", "Park Street", "EAST-01", "BR-CCU", 22.5510, 88.3530, False, False),
    ("Ahmedabad", "Ahmedabad", "GJ", "380015", "Navrangpura", "WEST-03", "BR-AMD", 23.0300, 72.5601, False, False),
    ("Surat", "Surat", "GJ", "395007", "Adajan", "WEST-03", "BR-SUR", 21.1959, 72.8302, False, False),
    ("Vadodara", "Vadodara", "GJ", "390007", "Alkapuri", "WEST-03", "BR-BDQ", 22.3072, 73.1812, False, False),
    ("Jaipur", "Jaipur", "RJ", "302001", "C-Scheme", "NORTH-04", "BR-JAI", 26.9124, 75.7873, False, False),
    ("Udaipur", "Udaipur", "RJ", "313001", "Fatehpura", "NORTH-04", "BR-UDR", 24.5854, 73.7125, False, False),
    ("Indore", "Indore", "MP", "452001", "Vijay Nagar", "CENTRAL-01", "BR-IDR", 22.7196, 75.8577, False, False),
    ("Bhopal", "Bhopal", "MP", "462001", "Arera Colony", "CENTRAL-01", "BR-BHO", 23.2599, 77.4126, False, False),
    ("Kochi", "Ernakulam", "KL", "682016", "Kakkanad", "SOUTH-04", "BR-COK", 9.9816, 76.2999, False, False),
    ("Chandigarh", "Chandigarh", "CH", "160017", "Sector 17", "NORTH-05", "BR-CHD", 30.7333, 76.7794, False, False),
    ("Ludhiana", "Ludhiana", "PB", "141001", "Model Town", "NORTH-05", "BR-LDH", 30.9010, 75.8573, False, False),
    ("Patna", "Patna", "BR", "800001", "Boring Road", "EAST-02", "BR-PAT", 25.5941, 85.1376, False, False),
    ("Ranchi", "Ranchi", "JH", "834001", "Main Road", "EAST-03", "BR-RNC", 23.3441, 85.3096, False, False),
    ("Bhubaneswar", "Khordha", "OD", "751001", "Saheed Nagar", "EAST-04", "BR-BBI", 20.2961, 85.8245, False, False),
    ("Guwahati", "Kamrup Metropolitan", "AS", "781005", "Zoo Road", "EAST-05", "BR-GUW", 26.1445, 91.7362, False, False),
    ("Dehradun", "Dehradun", "UK", "248001", "Rajpur Road", "NORTH-06", "BR-DDN", 30.3165, 78.0322, False, False),
    ("Panaji", "North Goa", "GA", "403001", "Fontainhas", "WEST-04", "BR-GOA", 15.4909, 73.8278, False, False),
    ("Visakhapatnam", "Visakhapatnam", "AP", "530003", "Dwaraka Nagar", "SOUTH-05", "BR-VIZ", 17.6868, 83.2185, False, False),
    ("Vijayawada", "NTR", "AP", "520010", "Benz Circle", "SOUTH-05", "BR-VJA", 16.5062, 80.6480, False, False),
    ("Amritsar", "Amritsar", "PB", "143001", "Lawrence Road", "NORTH-05", "BR-ATQ", 31.6340, 74.8723, False, False),
    ("Nashik", "Nashik", "MH", "422002", "College Road", "WEST-01", "BR-NSK", 20.0110, 73.7903, False, False),
    ("Jodhpur", "Jodhpur", "RJ", "342001", "Ratanada", "NORTH-04", "BR-JDH", 26.2389, 73.0243, False, False),
    ("Ludhiana Rural", "Ludhiana", "PB", "141113", "Raikot Road", "NORTH-05", "BR-LDH", 30.8234, 75.6721, False, False),
    ("Nagaur", "Nagaur", "RJ", "341001", "Mundwa Road", "NORTH-04", "BR-NGR", 27.2024, 73.7344, False, False),
]

FIRST = [
    "Rajesh", "Priya", "Amit", "Sneha", "Vikram", "Anita", "Suresh", "Kavita", "Rahul", "Deepa",
    "Arun", "Meera", "Sanjay", "Pooja", "Karthik", "Lakshmi", "Manoj", "Divya", "Ravi", "Neha",
    "Ashok", "Sunita", "Gopal", "Rekha", "Harish", "Anjali", "Pradeep", "Nisha", "Sunil", "Geeta",
]
LAST = [
    "Sharma", "Patel", "Reddy", "Iyer", "Nair", "Singh", "Kumar", "Menon", "Gupta", "Desai",
    "Rao", "Pillai", "Joshi", "Mehta", "Verma", "Kulkarni", "Chatterjee", "Banerjee", "Das", "Mishra",
    "Agarwal", "Malhotra", "Kapoor", "Bose", "Saxena", "Pandey", "Tripathi", "Hegde", "Shetty", "Ghosh",
]

PROJECTS = [
    "Prestige Lakeside Habitat", "DLF Camellias", "Godrej Platinum", "Lodha Palava", "Sobha Dream Acres",
    "Brigade Cornerstone Utopia", "Tata New Haven", "Mahindra Lifespaces Eden", "Puravankara Purva Park",
    "Embassy Lake Terraces", "M3M Golf Estate", "Adani Western Heights", "Raheja Viva", "Oberoi Springs",
    "Hiranandani Gardens", "Shapoorji Pallonji Joyville", "Kalpataru Radiance", "L&T Raintree Boulevard",
]

COMPANIES = [
    ("Sunrise Traders LLP", "LLP", "AABCS1234L"),
    ("Greenfield Developers Pvt Ltd", "PRIVATE_LIMITED", "AABCG5678M"),
    ("Metro Logistics Partnership", "PARTNERSHIP", "AABCM9012N"),
    ("Heritage Builders Pvt Ltd", "PRIVATE_LIMITED", "AABCH3456P"),
    ("Coastal Exports LLP", "LLP", "AABCC7890Q"),
]

# (property_type, subtype, weight)
PROPERTY_PROFILES = [
    ("RESIDENTIAL", "APARTMENT", 28),
    ("RESIDENTIAL", "VILLA", 8),
    ("RESIDENTIAL", "ROW_HOUSE", 5),
    ("RESIDENTIAL", "PLOT", 4),
    ("COMMERCIAL", "OFFICE", 6),
    ("COMMERCIAL", "SHOP", 5),
    ("COMMERCIAL", "PLOT", 2),
    ("INDUSTRIAL", "WAREHOUSE", 4),
    ("INDUSTRIAL", "FACTORY", 3),
    ("AGRICULTURAL", "LAND", 5),
    ("AGRICULTURAL", "PLOT", 3),
    ("MIXED_USE", "APARTMENT", 1),
    ("MIXED_USE", "SHOP", 1),
]

ACCOUNT_STATUSES = [
    ("ACTIVE", 58),
    ("CLOSED", 6),
    ("SETTLED", 4),
    ("RESTRUCTURED", 4),
    ("WRITTEN_OFF", 3),
]

CHARGE_TYPES = ["FIRST_CHARGE", "SECOND_CHARGE", "REGISTERED_MORTGAGE", "EQUITABLE_MORTGAGE", "PARI_PASSU"]
PRODUCT_TYPES = ["HOME_LOAN", "LAP", "CONSTRUCTION_LOAN", "COMMERCIAL_PROPERTY_LOAN", "PLOT_LOAN"]
NPA_CLASSES = ["STANDARD", "STANDARD", "STANDARD", "SMA0", "SMA1", "SMA2", "SUB_STANDARD", "DOUBTFUL"]
DOC_AVAIL = ["AVAILABLE", "NOT_AVAILABLE", "PENDING", "NOT_APPLICABLE"]
OCCUPANCY = ["SELF_OCCUPIED", "RENTED", "VACANT", "UNDER_CONSTRUCTION"]
CONSTRUCTION = ["COMPLETED", "UNDER_CONSTRUCTION", "PLOT_ONLY"]


def weighted_choice(items):
    vals, weights = zip(*items)
    return random.choices(vals, weights=weights, k=1)[0]


def pan_individual(seed: int) -> str:
    letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    a = letters[seed % 24]
    b = letters[(seed // 3) % 24]
    c = letters[(seed // 7) % 24]
    d = letters[(seed // 11) % 24]
    e = letters[(seed // 13) % 24]
    num = f"{1000 + (seed % 8999)}"
    check = letters[(seed // 17) % 24]
    return f"{a}{b}{c}{d}{e}{num}{check}"


def mobile(seed: int) -> str:
    return f"9{700000000 + (seed % 299999999):09d}"[-10:]


def write_csv(name: str, columns: list[str], rows: list[dict]):
    path = OUT / name
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        w.writeheader()
        for row in rows:
            w.writerow(row)


def build_records():
    properties = []
    ownerships = []
    borrowers = []
    co_borrowers = []
    loans = []
    charges = []
    valuations = []
    documents = []

    status_pool = []
    for s, c in ACCOUNT_STATUSES:
        status_pool.extend([s] * c)
    random.shuffle(status_pool)

    profile_pool = []
    for pt, st, c in PROPERTY_PROFILES:
        profile_pool.extend([(pt, st)] * c)
    random.shuffle(profile_pool)

    for i in range(1, RECORD_COUNT + 1):
        seq = f"{i:04d}"
        loc = LOCATIONS[(i - 1) % len(LOCATIONS)]
        city, district, state, pincode, locality, region, branch_pfx, lat, lon, use_cts, use_khata = loc
        pt, pst = profile_pool[i - 1]
        branch = f"{branch_pfx}-{1 + (i % 12):03d}"

        prop_ref = f"ABC-COL-{seq}"
        loan_no = f"ABC-HL-{seq}"
        cif = f"ABC-CIF-{100000 + i}"

        fn = FIRST[i % len(FIRST)]
        ln = LAST[(i * 3) % len(LAST)]
        name = f"{fn} {ln}"
        pan = pan_individual(i * 97)
        dob_year = 1965 + (i % 35)
        dob = f"{dob_year}-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}"

        is_company = i % 17 == 0
        if is_company:
            comp = COMPANIES[i % len(COMPANIES)]
            bor_name, bor_type, bor_pan = comp[0], comp[1], comp[2]
            bor_dob = ""
            bor_mobile = ""
        else:
            bor_name, bor_type, bor_pan = name, "INDIVIDUAL", pan
            bor_dob = dob
            bor_mobile = mobile(i)

        acct_status = status_pool[i - 1]
        sanction = round(random.uniform(25, 450) * 100000, 2)
        outstanding = 0.0 if acct_status in ("CLOSED", "SETTLED", "WRITTEN_OFF") else round(sanction * random.uniform(0.35, 0.98), 2)
        sanction_date = date(2018 + (i % 7), (i % 12) + 1, min(28, (i % 25) + 1))
        disb = sanction_date + timedelta(days=random.randint(15, 90))

        reg_date = sanction_date - timedelta(days=random.randint(30, 800))
        reg_no = f"REG/{reg_date.year}/{100000 + i}"
        sale_deed = f"SD/{reg_date.year}/{50000 + i}"

        project = PROJECTS[i % len(PROJECTS)] if pst in ("APARTMENT", "VILLA", "ROW_HOUSE") else ""
        building = f"Tower {chr(65 + (i % 5))}" if pst in ("APARTMENT", "OFFICE", "SHOP") else ""
        tower = f"Block {(i % 4) + 1}" if pst == "APARTMENT" else ""
        flat = f"{100 + (i % 900)}" if pst in ("APARTMENT", "OFFICE", "SHOP") else ""
        floor = str((i % 20) + 1) if pst in ("APARTMENT", "OFFICE") else ""
        plot = f"Plot {i}" if pst in ("PLOT", "LAND", "VILLA", "ROW_HOUSE", "WAREHOUSE", "FACTORY") else ""
        survey = f"{100 + (i % 400)}/{chr(65 + (i % 3))}" if pt in ("AGRICULTURAL",) or pst in ("PLOT", "LAND") else (f"{200 + i}/1" if i % 5 == 0 else "")
        cts = f"CTS {400 + i}/{(i % 8) + 1}/{(i % 3) + 1}" if use_cts and pst in ("APARTMENT", "OFFICE", "SHOP", "VILLA") else ""
        khata = f"KH-{pincode[:3]}-{800000 + i}" if use_khata else (f"KH-DN-{700000 + i}" if state == "KA" else "")
        muni_id = f"PID-{state}-{2020 + (i % 5)}-{88000 + i}"
        tax_no = f"PT-{state}-{9900000 + i}"

        addr1 = f"{10 + (i % 200)}, {locality} Main Road"
        addr2 = f"Near {locality} Market" if i % 3 else ""
        landmark = f"Opposite {locality} Bus Stand" if i % 2 else ""

        built = round(random.uniform(450, 3500), 2) if pst not in ("LAND", "PLOT") else ""
        land = round(random.uniform(1200, 25000), 2) if pst in ("LAND", "PLOT", "VILLA", "AGRICULTURAL") or pt == "AGRICULTURAL" else round(random.uniform(0, 5000), 2)
        area_unit = random.choice(["SQFT", "SQM", "ACRE", "GUNTHA", "BIGHA"]) if pt == "AGRICULTURAL" else random.choice(["SQFT", "SQM"])
        if area_unit in ("ACRE", "HECTARE", "GUNTHA", "BIGHA"):
            land = round(random.uniform(0.5, 15), 4)

        occ = weighted_choice([(x, 10) for x in OCCUPANCY])
        const = "PLOT_ONLY" if pst in ("PLOT", "LAND") else weighted_choice([("COMPLETED", 70), ("UNDER_CONSTRUCTION", 20), ("PLOT_ONLY", 10)])

        desc_map = {
            "APARTMENT": f"{2 + (i % 3)} BHK apartment in RERA registered project",
            "VILLA": "Independent villa with boundary wall",
            "ROW_HOUSE": "Row house in gated community",
            "PLOT": "Residential plot with demarcation",
            "OFFICE": "Commercial office unit in business district",
            "SHOP": "Ground floor retail shop",
            "WAREHOUSE": "Industrial warehouse with loading bay",
            "FACTORY": "Manufacturing unit in industrial estate",
            "LAND": "Agricultural land with irrigation access",
        }

        properties.append({
            "RECORD_TYPE": "PROPERTY",
            "MEMBER_PROPERTY_REFERENCE": prop_ref,
            "PROPERTY_TYPE": pt,
            "PROPERTY_SUBTYPE": pst,
            "PROPERTY_DESCRIPTION": desc_map.get(pst, "Collateral property"),
            "PROJECT_NAME": project,
            "BUILDING_NAME": building,
            "TOWER_NAME": tower,
            "FLAT_NUMBER": flat,
            "FLOOR_NUMBER": floor,
            "PLOT_NUMBER": plot,
            "SURVEY_NUMBER": survey,
            "CTS_NUMBER": cts,
            "KHATA_NUMBER": khata,
            "MUNICIPAL_PROPERTY_ID": muni_id,
            "PROPERTY_TAX_NUMBER": tax_no,
            "REGISTRATION_NUMBER": reg_no,
            "SALE_DEED_NUMBER": sale_deed,
            "REGISTRATION_DATE": reg_date.isoformat(),
            "REGISTRAR_OFFICE": f"Sub-Registrar {locality} {city}",
            "OCCUPANCY_STATUS": occ,
            "CONSTRUCTION_STATUS": const,
            "ADDRESS_LINE_1": addr1,
            "ADDRESS_LINE_2": addr2,
            "LOCALITY": locality,
            "LANDMARK": landmark,
            "CITY": city,
            "DISTRICT": district,
            "STATE": state,
            "PINCODE": pincode,
            "COUNTRY": "IN",
            "LATITUDE": f"{lat + (i % 10) * 0.001:.6f}",
            "LONGITUDE": f"{lon + (i % 10) * 0.001:.6f}",
            "BUILT_UP_AREA": built if built else "",
            "LAND_AREA": land if land else "",
            "AREA_UNIT": area_unit if (built or land) else "",
            "NUMBER_OF_FLOORS": str(5 + (i % 25)) if pst in ("APARTMENT", "OFFICE") else "",
            "YEAR_OF_CONSTRUCTION": str(2005 + (i % 18)),
            "PROPERTY_AGE_YEARS": str(min(2026 - (2005 + (i % 18)), 50)),
        })

        # Ownership — co-owner on every 7th record
        ownerships.append({
            "RECORD_TYPE": "OWNERSHIP",
            "MEMBER_PROPERTY_REFERENCE": prop_ref,
            "OWNER_SEQUENCE": "1",
            "OWNER_NAME": bor_name if not is_company else name,
            "OWNER_PAN": bor_pan if is_company else pan,
            "OWNER_TYPE": bor_type,
            "OWNERSHIP_PERCENT": "70.00" if i % 7 == 0 else "100.00",
            "OWNERSHIP_ROLE": "PRIMARY_OWNER",
            "TITLE_DOCUMENT_TYPE": random.choice(["SALE_DEED", "GIFT_DEED", "ALLOTMENT_LETTER", "AGREEMENT_TO_SELL"]),
            "TITLE_DOCUMENT_DATE": reg_date.isoformat(),
        })
        if i % 7 == 0:
            co_name = f"{FIRST[(i + 5) % len(FIRST)]} {LAST[(i + 7) % len(LAST)]}"
            ownerships.append({
                "RECORD_TYPE": "OWNERSHIP",
                "MEMBER_PROPERTY_REFERENCE": prop_ref,
                "OWNER_SEQUENCE": "2",
                "OWNER_NAME": co_name,
                "OWNER_PAN": pan_individual(i * 131),
                "OWNER_TYPE": "INDIVIDUAL",
                "OWNERSHIP_PERCENT": "30.00",
                "OWNERSHIP_ROLE": "CO_OWNER",
                "TITLE_DOCUMENT_TYPE": "SALE_DEED",
                "TITLE_DOCUMENT_DATE": reg_date.isoformat(),
            })

        has_co_borrower = i % 5 == 0 and not is_company
        borrowers.append({
            "RECORD_TYPE": "BORROWER",
            "MEMBER_LOAN_ACCOUNT_NUMBER": loan_no,
            "MEMBER_PROPERTY_REFERENCE": prop_ref,
            "MEMBER_CUSTOMER_ID": cif,
            "BRANCH_CODE": branch,
            "REGION_CODE": region,
            "BORROWER_TYPE": bor_type,
            "BORROWER_NAME": bor_name,
            "BORROWER_PAN": bor_pan,
            "BORROWER_DATE_OF_BIRTH": bor_dob,
            "BORROWER_MOBILE": bor_mobile,
            "BORROWER_EMAIL": f"{fn.lower()}.{ln.lower()}{i}@email.example.in" if not is_company else f"accounts{i}@{bor_name.split()[0].lower()}.example.in",
            "CO_BORROWER_FLAG": "Y" if has_co_borrower else "N",
        })

        if has_co_borrower:
            co_borrowers.append({
                "RECORD_TYPE": "CO_BORROWER",
                "MEMBER_LOAN_ACCOUNT_NUMBER": loan_no,
                "CO_BORROWER_SEQUENCE": "1",
                "CO_BORROWER_NAME": f"{FIRST[(i + 3) % len(FIRST)]} {ln}",
                "CO_BORROWER_PAN": pan_individual(i * 211),
                "CO_BORROWER_RELATIONSHIP": random.choice(["SPOUSE", "PARENT", "SIBLING", "BUSINESS_PARTNER"]),
            })

        product = "HOME_LOAN" if pt == "RESIDENTIAL" and pst != "PLOT" else (
            "PLOT_LOAN" if pst in ("PLOT", "LAND") else (
                "COMMERCIAL_PROPERTY_LOAN" if pt == "COMMERCIAL" else (
                    "CONSTRUCTION_LOAN" if const == "UNDER_CONSTRUCTION" else "LAP"
                )
            )
        )

        loans.append({
            "RECORD_TYPE": "LOAN_ACCOUNT",
            "MEMBER_LOAN_ACCOUNT_NUMBER": loan_no,
            "MEMBER_PROPERTY_REFERENCE": prop_ref,
            "PRODUCT_TYPE": product,
            "SANCTION_DATE": sanction_date.isoformat(),
            "DISBURSEMENT_DATE": disb.isoformat(),
            "SANCTION_AMOUNT": f"{sanction:.2f}",
            "CURRENT_OUTSTANDING": f"{outstanding:.2f}",
            "INTEREST_RATE": f"{8.25 + (i % 40) * 0.05:.4f}",
            "ACCOUNT_STATUS": acct_status,
            "ACCOUNT_STATUS_DATE": REPORTING_END,
            "TENURE_MONTHS": str(120 + (i % 180)),
            "EMI_AMOUNT": f"{round(outstanding / max(1, (120 + (i % 180)) - (i % 36)) * 1.1, 2):.2f}" if outstanding else "0.00",
            "DPD": str(i % 90) if acct_status == "ACTIVE" and i % 11 == 0 else ("120" if acct_status == "WRITTEN_OFF" else "0"),
            "NPA_CLASSIFICATION": "LOSS" if acct_status == "WRITTEN_OFF" else ("SUB_STANDARD" if acct_status == "RESTRUCTURED" else NPA_CLASSES[i % len(NPA_CLASSES)]),
        })

        charge_type = CHARGE_TYPES[i % len(CHARGE_TYPES)]
        charge_status = "RELEASED" if acct_status == "CLOSED" else "ACTIVE"
        chg_reg = disb + timedelta(days=random.randint(5, 45))
        charges.append({
            "RECORD_TYPE": "MORTGAGE_CHARGE",
            "MEMBER_LOAN_ACCOUNT_NUMBER": loan_no,
            "CHARGE_SEQUENCE": "1",
            "CHARGE_TYPE": charge_type,
            "CHARGE_AMOUNT": f"{sanction:.2f}",
            "CHARGE_REGISTRATION_DATE": chg_reg.isoformat() if charge_type == "REGISTERED_MORTGAGE" else "",
            "CHARGE_REGISTRATION_NUMBER": f"CHG/{chg_reg.year}/{60000 + i}" if charge_type == "REGISTERED_MORTGAGE" else "",
            "CHARGE_STATUS": charge_status,
            "CHARGE_RELEASE_DATE": REPORTING_END if charge_status == "RELEASED" else "",
            "PRIOR_CHARGE_EXISTS": "Y" if charge_type == "SECOND_CHARGE" else "N",
            "PRIOR_CHARGE_HOLDER_NAME": "XYZ National Bank" if charge_type == "SECOND_CHARGE" else "",
        })
        if charge_type == "PARI_PASSU" and i % 4 == 0:
            charges.append({
                "RECORD_TYPE": "MORTGAGE_CHARGE",
                "MEMBER_LOAN_ACCOUNT_NUMBER": loan_no,
                "CHARGE_SEQUENCE": "2",
                "CHARGE_TYPE": "PARI_PASSU",
                "CHARGE_AMOUNT": f"{sanction * 0.5:.2f}",
                "CHARGE_REGISTRATION_DATE": chg_reg.isoformat(),
                "CHARGE_REGISTRATION_NUMBER": f"CHG-PARI/{chg_reg.year}/{60000 + i}",
                "CHARGE_STATUS": "ACTIVE",
                "CHARGE_RELEASE_DATE": "",
                "PRIOR_CHARGE_EXISTS": "Y",
                "PRIOR_CHARGE_HOLDER_NAME": "PQR Housing Finance Ltd",
            })

        val_date = date(2025, (i % 12) + 1, 15)
        valuations.append({
            "RECORD_TYPE": "VALUATION",
            "MEMBER_PROPERTY_REFERENCE": prop_ref,
            "VALUATION_SEQUENCE": "1",
            "VALUATION_DATE": val_date.isoformat(),
            "VALUATION_AMOUNT": f"{round(sanction * random.uniform(1.15, 1.55), 2):.2f}",
            "VALUATION_TYPE": random.choice(["MARKET_VALUE", "FAIR_VALUE", "DISTRESS_VALUE", "BOOK_VALUE"]),
            "VALUATOR_NAME": random.choice([
                "Knight Frank India Pvt Ltd", "CBRE South Asia Pvt Ltd", "Cushman & Wakefield",
                "Anarock Property Consultants", "HFFC Approved Valuers Panel",
            ]),
            "IS_LATEST_VALUATION": "Y",
        })

        documents.append({
            "RECORD_TYPE": "DOCUMENT_STATUS",
            "MEMBER_PROPERTY_REFERENCE": prop_ref,
            "TITLE_DEED_AVAILABILITY": DOC_AVAIL[i % 4],
            "SALE_DEED_AVAILABILITY": DOC_AVAIL[(i + 1) % 4],
            "ENCUMBRANCE_CERTIFICATE_AVAILABILITY": DOC_AVAIL[(i + 2) % 4],
            "OCCUPANCY_CERTIFICATE_AVAILABILITY": "NOT_APPLICABLE" if pst in ("LAND", "PLOT") else DOC_AVAIL[(i + 3) % 4],
            "APPROVED_PLAN_AVAILABILITY": DOC_AVAIL[i % 3] if const != "PLOT_ONLY" else "NOT_APPLICABLE",
            "LAST_DOCUMENT_REVIEW_DATE": f"2026-{(i % 3) + 1:02d}-15",
        })

    return properties, ownerships, borrowers, co_borrowers, loans, charges, valuations, documents


def main():
    props, owns, bors, cobors, loans, charges, vals, docs = build_records()

    header = [{
        "RECORD_TYPE": "FILE_HEADER",
        "SUBMISSION_REFERENCE": SUBMISSION_REF,
        "MEMBER_INSTITUTION_CODE": MEMBER_CODE,
        "MEMBER_INSTITUTION_NAME": INSTITUTION_NAME,
        "REPORTING_PERIOD_END": REPORTING_END,
        "SUBMISSION_DATE": SUBMISSION_DATE,
        "SUBMISSION_TYPE": "FULL",
        "DATA_AS_OF_DATE": "2026-03-30",
        "CONTACT_EMAIL": "collateral.data@abchfc.example.in",
        "TOTAL_RECORD_COUNT": str(RECORD_COUNT),
        "FILE_VERSION": "V1.0",
        "ENCODING": "UTF-8",
        "DELIMITER": "COMMA",
    }]

    write_csv(
        "01_FILE_HEADER.csv",
        list(header[0].keys()),
        header,
    )

    prop_cols = list(props[0].keys())
    write_csv("02_PROPERTY_MASTER.csv", prop_cols, props)
    write_csv("03_OWNERSHIP.csv", list(owns[0].keys()), owns)
    write_csv("04_BORROWER.csv", list(bors[0].keys()), bors)
    if cobors:
        write_csv("05_CO_BORROWER.csv", list(cobors[0].keys()), cobors)
    write_csv("06_LOAN_ACCOUNT.csv", list(loans[0].keys()), loans)
    write_csv("07_MORTGAGE_CHARGE.csv", list(charges[0].keys()), charges)
    write_csv("08_VALUATION.csv", list(vals[0].keys()), vals)
    write_csv("09_DOCUMENT_STATUS.csv", list(docs[0].keys()), docs)

    # Combined enterprise package (single deliverable with RECORD_TYPE)
    combined_cols = ["RECORD_TYPE"] + sorted(
        set().union(*[set(r.keys()) for r in header + props + owns + bors + cobors + loans + charges + vals + docs])
    )
    combined = (
        header + props + owns + bors + cobors + loans + charges + vals + docs
    )
    write_csv("ABC_HFC_PROPERTY_SUBMISSION_2026Q1_FULL.csv", combined_cols, combined)

    # Manifest
    manifest = [
        {"File Name": "01_FILE_HEADER.csv", "Record Type": "FILE_HEADER", "Row Count": "1", "Description": "Batch control"},
        {"File Name": "02_PROPERTY_MASTER.csv", "Record Type": "PROPERTY", "Row Count": str(len(props)), "Description": "Collateral master"},
        {"File Name": "03_OWNERSHIP.csv", "Record Type": "OWNERSHIP", "Row Count": str(len(owns)), "Description": "Title holders"},
        {"File Name": "04_BORROWER.csv", "Record Type": "BORROWER", "Row Count": str(len(bors)), "Description": "Primary borrower"},
        {"File Name": "05_CO_BORROWER.csv", "Record Type": "CO_BORROWER", "Row Count": str(len(cobors)), "Description": "Co-borrowers"},
        {"File Name": "06_LOAN_ACCOUNT.csv", "Record Type": "LOAN_ACCOUNT", "Row Count": str(len(loans)), "Description": "Loan accounts"},
        {"File Name": "07_MORTGAGE_CHARGE.csv", "Record Type": "MORTGAGE_CHARGE", "Row Count": str(len(charges)), "Description": "Charges"},
        {"File Name": "08_VALUATION.csv", "Record Type": "VALUATION", "Row Count": str(len(vals)), "Description": "Valuations"},
        {"File Name": "09_DOCUMENT_STATUS.csv", "Record Type": "DOCUMENT_STATUS", "Row Count": str(len(docs)), "Description": "Document custody"},
        {"File Name": "ABC_HFC_PROPERTY_SUBMISSION_2026Q1_FULL.csv", "Record Type": "ALL", "Row Count": str(len(combined)), "Description": "Combined multi-record file"},
    ]
    write_csv("00_SUBMISSION_MANIFEST.csv", list(manifest[0].keys()), manifest)

    print(f"Generated {RECORD_COUNT} properties | {len(owns)} ownership | {len(cobors)} co-borrower | {len(charges)} charges")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
