# HCB Design Guidelines

Design system for the Hybrid Credit Bureau (HCB) admin dashboard. Use when designing new screens, modifying components, or evaluating consistency and accessibility.

## 1. Design Principles

1. **Clarity Over Decoration** – Prioritize comprehension of metrics, status, and actions.
2. **Audit-Ready** – Actions and decisions should be traceable (timestamps, attribution).
3. **Signal Over Noise** – Highlight anomalies and high-risk items with consistent emphasis.
4. **Consistent Density** – Support overview and deep investigation; use compact spacing where appropriate.
5. **Accessible by Default** – Meet minimum contrast and keyboard navigation requirements.
6. **Stable Layouts** – Avoid layout shifts; keep key metrics and actions in predictable locations.

## 2. Design Tokens and Theming

Tokens are defined in `src/index.css` and mapped in `tailwind.config.ts`. All colors use HSL-based CSS variables.

### Core Tokens

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`, `--primary-light`
- `--secondary`, `--secondary-foreground`
- `--accent`, `--accent-foreground`, `--accent-light`
- `--muted`, `--muted-foreground`
- `--border`, `--input`, `--ring`
- `--radius`

### Status Tokens

- **Success:** `--success`, `--success-foreground`, `--success-light`, `--success-subtle`
- **Warning:** `--warning`, `--warning-foreground`, `--warning-light`, `--warning-subtle`
- **Danger:** `--danger`, `--danger-foreground`, `--danger-light`, `--danger-subtle` (risk, blocked, failed)
- **Destructive:** `--destructive` (irreversible actions only, e.g. Revoke)
- **Info:** `--info`, `--info-foreground`, `--info-light`, `--info-subtle`

### Sidebar Tokens

- `--sidebar-background`, `--sidebar-foreground`
- `--sidebar-primary`, `--sidebar-primary-foreground`
- `--sidebar-accent`, `--sidebar-accent-foreground`
- `--sidebar-border`, `--sidebar-ring`

Dark mode is driven by `class="dark"` on the root. Test both themes when changing tokens.

## 3. Typography

Font family: **Inter** only. Use the semantic scale via Tailwind: `text-display`, `text-h1` … `text-caption`, `text-label`.

| Role       | Size   | Line height | Weight | Usage                    |
|-----------|--------|-------------|--------|--------------------------|
| Display   | 32px   | 40px        | 600    | Hero / large headlines   |
| H1        | 28px   | 36px        | 600    | Page title               |
| H2        | 24px   | 32px        | 600    | Section / card title     |
| H3        | 20px   | 28px        | 600    | Subsection               |
| H4        | 18px   | 26px        | 600    | Card/section heading     |
| Body      | 14px   | 22px        | 400    | Default body             |
| Body Dense| 13px   | 20px        | 400    | Dense tables/lists       |
| Caption   | 12px   | 18px        | 400    | Metadata, hints          |
| Label     | 12px   | 16px        | 600    | Form labels, buttons     |

- Use headings only for major sections; avoid skipping levels.
- Keep line lengths roughly 45–90 characters for readability.

## 4. Layout, Grid, and Spacing

- **Container:** Centered, 2rem padding, max-width 1400px at `2xl`.
- **Grid:** 12-column grid for dashboard and data-heavy screens; 2–4 columns for KPI and card rows.
- **Vertical rhythm:** 16–24px from section heading to content; 32px between major sections; 12–16px between form groups.
- **Compact spacing:** Use `compact-xs`, `compact-sm`, `compact-md`, `compact-lg` for dense layouts (e.g. tables).

## 5. Color Usage

- **Primary:** Brand actions, primary CTA, active navigation.
- **Accent:** Analytic highlights, links, non-critical emphasis.
- **Status:** Use only for state or severity (success, warning, danger, info). Prefer **danger** for risk/blocked/failed; reserve **destructive** for destructive actions (e.g. Revoke).
- Pair color with text or icon; avoid color-only indicators.

## 6. Components

- **Cards:** Subtle 1px border, light shadow, 24px padding, rounded corners. No heavy shadows or decorative gradients.
- **KPI cards:** Single primary metric, delta, and timeframe; label 12px/500 uppercase.
- **Tables:** Sticky headers for long lists; numeric columns right-aligned, text left-aligned; Body or Body Dense for cells, Caption for metadata.
- **Badges/Chips:** Semantic colors only; single-line with truncate.
- **Buttons:** One primary CTA per screen/section; secondary for alternates; destructive only for irreversible actions. Use visible focus ring (`--ring`).
- **Forms:** Labels above, helper below; inline validation with clear messages.

## 7. Data Visualization

- Axis labels and units on all charts (e.g. ms, %, k).
- No more than 5 series per chart; use tooltips for detailed values.
- **Colors:** Use `info` for default series; `success`, `warning`, `danger` for thresholds or success/failure; neutral greys for comparison.

## 8. Accessibility

- **Focus:** All interactive elements must have a visible focus ring (e.g. `ring-2 ring-ring ring-offset-2` on focus-visible).
- **Keyboard:** Logical tab order; modals/drawers trap focus.
- **Motion:** Respect `prefers-reduced-motion`; animations are disabled or minimal when the user prefers reduced motion.
- **Contrast:** Text must meet WCAG AA; do not rely on color alone for status.

## 9. Change Management

When updating the design system:

1. Update tokens in `src/index.css`.
2. Update mappings in `tailwind.config.ts` if needed.
3. Document changes in this file.
4. Validate in both light and dark modes.

---

*Last updated: February 2026. Aligned with Fraud-360 design guidelines where applicable.*
