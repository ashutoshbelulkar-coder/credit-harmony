import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: "submission" | "subscriber" | "general";
  details: string;
}

const auditEvents: AuditEvent[] = [
  { id: "a1", timestamp: "2026-02-19 09:14:22", user: "Sarah Kimani", action: "File Upload", category: "submission", details: "Batch upload of 2,480 records via SFTP" },
  { id: "a2", timestamp: "2026-02-19 08:45:10", user: "System", action: "API Key Rotation", category: "submission", details: "Submission API key auto-rotated (90-day policy)" },
  { id: "a3", timestamp: "2026-02-18 16:30:05", user: "James Oduya", action: "Rate Limit Change", category: "submission", details: "Submission API rate limit changed: 800/min → 1000/min" },
  { id: "a4", timestamp: "2026-02-18 14:22:18", user: "Grace Mutua", action: "Consent Failure", category: "subscriber", details: "3 enquiries rejected: expired consent tokens" },
  { id: "a5", timestamp: "2026-02-18 11:05:44", user: "Admin", action: "Billing Rate Change", category: "subscriber", details: "Bank Statement rate updated: KES 12 → KES 15 per call" },
  { id: "a6", timestamp: "2026-02-17 15:40:30", user: "System", action: "Alternate Data Toggle", category: "subscriber", details: "Telecom data source disabled" },
  { id: "a7", timestamp: "2026-02-17 10:15:22", user: "Peter Njoroge", action: "API Disable", category: "subscriber", details: "Enquiry API disabled for maintenance" },
  { id: "a8", timestamp: "2026-02-17 10:45:11", user: "Peter Njoroge", action: "API Enable", category: "subscriber", details: "Enquiry API re-enabled after maintenance" },
  { id: "a9", timestamp: "2026-02-16 09:00:00", user: "System", action: "File Upload", category: "submission", details: "Scheduled daily batch: 1,890 records processed" },
  { id: "a10", timestamp: "2026-02-15 14:30:55", user: "Sarah Kimani", action: "Rate Limit Change", category: "submission", details: "Bulk API rate limit changed: 50/min → 100/min" },
];

const categoryStyles: Record<string, string> = {
  submission: "bg-primary/15 text-primary",
  subscriber: "bg-secondary/15 text-secondary",
  general: "bg-muted text-muted-foreground",
};

export default function AuditTrailTab({ isDataSubmitter, isSubscriber }: { isDataSubmitter: boolean; isSubscriber: boolean }) {
  const filteredEvents = auditEvents.filter((e) => {
    if (e.category === "submission" && !isDataSubmitter) return false;
    if (e.category === "subscriber" && !isSubscriber) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-foreground">Audit Trail</h3>
        <p className="text-caption text-muted-foreground mt-1">Activity log of all configuration and operational changes.</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Timestamp</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>User</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Action</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Category</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEvents.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">{e.timestamp}</td>
                  <td className="px-5 py-4 text-body font-medium text-foreground">{e.user}</td>
                  <td className="px-5 py-4 text-body text-foreground">{e.action}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full capitalize", badgeTextClasses, categoryStyles[e.category])}>
                      {e.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-caption text-muted-foreground max-w-xs truncate">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
