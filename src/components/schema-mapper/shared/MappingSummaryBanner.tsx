import type { AIMappingSummary } from "@/types/schema-mapper";
import { cn } from "@/lib/utils";

interface MappingSummaryBannerProps {
  summary: AIMappingSummary;
  className?: string;
}

export function MappingSummaryBanner({ summary, className }: MappingSummaryBannerProps) {
  const items = [
    { label: "Total", value: summary.totalFields, color: "text-foreground" },
    { label: "Mapped", value: summary.autoMapped, color: "text-success" },
    { label: "Review", value: summary.needsReview, color: "text-warning" },
    { label: "Unmapped", value: summary.unmapped, color: "text-destructive" },
    { label: "Coverage", value: `${summary.coveragePercent}%`, color: "text-info" },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl border border-border bg-card px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      {items.map((item, idx) => (
        <div key={item.label} className="flex items-center gap-1">
          {idx > 0 && (
            <div className="h-3 w-px bg-border mx-1 hidden sm:block" />
          )}
          <span className={cn("text-body font-bold tabular-nums", item.color)}>
            {item.value}
          </span>
          <span className="text-[9px] leading-[12px] text-muted-foreground">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
