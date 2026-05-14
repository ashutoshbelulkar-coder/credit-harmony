/**
 * Pure consortium display helpers and status union — no JSON catalog.
 * Use from list/detail pages that load data from the API so bundles do not pull `consortiums.json`.
 */

export type ConsortiumStatus = "active" | "pending" | "inactive";

export const consortiumStatusStyles: Record<ConsortiumStatus, string> = {
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  inactive: "bg-muted text-muted-foreground",
};

export function consortiumListLabel(status: ConsortiumStatus): "Active" | "Draft" {
  return status === "active" ? "Active" : "Draft";
}

export function consortiumListLabelStyles(label: "Active" | "Draft"): string {
  return label === "Active"
    ? "bg-success/15 text-success"
    : "bg-warning/15 text-warning";
}
