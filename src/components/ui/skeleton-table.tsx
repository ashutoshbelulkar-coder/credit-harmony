import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
  /** Show a header row of skeletons above the body rows. */
  showHeader?: boolean;
}

/**
 * Animated skeleton placeholder for table loading states.
 * Drop-in replacement while data is being fetched.
 */
export function SkeletonTable({
  rows = 5,
  cols = 5,
  className,
  showHeader = true,
}: SkeletonTableProps) {
  return (
    <div className={cn("w-full overflow-hidden rounded-lg border border-border", className)}>
      {showHeader && (
        <div className="flex gap-3 border-b border-border bg-muted/40 px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1 rounded" />
          ))}
        </div>
      )}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-3 px-4 py-3">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={cn(
                  "h-4 rounded",
                  colIdx === 0 ? "w-1/4" : colIdx === cols - 1 ? "w-12" : "flex-1"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonKpiCardProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton for a row of KPI metric cards.
 */
export function SkeletonKpiCards({ count = 4, className }: SkeletonKpiCardProps) {
  return (
    <div className={cn("grid gap-4", `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count}`, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Skeleton className="mb-3 h-3 w-24 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="mt-2 h-2.5 w-32 rounded" />
        </div>
      ))}
    </div>
  );
}
