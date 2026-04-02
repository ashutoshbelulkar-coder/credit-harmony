# HCB Admin Portal — Design Guidelines
### Internal Design Audit + Documentation
**Version:** 1.1 — Reverse-engineered from codebase + implementation log  
**Audience:** Product, Design, Engineering  
**Status:** Living document — update on each sprint that touches UI

---

## 0. Implementation log

### April 2026 (design guideline remediation — phase 1)

**Shipped in code**

- **Control height:** `Button` default `h-9`, differentiated `sm` (`h-7`) and `icon` (`h-9 w-9`); `Input` and `SelectTrigger` use `h-9` and `text-body`.
- **Card:** Default `Card` surface uses `rounded-xl` (aligned with KPI/chart cards).
- **Empty state:** `EmptyState` typography uses semantic tokens (`text-h4`, `text-body`); icon wrapper is `aria-hidden`.
- **Status badges:** Institution lifecycle and user account status use `institutionLifecycleStatusBadgeClass` / `institutionLifecycleStatusLabel` and `userAccountStatusBadgeClass` / `userAccountStatusLabel` in [`src/lib/status-badges.ts`](src/lib/status-badges.ts). Consumers include member list, institution detail header, and institution Users tab. Removed `statusStyles` export from [`src/data/institutions-mock.ts`](src/data/institutions-mock.ts).
- **Sortable tables:** Member institutions list uses `<button type="button">` column headers with `aria-sort`.
- **Charts:** [`ChartContainer`](src/components/ui/chart.tsx) sets default `role="img"` and `aria-label` (override per chart when needed).
- **Toasts / header:** Sonner `containerAriaLabel="Notifications"`; notification bell `aria-label` reflects unread count; “Mark all read” uses `Button`.
- **Layout:** Skip link to `#main-content`; `<main id="main-content" tabIndex={-1}>`; mobile drawer wrapped with Radix `FocusScope` (`trapped`, `loop`).
- **Dashboard:** CSV export control uses `Button` instead of a raw `<button>`.
- **Monitoring:** [`MonitoringAlertBanner`](src/components/ui/monitoring-alert-banner.tsx) promoted to `src/components/ui/`.
- **Consortium wizard:** [`ConsortiumWizardPage`](src/pages/consortiums/ConsortiumWizardPage.tsx) uses `react-hook-form` + Zod + `<FormMessage>` for basic info, member count, and data visibility.

**Still open (see §12–§14)**

- Broad migration away from `text-sm` / `text-xs` across all pages; optional ESLint guard.
- Optional Storybook or token reference page; keyboard navigation for clickable `<tr>` rows beyond current patterns; further consolidation of other local `statusStyles` maps (products, batches, etc.).

