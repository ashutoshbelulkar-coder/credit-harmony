"""Generate Property Bureau Member Data Submission Standard CSV artifacts."""
import csv
from pathlib import Path

OUT = Path(__file__).parent

SPEC_COLUMNS = [
    "Field Category",
    "Field Name",
    "Business Description",
    "Data Type",
    "Maximum Length",
    "Mandatory (Y/N)",
    "Validation Rules",
    "Allowed Values / Enum Values",
    "Sample Value",
    "Remarks",
    "MATCHING_IMPORTANCE",
]

# (category, name, desc, dtype, maxlen, mand, validation, enum, sample, remarks, matching)
FIELDS = [
    # SUBMISSION_HEADER
    ("SUBMISSION_HEADER", "SUBMISSION_REFERENCE", "Unique reference assigned by the member for this submission batch or file.", "STRING", "50", "Y", "Alphanumeric and hyphen/underscore only; unique per MEMBER_INSTITUTION_CODE within rolling 24 months.", "", "BOM-PROP-2026-03-001", "Primary batch deduplication key at member level.", ""),
    ("SUBMISSION_HEADER", "MEMBER_INSTITUTION_CODE", "Bureau-issued institution identifier provided at onboarding.", "STRING", "20", "Y", "Must match bureau master; uppercase alphanumeric.", "", "BANK0001234", "Not a Property Bureau ID; institution master code.", ""),
    ("SUBMISSION_HEADER", "REPORTING_PERIOD_END", "As-of date for the property and mortgage snapshot being reported.", "DATE", "10", "Y", "ISO 8601 YYYY-MM-DD; must not be future-dated beyond T+1 business day tolerance.", "", "2026-03-31", "Aligns portfolio cut-off with credit bureau practice.", ""),
    ("SUBMISSION_HEADER", "SUBMISSION_DATE", "Calendar date when the member transmitted the file.", "DATE", "10", "Y", "ISO 8601 YYYY-MM-DD; >= REPORTING_PERIOD_END allowed within 30 calendar days.", "", "2026-04-02", "", ""),
    ("SUBMISSION_HEADER", "SUBMISSION_TYPE", "Indicates full refresh versus incremental delta.", "ENUM", "20", "Y", "Must be one of SUBMISSION_TYPE enum.", "SUBMISSION_TYPE", "DELTA", "FULL replaces all active records for period; DELTA adds/updates only.", ""),
    ("SUBMISSION_HEADER", "DATA_AS_OF_DATE", "Operational date of source systems used to compile records.", "DATE", "10", "N", "ISO 8601 YYYY-MM-DD; if blank defaults to REPORTING_PERIOD_END.", "", "2026-03-30", "", ""),
    ("SUBMISSION_HEADER", "CONTACT_EMAIL", "Operational contact for submission exceptions.", "STRING", "120", "Y", "RFC 5322 simplified: local@domain.tld; lowercase preferred.", "", "dataops@memberbank.in", "", ""),
    ("SUBMISSION_HEADER", "TOTAL_RECORD_COUNT", "Count of PROPERTY_RECORD rows excluding header.", "INTEGER", "10", "Y", "Non-negative integer; must equal actual property row count in file.", "", "1250", "File integrity check at ingestion.", ""),
    # INSTITUTION_REFERENCE
    ("INSTITUTION_REFERENCE", "MEMBER_LOAN_ACCOUNT_NUMBER", "Member internal loan / mortgage account number.", "STRING", "40", "Y", "Unique per MEMBER_INSTITUTION_CODE for ACTIVE accounts; alphanumeric.", "", "HL000987654", "Primary loan linkage key; duplicate ACTIVE rejected.", ""),
    ("INSTITUTION_REFERENCE", "MEMBER_PROPERTY_REFERENCE", "Member internal property collateral reference.", "STRING", "40", "Y", "Unique per property within institution; stable across submissions.", "", "COL-PROP-88921", "Links ownership, charge, valuation rows.", ""),
    ("INSTITUTION_REFERENCE", "MEMBER_CUSTOMER_ID", "Member internal customer / CIF identifier.", "STRING", "40", "N", "Alphanumeric; required when BORROWER_TYPE is not INDIVIDUAL.", "", "CIF10293847", "", ""),
    ("INSTITUTION_REFERENCE", "BRANCH_CODE", "Originating or servicing branch code.", "STRING", "20", "N", "Alphanumeric; must exist in member branch master if populated.", "", "BR-MUM-014", "", ""),
    ("INSTITUTION_REFERENCE", "REGION_CODE", "Member internal region / zone code.", "STRING", "20", "N", "Alphanumeric.", "", "WEST-02", "", ""),
    # PROPERTY_IDENTIFICATION
    ("PROPERTY_IDENTIFICATION", "PROPERTY_TYPE", "High-level classification of the collateral property.", "ENUM", "20", "Y", "Must be one of PROPERTY_TYPE enum.", "PROPERTY_TYPE", "RESIDENTIAL", "Drives conditional mandatory rules for subtypes.", "HIGH"),
    ("PROPERTY_IDENTIFICATION", "PROPERTY_SUBTYPE", "Granular property classification.", "ENUM", "30", "Y", "Must be valid for PROPERTY_TYPE per crosswalk; see enum master.", "PROPERTY_SUBTYPE", "APARTMENT", "Required for all records.", "HIGH"),
    ("PROPERTY_IDENTIFICATION", "PROPERTY_DESCRIPTION", "Free-text collateral description from loan file.", "STRING", "500", "N", "Printable ASCII and Unicode; no control characters.", "", "3 BHK flat in registered society", "Ancillary matching text.", "MEDIUM"),
    ("PROPERTY_IDENTIFICATION", "PROJECT_NAME", "Registered project or township name.", "STRING", "200", "N", "Required when PROPERTY_SUBTYPE in (APARTMENT,VILLA,ROW_HOUSE) and urban.", "PROJECT_NAME", "Prestige Lakeside Habitat", "Strong discriminator in metro markets.", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "BUILDING_NAME", "Building / wing / tower name or number.", "STRING", "120", "N", "Required when PROPERTY_SUBTYPE in (APARTMENT,OFFICE,SHOP).", "", "Tower B", "", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "TOWER_NAME", "Tower or block identifier within project.", "STRING", "60", "N", "Alphanumeric and common separators.", "", "Block C", "", "HIGH"),
    ("PROPERTY_IDENTIFICATION", "FLAT_NUMBER", "Flat / unit / door number.", "STRING", "30", "N", "Mandatory for APARTMENT, OFFICE, SHOP subtypes.", "", "1204", "Include floor prefix if no separate FLOOR_NUMBER.", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "FLOOR_NUMBER", "Floor or level of unit.", "STRING", "10", "N", "Alphanumeric; G/UG/LG allowed.", "", "12", "", "HIGH"),
    ("PROPERTY_IDENTIFICATION", "PLOT_NUMBER", "Plot or survey subdivision number.", "STRING", "40", "N", "Mandatory for PLOT, LAND, VILLA, ROW_HOUSE, WAREHOUSE, FACTORY when issued.", "", "Plot 42", "", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "SURVEY_NUMBER", "Revenue survey / khasra / survey number.", "STRING", "60", "N", "Mandatory for non-urban PLOT/LAND/AGRICULTURAL; alphanumeric with / and -.", "", "124/2A", "Primary rural matching key.", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "CTS_NUMBER", "City survey / CTS / block number (Maharashtra and equivalents).", "STRING", "60", "N", "Mandatory when property in CTS-governed municipal areas.", "", "CTS 456/B/2", "Critical in Mumbai, Pune, etc.", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "KHATA_NUMBER", "Municipal khata / assessment number.", "STRING", "60", "N", "State-specific format preserved as submitted.", "", "KH-908712", "High value in Karnataka and similar states.", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "MUNICIPAL_PROPERTY_ID", "Municipal corporation property ID / PID.", "STRING", "60", "N", "As printed on property tax bill.", "", "PID-MUM-2024-88901", "", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "PROPERTY_TAX_NUMBER", "Property tax assessment or PTIN.", "STRING", "60", "N", "Numeric or alphanumeric per ULB.", "", "PT-887120934", "", "HIGH"),
    ("PROPERTY_IDENTIFICATION", "REGISTRATION_NUMBER", "Sub-registrar document registration number.", "STRING", "60", "N", "Format varies by state; preserve leading zeros.", "", "REG/2021/123456", "Links to sale deed.", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "SALE_DEED_NUMBER", "Sale deed / conveyance document number.", "STRING", "60", "N", "Pair with REGISTRATION_DATE for uniqueness.", "", "SD-2021-45678", "", "CRITICAL"),
    ("PROPERTY_IDENTIFICATION", "REGISTRATION_DATE", "Date of property registration at sub-registrar.", "DATE", "10", "N", "ISO 8601; required if REGISTRATION_NUMBER populated.", "", "2021-08-15", "", "HIGH"),
    ("PROPERTY_IDENTIFICATION", "REGISTRAR_OFFICE", "Sub-registrar office name or jurisdiction.", "STRING", "120", "N", "Free text; include district if known.", "", "Sub-Registrar HSR Layout", "", "MEDIUM"),
    ("PROPERTY_IDENTIFICATION", "OCCUPANCY_STATUS", "Current occupancy of collateral.", "ENUM", "20", "N", "Must be one of OCCUPANCY_STATUS enum.", "OCCUPANCY_STATUS", "SELF_OCCUPIED", "", "LOW"),
    ("PROPERTY_IDENTIFICATION", "CONSTRUCTION_STATUS", "Built-up versus under-construction status.", "ENUM", "20", "Y", "Must be one of CONSTRUCTION_STATUS enum.", "CONSTRUCTION_STATUS", "COMPLETED", "", "MEDIUM"),
    # PROPERTY_LOCATION
    ("PROPERTY_LOCATION", "ADDRESS_LINE_1", "Primary address line (house/plot/street).", "STRING", "200", "Y", "Minimum 10 characters after trim; no-only-punctuation.", "", "No. 14, 3rd Cross, Sector 2", "Normalized to uppercase at bureau ingest.", "CRITICAL"),
    ("PROPERTY_LOCATION", "ADDRESS_LINE_2", "Secondary address line.", "STRING", "200", "N", "Printable characters.", "", "Near Metro Station", "", "HIGH"),
    ("PROPERTY_LOCATION", "LOCALITY", "Neighbourhood / area / village name.", "STRING", "120", "Y", "Minimum 3 characters.", "", "HSR Layout", "", "CRITICAL"),
    ("PROPERTY_LOCATION", "LANDMARK", "Nearby landmark for disambiguation.", "STRING", "120", "N", "", "", "Opposite BDA Complex", "", "MEDIUM"),
    ("PROPERTY_LOCATION", "CITY", "City or town name.", "STRING", "80", "Y", "Letters and spaces; official name preferred.", "", "Bengaluru", "", "CRITICAL"),
    ("PROPERTY_LOCATION", "DISTRICT", "Administrative district.", "STRING", "80", "Y", "Must align with STATE.", "", "Bengaluru Urban", "", "HIGH"),
    ("PROPERTY_LOCATION", "STATE", "Indian state or UT code.", "ENUM", "3", "Y", "Must be one of INDIAN_STATE_UT enum (ISO-style 2–3 letter bureau codes).", "INDIAN_STATE_UT", "KA", "", "CRITICAL"),
    ("PROPERTY_LOCATION", "PINCODE", "India Post 6-digit PIN code.", "STRING", "6", "Y", "Regex: ^[1-9][0-9]{5}$", "", "560102", "", "CRITICAL"),
    ("PROPERTY_LOCATION", "COUNTRY", "Country of property.", "ENUM", "3", "Y", "Default IN; only IN supported in V1.", "COUNTRY", "IN", "", "LOW"),
    ("PROPERTY_LOCATION", "LATITUDE", "WGS84 latitude in decimal degrees.", "DECIMAL", "12,8", "N", "Range -90 to 90; up to 8 decimal places.", "", "12.91230000", "Optional geocode from member.", "MEDIUM"),
    ("PROPERTY_LOCATION", "LONGITUDE", "WGS84 longitude in decimal degrees.", "DECIMAL", "12,8", "N", "Range -180 to 180; up to 8 decimal places.", "", "77.64450000", "", "MEDIUM"),
    # PROPERTY_PHYSICAL
    ("PROPERTY_PHYSICAL", "BUILT_UP_AREA", "Carpet or built-up area numeric value.", "DECIMAL", "12,4", "N", "Positive; > 0 when PROPERTY_SUBTYPE not LAND.", "", "1450.5000", "Precision 4 decimal places.", "MEDIUM"),
    ("PROPERTY_PHYSICAL", "LAND_AREA", "Land area numeric value.", "DECIMAL", "12,4", "N", "Mandatory for PLOT, LAND, AGRICULTURAL subtypes.", "", "2400.0000", "", "MEDIUM"),
    ("PROPERTY_PHYSICAL", "AREA_UNIT", "Unit of measure for area fields.", "ENUM", "10", "N", "Required if BUILT_UP_AREA or LAND_AREA populated.", "AREA_UNIT", "SQFT", "", "LOW"),
    ("PROPERTY_PHYSICAL", "NUMBER_OF_FLOORS", "Total floors in building.", "INTEGER", "3", "N", "1–200.", "", "18", "", "LOW"),
    ("PROPERTY_PHYSICAL", "YEAR_OF_CONSTRUCTION", "Year built or expected completion.", "INTEGER", "4", "N", "1900–current year + 5 for under construction.", "", "2019", "", "LOW"),
    ("PROPERTY_PHYSICAL", "PROPERTY_AGE_YEARS", "Age in years at REPORTING_PERIOD_END.", "INTEGER", "3", "N", "0–150; may be derived by member.", "", "7", "", "LOW"),
    # PROPERTY_OWNERSHIP
    ("PROPERTY_OWNERSHIP", "OWNER_SEQUENCE", "Sequence for multiple owners on same property.", "INTEGER", "2", "Y", "Starts at 1; unique per MEMBER_PROPERTY_REFERENCE.", "", "1", "Supports up to 10 owners per property.", "HIGH"),
    ("PROPERTY_OWNERSHIP", "OWNER_NAME", "Legal name of property owner as per title.", "STRING", "150", "Y", "Minimum 3 characters; no numeric-only.", "", "Rajesh Kumar Sharma", "Primary ownership matching.", "CRITICAL"),
    ("PROPERTY_OWNERSHIP", "OWNER_PAN", "Permanent Account Number of owner.", "STRING", "10", "N", "Regex: ^[A-Z]{5}[0-9]{4}[A-Z]$; required for INDIVIDUAL owners when available.", "", "ABCDE1234F", "Hashed at bureau; submit clear per agreement.", "CRITICAL"),
    ("PROPERTY_OWNERSHIP", "OWNER_TYPE", "Type of owning entity.", "ENUM", "20", "Y", "Must be one of BORROWER_TYPE enum.", "BORROWER_TYPE", "INDIVIDUAL", "", "HIGH"),
    ("PROPERTY_OWNERSHIP", "OWNERSHIP_PERCENT", "Percentage ownership share.", "DECIMAL", "5,2", "Y", "0.01–100.00; sum per property must equal 100.00 ±0.01.", "", "100.00", "Validation across owners on same property.", "HIGH"),
    ("PROPERTY_OWNERSHIP", "OWNERSHIP_ROLE", "Role of party on title.", "ENUM", "20", "Y", "Must be one of OWNERSHIP_ROLE enum.", "OWNERSHIP_ROLE", "PRIMARY_OWNER", "", "MEDIUM"),
    ("PROPERTY_OWNERSHIP", "TITLE_DOCUMENT_TYPE", "Primary title document held.", "ENUM", "30", "N", "Must be one of TITLE_DOCUMENT_TYPE enum.", "TITLE_DOCUMENT_TYPE", "SALE_DEED", "", "MEDIUM"),
    ("PROPERTY_OWNERSHIP", "TITLE_DOCUMENT_DATE", "Date of primary title document.", "DATE", "10", "N", "ISO 8601.", "", "2021-08-15", "", "MEDIUM"),
    # BORROWER
    ("BORROWER", "BORROWER_TYPE", "Legal constitution of primary borrower.", "ENUM", "20", "Y", "Must be one of BORROWER_TYPE enum.", "BORROWER_TYPE", "INDIVIDUAL", "", "HIGH"),
    ("BORROWER", "BORROWER_NAME", "Primary borrower legal name.", "STRING", "150", "Y", "Minimum 3 characters.", "", "Rajesh Kumar Sharma", "May differ from owner; matching aid.", "CRITICAL"),
    ("BORROWER", "BORROWER_PAN", "PAN of primary borrower.", "STRING", "10", "N", "Regex: ^[A-Z]{5}[0-9]{4}[A-Z]$; mandatory for INDIVIDUAL.", "", "ABCDE1234F", "", "CRITICAL"),
    ("BORROWER", "BORROWER_DATE_OF_BIRTH", "Date of birth for individual borrowers.", "DATE", "10", "N", "ISO 8601; age 18–100; required for INDIVIDUAL.", "", "1985-06-12", "", "MEDIUM"),
    ("BORROWER", "BORROWER_MOBILE", "Registered mobile (India).", "STRING", "10", "N", "Regex: ^[6-9][0-9]{9}$", "", "9876543210", "Hashed at bureau.", "LOW"),
    ("BORROWER", "BORROWER_EMAIL", "Registered email.", "STRING", "120", "N", "RFC 5322 simplified.", "", "rajesh.sharma@email.com", "", "LOW"),
    ("BORROWER", "CO_BORROWER_FLAG", "Indicates co-borrowers reported in separate rows.", "ENUM", "1", "N", "Y or N.", "YES_NO", "N", "If Y, CO_BORROWER records expected.", "LOW"),
    # CO_BORROWER
    ("CO_BORROWER", "CO_BORROWER_SEQUENCE", "Sequence number of co-borrower.", "INTEGER", "2", "N", "Required when CO_BORROWER_FLAG=Y; unique per loan.", "", "1", "Max 5 co-borrowers per loan in V1.", "MEDIUM"),
    ("CO_BORROWER", "CO_BORROWER_NAME", "Co-borrower legal name.", "STRING", "150", "N", "Required when CO_BORROWER_SEQUENCE populated.", "", "Priya Sharma", "", "HIGH"),
    ("CO_BORROWER", "CO_BORROWER_PAN", "Co-borrower PAN.", "STRING", "10", "N", "PAN regex when populated.", "", "FGHIJ5678K", "", "HIGH"),
    ("CO_BORROWER", "CO_BORROWER_RELATIONSHIP", "Relationship to primary borrower.", "ENUM", "30", "N", "Must be one of RELATIONSHIP_TYPE enum.", "RELATIONSHIP_TYPE", "SPOUSE", "", "LOW"),
    # LOAN_ACCOUNT
    ("LOAN_ACCOUNT", "PRODUCT_TYPE", "Member loan product category.", "ENUM", "30", "Y", "Must be one of LOAN_PRODUCT_TYPE enum.", "LOAN_PRODUCT_TYPE", "HOME_LOAN", "", "LOW"),
    ("LOAN_ACCOUNT", "SANCTION_DATE", "Loan sanction date.", "DATE", "10", "Y", "ISO 8601; <= DISBURSEMENT_DATE.", "", "2022-01-10", "", "LOW"),
    ("LOAN_ACCOUNT", "DISBURSEMENT_DATE", "First disbursement date.", "DATE", "10", "N", "ISO 8601; >= SANCTION_DATE.", "", "2022-02-15", "", "LOW"),
    ("LOAN_ACCOUNT", "SANCTION_AMOUNT", "Sanctioned loan amount in INR.", "DECIMAL", "18,2", "Y", "Positive; max 9999999999999999.99.", "", "8500000.00", "INR only in V1.", "LOW"),
    ("LOAN_ACCOUNT", "CURRENT_OUTSTANDING", "Principal outstanding as of REPORTING_PERIOD_END.", "DECIMAL", "18,2", "Y", "Non-negative; <= SANCTION_AMOUNT unless top-up.", "", "7234500.00", "", "LOW"),
    ("LOAN_ACCOUNT", "INTEREST_RATE", "Current annual interest rate percent.", "DECIMAL", "6,4", "N", "0–100.", "", "8.7500", "", "LOW"),
    ("LOAN_ACCOUNT", "ACCOUNT_STATUS", "Lifecycle status of loan account.", "ENUM", "20", "Y", "Must be one of ACCOUNT_STATUS enum.", "ACCOUNT_STATUS", "ACTIVE", "", "LOW"),
    ("LOAN_ACCOUNT", "ACCOUNT_STATUS_DATE", "Effective date of current ACCOUNT_STATUS.", "DATE", "10", "Y", "ISO 8601.", "", "2026-03-31", "", "LOW"),
    ("LOAN_ACCOUNT", "TENURE_MONTHS", "Original tenure in months.", "INTEGER", "4", "N", "1–600.", "", "240", "", "LOW"),
    ("LOAN_ACCOUNT", "EMI_AMOUNT", "Current EMI amount in INR.", "DECIMAL", "18,2", "N", "Non-negative.", "", "72500.00", "", "LOW"),
    ("LOAN_ACCOUNT", "DPD", "Days past due on REPORTING_PERIOD_END.", "INTEGER", "5", "N", "0–9999.", "", "0", "", "LOW"),
    ("LOAN_ACCOUNT", "NPA_CLASSIFICATION", "Asset classification per RBI norms.", "ENUM", "20", "N", "Must be one of NPA_CLASSIFICATION enum.", "NPA_CLASSIFICATION", "STANDARD", "", "LOW"),
    # MORTGAGE_CHARGE
    ("MORTGAGE_CHARGE", "CHARGE_SEQUENCE", "Sequence for multiple charges on same loan.", "INTEGER", "2", "Y", "Starts at 1 per MEMBER_LOAN_ACCOUNT_NUMBER.", "", "1", "", "LOW"),
    ("MORTGAGE_CHARGE", "CHARGE_TYPE", "Type of mortgage charge created.", "ENUM", "30", "Y", "Must be one of CHARGE_TYPE enum.", "CHARGE_TYPE", "REGISTERED_MORTGAGE", "", "MEDIUM"),
    ("MORTGAGE_CHARGE", "CHARGE_AMOUNT", "Amount secured by charge in INR.", "DECIMAL", "18,2", "Y", "Positive.", "", "8500000.00", "", "LOW"),
    ("MORTGAGE_CHARGE", "CHARGE_REGISTRATION_DATE", "Date charge registered or documented.", "DATE", "10", "N", "ISO 8601; required for REGISTERED_MORTGAGE.", "", "2022-03-01", "", "MEDIUM"),
    ("MORTGAGE_CHARGE", "CHARGE_REGISTRATION_NUMBER", "Registrar or member charge reference.", "STRING", "60", "N", "Required when CHARGE_TYPE=REGISTERED_MORTGAGE.", "", "CHG/2022/99881", "Member registry ref only.", "HIGH"),
    ("MORTGAGE_CHARGE", "CHARGE_STATUS", "Active or released status of charge.", "ENUM", "20", "Y", "Must be one of CHARGE_STATUS enum.", "CHARGE_STATUS", "ACTIVE", "", "LOW"),
    ("MORTGAGE_CHARGE", "CHARGE_RELEASE_DATE", "Date charge was released.", "DATE", "10", "N", "Required when CHARGE_STATUS=RELEASED.", "", "", "", "LOW"),
    ("MORTGAGE_CHARGE", "PRIOR_CHARGE_EXISTS", "Whether prior charge exists from another lender.", "ENUM", "1", "N", "Y or N.", "YES_NO", "N", "", "MEDIUM"),
    ("MORTGAGE_CHARGE", "PRIOR_CHARGE_HOLDER_NAME", "Name of prior charge holder if known.", "STRING", "150", "N", "Required when PRIOR_CHARGE_EXISTS=Y.", "", "", "", "MEDIUM"),
    # VALUATION
    ("VALUATION", "VALUATION_SEQUENCE", "Sequence for multiple valuations.", "INTEGER", "2", "N", "Starts at 1; latest marked IS_LATEST_VALUATION=Y.", "", "1", "", "LOW"),
    ("VALUATION", "VALUATION_DATE", "Date of valuation.", "DATE", "10", "N", "ISO 8601; required if VALUATION_AMOUNT populated.", "", "2025-11-20", "", "LOW"),
    ("VALUATION", "VALUATION_AMOUNT", "Market value in INR.", "DECIMAL", "18,2", "N", "Positive.", "", "12500000.00", "", "LOW"),
    ("VALUATION", "VALUATION_TYPE", "Basis of valuation.", "ENUM", "20", "N", "Must be one of VALUATION_TYPE enum.", "VALUATION_TYPE", "MARKET_VALUE", "", "LOW"),
    ("VALUATION", "VALUATOR_NAME", "Approved valuer or firm name.", "STRING", "150", "N", "", "", "ABC Valuers Pvt Ltd", "", "LOW"),
    ("VALUATION", "IS_LATEST_VALUATION", "Flags the current collateral valuation.", "ENUM", "1", "N", "Exactly one Y per MEMBER_PROPERTY_REFERENCE.", "YES_NO", "Y", "", "LOW"),
    # DOCUMENT_STATUS
    ("DOCUMENT_STATUS", "TITLE_DEED_AVAILABILITY", "Member custody status of title deed.", "ENUM", "20", "N", "Must be one of DOCUMENT_AVAILABILITY enum.", "DOCUMENT_AVAILABILITY", "AVAILABLE", "Member attestation only.", "LOW"),
    ("DOCUMENT_STATUS", "SALE_DEED_AVAILABILITY", "Sale deed availability.", "ENUM", "20", "N", "DOCUMENT_AVAILABILITY enum.", "DOCUMENT_AVAILABILITY", "AVAILABLE", "", "LOW"),
    ("DOCUMENT_STATUS", "ENCUMBRANCE_CERTIFICATE_AVAILABILITY", "EC availability.", "ENUM", "20", "N", "DOCUMENT_AVAILABILITY enum.", "DOCUMENT_AVAILABILITY", "PENDING", "", "LOW"),
    ("DOCUMENT_STATUS", "OCCUPANCY_CERTIFICATE_AVAILABILITY", "OC availability for under-construction/completed.", "ENUM", "20", "N", "DOCUMENT_AVAILABILITY enum.", "DOCUMENT_AVAILABILITY", "NOT_APPLICABLE", "", "LOW"),
    ("DOCUMENT_STATUS", "APPROVED_PLAN_AVAILABILITY", "Building plan approval availability.", "ENUM", "20", "N", "DOCUMENT_AVAILABILITY enum.", "DOCUMENT_AVAILABILITY", "AVAILABLE", "", "LOW"),
    ("DOCUMENT_STATUS", "LAST_DOCUMENT_REVIEW_DATE", "Date member last reviewed collateral documents.", "DATE", "10", "N", "ISO 8601.", "", "2026-01-15", "", "LOW"),
]

