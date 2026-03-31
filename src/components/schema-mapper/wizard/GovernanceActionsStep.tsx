import { useState } from "react";
import { Save, Send, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GovernanceSummary } from "@/types/schema-mapper";
import { governanceSummaryDefault } from "@/data/schema-mapper-mock";

interface GovernanceActionsStepProps {
  governanceSummary: GovernanceSummary | null;
  onSubmitToQueue: () => void | Promise<void>;
  onSaveDraft: () => void;
  onReject: () => void;
  onComplete: () => void;
}

export function GovernanceActionsStep({
  governanceSummary,
  onSubmitToQueue,
  onSaveDraft,
  onReject,
  onComplete,
}: GovernanceActionsStepProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const summary = governanceSummary ?? governanceSummaryDefault;

  const handleSubmitToQueue = async () => {
    setSubmitting(true);
    try {
      await onSubmitToQueue();
      setSubmitted(true);
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    onSaveDraft();
    onComplete();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">Governance Actions</h3>

        <div className="rounded-lg border border-border p-3.5 mb-4">
          <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Summary
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col rounded-lg border border-border p-3">
              <p className="font-sans text-h3 font-bold tabular-nums text-primary">
                {summary.mappingCoveragePercent}%
              </p>
              <p className="mt-1 text-caption font-medium uppercase tracking-wider text-muted-foreground">
                Mapping Coverage
              </p>
            </div>
            <div className="flex flex-col rounded-lg border border-border p-3">
              <p className="font-sans text-h3 font-bold tabular-nums text-foreground">
                {summary.newFieldsProposed}
              </p>
              <p className="mt-1 text-caption font-medium uppercase tracking-wider text-muted-foreground">
                New Fields Proposed
              </p>
            </div>
            <div className="flex flex-col rounded-lg border border-border p-3">
              <p className="font-sans text-h3 font-bold tabular-nums text-foreground">
                {summary.enumChangesProposed}
              </p>
              <p className="mt-1 text-caption font-medium uppercase tracking-wider text-muted-foreground">
                Enum Changes Proposed
              </p>
            </div>
            <div className="flex flex-col rounded-lg border border-border p-3">
              <p className="font-sans text-h3 font-bold tabular-nums text-foreground">
                {summary.rulesGenerated}
              </p>
              <p className="mt-1 text-caption font-medium uppercase tracking-wider text-muted-foreground">
                Rules Generated
              </p>
            </div>
          </div>
        </div>

        {submitted && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 mb-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <div>
                <p className="text-body font-semibold text-foreground">
                  Schema submitted to Super Admin Approval Queue
                </p>
                <p className="text-caption text-muted-foreground">
                  Status: <Badge className="bg-warning/15 text-warning text-[9px] border-0 font-medium">Pending Approval</Badge> — Track in <a href="/approval-queue" className="underline text-primary">Approval Queue</a>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            className="gap-1.5"
            disabled={submitted}
          >
            <Save className="h-3.5 w-3.5" />
            Save as Draft
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSubmitToQueue()}
            className="gap-1.5"
            disabled={submitted || submitting}
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Submitting…" : "Submit to Evolution Queue"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onReject}
            className="gap-1.5"
            disabled={submitted}
          >
            <X className="h-3.5 w-3.5" />
            Reject Schema
          </Button>
        </div>

        <p className="mt-3 text-caption text-muted-foreground">
          All new fields and mapping changes require governance approval. PII fields require compliance review.
          Version increment is auto-generated. Rollback is available via Version diff.
        </p>
      </div>
    </div>
  );
}
