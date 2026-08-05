# Deferred Work

## From: Add SAP item code (2026-08-05)

- Uniqueness validation for SAP item code across products/versions
- Format / length / charset rules for SAP item codes
- Catalogue and product-list search by SAP item code
- Link access-request `billingRef` to product SAP item code
- Bump demo `STORAGE_KEY` so localStorage picks up seeded SAP values without manual reset
- Include SAP (and other missing metadata) continuity warnings when cloning versions
- Surface SAP item code on Product Submit / pre-approval package beyond Approval Review
