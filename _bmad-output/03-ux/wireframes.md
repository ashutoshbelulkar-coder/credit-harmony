# Wireframes & interaction patterns — HCB Admin Portal

**Note:** This repository ships a **fully implemented** UI (shadcn/ui + Tailwind). This document specifies **structural wireframe intent** and **interaction patterns** so design changes stay aligned—**not** pixel-perfect Figma replacements.

---

## Global shell

| Zone | Content | Pattern |
|------|---------|---------|
| **Sidebar** | Module nav per `nav-config` | RBAC-aware sections; **Member Management** includes Register member |
| **Header** | Context, user, theme | Command palette entry for power users |
| **Main** | Page title + primary CTA + content | Avoid duplicate CTAs (e.g. register only in sidebar per PRD v2.15) |

---

## Pattern: Approval queue row

**Intent:** One row = one **actionable decision** with **entity context**.

```
[Type badge: Institution | Product | …]  [Title / name]
[IDs: institutionId / productId / …]      [Submitted / age]
[Preview: 1–2 lines of diff or summary]    [Approve] [Reject] [Request changes]
```

**Rules:**

- Click row or **View** → deep link to entity screen with `metadata` id.  
- **204** responses — optimistic or refetch; no JSON body.

---

## Pattern: Institution registration (stepper)

**Steps (logical):** Entity / regulatory / contact / participation / consortium → compliance (if required) → review.

**Review step:** Values use **`text-body`** with **template literal** class composition where `tailwind-merge` would drop tokens ([AGENTS.md](../../AGENTS.md)).

---

## Pattern: Data product — packet rows

- **One row per distinct source type within category** (catalogue order).  
- **Configure** opens **PacketConfigModal** for **all** selected packets in group — **Packet** switcher when multiple.  
- **Raw / Derived** tabs; **sr-only** dialog title for a11y.

---

## Pattern: Schema mapper wizard

- **Source Type** / **Data Category** from **`wizard-metadata`** — no hard-coded path strings in microcopy.  
- Loading and error states on metadata fetch.

---

## Pattern: Batch job detail

- **Preferred:** Phases → stages → segments → logs → error samples (when API provides).  
- **Fallback:** Flat stages — show **“limited detail”** messaging if phase tree absent.

---

## UX principles (recap)

1. Traceability over vanity metrics.  
2. Progressive disclosure.  
3. Bureau-native vocabulary.  
4. Policy errors in **plain language** + link to dictionary codes.

---

## Cross-references

- [design-guidelines.md](../design-guidelines.md)  
- [PRD-BRD §6](../PRD-BRD-HCB-Admin-Portal.md) screen requirements
