import { cn } from "@/lib/utils";

interface AttributeCountsBannerProps {
  active: number;
  pending: number;
  proposed: number;
  deprecated: number;
  revisionOutOfPath: number;
}

export function AttributeCountsBanner({
  active,
  pending,
  proposed,
  deprecated,
  revisionOutOfPath,
}: AttributeCountsBannerProps) {
  const warning = pending + proposed > 0;
  const destructive = revisionOutOfPath > 0;
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2 text-caption font-medium",
          destructive
            ? "bg-destructive/15 text-destructive"
            : warning
              ? "bg-warning/15 text-warning"
              : "bg-muted text-muted-foreground",
        )}
      >
        <span>
          {active} active · {pending} pending · {proposed} proposed · {deprecated} deprecated
        </span>
      </div>
      {destructive && (
        <p className="text-caption text-destructive">
          {revisionOutOfPath} previously active attribute(s) are under revision and are not currently writable.
        </p>
      )}
    </div>
  );
}
