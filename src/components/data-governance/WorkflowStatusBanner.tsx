import { cn } from "@/lib/utils";
import type { MappingWorkflowStatus } from "@/types/data-governance";

const STATUS_LABELS: Record<MappingWorkflowStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  rolled_back: "Rolled Back",
};

const STATUS_STYLES: Record<MappingWorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-info/15 text-info",
  approved: "bg-success/15 text-success",
  rolled_back: "bg-destructive/15 text-destructive",
};

export interface WorkflowStatusBannerProps {
  status: MappingWorkflowStatus;
  className?: string;
}

export function WorkflowStatusBanner({ status, className }: WorkflowStatusBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-2 text-caption font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      <span>{STATUS_LABELS[status]}</span>
    </div>
  );
}
