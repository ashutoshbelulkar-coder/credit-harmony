/**
 * Central typography classes for tables and badges.
 * Change font size here to update app-wide; values match tailwind.config.ts semantic scale.
 */
const TABLE_HEADER_FONT = "text-[10px] leading-[13px]";
const BADGE_FONT = "text-[10px] leading-[14px]";

/** Table header (th) – muted, uppercase, tracking. Use with px/py and alignment. */
export const tableHeaderClasses =
  `${TABLE_HEADER_FONT} text-muted-foreground uppercase tracking-wider`.trim();

/** Status/category badge – use with pill styles and semantic colors (e.g. bg-success/15 text-success). */
export const badgeTextClasses =
  `${BADGE_FONT} font-medium`.trim();
