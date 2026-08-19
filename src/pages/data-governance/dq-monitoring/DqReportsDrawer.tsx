import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { badgeTextClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import { toast } from "sonner";
import type { DqReportJob, DqReportPrefill, DqReportType } from "@/types/dq-monitoring";
import {
  DQ_REPORT_TYPES,
  dqIssues,
  dqMembers,
  dqMoversDrops,
  dqMoversRises,
  dqBatches,
} from "@/data/dq-monitoring-mock";

function statusClass(status: DqReportJob["status"]) {
  if (status === "Ready") return "bg-success/15 text-success";
  if (status === "Running") return "bg-warning/15 text-warning";
  return "bg-muted text-muted-foreground";
}

export function DqReportsDrawer({
  open,
  onOpenChange,
  prefill,
  jobs,
  onJobsChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: DqReportPrefill | null;
  jobs: DqReportJob[];
  onJobsChange: Dispatch<SetStateAction<DqReportJob[]>>;
}) {
  const [type, setType] = useState<DqReportType>(prefill?.type ?? "portfolio_summary");
  const [memberId, setMemberId] = useState(prefill?.memberId ?? "FNB");
  const namedMembers = useMemo(() => dqMembers.filter((m) => m.named), []);

  useEffect(() => {
    if (prefill?.type) setType(prefill.type);
    if (prefill?.memberId) setMemberId(prefill.memberId);
  }, [prefill]);

  const generate = () => {
    const id = `JOB-${Date.now().toString().slice(-6)}`;
    const job: DqReportJob = {
      id,
      type,
      status: "Queued",
      createdAt: new Date().toISOString(),
    };
    onJobsChange((prev) => [job, ...prev]);
    toast.success("Report queued");
    window.setTimeout(() => {
      onJobsChange((prev) => prev.map((j) => (j.id === id ? { ...j, status: "Running" } : j)));
    }, 400);
    window.setTimeout(() => {
      onJobsChange((prev) => prev.map((j) => (j.id === id ? { ...j, status: "Ready", rowCount: 100_000 } : j)));
    }, 1400);
  };

  const download = (job: DqReportJob) => {
    if (job.type === "issue_extract") {
      exportToCsv("dq_issue_extract", dqIssues, [
        { key: "code", label: "Error code" },
        { key: "ruleType", label: "Rule type" },
        { key: "field", label: "Field" },
        { key: "severity", label: "Severity" },
        { key: "records", label: "Records" },
        { key: "membersAffected", label: "Members affected" },
      ]);
    } else if (job.type === "movers_report") {
      exportToCsv("dq_movers", [...dqMoversDrops, ...dqMoversRises], [
        { key: "memberName", label: "Member" },
        { key: "dqi", label: "DQI" },
        { key: "delta", label: "Delta" },
        { key: "causeCode", label: "Cause" },
      ]);
    } else if (job.type === "submission_extract") {
      exportToCsv(
        "dq_submissions",
        dqBatches.slice(0, 500) as unknown as Record<string, unknown>[],
        [
          { key: "batchId", label: "Batch ID" },
          { key: "memberName", label: "Member" },
          { key: "evaluated", label: "Evaluated" },
          { key: "rejected", label: "Rejected" },
          { key: "dqi", label: "DQI" },
        ],
      );
    } else {
      const m = dqMembers.find((x) => x.id === memberId) ?? dqMembers[0];
      exportToCsv("dq_scorecard", [m], [
        { key: "id", label: "Member ID" },
        { key: "name", label: "Member" },
        { key: "dqi", label: "DQI" },
        { key: "grade", label: "Grade" },
        { key: "validity", label: "Validity" },
        { key: "completeness", label: "Completeness" },
        { key: "dupIntegrity", label: "Dup & Integrity" },
      ]);
    }
    toast.success("Download started (100k-row cap).");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-h4 font-semibold text-foreground">Reports</SheetTitle>
          <SheetDescription>
            Generate extracts for the current filters. Downloads are capped at 100,000 rows.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Report type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DqReportType)}>
              <SelectTrigger className="h-8 text-caption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DQ_REPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-caption">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(type === "member_scorecard") && (
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="h-8 text-caption">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {namedMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-caption">
                      {m.name} ({m.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {prefill?.batchId && (
            <p className="text-caption text-muted-foreground">Prefill batch {prefill.batchId}</p>
          )}
          <Button type="button" size="sm" className="w-full" onClick={generate}>
            Generate
          </Button>
        </div>
        <div className="mt-8">
          <h3 className="text-h4 font-semibold text-foreground">Jobs</h3>
          <ul className="mt-3 space-y-2">
            {jobs.length === 0 && (
              <li className="text-caption text-muted-foreground">No jobs yet.</li>
            )}
            {jobs.map((job) => (
              <li key={job.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-body font-medium text-foreground">
                    {DQ_REPORT_TYPES.find((t) => t.value === job.type)?.label ?? job.type}
                  </p>
                  <span className={cn("rounded-full px-2 py-0.5", badgeTextClasses, statusClass(job.status))}>
                    {job.status}
                  </span>
                </div>
                <p className="mt-1 text-caption text-muted-foreground">{job.id}</p>
                {job.status === "Ready" && (
                  <Button type="button" variant="outline" size="sm" className="mt-2 h-7 gap-1 text-caption" onClick={() => download(job)}>
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
