import { cn } from "@/lib/utils";

interface MappingCoverageBarProps {
  value: number;
  className?: string;
}

export function MappingCoverageBar({ value, className }: MappingCoverageBarProps) {
  const color =
    value >= 90
      ? "bg-success"
      : value >= 70
        ? "bg-warning"
        : value >= 40
          ? "bg-info"
          : "bg-destructive";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-caption font-medium tabular-nums text-foreground">
        {value}%
      </span>
    </div>
  );
}