ENUMS = [
    ("SUBMISSION_TYPE", "FULL", "Full portfolio refresh for reporting period", "1"),
    ("SUBMISSION_TYPE", "DELTA", "Incremental add/update/delete", "2"),
    ("SUBMISSION_TYPE", "REFRESH", "Re-submit corrected records for same period", "3"),
    ("PROPERTY_TYPE", "RESIDENTIAL", "Residential collateral", "1"),
    ("PROPERTY_TYPE", "COMMERCIAL", "Commercial collateral", "2"),
    ("PROPERTY_TYPE", "INDUSTRIAL", "Industrial collateral", "3"),
    ("PROPERTY_TYPE", "AGRICULTURAL", "Agricultural land", "4"),
    ("PROPERTY_TYPE", "MIXED_USE", "Mixed use development", "5"),
    ("PROPERTY_SUBTYPE", "APARTMENT", "Multi-storey dwelling unit", "1"),
    ("PROPERTY_SUBTYPE", "VILLA", "Independent villa / bungalow", "2"),
    ("PROPERTY_SUBTYPE", "ROW_HOUSE", "Row house / townhouse", "3"),
    ("PROPERTY_SUBTYPE", "PLOT", "Residential or commercial plot", "4"),
    ("PROPERTY_SUBTYPE", "OFFICE", "Office space", "5"),
    ("PROPERTY_SUBTYPE", "SHOP", "Retail shop", "6"),
    ("PROPERTY_SUBTYPE", "WAREHOUSE", "Warehouse", "7"),
    ("PROPERTY_SUBTYPE", "FACTORY", "Industrial factory", "8"),
    ("PROPERTY_SUBTYPE", "LAND", "Undeveloped land", "9"),
    ("BORROWER_TYPE", "INDIVIDUAL", "Individual person", "1"),
    ("BORROWER_TYPE", "PROPRIETORSHIP", "Sole proprietorship", "2"),
    ("BORROWER_TYPE", "PARTNERSHIP", "Partnership firm", "3"),
    ("BORROWER_TYPE", "PRIVATE_LIMITED", "Private limited company", "4"),
    ("BORROWER_TYPE", "PUBLIC_LIMITED", "Public limited company", "5"),
    ("BORROWER_TYPE", "LLP", "Limited liability partnership", "6"),
    ("BORROWER_TYPE", "TRUST", "Trust", "7"),
    ("BORROWER_TYPE", "SOCIETY", "Cooperative society / association", "8"),
    ("ACCOUNT_STATUS", "ACTIVE", "Loan actively serviced", "1"),
    ("ACCOUNT_STATUS", "CLOSED", "Loan closed / foreclosed", "2"),
    ("ACCOUNT_STATUS", "SETTLED", "Settled with dues adjustment", "3"),
    ("ACCOUNT_STATUS", "WRITTEN_OFF", "Written off", "4"),
    ("ACCOUNT_STATUS", "RESTRUCTURED", "Restructured under RBI framework", "5"),
    ("CHARGE_TYPE", "FIRST_CHARGE", "First ranking charge", "1"),
    ("CHARGE_TYPE", "SECOND_CHARGE", "Second ranking charge", "2"),
    ("CHARGE_TYPE", "PARI_PASSU", "Pari passu charge", "3"),
    ("CHARGE_TYPE", "EQUITABLE_MORTGAGE", "Equitable mortgage", "4"),
    ("CHARGE_TYPE", "REGISTERED_MORTGAGE", "Registered mortgage", "5"),
    ("AREA_UNIT", "SQFT", "Square feet", "1"),
    ("AREA_UNIT", "SQM", "Square metres", "2"),
    ("AREA_UNIT", "ACRE", "Acre", "3"),
    ("AREA_UNIT", "HECTARE", "Hectare", "4"),
    ("AREA_UNIT", "GUNTHA", "Guntha", "5"),
    ("AREA_UNIT", "BIGHA", "Bigha", "6"),
    ("DOCUMENT_AVAILABILITY", "AVAILABLE", "Document available in member custody", "1"),
    ("DOCUMENT_AVAILABILITY", "NOT_AVAILABLE", "Not available", "2"),
    ("DOCUMENT_AVAILABILITY", "PENDING", "Pending collection", "3"),
    ("DOCUMENT_AVAILABILITY", "NOT_APPLICABLE", "Not applicable for property type", "4"),
    ("OCCUPANCY_STATUS", "SELF_OCCUPIED", "Self occupied by borrower/owner", "1"),
    ("OCCUPANCY_STATUS", "RENTED", "Rented out", "2"),
    ("OCCUPANCY_STATUS", "VACANT", "Vacant", "3"),
    ("OCCUPANCY_STATUS", "UNDER_CONSTRUCTION", "Under construction", "4"),
    ("CONSTRUCTION_STATUS", "COMPLETED", "Construction completed", "1"),
    ("CONSTRUCTION_STATUS", "UNDER_CONSTRUCTION", "Under construction", "2"),
    ("CONSTRUCTION_STATUS", "PLOT_ONLY", "Land only", "3"),
    ("OWNERSHIP_ROLE", "PRIMARY_OWNER", "Primary title holder", "1"),
    ("OWNERSHIP_ROLE", "CO_OWNER", "Co-owner", "2"),
    ("OWNERSHIP_ROLE", "GUARANTOR", "Guarantor with ownership", "3"),
    ("TITLE_DOCUMENT_TYPE", "SALE_DEED", "Sale deed", "1"),
    ("TITLE_DOCUMENT_TYPE", "GIFT_DEED", "Gift deed", "2"),
    ("TITLE_DOCUMENT_TYPE", "LEASE_DEED", "Lease deed", "3"),
    ("TITLE_DOCUMENT_TYPE", "ALLOTMENT_LETTER", "Allotment letter", "4"),
    ("TITLE_DOCUMENT_TYPE", "AGREEMENT_TO_SELL", "Agreement to sell", "5"),
    ("RELATIONSHIP_TYPE", "SPOUSE", "Spouse", "1"),
    ("RELATIONSHIP_TYPE", "PARENT", "Parent", "2"),
    ("RELATIONSHIP_TYPE", "CHILD", "Child", "3"),
    ("RELATIONSHIP_TYPE", "SIBLING", "Sibling", "4"),
    ("RELATIONSHIP_TYPE", "BUSINESS_PARTNER", "Business partner", "5"),
    ("RELATIONSHIP_TYPE", "OTHER", "Other", "6"),
    ("LOAN_PRODUCT_TYPE", "HOME_LOAN", "Home loan", "1"),
    ("LOAN_PRODUCT_TYPE", "LAP", "Loan against property", "2"),
    ("LOAN_PRODUCT_TYPE", "CONSTRUCTION_LOAN", "Construction finance", "3"),
    ("LOAN_PRODUCT_TYPE", "COMMERCIAL_PROPERTY_LOAN", "Commercial property loan", "4"),
    ("LOAN_PRODUCT_TYPE", "PLOT_LOAN", "Plot purchase loan", "5"),
    ("NPA_CLASSIFICATION", "STANDARD", "Standard asset", "1"),
    ("NPA_CLASSIFICATION", "SMA0", "SMA-0", "2"),
    ("NPA_CLASSIFICATION", "SMA1", "SMA-1", "3"),
    ("NPA_CLASSIFICATION", "SMA2", "SMA-2", "4"),
    ("NPA_CLASSIFICATION", "SUB_STANDARD", "Sub-standard", "5"),
    ("NPA_CLASSIFICATION", "DOUBTFUL", "Doubtful", "6"),
    ("NPA_CLASSIFICATION", "LOSS", "Loss", "7"),
    ("CHARGE_STATUS", "ACTIVE", "Charge active", "1"),
    ("CHARGE_STATUS", "RELEASED", "Charge released", "2"),
    ("CHARGE_STATUS", "PARTIALLY_RELEASED", "Partial release", "3"),
    ("VALUATION_TYPE", "MARKET_VALUE", "Market value", "1"),
    ("VALUATION_TYPE", "DISTRESS_VALUE", "Distress value", "2"),
    ("VALUATION_TYPE", "BOOK_VALUE", "Book value", "3"),
    ("VALUATION_TYPE", "FAIR_VALUE", "Fair value", "4"),
    ("YES_NO", "Y", "Yes", "1"),
    ("YES_NO", "N", "No", "2"),
    ("COUNTRY", "IN", "India", "1"),
    ("INDIAN_STATE_UT", "AN", "Andaman and Nicobar Islands", "1"),
    ("INDIAN_STATE_UT", "AP", "Andhra Pradesh", "2"),
    ("INDIAN_STATE_UT", "AR", "Arunachal Pradesh", "3"),
    ("INDIAN_STATE_UT", "AS", "Assam", "4"),
    ("INDIAN_STATE_UT", "BR", "Bihar", "5"),
    ("INDIAN_STATE_UT", "CH", "Chandigarh", "6"),
    ("INDIAN_STATE_UT", "CT", "Chhattisgarh", "7"),
    ("INDIAN_STATE_UT", "DL", "Delhi", "8"),
    ("INDIAN_STATE_UT", "GA", "Goa", "9"),
    ("INDIAN_STATE_UT", "GJ", "Gujarat", "10"),
    ("INDIAN_STATE_UT", "HP", "Himachal Pradesh", "11"),
    ("INDIAN_STATE_UT", "HR", "Haryana", "12"),
    ("INDIAN_STATE_UT", "JH", "Jharkhand", "13"),
    ("INDIAN_STATE_UT", "JK", "Jammu and Kashmir", "14"),
    ("INDIAN_STATE_UT", "KA", "Karnataka", "15"),
    ("INDIAN_STATE_UT", "KL", "Kerala", "16"),
    ("INDIAN_STATE_UT", "LA", "Ladakh", "17"),
    ("INDIAN_STATE_UT", "MH", "Maharashtra", "18"),
    ("INDIAN_STATE_UT", "ML", "Meghalaya", "19"),
    ("INDIAN_STATE_UT", "MN", "Manipur", "20"),
    ("INDIAN_STATE_UT", "MP", "Madhya Pradesh", "21"),
    ("INDIAN_STATE_UT", "MZ", "Mizoram", "22"),
    ("INDIAN_STATE_UT", "NL", "Nagaland", "23"),
    ("INDIAN_STATE_UT", "OD", "Odisha", "24"),
    ("INDIAN_STATE_UT", "PB", "Punjab", "25"),
    ("INDIAN_STATE_UT", "PY", "Puducherry", "26"),
    ("INDIAN_STATE_UT", "RJ", "Rajasthan", "27"),
    ("INDIAN_STATE_UT", "SK", "Sikkim", "28"),
    ("INDIAN_STATE_UT", "TN", "Tamil Nadu", "29"),
    ("INDIAN_STATE_UT", "TS", "Telangana", "30"),
    ("INDIAN_STATE_UT", "TR", "Tripura", "31"),
    ("INDIAN_STATE_UT", "UK", "Uttarakhand", "32"),
    ("INDIAN_STATE_UT", "UP", "Uttar Pradesh", "33"),
    ("INDIAN_STATE_UT", "WB", "West Bengal", "34"),
]

