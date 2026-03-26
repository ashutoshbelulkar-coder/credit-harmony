import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { Download, FileBarChart, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ReportDef {
  name: string;
  description: string;
  lastGenerated: string;
  frequency: string;
}

const submissionReports: ReportDef[] = [
  { name: "Volume Report", description: "Daily/monthly submission volume breakdown", lastGenerated: "2026-02-18", frequency: "Daily" },
  { name: "Rejection Report", description: "Rejected records with reason codes", lastGenerated: "2026-02-18", frequency: "Daily" },
  { name: "SLA Report", description: "Processing time and SLA compliance metrics", lastGenerated: "2026-02-17", frequency: "Weekly" },
];

const subscriberReports: ReportDef[] = [
  { name: "Enquiry Report", description: "Enquiry volume, success rate, and latency", lastGenerated: "2026-02-19", frequency: "Daily" },
  { name: "Billing Summary", description: "Usage, credits consumed, and outstanding balance", lastGenerated: "2026-02-15", frequency: "Monthly" },
  { name: "Alternate Data Usage Report", description: "Usage by data source with cost breakdown", lastGenerated: "2026-02-18", frequency: "Weekly" },
];

interface ScheduledReport {
  reportName: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  scheduleTime: string;
  recipientEmails: string;
  emailHtml: string;
  updatedAt: string;
}

function ReportTable({
  reports,
  onEditSchedule,
}: {
  reports: ReportDef[];
  onEditSchedule: (report: ReportDef) => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-muted/95 backdrop-blur">
            <tr className="border-b border-border">
              <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Report</th>
              <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Frequency</th>
              <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Last Generated</th>
              <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((r) => (
              <tr key={r.name} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileBarChart className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-body font-medium text-foreground">{r.name}</p>
                      <p className="text-caption text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-body text-muted-foreground">{r.frequency}</td>
                <td className="px-5 py-4 text-body text-muted-foreground">{r.lastGenerated}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => onEditSchedule(r)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      aria-label={`Edit schedule for ${r.name}`}
                      title="Edit schedule"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      aria-label={`Export ${r.name}`}
                      title="Export"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsTab({ isDataSubmitter, isSubscriber }: { isDataSubmitter: boolean; isSubscriber: boolean }) {
  const availableReports = useMemo(() => {
    const list: ReportDef[] = [];
    if (isDataSubmitter) list.push(...submissionReports);
    if (isSubscriber) list.push(...subscriberReports);
    return list;
  }, [isDataSubmitter, isSubscriber]);

  const [reportName, setReportName] = useState<string>(availableReports[0]?.name ?? "");
  const [frequency, setFrequency] = useState<ScheduledReport["frequency"]>("Weekly");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [recipientEmails, setRecipientEmails] = useState("ops@institution.com,risk@institution.com");
  const [emailHtml, setEmailHtml] = useState(
    "<h3>Scheduled Report</h3><p>Please find the latest report attached.</p>"
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);

  const resetForm = () => {
    setReportName(availableReports[0]?.name ?? "");
    setFrequency("Weekly");
    setScheduleTime("09:00");
    setRecipientEmails("ops@institution.com,risk@institution.com");
    setEmailHtml("<h3>Scheduled Report</h3><p>Please find the latest report attached.</p>");
    setEditingIndex(null);
    setShowScheduler(false);
  };

  const handleSaveSchedule = () => {
    if (!reportName || !recipientEmails.trim()) return;
    const payload: ScheduledReport = {
      reportName,
      frequency,
      scheduleTime,
      recipientEmails: recipientEmails.trim(),
      emailHtml: emailHtml.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    if (editingIndex != null) {
      setScheduledReports((prev) => prev.map((r, i) => (i === editingIndex ? payload : r)));
    } else {
      setScheduledReports((prev) => [payload, ...prev]);
    }
    resetForm();
  };

  const handleEditSchedule = (index: number) => {
    const row = scheduledReports[index];
    setReportName(row.reportName);
    setFrequency(row.frequency);
    setScheduleTime(row.scheduleTime);
    setRecipientEmails(row.recipientEmails);
    setEmailHtml(row.emailHtml);
    setEditingIndex(index);
    setShowScheduler(true);
  };

  const handleOpenScheduleForReport = (report: ReportDef) => {
    const existingIndex = scheduledReports.findIndex((r) => r.reportName === report.name);
    if (existingIndex >= 0) {
      handleEditSchedule(existingIndex);
      return;
    }
    setReportName(report.name);
    const inferred =
      report.frequency === "Daily" || report.frequency === "Weekly" || report.frequency === "Monthly"
        ? report.frequency
        : "Weekly";
    setFrequency(inferred);
    setScheduleTime("09:00");
    setRecipientEmails("ops@institution.com,risk@institution.com");
    setEmailHtml("<h3>Scheduled Report</h3><p>Please find the latest report attached.</p>");
    setEditingIndex(null);
    setShowScheduler(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-h4 font-semibold text-foreground">Reports</h3>
            <p className="text-caption text-muted-foreground mt-1">Generate and export institution reports.</p>
          </div>
          <Button size="sm" onClick={() => setShowScheduler(true)}>
            Schedule Report
          </Button>
        </div>
      </div>

      <Dialog open={showScheduler} onOpenChange={(v) => !v && resetForm()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Report Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Report</Label>
                <Select value={reportName} onValueChange={setReportName}>
                  <SelectTrigger className="h-9 text-caption">
                    <SelectValue placeholder="Select report" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableReports.map((r) => (
                      <SelectItem key={r.name} value={r.name} className="text-caption">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduledReport["frequency"])}>
                  <SelectTrigger className="h-9 text-caption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily" className="text-caption">Daily</SelectItem>
                    <SelectItem value="Weekly" className="text-caption">Weekly</SelectItem>
                    <SelectItem value="Monthly" className="text-caption">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-time" className="text-caption text-muted-foreground">Schedule Time</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-9 text-caption"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Recipient Emails</Label>
              <Input
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                placeholder="ops@institution.com,risk@institution.com"
                className="h-9 text-caption"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-caption text-muted-foreground">Email HTML Content</Label>
              <Textarea
                value={emailHtml}
                onChange={(e) => setEmailHtml(e.target.value)}
                rows={5}
                className="text-caption font-mono"
                placeholder="<h3>Scheduled Report</h3><p>Report summary...</p>"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button size="sm" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveSchedule} disabled={!reportName || !recipientEmails.trim()}>
              {editingIndex != null ? "Update Schedule" : "Schedule Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isDataSubmitter && (
        <div className="space-y-4">
          <h4 className="text-body font-semibold text-foreground">Submission Reports</h4>
          <ReportTable reports={submissionReports} onEditSchedule={handleOpenScheduleForReport} />
        </div>
      )}

      {isSubscriber && (
        <div className="space-y-4">
          {isDataSubmitter && <div className="border-t border-border pt-2" />}
          <h4 className="text-body font-semibold text-foreground">Subscriber Reports</h4>
          <ReportTable reports={subscriberReports} onEditSchedule={handleOpenScheduleForReport} />
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-body font-semibold text-foreground">Scheduled Reports</h4>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-muted/95 backdrop-blur">
                <tr className="border-b border-border">
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Report</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Frequency</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Time</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Recipients</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Updated</th>
                  <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scheduledReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-caption text-muted-foreground">
                      No scheduled reports yet.
                    </td>
                  </tr>
                ) : (
                  scheduledReports.map((r, idx) => (
                    <tr key={`${r.reportName}-${idx}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 text-body text-foreground">{r.reportName}</td>
                      <td className="px-5 py-3.5 text-body text-muted-foreground">{r.frequency}</td>
                      <td className="px-5 py-3.5 text-body text-muted-foreground tabular-nums">{r.scheduleTime}</td>
                      <td className="px-5 py-3.5 text-caption text-muted-foreground max-w-[280px] truncate">{r.recipientEmails}</td>
                      <td className="px-5 py-3.5 text-body text-muted-foreground">{r.updatedAt}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleEditSchedule(idx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-caption font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
