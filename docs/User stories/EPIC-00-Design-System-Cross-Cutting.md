# EPIC-00 — Design System & UI Consistency (Cross-Cutting)

> **Epic Code:** DSYS | **Scope:** Platform-wide SPA conventions  
> **Owner:** Platform Engineering | **Priority:** P1 (quality bar)  
> **Implementation Status:** ✅ Phase 1 delivered (April 2026); incremental work continues per [Design Guidelines](../design-guidelines.md).

---

## 1. Purpose

This epic is not a product feature: it tracks **cross-cutting UI/UX work** that touches multiple functional epics (dashboard, members, monitoring, consortiums, etc.). It aligns the React SPA with the internal [Design Guidelines](../design-guidelines.md) audit and §14 Recommended Standardization.

**Canonical references**

- [Design Guidelines](../design-guidelines.md) — audit, gaps, checklist, token tables.
- [status-badges.ts](../../src/lib/status-badges.ts) — API/status → badge class + label helpers (extend here; avoid inline maps).

---

## 2. Delivered (April 2026)

| Area | Change |
|------|--------|
| Controls | `Button` sizes: default `h-9`, `sm` `h-7`, `icon` `h-9`; `Input` / `SelectTrigger` `h-9` + `text-body`. |
| Cards | Default shadcn `Card` radius `rounded-xl`. |
| Empty states | `EmptyState` uses `text-h4` / `text-body`; decorative icon `aria-hidden`. |
| Member status | Institution lifecycle + user account badges via `status-badges.ts`; list, detail, Users tab; removed duplicate `statusStyles` from `institutions-mock.ts`. |
| Tables | Member list sort headers are native buttons with `aria-sort`. |
| Charts | `ChartContainer` defaults `role="img"` and `aria-label` (overridable). |
| Shell / a11y | Skip link → `#main-content`; mobile nav drawer focus trap (`FocusScope`); Sonner `containerAriaLabel`; notification bell label includes unread count. |
| Dashboard | CSV export control uses shared `Button`. |
| Monitoring | `MonitoringAlertBanner` lives under `src/components/ui/` for reuse. |
| Consortium wizard | `react-hook-form` + Zod + `<FormMessage>` for basic info, member count, data visibility. |

**Tests:** `src/lib/status-badges.test.ts` extended for institution + user account helpers; full suite `npm run test`.

---

## 3. Remaining backlog (from design guidelines)

- Repository-wide migration off raw `text-sm` / `text-xs` where product wants strict semantic scale; optional ESLint `no-restricted-syntax`.
- Keyboard-first patterns for clickable table rows (beyond sort headers).
- Optional internal token / Storybook reference page.
- Further consolidation of page-local `statusStyles` maps (products, batches, alerts) into `status-badges.ts` where appropriate.

---

## 4. Epic touchpoints

Work in this epic may appear in UI owned by **EPIC-02** (institutions), **EPIC-03** (consortiums), **EPIC-09** (monitoring), **EPIC-13** (dashboard), **EPIC-12** (users tab), and shared **layout / ui** primitives. When changing badges or shell behaviour, update this document and the design guidelines implementation log.