VALIDATION_RULES = [
    ("VR-001", "FILE", "SUBMISSION_REFERENCE", "Duplicate batch rejection", "Reject entire file if SUBMISSION_REFERENCE already accepted for MEMBER_INSTITUTION_CODE within 24 months unless SUBMISSION_TYPE=REFRESH.", "ERROR", "Member must issue new reference or use REFRESH."),
    ("VR-002", "FILE", "TOTAL_RECORD_COUNT", "Record count integrity", "Header TOTAL_RECORD_COUNT must equal count of data rows with RECORD_TYPE=PROPERTY.", "ERROR", "File rejected."),
    ("VR-003", "RECORD", "MEMBER_LOAN_ACCOUNT_NUMBER", "Active loan uniqueness", "Only one ACTIVE row per MEMBER_LOAN_ACCOUNT_NUMBER per reporting period; CLOSED may coexist historically with sequence.", "ERROR", "Use ACCOUNT_STATUS and delta rules."),
    ("VR-004", "RECORD", "MEMBER_PROPERTY_REFERENCE", "Property reference stability", "MEMBER_PROPERTY_REFERENCE must not change for same physical collateral across submissions.", "WARNING", "Flag for data stewardship review."),
    ("VR-005", "RECORD", "OWNER_PAN + OWNER_NAME", "Owner deduplication", "Duplicate OWNER_SEQUENCE with same OWNER_PAN on same MEMBER_PROPERTY_REFERENCE rejected.", "ERROR", ""),
    ("VR-006", "RECORD", "OWNERSHIP_PERCENT", "Ownership sum", "Sum of OWNERSHIP_PERCENT per MEMBER_PROPERTY_REFERENCE must equal 100.00 (±0.01).", "ERROR", ""),
    ("VR-007", "RECORD", "PINCODE", "PIN format", "Regex: ^[1-9][0-9]{5}$", "ERROR", ""),
    ("VR-008", "RECORD", "BORROWER_PAN", "PAN format", "Regex: ^[A-Z]{5}[0-9]{4}[A-Z]$", "ERROR", "Uppercase only."),
    ("VR-009", "RECORD", "OWNER_PAN", "PAN format", "Same as VR-008 when populated.", "ERROR", ""),
    ("VR-010", "RECORD", "BORROWER_MOBILE", "Mobile format", "Regex: ^[6-9][0-9]{9}$", "ERROR", ""),
    ("VR-011", "RECORD", "SANCTION_AMOUNT", "Amount precision", "Maximum 18 digits including 2 decimal places; no currency symbols.", "ERROR", "INR implied."),
    ("VR-012", "RECORD", "CURRENT_OUTSTANDING", "Outstanding bounds", "Must be >= 0; if ACCOUNT_STATUS=CLOSED then must be 0.", "ERROR", ""),
    ("VR-013", "RECORD", "REGISTRATION_NUMBER", "Conditional mandatory", "Required when SALE_DEED_NUMBER or CHARGE_TYPE=REGISTERED_MORTGAGE and state mandates registration.", "WARNING", "State rule pack may elevate to ERROR."),
    ("VR-014", "RECORD", "SURVEY_NUMBER", "Rural mandatory", "Mandatory when PROPERTY_TYPE in (AGRICULTURAL) or PROPERTY_SUBTYPE in (PLOT,LAND).", "ERROR", ""),
    ("VR-015", "RECORD", "FLAT_NUMBER", "Urban unit mandatory", "Mandatory when PROPERTY_SUBTYPE in (APARTMENT,OFFICE,SHOP).", "ERROR", ""),
    ("VR-016", "RECORD", "IS_LATEST_VALUATION", "Single latest valuation", "Exactly one VALUATION row per property with IS_LATEST_VALUATION=Y.", "ERROR", ""),
    ("VR-017", "RECORD", "CHARGE_RELEASE_DATE", "Release date", "Required when CHARGE_STATUS=RELEASED; must be >= CHARGE_REGISTRATION_DATE.", "ERROR", ""),
    ("VR-018", "RECORD", "DATE fields", "Date format", "All dates ISO 8601 YYYY-MM-DD.", "ERROR", "No DD-MM-YYYY."),
    ("VR-019", "RECORD", "PROPERTY_SUBTYPE", "Type crosswalk", "PROPERTY_SUBTYPE must be valid for PROPERTY_TYPE per enum crosswalk sheet.", "ERROR", "See ENUM_CROSSWALK."),
    ("VR-020", "RECORD", "Matching keys", "Minimum matching set", "At least 3 fields with MATCHING_IMPORTANCE=CRITICAL must be non-blank per property.", "ERROR", "Ensures matchability."),
]

