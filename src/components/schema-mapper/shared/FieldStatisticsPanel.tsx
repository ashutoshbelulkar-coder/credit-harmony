import type { SourceFieldStatistics } from "@/types/schema-mapper";
import { Hash, Type, Calendar, ListTree, ToggleLeft, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldStatisticsPanelProps {
  stats: SourceFieldStatistics;
  className?: string;
}

const STAT_ITEMS: {
  key: keyof SourceFieldStatistics;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "totalFields", label: "Total Fields", icon: Layers },
  { key: "nestedFields", label: "Nested Fields", icon: ListTree },
  { key: "enumCandidates", label: "Enum Candidates", icon: ToggleLeft },
  { key: "numericFields", label: "Numeric", icon: Hash },
  { key: "stringFields", label: "String", icon: Type },
  { key: "dateFields", label: "Date", icon: Calendar },
];

export function FieldStatisticsPanel({ stats, className }: FieldStatisticsPanelProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-h4 font-semibold tabular-nums text-foreground">
              {stats[key]}
            </p>
            <p className="text-[9px] leading-[12px] text-muted-foreground truncate">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
