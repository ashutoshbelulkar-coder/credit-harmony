/**
 * Single display string for an institution: prefer legal name (`name`), else trading name.
 * Matches backend COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name).
 */
export function institutionDisplayLabel(i: {
  name?: string | null;
  tradingName?: string | null;
}): string {
  const legal = i.name?.trim() ?? "";
  if (legal.length > 0) return legal;
  return (i.tradingName?.trim() ?? "") || "";
}
