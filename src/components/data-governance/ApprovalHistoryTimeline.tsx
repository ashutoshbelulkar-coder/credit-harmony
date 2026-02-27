import type { ApprovalEvent } from "@/types/data-governance";

export interface ApprovalHistoryTimelineProps {
  events: ApprovalEvent[];
  className?: string;
}

export function ApprovalHistoryTimeline({ events, className }: ApprovalHistoryTimelineProps) {
  return (
    <div className={className}>
      <p className="mb-2 text-caption font-medium uppercase tracking-wider text-muted-foreground">
        Approval history
      </p>
      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.id} className="relative flex gap-3 border-l-2 border-border pl-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-foreground">
                {ev.approverName} ({ev.approverRole})
              </span>
              <span className="text-caption text-muted-foreground">
                {new Date(ev.timestamp).toLocaleString()} · {ev.action}
              </span>
              {(ev.comment || ev.reason) && (
                <p className="mt-1 text-caption text-muted-foreground">
                  {ev.comment || ev.reason}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
