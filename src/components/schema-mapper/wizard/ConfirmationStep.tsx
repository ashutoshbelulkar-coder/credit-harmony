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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">Mapping Summary</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-h3 font-bold tabular-nums text-primary">{coverage}%</p>
            <p className="text-caption text-muted-foreground mt-1">Mapping Coverage</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-h3 font-bold tabular-nums text-foreground">{newFields}</p>
            <p className="text-caption text-muted-foreground mt-1">New Fields Created</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-h3 font-bold tabular-nums text-foreground">{enumValuesAdded}</p>
            <p className="text-caption text-muted-foreground mt-1">Enum Values Mapped</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-h3 font-bold tabular-nums text-foreground">{rulesCount}</p>
            <p className="text-caption text-muted-foreground mt-1">Validation Rules</p>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-3">Pre-Submission Checklist</h3>
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.checked ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span
                className={cn(
                  "text-body",
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
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-h4 font-semibold text-foreground">Approval Timeline</h3>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-3 mb-3">
            <Badge className="bg-info/15 text-info text-[9px] leading-[12px] border-0">
              Next Step
            </Badge>
            <span className="text-body text-muted-foreground">
              Draft → Under Review → Approved → Active
            </span>
          </div>
          <p className="text-caption text-muted-foreground">
            Submitting will change the mapping status from <strong>Draft</strong> to <strong>Under Review</strong>.
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
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-body font-medium text-foreground">
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