# Property subtype crosswalk for enum sheet supplement
CROSSWALK = [
    ("RESIDENTIAL", "APARTMENT"), ("RESIDENTIAL", "VILLA"), ("RESIDENTIAL", "ROW_HOUSE"), ("RESIDENTIAL", "PLOT"),
    ("COMMERCIAL", "OFFICE"), ("COMMERCIAL", "SHOP"), ("COMMERCIAL", "PLOT"),
    ("INDUSTRIAL", "WAREHOUSE"), ("INDUSTRIAL", "FACTORY"), ("INDUSTRIAL", "PLOT"),
    ("AGRICULTURAL", "LAND"), ("AGRICULTURAL", "PLOT"),
    ("MIXED_USE", "APARTMENT"), ("MIXED_USE", "OFFICE"), ("MIXED_USE", "SHOP"),
]

V1_TEMPLATE = [
    ("FILE_HEADER", "One row per file", "SUBMISSION_REFERENCE, MEMBER_INSTITUTION_CODE, REPORTING_PERIOD_END, SUBMISSION_DATE, SUBMISSION_TYPE, DATA_AS_OF_DATE, CONTACT_EMAIL, TOTAL_RECORD_COUNT", "Y", "First row; comma-delimited UTF-8 with BOM."),
    ("PROPERTY", "One row per collateral property", "All PROPERTY_* and PROPERTY_LOCATION fields + INSTITUTION_REFERENCE.MEMBER_PROPERTY_REFERENCE", "Y", "Core property master."),
    ("OWNERSHIP", "One row per owner", "MEMBER_PROPERTY_REFERENCE, OWNER_* fields", "Y", "Up to 10 rows per property."),
    ("BORROWER", "One row per loan", "MEMBER_LOAN_ACCOUNT_NUMBER, MEMBER_PROPERTY_REFERENCE, BORROWER_*", "Y", "Primary borrower."),
    ("CO_BORROWER", "Optional rows", "MEMBER_LOAN_ACCOUNT_NUMBER, CO_BORROWER_*", "N", "Max 5 per loan."),
    ("LOAN_ACCOUNT", "One row per loan", "MEMBER_LOAN_ACCOUNT_NUMBER, LOAN_ACCOUNT_*", "Y", "Linked to property via MEMBER_PROPERTY_REFERENCE on BORROWER row."),
    ("MORTGAGE_CHARGE", "One or more per loan", "MEMBER_LOAN_ACCOUNT_NUMBER, MORTGAGE_CHARGE_*", "Y", "At least one charge for ACTIVE loans."),
    ("VALUATION", "Optional rows", "MEMBER_PROPERTY_REFERENCE, VALUATION_*", "N", "Recommended quarterly."),
    ("DOCUMENT_STATUS", "One row per property", "MEMBER_PROPERTY_REFERENCE, DOCUMENT_STATUS_*", "N", "Member document custody attestation."),
]

