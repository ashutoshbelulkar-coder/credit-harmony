import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MappingCoverageBar } from "@/components/schema-mapper/shared/MappingCoverageBar";
import { cn } from "@/lib/utils";
import type { SchemaRegistryEntry, SchemaStatus, SourceType } from "@/types/schema-mapper";

interface SchemaDetailDialogProps {
  entry: SchemaRegistryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_STYLES: Record<SchemaStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-info/15 text-info",
  approved: "bg-success/15 text-success",
  active: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground opacity-60",
};

const STATUS_LABELS: Record<SchemaStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  active: "Active",
  archived: "Archived",
};

const SOURCE_LABELS: Record<SourceType, string> = {
  telecom: "Telecom",
  utility: "Utility",
  bank: "Bank",
  gst: "GST",
  custom: "Custom",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground w-32 shrink-0">
        {label}
      </span>
      <span className="text-body text-foreground">{children}</span>
    </div>
  );
}

export function SchemaDetailDialog({ entry, open, onOpenChange }: SchemaDetailDialogProps) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-h4 font-semibold text-foreground">
            {entry.sourceName}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
              {SOURCE_LABELS[entry.sourceType]}
            </Badge>
            <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[entry.status])}>
              {STATUS_LABELS[entry.status]}
            </Badge>
            <Badge variant="outline" className="text-[9px] leading-[12px] font-mono">
              {entry.version}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="rounded-lg border border-border p-3">
            <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Mapping Coverage
            </p>
            <MappingCoverageBar value={entry.mappingCoverage} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-2.5 text-center">
              <p className="font-sans text-h4 font-bold tabular-nums text-foreground">
                {entry.unmappedFields}
              </p>
              <p className="text-caption text-muted-foreground mt-0.5">Unmapped</p>
            </div>
            <div className="rounded-lg border border-border p-2.5 text-center">
              <p className="font-sans text-h4 font-bold tabular-nums text-foreground">
                {entry.ruleCount}
              </p>
              <p className="text-caption text-muted-foreground mt-0.5">Rules</p>
            </div>
            <div className="rounded-lg border border-border p-2.5 text-center">
              <p className="font-sans text-h4 font-bold tabular-nums text-primary">
                {entry.mappingCoverage}%
              </p>
              <p className="text-caption text-muted-foreground mt-0.5">Coverage</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <DetailRow label="Master Schema">{entry.masterSchemaVersion}</DetailRow>
            <DetailRow label="Created By">{entry.createdBy}</DetailRow>
            <DetailRow label="Created At">{formatDate(entry.createdAt)}</DetailRow>
            <DetailRow label="Last Modified">{entry.lastModifiedBy}</DetailRow>
            <DetailRow label="Modified At">{formatDate(entry.lastModifiedAt)}</DetailRow>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