**Documentation:** [EPIC-00 — Design System](User%20stories/EPIC-00-Design-System-Cross-Cutting.md), [INDEX](User%20stories/INDEX.md).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Design Philosophy](#2-current-design-philosophy)
3. [Layout & Structure](#3-layout--structure) (includes [§3.7 Theme](#37-light-and-dark-theme) and [§3.8 Responsive](#38-responsive-behaviour))
4. [Typography](#4-typography)
5. [Color System](#5-color-system)
6. [Component Inventory](#6-component-inventory)
7. [Table UX Patterns](#7-table-ux-patterns)
8. [Forms & Wizards](#8-forms--wizards)
9. [Workflow UX](#9-workflow-ux)
10. [State Handling](#10-state-handling)
11. [Accessibility Assessment](#11-accessibility-assessment)
12. [Design Consistency Audit](#12-design-consistency-audit)
13. [UX Gaps & Improvement Opportunities](#13-ux-gaps--improvement-opportunities)
14. [Recommended Standardization](#14-recommended-standardization)
15. [Design QA Checklist](#15-design-qa-checklist)

---

## 1. Executive Summary

### What Kind of Design System Currently Exists

The HCB Admin Portal operates on an **implicit, component-driven design system** built on top of **shadcn/ui** (Radix UI primitives) with a Tailwind CSS utility layer. The system is not formally documented but exhibits consistent conventions across most of the codebase. Design decisions are enforced primarily through:

- `tailwind.config.ts` — custom token definitions (font scale, spacing, colors)
- `src/index.css` — CSS custom properties (HSL-based semantic tokens)
- `src/lib/typography.ts` — central typography class exports
- `src/lib/status-badges.ts` — centralized status-to-badge mapping

### Maturity Level

**Mid-stage** — Approaching advanced in some areas, still early in others.

| Area | Maturity |
|---|---|
| Color system | ★★★★☆ — HSL variables, semantic names, light/dark tokens |
| Typography | ★★★☆☆ — Custom scale exists, but Tailwind defaults (`text-sm`, `text-xs`) still leak in |
| Component library | ★★★★☆ — shadcn/ui primitives + custom wrappers; default/`sm` Button heights differentiated (Apr 2026) |
| Status badges | ★★★★★ — `status-badges.ts` covers API/enquiry/report + institution lifecycle + user account (Apr 2026) |
| Layout patterns | ★★★★☆ — Consistent shell, minor responsive gaps |
| State handling | ★★★★☆ — Loading/error/empty covered, not fully standardized |
| Accessibility | ★★★★☆ — Sortable `<th>` buttons, chart `role="img"`, skip link, mobile drawer focus scope, richer toast/bell labels (Apr 2026); some tables still use row `onClick` only |
| Documentation | ★☆☆☆☆ — Nearly none (this document fills the gap) |

### Key Strengths

- **Semantic color tokens** with light/dark variants for every state (success, warning, danger, info)
- **Centralized status badge logic** — single source of truth for all status → color → label mappings
- **Consistent page-level structure** — `text-h2 font-semibold` headings + `text-caption text-muted-foreground` subtitles across all pages
- **Data-dense KPI cards** with a well-defined pattern (icon, value, delta, comparison label)
- **Dark mode** — fully implemented with CSS variable swap, not a bolt-on
- **Print styles** — sidebar/header hidden on `@media print`
- **Reduced motion** — `prefers-reduced-motion` handled globally in `index.css`

### Key Gaps

- **Typography inconsistency** — Many pages still mix `text-sm` / `text-xs` (Tailwind defaults) alongside the semantic scale (`text-body`, `text-caption`); `EmptyState` and core inputs now use tokens (Apr 2026).
- **No design token documentation** — engineers must read `tailwind.config.ts` and `index.css` to discover tokens (optional Storybook/token page still outstanding).
- **No motion/animation design language** — animations exist (`fade-in`, `slide-in-right`, `float`) but are not systematically documented.
- **Clickable table rows** — several lists use `onClick` on `<tr>` without full keyboard parity; member list sort headers fixed (Apr 2026).

---

## 2. Current Design Philosophy

### Inferred Philosophy

> **Data-dense, operator-centric, monitoring-first SaaS** — Built for bureau admins who live in dashboards and need information density over whitespace. The UX privileges scannable tables, persistent sidebar navigation, and semantic status signaling over visual decoration.

### Key Evidence

| Principle | Evidence in Code |
|---|---|
| **Information density** | KPI cards use `text-h1` (22px) for values but `text-caption` (10px) for labels — maximizes data per pixel |
| **Semantic status everywhere** | 5 distinct badge systems (API, Enquiry, Report, Institution, Approval), each with 4–6 states |
| **Dark-sidebar navigation** | Sidebar uses `hsl(222 47% 11%)` background — high-contrast nav against lighter content area |
| **Teal/green as "action" signal** | Secondary color `hsl(175 60% 40%)` (teal-green) used for sidebar active state, success KPIs — bureau "health" color |
| **Card-based sectioning** | Nearly every data group is wrapped in `rounded-xl border border-border bg-card` |
| **Progressive disclosure** | Sidebar collapses to icon-only; sub-navigation expands inline; schema wizard has 7 steps with a step indicator |
| **Keyboard-power-user features** | Command palette (`⌘K`) for full navigation, reducing mouse dependency |

---

## 3. Layout & Structure

### 3.1 App Shell

The application shell follows a **fixed sidebar + scrollable content** pattern:

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (w-64 / w-16 collapsed) │  Header (h-16)     │
│  sidebar-gradient background     │  sticky top-0      │
│  sticky top-0, h-screen          ├────────────────────┤
│  ──────────────────────────────  │  <main>            │
│  Logo (h-16)                     │  p-4 sm:p-6        │
│  nav (flex-1, overflow-y-auto)   │  overflow-y-auto   │
│  Collapse toggle (h-12)          │  overscroll-y-cont │
└──────────────────────────────────────────────────────┘
```

**Implementation:** `DashboardLayout.tsx`
- Sidebar: `w-64` expanded, `w-16` collapsed, `transition-all duration-300`
- Content area: `flex flex-1 flex-col min-h-0`
- Main scroll: single scroll axis — `body { overflow: hidden }`, `main { overflow-y-auto }`
- Mobile: Sidebar becomes a full-screen drawer with a `bg-black/50` backdrop

**Special case:** Agent detail pages (`/agents/:id/...`) suppress the header and use `overflow-hidden` — immersive fullscreen chat layout.

### 3.2 Sidebar Structure

| Zone | Height | Content |
|---|---|---|
| Logo zone | `h-16` | Brand mark + name (hidden when collapsed) |
| Navigation | `flex-1` | 9 top-level nav items, 5 with sub-navigation |
| Collapse toggle | `h-12` | `ChevronLeft` / `ChevronRight` icon button |

**Sub-navigation behavior:**
- Accordion-style: at most one section open at a time
- Section follows route automatically via `useEffect` + `sectionIdFromPathname()`
- Collapsed state: sub-items become a `DropdownMenu` flyout (Radix)
- Active item: `bg-sidebar-accent text-sidebar-primary` + dot indicator (`w-1.5 h-1.5 rounded-full`)
- Sub-item active: `bg-sidebar-accent/80` + smaller dot (`w-1 h-1`)

### 3.3 Header Structure

```
[Mobile menu] [Search (⌘K)] [ml-auto] [Theme toggle] [Notifications] [User avatar]
```

- Height: `h-16`, `sticky top-0 z-20`
- Search: Full-width button (max 448px), opens CommandPalette on click
- Notifications: Popover with badge count (`bg-destructive rounded-full`)
- User: Avatar + email/role (hidden on mobile) + dropdown

### 3.4 Page-Level Structure

All standard content pages follow this exact pattern:

```tsx
// Standard page header
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h1 className="text-h2 font-semibold text-foreground">{title}</h1>
    <p className="text-caption text-muted-foreground mt-1">{description}</p>
  </div>
  <div className="flex items-center gap-2">
    {/* Action buttons */}
  </div>
</div>
```

Observed across: `Dashboard.tsx`, `InstitutionList.tsx`, `MonitoringLayout.tsx`, `ConsortiumListPage.tsx`, `UsersListPage.tsx`, `ApprovalQueuePage.tsx`.

**Spacing between sections:** `space-y-6` (standard) or `space-y-6 md:space-y-8 laptop:space-y-6 desktop:space-y-8` (responsive dashboard).

### 3.5 Grid Patterns

| Usage | Grid definition |
|---|---|
| KPI cards (4-up) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 laptop:grid-cols-12` (each col: `laptop:col-span-3`) |
| Dashboard command center | `lg:grid-cols-12` with `lg:col-span-5` / `lg:col-span-7` splits |
| API usage charts | `lg:grid-cols-12` with 8/4 split |
| General form layout | No CSS grid — uses stacked `space-y-4` or `gap-4` flex rows |

### 3.6 Custom Breakpoints

Beyond standard Tailwind, the config adds:

| Name | Value | Purpose |
|---|---|---|
| `laptop` | 1200px | Tighter spacing on common laptop screens |
| `desktop` | 1440px | Larger typography/spacing on wide monitors |

**Inconsistency:** `laptop` breakpoint used only in `Dashboard.tsx` and `DashboardCharts.tsx`. Other pages use only `sm`/`md`/`lg`/`xl` — the custom breakpoints are not adopted app-wide.

### 3.7 Light and dark theme

- **Mechanism:** The SPA uses **next-themes** with a **class** on the root (`dark`) so [`src/index.css`](src/index.css) can swap HSL custom properties. The header exposes **Light / Dark / System** in a dropdown.
- **Tokens:** Core semantic variables (`--background`, `--foreground`, `--card`, `--primary`, etc.) are defined in **light and dark** columns in [§5.1](#51-core-palette-hsl-tokens-indexcss). Sidebar uses a dedicated dark-blue strip (`--sidebar-*`) in both themes for contrast with the content area.
- **Components:** shadcn primitives consume CSS variables, so components do not hard-code light-only colours.

### 3.8 Responsive behaviour

- **Shell:** Below `md`, the sidebar becomes a **full-height drawer** with a `bg-black/50` scrim; the header includes a **mobile menu** control. Main content uses responsive padding (`p-4 sm:p-6`).
- **Page headers:** Standard pattern stacks vertically below `sm` (`flex-col` → `sm:flex-row`).
- **Breakpoints:** Default Tailwind plus **`laptop` (1200px)** and **`desktop` (1440px)** for dashboard density; see §3.6 for adoption gaps.
- **Touch:** Header controls use at least **44×44px** touch targets on small viewports where noted (e.g. notification bell).
- **QA:** See §15.3 for the responsiveness checklist.

---

## 4. Typography

### 4.1 Font Stack

```css
font-family: "Inter", system-ui, sans-serif;
```

Inter is loaded from Google Fonts with weights: 300, 400, 500, 600, 700, 800.

### 4.2 Semantic Type Scale (Custom — `tailwind.config.ts` `extend.fontSize`)

These are the **intended** type tokens:

| Token | Size | Line Height | Typical Use |
|---|---|---|---|
| `text-display` | 26px | 32px | Reserved — not seen in production pages |
| `text-h1` | 22px | 29px | KPI card values |
| `text-h2` | 19px | 26px | Page titles (all pages) |
| `text-h3` | 16px | 22px | Card section headings |
| `text-h4` | 14px | 21px | Chart headings, sub-section titles |
| `text-body` | 11px | 18px | Table cells, sidebar items, form labels |
| `text-body-dense` | 10px | 16px | Compact data cells |
| `text-caption` | 10px | 14px | Timestamps, helper text, KPI subtitles |
| `text-label` | 10px | 13px | Form field labels (uppercase contexts) |

### 4.3 Overridden Base Scale

The Tailwind base font scale is also overridden:

| Token | Size | Note |
|---|---|---|
| `text-xs` | 9px / 12px | Very small — avoid |
| `text-sm` | 0.7rem / 1rem | Used as ~11px |
| `text-base` | 0.8rem / 1.2rem | Used as ~12.8px |
| `text-lg` | 0.9rem / 1.4rem | Rarely used |
| `text-xl` | 1rem / 1.4rem | Rarely used |

### 4.4 Observed Typography in Pages

**Correctly uses semantic scale (✓):**
- All page `<h1>` elements: `text-h2 font-semibold`
- All page subtitles: `text-caption text-muted-foreground`
- All table headers: `text-[10px] leading-[13px]` via `tableHeaderClasses` in `typography.ts`
- Badge text: `text-[10px] leading-[14px]` via `badgeTextClasses`
- KPI values: `text-h1 font-bold`
- KPI labels: `text-caption font-medium uppercase tracking-[0.08em]`

**Inconsistently uses Tailwind defaults (✗):**
- `EmptyState.tsx`: `text-sm` for title, `text-sm` for description — should be `text-body`
- `AppHeader.tsx` notifications panel: `text-sm font-semibold`, `text-xs`, `text-[10px]` — mixed
- `ApprovalQueuePage.tsx`: `text-sm` in notification title inside popover
- `InstitutionDetail.tsx`: `text-sm` used in 7 places alongside semantic tokens
- `ConsentConfigTab.tsx`: `text-sm` and `text-xs` used extensively (12 occurrences)
- `UsersTab.tsx`: `text-sm` used 16 times
- `BillingTab.tsx`: `text-xs` and `text-sm` mixed with semantic scale

**Root cause:** `shadcn/ui` base components (like `Table`, `Card`) ship with `text-sm` hardcoded, and several pages use shadcn table components without overriding to the custom scale.

### 4.5 Font Weight Conventions

| Weight | Token | Usage |
|---|---|---|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Table cells, badges, nav items |
| 600 | `font-semibold` | Page headings, card titles |
| 700 | `font-bold` | KPI values |

---

## 5. Color System

### 5.1 Core Palette (HSL tokens, `index.css`)

| Token | Light Mode HSL | Dark Mode HSL | Hex approx. (Light) |
|---|---|---|---|
| `--primary` | `214 78% 20%` | `175 60% 40%` | `#0A3161` (deep navy) |
| `--secondary` | `175 60% 40%` | `214 78% 20%` | `#29998F` (teal) |
| `--accent` | `175 50% 45%` | `175 50% 35%` | `#3AA89D` |
| `--background` | `220 20% 97%` | `222 47% 8%` | `#F3F5F9` |
| `--foreground` | `222 47% 11%` | `210 40% 95%` | `#0E1729` |
| `--card` | `0 0% 100%` | `222 47% 11%` | `#FFFFFF` |
| `--muted` | `220 14% 92%` | `222 30% 18%` | `#E8EAEF` |
| `--muted-foreground` | `220 9% 46%` | `220 14% 60%` | `#6B7280` |
| `--border` | `220 13% 88%` | `222 30% 18%` | `#DCDFE6` |

### 5.2 Semantic Color Tokens

Each semantic color has 4 variants: `DEFAULT`, `foreground`, `light`, `subtle`.

| Semantic | DEFAULT HSL | Light HSL | Subtle HSL | Meaning |
|---|---|---|---|---|
| `--success` | `152 60% 42%` | `152 60% 96%` | `152 50% 92%` | Active, approved, pass |
| `--warning` | `38 92% 50%` | `38 92% 96%` | `38 85% 88%` | Pending, rate limited, degraded |
| `--danger` | `0 72% 51%` | `0 72% 96%` | `0 65% 92%` | Suspended, failed, critical |
| `--info` | `210 80% 52%` | `210 80% 96%` | `210 70% 90%` | Changes requested, informational |
| `--destructive` | `0 72% 51%` | — | — | Destructive actions (alias of danger) |
| `--crif-orange` | `24 95% 53%` | — | — | Brand accent (appears in badge for env type) |

**Note:** `--danger` and `--destructive` are duplicates (same HSL values). This is intentional — `destructive` follows shadcn/ui convention for button/alert APIs, while `danger` is used for custom status badges.

### 5.3 Chart Colors

| Token | HSL | Semantic Mapping |
|---|---|---|
| `--chart-1` | `214 78% 20%` | Primary line (API volume) |
| `--chart-2` | `152 55% 40%` | Success line |
| `--chart-3` | `38 92% 50%` | Warning/P99 latency line |
| `--chart-4` | `225 20% 65%` | Neutral series |
| `--chart-5` | `210 16% 35%` | Secondary neutral |

### 5.4 Sidebar-Specific Tokens

The sidebar has its own complete color subsystem:

| Token | Value |
|---|---|
| `--sidebar-background` | `222 47% 11%` (deep dark blue) |
| `--sidebar-foreground` | `220 14% 80%` (light gray) |
| `--sidebar-primary` | `175 60% 40%` (teal — active indicator) |
| `--sidebar-accent` | `222 40% 16%` (hover/active bg) |
| `--sidebar-border` | `222 30% 18%` |

### 5.5 Status → Badge Color Mapping (from `status-badges.ts`)

| Status | Badge Background | Text Color |
|---|---|---|
| `success` | `bg-success/20` | `text-success` |
| `failed` | `bg-destructive/20` | `text-destructive` |
| `partial` | `bg-warning/20` | `text-warning` |
| `rate_limited` | `bg-warning/20` | `text-warning` |
| `authentication_failed` | `bg-destructive/20` | `text-destructive` |
| `pending` | `bg-warning/15` | `text-warning` |
| `approved` | `bg-success/15` | `text-success` |
| `rejected` | `bg-destructive/15` | `text-destructive` |
| `changes_requested` | `bg-info/15` | `text-info` |
| `queued` | `bg-warning/15` | `text-warning` |
| `processing` | `bg-primary/20` | `text-primary` |

**Note:** Opacity variants (`/15`, `/20`, `/25`) are used as badge backgrounds — tinted chips rather than solid fills. This is consistent throughout `status-badges.ts` but **varies** in inline implementations (e.g., `InstitutionDetail.tsx` uses `/15`, `UsersListPage.tsx` uses `/20` for similar statuses).

### 5.6 Environment Badge Colors

Defined as raw CSS variables (not mapped to a component):

| Environment | Token | Color |
|---|---|---|
| Sandbox | `--badge-sandbox` | `38 92% 50%` (amber) |
| UAT | `--badge-uat` | `262 52% 47%` (purple) |
| Production | `--badge-prod` | `152 60% 42%` (green) |

**Gap:** These tokens exist in CSS but no `Badge` variant or utility class maps to them. Usage is ad-hoc per component.

### 5.7 Color Inconsistencies

| Issue | Location | Impact |
|---|---|---|
| `status: "Active"` uses `bg-success/15` but `"active"` also uses `bg-success/15` — duplicated map keys for same status | `InstitutionDetail.tsx` lines 62–70 | Medium — redundant, fragile |
| `statusStyles` defined twice | `InstitutionList.tsx` imports from `institutions-mock.ts`; `InstitutionDetail.tsx` redefines inline | Medium — drift risk |
| User status `Active` = `bg-success/20` vs institution status `active` = `bg-success/15` | `UsersListPage.tsx` vs `InstitutionList.tsx` | Low — visual difference in chip opacity |
| `info` color used for `changes_requested` badge in approval queue but not in status-badges.ts | `ApprovalQueuePage.tsx` statusConfig | Low — isolated |

---

## 6. Component Inventory

### 6.1 Buttons

**Base component:** `src/components/ui/button.tsx` (CVA-based)

| Variant | Class | Primary Use |
|---|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` | Primary CTAs (Submit, Save, Create) |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | Irreversible actions (Suspend, Delete) |
| `outline` | `border border-input bg-background hover:bg-accent` | Secondary CTAs (Export CSV, Previous/Next pagination) |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` | Rarely seen in pages |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` | Icon-only table row action triggers |
| `link` | `text-primary underline-offset-4 hover:underline` | Inline text navigation |

**Sizes:**

| Size | Height | Padding | Font | Note |
|---|---|---|---|---|
| `default` | `h-8` | `px-3` | `text-[10px]` | Same dimensions as `sm` — **gap** |
| `sm` | `h-8` | `px-3` | `text-[10px]` | Identical to default — **non-functional size** |
| `lg` | `h-10` | `px-6` | `text-[13px]` | Login form submit |
| `icon` | `h-8 w-8` | `p-0` | SVG 16×16 | Table row action buttons |

**Inconsistency:** `default` and `sm` sizes are pixel-identical. The size distinction carries no visual weight.

**Non-Button CTAs observed in pages:**
- `Dashboard.tsx` export button: raw `<button>` with `h-7 px-2.5 rounded-md border` — bypasses the Button component
- `AppHeader.tsx` "Mark all read": raw `<button>` with inline Tailwind — not using Button component
- Sidebar items: `<NavLink>` / `<button>` with custom classes — intentionally not Button (correct)

### 6.2 Inputs

**Base component:** `src/components/ui/input.tsx`

- Height: `h-10` (40px — larger than buttons at 32px)
- Border: `border border-input` → `hsl(220 13% 88%)`
- Focus ring: `ring-2 ring-ring ring-offset-2`
- Font: `text-base md:text-sm` (Tailwind defaults — not the custom semantic scale)
- Placeholder: `text-muted-foreground`

**Pattern for search inputs** (used in InstitutionList, UsersListPage, and others):
```tsx
<div className="flex-1 max-w-sm relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  <Input placeholder="Search..." className="pl-10" />
</div>
```

**Inconsistency:** Input height is `h-10` (40px) while `Button default/sm` is `h-8` (32px). A search + filter row where an Input sits next to a Select sits next to a Button will have uneven heights.

### 6.3 Select

**Component:** `src/components/ui/select.tsx` (Radix Select)

- Standard width: `w-[160px]` for status filters
- Usage pattern: always `<Select value={...} onValueChange={...}>` with a controlled state
- Seen in: InstitutionList, UsersListPage, ApprovalQueuePage, MonitoringFilterBar, NewReportRequestPage

### 6.4 Cards

**Base component:** `src/components/ui/card.tsx`

- Base: `rounded-lg border bg-card text-card-foreground shadow-sm`
- `CardHeader`: `flex flex-col space-y-1 p-4`
- `CardTitle`: `text-[12px] font-semibold tracking-tight` — **hardcoded**, not using custom scale
- `CardContent`: `p-4 pt-0`

**Dashboard KPI cards override the base card** — they use raw div with `rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]` and `hover:border-primary/30` — showing the navigable card pattern.

**Inconsistency:** Base `Card` uses `rounded-lg`, while KPI and chart cards use `rounded-xl`. There is no formal distinction in the design language for when each is used.

### 6.5 Badges

**Base component:** `src/components/ui/badge.tsx` (CVA-based)

| Variant | Usage |
|---|---|
| `default` | Primary-colored tag (rarely used directly) |
| `secondary` | Teal-colored tag |
| `destructive` | Error state tag |
| `outline` | Borderless text badge |

**In practice, almost no page uses the Badge component directly for status.** Instead, status coloring is applied via:
1. `src/lib/status-badges.ts` functions → className string on a `<span>` or `<Badge>`
2. Inline `statusStyles` records mapping status key → Tailwind classes
3. Direct inline `cn("bg-success/15 text-success ...")` strings

This means the `badgeVariants` CVA in `badge.tsx` is not the canonical status system — it's a structural container only.

### 6.6 Tables

Two distinct table implementations coexist:

**Pattern A: Raw HTML `<table>` (InstitutionList, ApprovalQueuePage items with custom layout)**
```tsx
<table className="w-full min-w-max">
  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
    <tr className="border-b border-border">
      <th className={cn("px-5 py-3", tableHeaderClasses)}>...</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-border">
    <tr className="hover:bg-muted/30 cursor-pointer transition-colors">
      <td className="px-5 py-4">...</td>
    </tr>
  </tbody>
</table>
```

**Pattern B: shadcn `<Table>` components (UsersListPage, ApprovalQueuePage)**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>...</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>...</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

See Section 7 for full table UX analysis.

### 6.7 Modals / Dialogs

**Dialog** (`src/components/ui/dialog.tsx` — Radix Dialog): Used for confirmations, user invite, schema detail, API key generation.

**AlertDialog** (`src/components/ui/alert-dialog.tsx`): Used for destructive confirmations — suspend institution, suspend user. Pattern:
```tsx
<AlertDialogContent>
  <AlertDialogHeader>
    <AlertDialogTitle>Suspend Institution</AlertDialogTitle>
    <AlertDialogDescription>...</AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
    <AlertDialogAction className="bg-destructive ...">Suspend</AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

**Sheet** (`src/components/ui/sheet.tsx` — Radix Sheet): Used for detail drawers (UserDetailDrawer, EnquiryDetailDrawer, RequestDetailDrawer, chat history sidebar in AgentChatWorkspace). Slides in from the right.

**Popover** (`src/components/ui/popover.tsx`): Used for notifications panel, date picker, consortium member picker.

### 6.8 Tabs

**Component:** `src/components/ui/tabs.tsx` (Radix Tabs)

Two visual styles observed:

**Style A — Institution Detail page tabs** (custom pills, not using standard Tabs variant):
```tsx
// Horizontal scroll container with custom button styling
<button className={cn(detailPageTabTriggerBaseClasses, isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{tab}</button>
```
`detailPageTabTriggerBaseClasses` = `"rounded-lg px-2.5 py-1.5 text-[11px] leading-[18px] font-medium whitespace-nowrap"`

**Style B — Standard Radix Tabs** (ApprovalQueuePage, DashboardCharts, AgentChatWorkspace):
```tsx
<Tabs value={tab} onValueChange={setTab}>
  <TabsList><TabsTrigger value="all">All</TabsTrigger>...</TabsList>
  <TabsContent value="all">...</TabsContent>
</Tabs>
```

**Inconsistency:** Two tab patterns in production. The custom pill pattern (`detailPageTabTriggerBaseClasses`) exists because InstitutionDetail has 10+ tabs and needs horizontal scroll — Radix TabsList doesn't scroll natively.

### 6.9 Sidebar

See Section 3.2 for full sidebar documentation.

### 6.10 Header

See Section 3.3 for full header documentation.

### 6.11 Charts

**Library:** Recharts, wrapped via `src/components/ui/chart.tsx` (shadcn chart wrapper).

Chart types in use:

| Type | Used In | Component |
|---|---|---|
| `LineChart` | API usage trend, SLA latency, processing throughput | `DashboardCharts.tsx`, `ProcessingThroughputCard` |
| `BarChart` | Data quality, rejection/override, match confidence | `DashboardCharts.tsx`, `MemberDataQualityCard` |
| `PieChart` | Success/failure distribution, API distribution | `DashboardCharts.tsx`, `InstitutionDetail.tsx` |
| `AreaChart` | Not observed in current codebase | — |

**Chart card pattern:**
```tsx
<div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] h-full flex flex-col">
  <header>
    <h2 className="text-h4 font-semibold text-foreground">{heading}</h2>
    <p className="mt-1 text-caption text-muted-foreground">{sub}</p>
  </header>
  <ChartContainer config={config} className="h-[200px] ... w-full">
    ...
  </ChartContainer>
</div>
```

Chart height is responsive: `h-[200px] md:h-[240px] laptop:h-[260px] desktop:h-[280px]`

### 6.12 Breadcrumbs

**Component:** `src/components/PageBreadcrumb.tsx`

- Uses `text-caption` for all segments
- Segments: array of `{ label, href? }` — last segment is current page (no href)
- Used on: RegisterInstitution, InstitutionDetail, ApprovalQueuePage, SchemaMapper wizard, ConsortiumWizardPage

### 6.13 Command Palette

**Trigger:** `⌘K` / `Ctrl+K` or clicking the search bar in header
- Uses Radix `CommandDialog`
- Grouped results: Navigation, Data Products, Data Governance, Monitoring, Institutions (dynamic), Consortiums (dynamic)
- Dynamic institution/consortium results loaded only when palette is open (lazy fetch)

### 6.14 Empty State

**Component:** `src/components/EmptyState.tsx`

```tsx
<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
    <Icon className="h-6 w-6 text-muted-foreground" />
  </div>
  <h3 className="text-sm font-semibold text-foreground">{title}</h3>  {/* ← uses text-sm, not text-body */}
  <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>  {/* ← same */}
  <Button variant="outline" size="sm" className="mt-4">...</Button>
</div>
```

**Gap:** Uses `text-sm` (Tailwind default) rather than `text-body` (semantic token). Should be updated to be consistent.

### 6.15 Loading Skeletons

**Components:** `src/components/ui/skeleton-table.tsx`

Two variants:
- `SkeletonTable`: Mimics a table with header + n rows × m columns
- `SkeletonKpiCards`: Mimics KPI card row (n cards)

Both use `rounded-xl border border-border bg-card` outer shell matching real card style. Skeleton cells use `bg-muted animate-pulse` (from base Skeleton component).

### 6.16 Alert/Banner Component

**Component:** `src/pages/monitoring/MonitoringAlertBanner.tsx`

Three severity types: `info`, `warning`, `critical`

| Type | Border | Background | Icon |
|---|---|---|---|
| `info` | `border-primary/50` | `bg-primary/5` | `Info` (blue) |
| `warning` | `border-warning/50` | `bg-warning/5` | `AlertTriangle` (amber) |
| `critical` | `border-destructive/50` | `bg-destructive/5` | `AlertCircle` (red) |

**Gap:** This component lives in `pages/monitoring/` rather than `components/ui/`. It should be promoted to the shared component library.

---

## 7. Table UX Patterns

### 7.1 Current Implementation

**Two table patterns** coexist with no formal policy for when to use each:

| Attribute | Pattern A (Raw HTML) | Pattern B (shadcn `<Table>`) |
|---|---|---|
| **Used in** | InstitutionList, schema mapper tables | UsersListPage, ApprovalQueuePage |
| **Header sticky** | Yes — `sticky top-0 z-10 bg-muted/95 backdrop-blur` | Not sticky |
| **Header style** | Custom `tableHeaderClasses` from `typography.ts` | `TableHead` — uses shadcn default `text-sm` |
| **Row hover** | `hover:bg-muted/30 cursor-pointer transition-colors` | `TableRow` — uses shadcn default hover |
| **Cell padding** | `px-5 py-4` (20px / 16px) | `TableCell` — uses shadcn defaults (`p-4`) |
| **Typography** | `text-body` semantic token | Inherits `text-sm` from shadcn base |

### 7.2 Sorting

Implemented in InstitutionList (client-side). Pattern:
```tsx
type SortKey = "name" | "institutionType" | ...
const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
const [sortDir, setSortDir] = useState<SortDir>("desc");
```

Sort icons: `ArrowUpDown` (neutral) → `ArrowUp` or `ArrowDown` (active). Icons are `w-3 h-3`.

**Gap:** Sort headers use `<span onClick>` inside `<th>` rather than a proper `<button>` — not keyboard accessible.

### 7.3 Filtering

Standard filter pattern:

```
[Search input (max-w-sm, with left icon)] [Status Select (w-[160px])] [Additional filters...]
```

- Filters are applied client-side (from already-fetched data)
- Fetch is done at `size=200` to get all records upfront
- Filtering resets pagination to page 1

**Gap:** No debounce on search input — filtering runs on every keypress. Acceptable at ≤200 rows but could be laggy with larger datasets.

### 7.4 Pagination

**Client-side pagination** (InstitutionList `PAGE_SIZE=5`, UsersListPage `PAGE_SIZE=10`)

Footer pattern:
```
Showing 1–5 of 23 institutions    [Previous] [1 / 5] [Next]
```
- Buttons: `Button variant="outline" size="sm"` with `disabled` states
- Counter: `text-caption text-muted-foreground`
- Located inside the card, separated by `border-t border-border`

**Gap:** No server-side pagination for large datasets. The `size=200` fetch is documented as intentional but will degrade at scale.

### 7.5 Row Actions

**Pattern:** `DropdownMenu` triggered by `MoreHorizontal` icon button in the last column.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-40">
    <DropdownMenuItem><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
    <DropdownMenuItem><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
    <DropdownMenuItem className="text-destructive focus:text-destructive">
      <Ban className="w-3.5 h-3.5 mr-2" /> Suspend
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- `e.stopPropagation()` prevents row click (navigate to detail) from firing when dropdown opens
- Destructive items: `className="text-destructive focus:text-destructive"`

### 7.6 Inline Data Enrichment

| Pattern | Example | Implementation |
|---|---|---|
| Progress bar for SLA | Institution list SLA Health column | `w-16 h-1.5 bg-muted rounded-full` with colored fill div |
| Avatar initials | Users list | `Avatar` + `AvatarFallback` with user initials |
| Status badge | Every list | Pill span with semantic color classes |

### 7.7 Gaps vs Best Practices

| Best Practice | Current Status | Severity |
|---|---|---|
| Column sort via keyboard (`<button>` inside `<th>`) | `<span onClick>` — not keyboard accessible | Medium |
| Server-side pagination | Client-side, `size=200` fetch | Low (acceptable now) |
| Debounced search | Not debounced | Low |
| Sticky headers in shadcn Table variant | Not implemented | Low |
| Consistent cell padding across both table patterns | `px-5 py-4` vs shadcn `p-4` — different | Medium |
| Export button in table header (not just page header) | Export is in page header, consistent | Good |
| Loading state uses skeleton | `SkeletonTable` used correctly | Good |
| Empty state in table | `EmptyState` in `<td colSpan>` | Good |

---

## 8. Forms & Wizards

### 8.1 Institution Registration Wizard (3-Step)

**Route:** `/institutions/register`
**Component:** `RegisterInstitution.tsx`

**Steps:**
| Step | Title | Icon | Content |
|---|---|---|---|
| 0 | Corporate Details | `Building2` | Metadata-driven form fields from `GET /api/v1/institutions/form-metadata` |
| 1 | Compliance Documents | `FileText` | File upload per `requiredComplianceDocuments` (conditional — skipped if empty) |
| 2 | Review & Submit | `Eye` | Read-only field summary + submit |

**Step Indicator Pattern:**
```tsx
// Horizontal step indicators with icon + title + connector lines
{steps.map((step, i) => (
  <div key={i} className="flex items-center">
    <div className={cn("rounded-full w-8 h-8 flex items-center justify-center",
      i < currentStep ? "bg-success text-success-foreground" :
      i === currentStep ? "bg-primary text-primary-foreground" :
      "bg-muted text-muted-foreground")}>
      {i < currentStep ? <Check /> : <step.icon />}
    </div>
    {/* Connector line */}
  </div>
))}
```

**Form Fields:**
- Uses `react-hook-form` + `zodResolver` for validation
- shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormMessage>` wrappers
- Field types: `input`, `select`, `checkbox`, `multi-select` (custom Popover + Command combo)
- Registration Number: `readOnly` — visually distinguished via `bg-muted`

**Good patterns:**
- Inline validation messages via `<FormMessage>` (Zod errors surfaced per-field)
- `isPending` spinner on submit button during API call
- Back navigation preserves form state
- Step 3 review renders field values with `text-body text-foreground` — matches body text style

**Friction points:**
- Multi-select uses a Popover + Command component — unusual UX pattern for a form field; no `<select multiple>` equivalent
- No progress save (refresh = lost data)
- `registrationNumber` is read-only but still part of the form — unclear to users it's auto-assigned

### 8.2 Schema Mapper Wizard (7-Step)

**Route:** `/data-governance/auto-mapping-review`
**Component:** `WizardContainer.tsx` with `StepIndicator.tsx`

**Steps:**
1. Source Ingestion
2. Multi-Schema Matching
3. LLM Field Intelligence
4. Validation Rules
5. Semantic Insights
6. Storage & Visibility
7. Governance Actions

**Step Indicator:** `StepIndicator.tsx` — horizontal progress dots/numbers.

This wizard is the most complex UX flow in the application. It mixes:
- API calls between steps (async job creation after Step 1)
- LLM-generated suggestions (Step 3)
- Complex data grid for field mapping (Step 2)
- Drawer sub-panels (`EnumReconciliationDrawer`, `MasterFieldDrawer`)

**Good patterns:**
- `Breadcrumb` navigation at top of wizard for context
- Cancel (`X`) button with confirmation
- Each step is a contained component — good separation
- `ConfirmationStep` at end summarizes all decisions

**Friction points:**
- 7 steps is long — no ability to jump back to a specific step freely
- LLM suggestions step has no "skip" affordance if LLM is unavailable
- No auto-save between wizard steps

### 8.3 Consortium Wizard (4-Step)

**Route:** `/consortiums/create` or `/consortiums/:id/edit`
**Component:** `ConsortiumWizardPage.tsx`

**Steps:**
1. Basic Info (name, description, type)
2. Members (multi-select from subscriber institutions)
3. Data Policy
4. Review

**Pattern:**
- Step header: `steps.map()` with horizontal pill indicators using `Check` icon for completed steps
- Form validation: manual state (no react-hook-form — different from Institution wizard)
- Members search: inline `<input>` filter within step

**Gap:** Different form handling approach from Institution registration (react-hook-form + Zod vs manual state). This creates inconsistency when developers extend either form.

### 8.4 Form Validation Patterns

| Pattern | Used In | Behavior |
|---|---|---|
| react-hook-form + Zod | Institution registration | Per-field errors via `<FormMessage>`, submit-blocked |
| Manual state validation | Consortium wizard | Toast notification on validation failure |
| Server-side validation | Login page | `errors.server` state rendered in `<Alert>` |
| Inline field validation | Login email/password | Immediate inline error below field |

**Gap:** Three different validation approaches across forms with no standard.

---

## 9. Workflow UX

### 9.1 Approval Queue Workflow

**Route:** `/approval-queue`

**Flow:**
1. Operator lands on Approval Queue → sees KPI cards (Pending, Approved This Month, Changes Requested)
2. Tabs filter by type: All, Institutions, Mappings, Consortiums, Products, Alert Rules
3. Status filter further narrows: pending, approved, rejected, changes_requested
4. Row click → Sheet drawer opens with item detail + Approve/Reject/Request Changes buttons
5. Approve: immediate API call → success toast → item updates
6. Reject/Request Changes: Dialog opens for reason input → API call

**Good patterns:**
- Status badge is consistent with `statusConfig` map in the page (pending/approved/rejected/changes_requested)
- Detail drawer (Sheet) allows action without leaving the list view
- Confirmation dialog for reject/changes_requested prevents accidental actions

**Friction points:**
- KPI cards are non-navigable (clicking "Pending" doesn't filter the list)
- No bulk approve action
- Reason text is required for reject/changes but there's no character minimum hint

### 9.2 Schema Mapper Workflow

**Route:** `/data-governance/auto-mapping-review`

Three entry modes:
1. New mapping → full 7-step wizard
2. Edit existing → wizard pre-populated from saved mapping
3. Registry view → `SchemaRegistryView.tsx` shows all submitted mappings

**Status lifecycle:** Draft → Pending Approval → Approved/Rejected/Changes Requested

**Good patterns:**
- Schema Registry shows versioned mappings with diff view (`VersionDiffViewer.tsx`)
- AI-powered field suggestions with confidence scores in LLM step
- Submit for Approval action inserts into the Approval Queue

**Friction points:**
- The Registry view and the Wizard are two separate entry points on the same page — context switch is abrupt
- No breadcrumb trail back from the wizard to the registry

### 9.3 Monitoring Workflow

**Route:** `/monitoring/*` (5 sub-sections)

**Pattern:** `MonitoringLayout.tsx` provides shared header + filter bar, injects filters via React Router `Outlet` context.

**Alert banner system:** Thresholds checked in `MonitoringLayout`:
- Success rate < 95% → warning banner
- Success rate < 90% → critical banner
- P95 latency > 300ms → warning banner

**Detail drawers:**
- `RequestDetailDrawer.tsx` — slides in from right for API request detail
- `EnquiryDetailDrawer.tsx` — same for enquiry detail
- Both use `Sheet` component

**Good patterns:**
- Shared `MonitoringFilterBar` for consistent filtering across all monitoring sections
- Real-time alert banners based on KPI thresholds (not static)
- Drill-down from list → detail drawer preserves list context

**Friction points:**
- Filter bar is hidden on the Alert Engine sub-section (excluded by condition) — no explanation shown to user
- SLA Configuration page has no filter bar but visually looks similar to pages that do

### 9.4 Agent Chat Workflow

**Routes:** `/agents`, `/agents/:id/:subAgentId`

**Layout exception:** Agent sub-pages suppress the standard header and switch to `overflow-hidden` — full-screen chat interface.

**Chat pattern:**
- Two-panel layout: message thread (scroll area) + customer context panel (Sheet or inline)
- Welcome message from agent on load
- Tool panel: 6 recommended tools as clickable cards below input
- Input: `<Input>` with send button + attachment icon
- Agent responses: markdown-rendered via bold/paragraph parsing

**Good patterns:**
- Tool cards show name, description, and icon — good affordance for operators unfamiliar with tool names
- Customer context panel shows credit data in structured accordion sections
- Bureau Enquiry opens a modal form — keeps the chat context visible

**Friction points:**
- Recommended tool order is persisted in `useState` but not in `localStorage` — resets on refresh
- No typing indicator for agent "thinking" state
- Chat history is in a Sheet drawer — accessible but not persistent

---

## 10. State Handling

### 10.1 Loading States

| Pattern | Component | Usage |
|---|---|---|
| `SkeletonTable` | `src/components/ui/skeleton-table.tsx` | Institution list, Users list, schema registry |
| `SkeletonKpiCards` | `src/components/ui/skeleton-table.tsx` | Approval Queue KPI row |
| Inline `Skeleton` | Various | Individual card sections during load |
| `loading ? "—" : value` | KPI cards in `DashboardKPIRow` | Individual value cells |
| `isPending` on button | Submit buttons | Replaces button text with loading text (e.g., "Suspending…") |
| `Loader2` spinner | Login submit button | `animate-spin` icon alongside text |

**Consistency level:** Good — `SkeletonTable` is used across all major list pages. Button loading states use in-line text replacement without a spinner (exception: Login uses `Loader2`).

**Gap:** No consistent spinner/loader component for card-level data reloads. Some cards show `loading ? [] : data` with empty charts rather than a skeleton.

### 10.2 Error States

**ApiErrorCard component** (`src/components/ui/api-error-card.tsx`):

Two variants:
1. **Card** (default): Centered icon + title + description + retry button. Used for full-page data failures (dashboard, institution list, monitoring)
2. **Inline** (`inline={true}`): Icon + message in a single line. Used within form sections

Error classification (from `ApiError`):
- `isUnauthorized` → "Session expired"
- `isForbidden` → "Access denied"
- `isNotFound` → "Not found"
- `isServerError` → "Server error"
- Network/unknown → "Connection error" with `WifiOff` icon instead of `AlertCircle`

**Usage:** Consistently applied on all data-fetching pages.

**Gap:** Form submission errors are handled ad-hoc (some toast, some inline `Alert`, some local state).

### 10.3 Empty States

**EmptyState component** (`src/components/EmptyState.tsx`):
- Used inside table `<td colSpan>` when filtered result is empty
- Also used standalone for truly empty data (no records at all)
- `icon` prop supports custom icons (default: `Inbox`)
- Action button optional — used for "Clear filters" in search contexts

**Gap:** Some pages render a bare "No results" text string rather than using the `EmptyState` component.

### 10.4 Success Feedback

**Pattern:** `sonner` toast notifications throughout the application.

```tsx
toast.success("Export started.");
toast.error("Nothing to export yet.");
toast.info("Opening Anomaly Feed…");
```

- Success: green toast (sonner default for `toast.success`)
- Error: red toast
- Info: neutral toast

**Gap:** No standardized toast duration or action buttons in toasts. Some flows use `setTimeout` + toast to simulate async navigation feedback (e.g., `AgentChatWorkspace` anomaly action).

---

## 11. Accessibility Assessment

### 11.1 What Is Implemented

| Feature | Status | Evidence |
|---|---|---|
| `aria-label` on icon-only buttons | Partial | Sidebar collapse toggle, mobile menu, notifications bell — all have `aria-label` |
| `aria-expanded` on accordion items | Yes | Sidebar section chevron buttons use `aria-expanded={expandedSectionId === sectionId}` |
| `aria-haspopup="menu"` on dropdown triggers | Yes | Sidebar collapsed dropdown triggers |
| `focusVisible` ring styles | Yes | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` on interactive elements |
| `sr-only` dialog titles | Selective | PacketConfigModal uses `sr-only` for dialog title (modal is diagram-only) |
| Reduced motion support | Yes | `prefers-reduced-motion: reduce` in `index.css` disables all animations |
| `disabled` state on buttons | Yes | Pagination Previous/Next, suspended institution actions |
| `type="button"` on non-submit buttons | Partial | Most sidebar and header buttons have this; some inline raw buttons do not |
| Semantic HTML | Partial | `<header>`, `<aside>`, `<main>`, `<nav>`, `<section aria-label>` used in core layout |
| `alt` text on images | N/A | No `<img>` elements found; all visuals are SVG icons or CSS |

### 11.2 What Is Missing or Inconsistent

| Issue | Severity | Location |
|---|---|---|
| Sort headers are `<span onClick>` inside `<th>` — not keyboard-accessible buttons | High | `InstitutionList.tsx` sort icons |
| Table rows use `onClick` on `<tr>` — not navigable by keyboard without Tab→Enter | High | `InstitutionList.tsx`, all data tables |
| No `role="live"` region for toast notifications | Medium | `sonner` toast system |
| Notification badge count has no `aria-label` with count | Medium | `AppHeader.tsx` bell badge |
| Chart containers have no accessible description | Medium | All `ChartContainer` elements |
| `EmptyState` icon wrapper has no `aria-hidden` | Low | `EmptyState.tsx` |
| Drawer Sheet has no `aria-describedby` in most usages | Low | `UserDetailDrawer`, `EnquiryDetailDrawer` |
| Color-only status signaling (e.g., red/green badges with no text in some contexts) | Medium | SLA health progress bar in Institution table |
| No skip-to-content link | Medium | App-wide |
| Login OTP input has no explicit `inputmode="numeric"` | Low | `Login.tsx` OTP step |
| Focus is not trapped in mobile sidebar when open | Medium | `DashboardLayout.tsx` mobile overlay |

---

## 12. Design Consistency Audit

### 12.1 Typography Inconsistencies

| Inconsistency | Files Affected | Impact |
|---|---|---|
| `text-sm` / `text-xs` used instead of `text-body` / `text-caption` | 15 page files, `EmptyState`, `AppHeader` notifications | Medium — inconsistent visual density |
| `CardTitle` hardcodes `text-[12px]` instead of using a token | `card.tsx` | Low — matches `text-body` anyway |
| `AppHeader` notification text uses 3 different font size classes in one component | `AppHeader.tsx` | Medium |

### 12.2 Button / Interactive Element Inconsistencies

| Inconsistency | Files Affected | Impact |
|---|---|---|
| Raw `<button>` with custom classes bypassing Button component | `Dashboard.tsx` export, `AppHeader.tsx` "Mark all read" | Medium — inconsistent hover/focus behavior |
| `Button size="sm"` and `Button size="default"` are pixel-identical (`h-8 px-3`) | `button.tsx` | Medium — size prop is misleading |
| Input height (`h-10`) doesn't match Button height (`h-8`) | Global | High — misaligned filter rows on every list page |

### 12.3 Card Inconsistencies

| Inconsistency | Files Affected | Impact |
|---|---|---|
| Base `Card` uses `rounded-lg`; KPI/chart cards use `rounded-xl` | Everywhere | Low — subtle visual inconsistency |
| Some cards use `shadow-sm` (shadcn default); others use `shadow-[0_1px_3px_rgba(15,23,42,0.06)]` | Dashboard vs other pages | Low |
| Card padding: `p-4` (base), but some cards override with `p-6`, others with `p-3` | Various | Low |

### 12.4 Status Badge Inconsistencies

| Inconsistency | Files Affected | Impact |
|---|---|---|
| `statusStyles` defined in both `InstitutionList` (via `institutions-mock.ts`) and inline in `InstitutionDetail.tsx` | 2 files | High — values may diverge |
| Institution status `"Active"` (Title Case) and `"active"` (lowercase) both in `InstitutionDetail.tsx` status map | `InstitutionDetail.tsx` lines 62–70 | High — fragile case sensitivity |
| User status `bg-success/20` vs institution status `bg-success/15` for equivalent "active" state | `UsersListPage.tsx` vs `InstitutionList.tsx` | Medium — visual inconsistency |

### 12.5 Form Inconsistencies

| Inconsistency | Files Affected | Impact |
|---|---|---|
| Institution wizard uses react-hook-form + Zod | `RegisterInstitution.tsx` | — |
| Consortium wizard uses manual `useState` validation | `ConsortiumWizardPage.tsx` | High — developer experience |
| Error feedback: toast (Consortium), inline Alert (Login), FormMessage (Institution) | Multiple wizards | High — user experience inconsistency |

### 12.6 Spacing Inconsistencies

| Inconsistency | Example | Impact |
|---|---|---|
| Page sections: `space-y-6` vs `space-y-8` vs `space-y-6 md:space-y-8` | Dashboard vs Institution list vs Monitoring | Low |
| Table cell padding: `px-5 py-4` (Pattern A) vs shadcn default `p-4` (Pattern B) | Across table pages | Medium |
| Card inner padding: `p-4` standard vs `p-6` in CardFooter vs `p-3` in some custom cards | Various | Low |

### 12.7 Icon Usage

- **Library:** `lucide-react` exclusively — consistent
- **Sizes:** `w-4 h-4` standard, `w-5 h-5` for sidebar nav icons, `w-3 h-3` for small inline (table sort)
- **Color:** `text-muted-foreground` for decorative/secondary, inherits for primary actions
- **Gap:** Some inline icons (action rows in drawers) use `w-3.5 h-3.5` — a non-standard size between `w-3` and `w-4`

---

## 13. UX Gaps & Improvement Opportunities

### 13.1 High Impact Issues

| Issue | Priority | Effort | Recommendation |
|---|---|---|---|
| Input height (`h-10`) / Button height (`h-8`) mismatch | P0 | Low | Standardize — either bring inputs to `h-8` or buttons to `h-10`. Adopt `h-9` as a shared control height |
| Duplicate `statusStyles` maps (Institution List vs Institution Detail) | P0 | Low | Consolidate into `status-badges.ts` — already has the pattern |
| Table sort column headers are `<span onClick>` not `<button>` | P1 | Low | Wrap in `<button>` with `type="button"` and `aria-sort` |
| `EmptyState` uses `text-sm` not `text-body` | P1 | Low | Single line fix in `EmptyState.tsx` |
| Form validation approach: 3 different patterns across 3 wizards | P1 | Medium | Standardize on react-hook-form + Zod + `<FormMessage>` pattern |

### 13.2 Quick Wins

| Issue | Effort | Impact |
|---|---|---|
| Add `aria-live="polite"` region for Sonner toasts | 30 min | Accessibility — screen readers announce toasts |
| Add notification count to bell `aria-label` | 5 min | Accessibility — `aria-label={${unreadCount} unread notifications}` |
| Add `type="button"` to all raw `<button>` elements that lack it | 30 min | Prevents accidental form submission in edge cases |
| Promote `MonitoringAlertBanner` to `src/components/ui/` | 15 min | Developer experience — usable outside Monitoring pages |
| Add `inputmode="numeric"` to OTP input | 5 min | Mobile UX — opens numeric keyboard on iOS/Android |
| Consistent status badge opacity (`/15` everywhere) — pick one | 30 min | Visual consistency |
| Chart containers should include a `role="img" aria-label` | 1 hour | Accessibility baseline |

### 13.3 Structural Improvements

| Issue | Effort | Impact |
|---|---|---|
| **Tab component for detail pages** — InstitutionDetail implements a custom tab scroller, schema mapper uses Radix Tabs, Approval Queue uses both | Medium | Create a `ScrollableTabs` component that wraps Radix Tabs with `overflow-x-auto` |
| **No skip-to-content link** | Low | Add a visually hidden `<a href="#main-content">` before the sidebar |
| **KPI cards should be keyboard-navigable** — Dashboard KPI cards use `onClick` on a div | Medium | Wrap in `<button>` or `<a>` for navigable cards |
| **Server-side pagination hooks** — `size=200` will degrade at scale | High (future) | Add paginated API support when institution count grows |
| **Design token documentation** — no one can discover tokens without reading 2 config files | Medium | Consider Storybook or a simple token reference page |
| **Consortium wizard form modernization** — uses manual state, not react-hook-form | Medium | Aligns with Institution wizard pattern |

---

## 14. Recommended Standardization

The following should be standardized without rewriting the system:

### 14.1 Control Height Standard

Adopt `h-9` (36px) as the universal interactive control height:

```tsx
// button.tsx — update size variants
size: {
  default: "h-9 px-3 py-0",
  sm: "h-7 px-2.5 py-0",        // differentiated from default
  lg: "h-10 px-6 py-0 text-[13px]",
  icon: "h-9 w-9 p-0",
}

// input.tsx — update from h-10 to h-9
"flex h-9 w-full rounded-md ..."
```

### 14.2 Status Badge Standard

**Rule:** All status → color mappings MUST go through `src/lib/status-badges.ts`. Direct inline `statusStyles` maps are prohibited.

Add institution lifecycle status functions to `status-badges.ts`:
```ts
export function institutionStatusBadgeClass(status: string): string { ... }
export function institutionStatusLabel(status: string): string { ... }
```

### 14.3 Typography Standard

**Rule:** Never use `text-sm`, `text-xs`, `text-base` in page/component code. Always use the semantic scale.

Migration guide:
| Old | New |
|---|---|
| `text-sm` | `text-body` (11px) |
| `text-xs` | `text-caption` (10px) |
| `text-base` | `text-h4` (14px) if heading, `text-body` if body |

### 14.4 Form Validation Standard

All multi-step forms MUST use:
1. `react-hook-form` for form state management
2. `zod` schemas for validation
3. shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormMessage>` for rendering
4. `toast.error()` only for server/network errors (not field validation errors)

### 14.5 Table Standard

**Rule:** Use **Pattern A (raw HTML table with custom classes)** as the canonical table pattern. Rationale: it correctly applies the semantic type scale, has sticky headers, and uses the `tableHeaderClasses` token.

When to use shadcn `<Table>`: Only for simple, non-sortable, non-sticky display tables (e.g., detail view sub-tables with 3–4 rows).

### 14.6 Card Radius Standard

| Context | Radius | Token |
|---|---|---|
| KPI cards, chart cards, main data cards | `rounded-xl` | — |
| shadcn `Card` base component | Update to `rounded-xl` | Change `card.tsx` |
| Small inner cards, filter chips | `rounded-lg` | `rounded-lg` |
| Badges / pills | `rounded-full` | `rounded-full` |

### 14.7 Alert / Feedback Standard

| Scenario | Component |
|---|---|
| Page-level data load failure | `ApiErrorCard` (full card variant) |
| Inline field/section error | `ApiErrorCard inline={true}` |
| Field validation error | `<FormMessage>` (react-hook-form) |
| Success action feedback | `toast.success()` |
| Warning/info system alert | `MonitoringAlertBanner` (after promotion to `ui/`) |
| Destructive confirmation | `AlertDialog` |

---

## 15. Design QA Checklist

Use this checklist before merging any UI PR:

### 15.1 Consistency

- [ ] All headings use `text-h2 font-semibold text-foreground` (not `text-lg`, `text-xl`, etc.)
- [ ] All page subtitles use `text-caption text-muted-foreground mt-1`
- [ ] All status badges come from `status-badges.ts` functions (no inline color maps)
- [ ] No use of `text-sm` / `text-xs` / `text-base` in new code
- [ ] Cards use `rounded-xl` for primary surfaces, `rounded-lg` for inner elements
- [ ] Buttons use the `Button` component — no raw `<button>` with custom Tailwind
- [ ] Form validation uses react-hook-form + `<FormMessage>` pattern

### 15.2 Accessibility

- [ ] All icon-only interactive elements have `aria-label`
- [ ] All toggle/accordion buttons have `aria-expanded`
- [ ] Sort headers are `<button>` elements with `aria-sort`
- [ ] Destructive confirmations use `AlertDialog` (not `window.confirm`)
- [ ] Charts have `role="img"` and `aria-label` describing the data
- [ ] No color-only status indicators (badge must have text label)
- [ ] Focus ring is visible on all interactive elements (`focus-visible:ring-2`)

### 15.3 Responsiveness

- [ ] Page header collapses correctly on `< sm` viewports (stack layout)
- [ ] Tables have `overflow-x-auto` container
- [ ] Filter rows don't overflow on mobile (allow wrapping)
- [ ] Sidebar collapses on `< md` and renders as drawer on mobile
- [ ] Touch targets are minimum `44×44px` on mobile (check `min-h-[44px]`)

### 15.4 State Handling

- [ ] Loading state uses `SkeletonTable` or `SkeletonKpiCards` (not a spinner)
- [ ] Error state uses `ApiErrorCard` with `onRetry`
- [ ] Empty state uses `EmptyState` component (not bare text)
- [ ] Submit buttons show in-progress label during API calls (e.g., "Saving…")
- [ ] Success actions trigger `toast.success()`
- [ ] Failed mutations trigger `toast.error()` with a descriptive message

### 15.5 UX Clarity

- [ ] Destructive actions use `variant="destructive"` button + `AlertDialog` confirmation
- [ ] Multi-step forms have a visible step indicator showing current position
- [ ] Back navigation in wizards preserves form state
- [ ] `DropdownMenuItem` for destructive items uses `className="text-destructive"`
- [ ] Paginated lists show count text: "Showing X–Y of Z items"
- [ ] New features have command palette entries if they are a primary navigation destination

---

*End of Design Guidelines v1.1*  
*Last reverse-engineered: April 2026*  
*Implementation log: §0*  
*Next review: Before next major feature milestone*
