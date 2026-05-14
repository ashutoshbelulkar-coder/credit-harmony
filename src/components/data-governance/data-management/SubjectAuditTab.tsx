import { useMemo } from "react";
import { Link2, PencilLine, PlusCircle, Trash2, Unlink2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { badgeTextClasses } from "@/lib/typography";
import type { AuditAction, AuditEntry } from "@/types/data-management";

const ACTION_META: Record<AuditAction, { label: string; tone: "success" | "warning" | "destructive" | "info"; Icon: React.ComponentType<{ className?: string }> }> = {
  CREATE: { label: "Created", tone: "success", Icon: PlusCircle },
  UPDATE: { label: "Updated", tone: "info", Icon: PencilLine },
  DELETE: { label: "Deleted", tone: "destructive", Icon: Trash2 },
  LINK: { label: "Linked source", tone: "success", Icon: Link2 },
  UNLINK: { label: "Unlinked source", tone: "warning", Icon: Unlink2 },
};

const TONE_CLASSES: Record<string, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary/10 text-primary border-primary/20",
};

interface SubjectAuditTabProps {
  entries: AuditEntry[];
}

export function SubjectAuditTab({ entries }: SubjectAuditTabProps) {
  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      ),
    [entries]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-caption text-muted-foreground">
        No audit history yet for this subject.
      </div>
    );
  }

  return (
    <ol className="space-y-3" aria-label="Audit history">
      {sorted.map((entry) => {
        const meta = ACTION_META[entry.action];
        return (
          <li
            key={entry.logId}
            className="rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${badgeTextClasses} ${TONE_CLASSES[meta.tone]}`}
              >
                <meta.Icon className="mr-1 h-3 w-3" /> {meta.label}
              </Badge>
              {entry.relatedSourceId && (
                <Badge variant="outline" className={badgeTextClasses}>
                  Source: {entry.relatedSourceId}
                </Badge>
              )}
              <span className="text-caption text-muted-foreground">
                {new Date(entry.performedAt).toLocaleString()}
              </span>
              <span className="ml-auto text-caption text-muted-foreground">
                by <span className="font-medium text-foreground">{entry.performedBy}</span>
              </span>
            </div>
            {entry.changes && entry.changes.length > 0 && (
              <ul className="mt-2 space-y-1 text-caption text-foreground">
                {entry.changes.map((change) => (
                  <li key={change.field} className="flex flex-wrap items-baseline gap-1">
                    <span className="font-medium">{change.field}:</span>
                    <span className="text-muted-foreground line-through">
                      {change.oldValue ?? "—"}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground">{change.newValue ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-body text-foreground">{entry.comment}</p>
          </li>
        );
      })}
    </ol>
  );
}