def write_csv(name, columns, rows):
    path = OUT / name
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(columns)
        w.writerows(rows)

def main():
    write_csv("01_complete_data_dictionary.csv", SPEC_COLUMNS, FIELDS)
    write_csv("02_field_specification.csv", SPEC_COLUMNS, FIELDS)

    dict_rows = [
        (r[1], r[0], r[2], r[3], r[4], r[5], r[6][:80] + "..." if len(r[6]) > 80 else r[6], r[10] or "N/A")
        for r in FIELDS
    ]
    write_csv(
        "01_complete_data_dictionary_summary.csv",
        ["Field Name", "Field Category", "Business Description", "Data Type", "Max Length", "Mandatory", "Validation (abridged)", "Matching Importance"],
        dict_rows,
    )

    write_csv(
        "03_enum_master.csv",
        ["Enum Code", "Enum Value", "Description", "Sort Order"],
        ENUMS,
    )
    write_csv(
        "03b_enum_property_subtype_crosswalk.csv",
        ["PROPERTY_TYPE", "Allowed PROPERTY_SUBTYPE"],
        CROSSWALK,
    )

    write_csv(
        "04_validation_rules.csv",
        ["Rule ID", "Scope", "Field(s)", "Rule Name", "Rule Definition", "Severity", "Remediation"],
        VALIDATION_RULES,
    )

    matrix = [(r[1], r[0], r[5], r[10] or "N/A") for r in FIELDS]
    write_csv(
        "05_mandatory_optional_matrix.csv",
        ["Field Name", "Field Category", "Mandatory (Y/N)", "MATCHING_IMPORTANCE"],
        matrix,
    )

    write_csv(
        "06_recommended_v1_submission_template.csv",
        ["Record Type", "Cardinality", "Key Fields Included", "Mandatory in V1", "Notes"],
        V1_TEMPLATE,
    )

    # V1 column order for flat file
    v1_cols = [r[1] for r in FIELDS]
    write_csv("06b_v1_flat_file_column_order.csv", ["Column Order", "Field Name"], list(enumerate(v1_cols, 1)))

    matching = [r for r in FIELDS if r[10] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")]
    write_csv(
        "07_property_matching_fields_priority.csv",
        ["Field Name", "Field Category", "MATCHING_IMPORTANCE", "Mandatory (Y/N)", "Business Description", "Validation Rules"],
        [(r[1], r[0], r[10], r[5], r[2], r[6]) for r in matching],
    )

    sample = {r[1]: r[8] for r in FIELDS}
    write_csv("08_sample_record_values.csv", ["Field Name", "Sample Value"], list(sample.items()))

    print(f"Generated {len(FIELDS)} fields across {len(list(OUT.glob('*.csv')))} CSV files in {OUT}")

if __name__ == "__main__":
    main()
