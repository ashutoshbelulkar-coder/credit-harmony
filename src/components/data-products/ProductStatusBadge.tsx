import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import {
  BRD_STATUS_LABEL,
  BRD_STATUS_STYLES,
  type BrdLifecycleStatus,
} from "@/data/product-management-types";

export function ProductStatusBadge({
  status,
  className,
}: {
  status: BrdLifecycleStatus | string;
  className?: string;
}) {
  const key = status as BrdLifecycleStatus;
  const label = BRD_STATUS_LABEL[key] ?? status;
  const style = BRD_STATUS_STYLES[key] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", badgeTextClasses, style, className)}>
      {label}
    </span>
  );
}
