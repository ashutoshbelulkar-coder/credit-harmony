# Enquiry API monitoring — notes

Assumptions made while implementing the React ops console (not a disk-openable `index.html`):

- Delivered as `/monitoring/inquiry-api` inside the existing SPA, reusing DSAPI conventions (`ChartContainer` + Recharts, shadcn cards/tables/chips). Nav label remains **Inquiry API**; page heading is **Enquiry API**.
- Mock lives in TypeScript (`enquiryScaleMock.ts`) rather than `enquiry-mock.js`. `window.__enquiryMock` is attached in Vite DEV only.
- Pareto `code` is applied in the UI after `buildEnquirySnapshot`, so KPI cards and non-Pareto charts are stable for a given filter set.
- 60s refresh jitters only the latest time bucket (±2%) and advances **Data as of**; KPI totals stay on the base snapshot so the page does not flicker a full reseed.
- Live enquiry APIs are not overlaid (scale mock would be drowned by sparse backend rows). `?simulate=panelError|accessDenied|stale` demos error/stale chrome.
- Member ranking is capped at 400 rows when window is 90d and member is All.
- Compact numbers follow the DSAPI helper (K at ≥100k, M at ≥1M).
- Timestamps use the local timezone with an IST caption on the meta row (no separate IANA zone conversion).
