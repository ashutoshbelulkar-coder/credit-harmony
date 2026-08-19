# Claude Design Prompt — HCB Data Quality Monitoring Dashboard

## Role

Act as a senior product designer building an **enterprise data-quality monitoring module** for the Hybrid Credit Bureau (HCB) platform. The audience is HCB Data Operations (bureau-side) and, in a scoped view, member institutions (banks, NBFCs, MFIs) who submit data. Design for clarity and operational triage at scale — not for visual impressiveness.

## Visual system — match the attached screenshot exactly

The attached screenshot is the existing HCB Control Hub. Reuse its shell and design language without change:

- **Left sidebar**: navy (#0F2A4A range), 96px wide, white "H" logo tile top-left, vertical icon nav (dashboard, building, cube, target/gear, shield — active state = teal-highlighted rounded square, activity, bar-chart/report, clipboard, users), collapse chevron at bottom.
- **Top bar**: white, centred search field with ⌘K hint, theme toggle, bell with red badge "3", user chip `admin@hcb.com / Super Admin` with dropdown.
- **Page canvas**: light grey (#F5F7FA), page title in bold dark navy with one-line grey subtitle, primary action button top-right (outlined, with icon).
- **Cards**: white, 12–16px radius, 1px light border, generous padding, section title bold + grey helper line.
- **KPI tiles**: uppercase small grey label, large bold value, small grey sub-line; equal-width row.
- **Filter card**: labelled inputs in a row (date pickers with calendar icon, dropdowns with chevron).
- **Charts**: navy line, orange dashed reference/threshold line, red dot for flagged points, light dashed gridlines, small legend below.
- **Typography**: Inter-style sans; **colours**: navy #1F3864 / #093766 primary, orange #F97316 accent, semantic green/amber/red for grades. Keep the same density and whitespace as the screenshot.

Do not restyle, do not introduce a new component library look. New components must look native to this shell.

## What to design

Redesign the **Data Quality Monitoring** page (currently the shield-icon nav item) into a module of five screens plus one report drawer, wired together with clickable drill-downs. Populate everything with the realistic mock data specified below.

### Screen 1 — Overview (landing)

1. **Title**: "Data Quality Monitoring" · subtitle "Quality of submitted data across members and channels — DQI, issues, movers and threshold events." · button "Reports".
2. **Filter card**: Period (preset chips 24h · 7d · 30d · 90d · Custom, default 30d, from 20 Jul 2026 to 19 Aug 2026) · Compare vs previous period (toggle, on) · Channel segmented control (All | Batch | API) · Member (multi-select, "All 1,214 members") · Source type (dropdown) · Profile · Severity (REJECT / WARNING / INFO) · Grade (A–F).
3. **Headline strip** (8 tiles): Portfolio DQI **87.4 /100** grade **B** ▲0.6 · Records evaluated **54.2M** · Accepted **95.1%** · Rejected **2.66M** · Warned (field dropped) **2.10M** · Duplicates collapsed **412k** · Threshold events **17 open / 63 total** · Systemic issues **3**.
4. **Grade distribution card** (left, 50%): two stacked horizontal bars — "Members by grade" (A 421 · B 498 · C 201 · D 68 · F 26) and "Records by grade" (A 61% · B 27% · C 8% · D 3% · F 1%), each with previous-period ghost bar for comparison.
5. **Movers card** (right, 50%): two ranked lists of 5 — "Largest DQI drops" and "Largest DQI rises" — columns member · DQI · Δ · records · cause chip (top rule code).
6. **Top quality issues table** (full width, 10 rows): Error code · Rule type · Field · Severity · Records · % of rejects · Δ vs prior · **Members affected** · First seen · tag "SYSTEMIC" when members affected ≥ 25. Default sort: members affected desc. Column header sort affordances.
7. **Threshold events queue** (full width, 6 visible rows, "View all 63"): Batch ID · Member · Stage · Observed vs configured failure % · Pause type / reason code · Status (New / Acknowledged / Linked to RCA) · Age · link "Open in File Monitoring".
8. **Portfolio DQI trend** (compact, full width, last): daily points, y-axis 0–100 with A–F grade bands lightly shaded, three lines — P90 (light), Median (navy), P10 (light) across members — plus channel toggle. Orange dashed line = platform default target 85.

### Screen 2 — Members

Server-paginated table (50 per page, "Showing 1–50 of 1,214"), default sort "Attention" desc. Toolbar: search, saved views ("My members", "Watchlist", "All"), export. Columns: ★ · Member · Source types · Channel mix (mini bar batch/API) · Records evaluated · DQI · Grade pill · Δ · Validity · Completeness · Dup & Integrity · Rejected % · Breaches · Last assessment · Attention score. Row click → Screen 5.

### Screen 3 — Issues

Table: Error code · Rule type (from catalogue) · Field · Severity · Records · % of rejects · Δ · Members affected (with 8-week sparkline) · First seen · Last seen · Systemic tag. Filter chips: Systemic only · Severity · Channel. Row expands inline: members-affected list (top 10), fields, masked sample record IDs (e.g. `4001-R0000015`), link "View rule in Profile Rule Catalogue".

### Screen 4 — Submissions

Segmented control: **Batches** | **API daily assessments**. Batches table (one row per batch): Batch ID · Member · Source type · Profile · Evaluated · Accepted · Rejected · Warned · DQI · Grade · Stage of first breach · Completed at · actions "DQI report" · "File Monitoring". API table (one row per member × source type × day): Assessment · Member · Source type · Records · Accepted % · Rejected · Top code · Trend sparkline.

### Screen 5 — Member detail (example: FNB — First National Bank, member ID FNB)

Header: member name, ID, tier, source types, contact, watchlist star, "Download scorecard". Tabs: **Trend** (single navy DQI line + acceptance rate line, grade bands, orange dashed portfolio median 86.9, hourly toggle for API) · **Dimensions** (three horizontal bars Validity 91 · Completeness 88 · Duplicates & Integrity 84, weight %, Δ) · **Issues** (member's top rules) · **Submissions** (its batches and API days) · **Events** (its threshold events).

### Report drawer

Slide-over from "Reports": report type (Member scorecard · Portfolio summary · Issue extract · Submission extract · Movers report), parameters, "Generate", and a jobs list (Queued / Running / Ready — Download, 100k-row cap notice).

## Mock data specification — must look real

Use these values verbatim where given; generate the rest consistently. Current date is **19 Aug 2026**.

**Scale**: 1,214 members; ~1.86M records/day (1.16M batch, 0.70M API); ~350 batches/day; month-end 3–4× batches.

**Member names** (Indian bank/NBFC/MFI style, ~40 named, rest generated): First National Bank (FNB), Metro Microfinance (MMF), Apex Finance (APX), Suryoday Small Finance Bank (SSFB), Kaveri Housing Finance (KHF), Northline NBFC (NLN), Deccan Gramin Bank (DGB), Vistara Capital (VSC), Sahyadri Co-op Bank (SCB), Bluestone Fintech (BSF), Prakash Leasing (PKL), Meridian Bank (MRB), Aarohan Microcredit (ARM), Konkan Urban Bank (KUB), Trident Consumer Finance (TCF), Godavari Rural Bank (GRB), Nexa Digital Lending (NXD), Shakti Women's MFI (SWM), Orion Credit (ORC), Pinnacle Auto Finance (PAF)…

**Identifiers** (exact formats):
- Batch ID `BATCH-{MEMBERID}-{YYYYMMDD}-{seq4}` e.g. `BATCH-FNB-20260819-0001`
- Intake ID `INTAKE-FNB-20260819-0001` · File ID numeric `4001` · Record ID `4001-R0000015`
- API submission reference `SUB-FNB-20260819-000123`
- Stage IDs: S11 File Transfer & Pre-Checks · S12 Batch Creation · S21 Profile Identification · S31 Data Model Mapping · S32 Normalisation & Transformation · **S33 Validation (DQI)** · S34 Business Logic · **S35 De-duplication** · S41 Identity Resolution · S51 Data Load · S52 Post-Load Reconciliation
- Pause types / reason codes: AUTO_VALIDATION / PAUSE-VAL-THRESHOLD; AUTO_SLA / PAUSE-TIME-THRESHOLD; MANUAL / PAUSE-OPERATOR; suspend reason SUS-DATA-QUALITY
- Source types (LOV): BANK_STATEMENT, INVESTMENT, MOBILE_MONEY, REMITTANCE, ECOMMERCE, MERCHANT_POS, TRADE_CREDIT, AGRICULTURAL, RENTAL, SUBSCRIPTION, TELECOM, UTILITY, INSURANCE, EMPLOYMENT, GST, LOANS, CARDS, MICROFINANCE, LEASING, HOUSING_FINANCE, BNPL, FRAUD_SIGNALS
- Profiles: `Loans master v3.2`, `Customer demographics v2.1`, `Collateral v1.4`, `Repayment schedule v2.0`, `Member master v1.9`, `Guarantor v1.1`, `KYC v2.3`
- Grade bands: A 90–100 · B 80–89 · C 70–79 · D 60–69 · F <60. DQI = Validity 40% + Completeness 35% + Duplicates & Integrity 25% (present as three dimensions).

**Error / rule codes** (use these, with rule type and severity):

| Code | Rule type | Field | Severity | Records (30d) | Members affected |
|---|---|---|---|---|---|
| ERR_FIELD_MANDATORY | Mandatory presence | nationalId | REJECT | 612,340 | 388 |
| VAL-PAN-FORMAT | Format compliance | pan | REJECT | 418,902 | 341 |
| MAP-MANDATORY-MISSING | Mapping (S31) | customerId | REJECT | 96,120 | **41 — SYSTEMIC** (first seen 12 Aug 2026, profile Loans master v3.2 change) |
| VAL-DOB-RANGE | Range | dateOfBirth | REJECT | 201,455 | 297 |
| ERR_FIELD_ENUM | Enum / code list | facilityType | REJECT | 188,010 | 262 |
| ERR_FIELD_CROSS | Cross-field | dpdDays / facilityStatus | REJECT | 143,880 | 219 |
| VAL-PHONE-FORMAT | Format compliance | mobile | WARNING | 704,220 | 455 |
| VAL-REF-INTEGRITY | Reference integrity | guarantorId | REJECT | 87,660 | 74 |
| DEDUP-KEY-MATCH | De-duplication (S35) | dedup key | INFO | 412,000 | 503 |
| VAL-GSTIN-CHECKDIGIT | Check-digit | gstin | WARNING | 52,310 | 88 |

**Movers (30d vs prior 30d)** — drops: Apex Finance 71.2 (▼9.4, VAL-PAN-FORMAT), Konkan Urban Bank 78.0 (▼6.1, MAP-MANDATORY-MISSING), Orion Credit 82.5 (▼5.3, ERR_FIELD_MANDATORY), Prakash Leasing 66.8 (▼4.9, VAL-REF-INTEGRITY), Nexa Digital Lending 84.1 (▼3.7, ERR_FIELD_ENUM). Rises: Metro Microfinance 81.6 (▲5.2), Shakti Women's MFI 88.9 (▲4.1), Deccan Gramin Bank 90.3 (▲3.8), Trident Consumer Finance 86.0 (▲2.9), Godavari Rural Bank 92.7 (▲2.2).

**Threshold events (sample rows)**: `BATCH-APX-20260819-0002` · Apex Finance · S33 Validation (DQI) · 54.2% vs 50% · AUTO_VALIDATION / PAUSE-VAL-THRESHOLD · New · 2h · | `BATCH-KUB-20260818-0001` · Konkan Urban Bank · S31 Data Model Mapping · 63.0% vs 50% · AUTO_VALIDATION · Acknowledged · 1d | `BATCH-PKL-20260818-0003` · Prakash Leasing · S35 De-duplication · 24.1% vs 20% (volume guard) · AUTO_VALIDATION · Linked to RCA · 1d | `BATCH-NLN-20260817-0001` · Northline NBFC · S33 · 51.8% vs 50% · AUTO_VALIDATION · Acknowledged · 2d | `BATCH-ORC-20260816-0002` · Orion Credit · S33 · Suspended · SUS-DATA-QUALITY · Closed · 3d.

**Member detail (FNB)**: DQI 95.8 grade A ▲0.8; 30-day trend between 90.5 and 95.8; 26 batches this period, 2 API source types; dimensions Validity 95 · Completeness 96 · Dup & Integrity 97; top issues VAL-PAN-FORMAT 312, ERR_FIELD_MANDATORY (customerId) 140, VAL-DOB-RANGE 118; no threshold events; latest batch `BATCH-FNB-20260819-0001` 18,420 evaluated / 17,490 accepted / 930 rejected.

**Trend shape**: portfolio median flat ~87 with a visible dip 12–14 Aug (the S31 mapping issue) and recovery; P10 line dips more sharply to ~74; P90 steady ~95. Member trends should have realistic day-to-day noise (±0.5–1.5) and weekend gaps for batch-only members.

## Interaction & state requirements

- Every KPI tile, table row, chart point and chip is a drill-down; show hover states and cursor affordances.
- Include: loading skeletons, empty state ("No assessments for the current filters"), and a member-scoped variant note (member users see only their institution; portfolio figures shown as anonymised percentiles).
- Tables: sticky header, column sort, pagination footer, row density consistent with screenshot.
- Show masked identifiers only; never render field values or PII.
- Last-refreshed timestamp under the page title: "Updated 19 Aug 2026, 09:42 IST · batch: event-driven · API: 60-second aggregates".

## Constraints

- Do not invent statuses, stages, error codes, or KPIs beyond those listed.
- No "schema drift" or "mapping drift" alert concepts, no anomaly-detection labelling; use threshold events and members-affected instead.
- Keep it to the five screens + report drawer; no extra dashboards.
- Deliver as clickable prototype frames in the same shell as the screenshot, desktop 1920×1080, with the shield nav item active on all screens.
