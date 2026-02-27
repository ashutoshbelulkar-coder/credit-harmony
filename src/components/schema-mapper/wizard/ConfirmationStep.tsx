import { useState } from "react";
import { CheckCircle2, Circle, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIMappingSummary, EnumReconciliation } from "@/types/schema-mapper";
import { ApprovalHistoryTimeline } from "@/components/data-governance/ApprovalHistoryTimeline";
import { approvalEvents } from "@/data/data-governance-mock";

interface ConfirmationStepProps {
  mappingSummary: AIMappingSummary | null;
  rulesCount: number;
  enumReconciliations: EnumReconciliation[];
  onSubmit: () => void;
}

interface ChecklistItem {
  label: string;
  checked: boolean;
}

export function ConfirmationStep({
  mappingSummary,
  rulesCount,
  enumReconciliations,
  onSubmit,
}: ConfirmationStepProps) {
  const [confirmed, setConfirmed] = useState(false);

  const coverage = mappingSummary?.coveragePercent ?? 96;
  const newFields = 1;
  const enumValuesAdded = enumReconciliations.reduce(
    (acc, e) => acc + e.mappings.filter((m) => m.isApproved).length,
    0,
  ) || 4;

  const checklist: ChecklistItem[] = [
    { label: "All unmapped fields resolved", checked: true },
    { label: "Enum mapping validated", checked: true },
    { label: "Validation rules reviewed", checked: true },
  ];

  const allChecked = checklist.every((c) => c.checked);

  const kpis = [
    { label: "Mapping Coverage", value: `${coverage}%`, accent: true },
    { label: "New Fields Created", value: String(newFields), accent: false },
    { label: "Enum Values Mapped", value: String(enumValuesAdded), accent: false },
    { label: "Validation Rules", value: String(rulesCount), accent: false },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary KPI cards */}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-4">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3">
          Mapping Summary
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="flex flex-col rounded-lg border border-border p-3 xl:p-3.5"
            >
              <p className="font-sans text-h3 font-bold tabular-nums text-foreground xl:text-h2">
                <span className={kpi.accent ? "text-primary" : undefined}>
                  {kpi.value}
                </span>
              </p>
              <p className="mt-1 text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {kpi.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-4">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3">
          Pre-Submission Checklist
        </p>
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.checked ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span
                className={cn(
                  "text-body font-medium",
                  item.checked ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Approval Timeline */}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] xl:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Approval Timeline
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-info/15 text-info text-[9px] leading-[12px] border-0 font-medium">
              Next Step
            </Badge>
            <span className="text-body text-muted-foreground">
              Draft → Under Review → Approved → Active
            </span>
          </div>
          <p className="text-caption text-muted-foreground">
            Submitting will change the mapping status from <strong className="font-semibold text-foreground">Draft</strong> to <strong className="font-semibold text-foreground">Under Review</strong>.
            Dual approval is required before activation.
          </p>
        </div>

        {approvalEvents.length > 0 && (
          <div className="mt-4">
            <ApprovalHistoryTimeline events={approvalEvents} />
          </div>
        )}
      </div>

      {/* Status transition */}
      {confirmed && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 animate-fade-in xl:p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <div>
              <p className="text-body font-semibold text-foreground">
                Mapping submitted for approval
              </p>
              <p className="text-caption text-muted-foreground">
                Status changed: Draft → Under Review
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      {!confirmed && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => { setConfirmed(true); onSubmit(); }}
            disabled={!allChecked}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Confirm & Submit for Approval
          </Button>
        </div>
      )}
    </div>
  );
}
