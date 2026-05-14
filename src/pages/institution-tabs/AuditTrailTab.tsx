import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { useAuditLogs } from "@/hooks/api/useAuditLogs";
import { SkeletonTable } from "@/components/ui/skeleton-table";

const categoryStyles: Record<string, string> = {
  SUBMISSION: "bg-primary/15 text-primary",
  SUBSCRIBER: "bg-secondary/15 text-secondary",
  SYSTEM: "bg-muted text-muted-foreground",
  GOVERNANCE: "bg-warning/15 text-warning",
  INSTITUTION: "bg-primary/15 text-primary",
};

function resolveCategory(entityType: string): string {
  const upper = entityType.toUpperCase();
  if (upper.includes("SUBMISS")) return "SUBMISSION";
  if (upper.includes("SUBSCRIB")) return "SUBSCRIBER";
  if (upper.includes("GOVERN")) return "GOVERNANCE";
  if (upper.includes("INSTIT")) return "INSTITUTION";
  return "SYSTEM";
}

export default function AuditTrailTab({
  isDataSubmitter,
  isSubscriber,
  institutionId,
}: {
  isDataSubmitter: boolean;
  isSubscriber: boolean;
  institutionId?: string;
}) {
  const { data, isLoading } = useAuditLogs({
    entityType: institutionId ? "INSTITUTION" : undefined,
    entityId: institutionId,
    size: 20,
  });

  const entries = data?.content ?? [];

  const filteredEvents = entries.filter((e) => {
    const cat = resolveCategory(e.entityType);
    if (cat === "SUBMISSION" && !isDataSubmitter) return false;
    if (cat === "SUBSCRIBER" && !isSubscriber) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-foreground">Audit Trail</h3>
        <p className="text-caption text-muted-foreground mt-1">
          Activity log of all configuration and operational changes.
        </p>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-max">
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
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-caption text-muted-foreground">
                      No audit events found
                    </td>
                  </tr>
                ) : filteredEvents.map((e) => {
                  const cat = resolveCategory(e.entityType);
                  return (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">
                        {new Date(e.occurredAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-body font-medium text-foreground">
                        {e.userEmail ?? "System"}
                      </td>
                      <td className="px-5 py-4 text-body text-foreground">
                        {e.actionType.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full capitalize", badgeTextClasses, categoryStyles[cat] ?? "bg-muted text-muted-foreground")}>
                          {cat.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-caption text-muted-foreground max-w-xs truncate">
                        {e.description ?? `${e.entityType}/${e.entityId}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
