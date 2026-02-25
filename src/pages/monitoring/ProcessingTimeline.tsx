import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";

export interface TimelineStep {
  step: string;
  timestamp: string;
  completed: boolean;
}

interface ProcessingTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function ProcessingTimeline({ steps, className }: ProcessingTimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-0.5">
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full border-2 shrink-0",
                s.completed ? "bg-primary border-primary" : "bg-muted border-border"
              )}
            />
            {i < steps.length - 1 && (
              <div className={cn("w-0.5 flex-1 min-h-[20px]", s.completed ? "bg-primary/30" : "bg-border")} />
            )}
          </div>
          <div className="pb-4">
            <p className={cn(badgeTextClasses, s.completed ? "text-foreground" : "text-muted-foreground")}>
              {s.step}
            </p>
            <p className="text-[10px] leading-[13px] text-muted-foreground mt-0.5">{s.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
