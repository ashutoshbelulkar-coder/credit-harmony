import { cn } from "@/lib/utils";
import { normalizeStatusKey } from "@/lib/status-badges";

const BADGE_SHELL = "border-0 border-transparent shadow-none";

const MATCH_BADGE: Record<string, string> = {
  single_match: "bg-success/20 text-success hover:bg-success/30",
  multiple_matches: "bg-warning/20 text-warning hover:bg-warning/30",
  no_match: "bg-destructive/20 text-destructive hover:bg-destructive/30",
  pending: "bg-primary/20 text-primary hover:bg-primary/30",
};

const REPORT_BADGE: Record<string, string> = {
  ready: "bg-success/20 text-success hover:bg-success/30",
  pending: "bg-warning/15 text-warning hover:bg-warning/25",
  failed: "bg-destructive/20 text-destructive hover:bg-destructive/30",
  partial: "bg-warning/20 text-warning hover:bg-warning/30",
};

export function matchStatusBadgeClass(status: string): string {
  const key = normalizeStatusKey(status);
  return cn(BADGE_SHELL, MATCH_BADGE[key] ?? "bg-muted/70 text-muted-foreground hover:bg-muted");
}

export function reportStatusBadgeClass(status: string): string {
  const key = normalizeStatusKey(status);
  return cn(BADGE_SHELL, REPORT_BADGE[key] ?? "bg-muted/70 text-muted-foreground hover:bg-muted");
}
