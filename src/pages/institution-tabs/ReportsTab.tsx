import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { Download, FileBarChart } from "lucide-react";

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

function ReportTable({ reports }: { reports: ReportDef[] }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
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
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-caption font-medium text-foreground hover:bg-muted transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
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
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-foreground">Reports</h3>
        <p className="text-caption text-muted-foreground mt-1">Generate and export institution reports.</p>
      </div>

      {isDataSubmitter && (
        <div className="space-y-4">
          <h4 className="text-body font-semibold text-foreground">Submission Reports</h4>
          <ReportTable reports={submissionReports} />
        </div>
      )}

      {isSubscriber && (
        <div className="space-y-4">
          {isDataSubmitter && <div className="border-t border-border pt-2" />}
          <h4 className="text-body font-semibold text-foreground">Subscriber Reports</h4>
          <ReportTable reports={subscriberReports} />
        </div>
      )}
    </div>
  );
}
