---
title: 'Add SAP item code to Product Configurator'
type: 'feature'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
context: []
---

# Add SAP item code to Product Configurator

## Intent

**Problem:** Product create/edit basics step had no place to capture an SAP item code used for billing reference.

**Approach:** Add an optional `sapItemCode` field on product metadata, wire it through authoring, review, detail, approval summary, version compare, and demo seed data.

## Suggested Review Order

1. [Product form field](../../src/pages/data-products/ProductFormPage.tsx) — step 1 input + review display; confirm optional labeling and trim-on-save
2. [Metadata type + store](../../src/data/product-management-types.ts) — `sapItemCode` on `ProductMetadata`; store normalize/default
3. [Detail + approval surfaces](../../src/pages/data-products/ProductDetailPage.tsx) — overview and approval metadata visibility
4. [Compare + seed](../../src/components/data-products/VersionComparePanel.tsx) — diff label and demo seed values
