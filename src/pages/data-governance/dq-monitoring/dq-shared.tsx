import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { badgeTextClasses, tableHeaderClasses } from "@/lib/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { DqGrade, DqSeverity } from "@/types/dq-monitoring";

export function DqGradePill({ grade, className }: { grade: DqGrade; className?: string }) {
  const tone =
    grade === "A"
      ? "bg-success/15 text-success"
      : grade === "B"
        ? "bg-primary/10 text-primary"
        : grade === "C"
          ? "bg-warning/15 text-warning"
          : grade === "D"
            ? "bg-crif-orange/15 text-crif-orange"
            : "bg-destructive/15 text-destructive";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5", badgeTextClasses, tone, className)}>
      {grade}
    </span>
  );
}

export function DqSeverityPill({ severity }: { severity: DqSeverity }) {
  const tone =
    severity === "REJECT"
      ? "bg-destructive/15 text-destructive"
      : severity === "WARNING"
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5", badgeTextClasses, tone)}>{severity}</span>
  );
}

export function DqEventStatusPill({ status }: { status: string }) {
  const tone =
    status === "New"
      ? "bg-destructive/15 text-destructive"
      : status === "Acknowledged"
        ? "bg-warning/15 text-warning"
        : status === "Linked to RCA"
          ? "bg-info/15 text-info"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5", badgeTextClasses, tone)}>{status}</span>
  );
}

export function DqChannelMixBar({ batchPct }: { batchPct: number }) {
  const apiPct = Math.max(0, 100 - batchPct);
  return (
    <div className="flex items-center gap-2 min-w-[88px]">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="flex h-full w-full">
          <div className="h-full bg-primary" style={{ width: `${batchPct}%` }} />
          <div className="h-full bg-crif-orange/80" style={{ width: `${apiPct}%` }} />
        </div>
      </div>
      <span className="text-caption tabular-nums text-muted-foreground whitespace-nowrap">
        {Math.round(batchPct)}/{Math.round(apiPct)}
      </span>
    </div>
  );
}

export function DqSparkline({ values, className }: { values: number[]; className?: string }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const w = 64;
  const h = 18;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className={cn("inline-block", className)} aria-hidden>
      <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" points={pts} />
    </svg>
  );
}

export function DqEmptyState({ message = "No assessments for the current filters" }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
      <p className="text-body text-muted-foreground">{message}</p>
    </div>
  );
}

export function DqKpiSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

export function DqTableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DqDelta({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  return (
    <span
      className={cn(
        "text-caption tabular-nums font-medium",
        good && "text-success",
        bad && "text-destructive",
        !good && !bad && "text-muted-foreground",
      )}
    >
      {value > 0 ? `▲${value.toFixed(1)}` : value < 0 ? `▼${Math.abs(value).toFixed(1)}` : "—"}
    </span>
  );
}

export function DqSortHead({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(tableHeaderClasses, "text-left hover:text-foreground", className)}
    >
      {label}
      {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

export function DqFileMonitoringLink({ batchId, className }: { batchId?: string; className?: string }) {
  const href = batchId
    ? `/monitoring/data-submission-batch?batchId=${encodeURIComponent(batchId)}`
    : "/monitoring/data-submission-batch";
  return (
    <Link to={href} className={cn("text-caption text-primary hover:underline", className)} onClick={(e) => e.stopPropagation()}>
      Open in File Monitoring
    </Link>
  );
}

export function DqPaginationBar({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(page, pages);
  const from = total === 0 ? 0 : (safe - 1) * pageSize + 1;
  const to = Math.min(safe * pageSize, total);
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-caption text-muted-foreground">
        Showing {from}–{to} of {new Intl.NumberFormat("en-US").format(total)}
      </span>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="sm" disabled={safe <= 1} onClick={() => onPage(safe - 1)}>
          Previous
        </Button>
        <span className="text-caption text-muted-foreground px-2">
          {safe} / {pages}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={safe >= pages} onClick={() => onPage(safe + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
