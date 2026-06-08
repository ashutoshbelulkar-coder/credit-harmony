import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/real-estate-bureau/types";
import {
  PRE_SCREENING_CONFIG,
  PRE_SCREENING_OUTCOMES,
  riskLevelToPreScreeningOutcome,
  type PreScreeningOutcome,
} from "@/lib/real-estate-bureau/pre-screening";

const OUTCOME_STYLES: Record<
  PreScreeningOutcome,
  {
    icon: typeof CheckCircle2;
    ring: string;
    bg: string;
    text: string;
    border: string;
    segment: string;
  }
> = {
  pre_screen_approved: {
    icon: CheckCircle2,
    ring: "ring-success/25",
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/35",
    segment: "bg-success text-success-foreground",
  },
  pre_screen_conditional: {
    icon: AlertCircle,
    ring: "ring-[hsl(var(--risk-medium))]/25",
    bg: "bg-[hsl(var(--risk-medium))]/10",
    text: "text-[hsl(var(--risk-medium))]",
    border: "border-[hsl(var(--risk-medium))]/35",
    segment: "bg-[hsl(var(--risk-medium))] text-white",
  },
  manual_screening_required: {
    icon: ClipboardList,
    ring: "ring-destructive/25",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/35",
    segment: "bg-destructive text-destructive-foreground",
  },
};

interface RiskGaugeProps {
  level: RiskLevel;
  outcome?: PreScreeningOutcome;
  summary?: string;
}

export function RiskGauge({ level, outcome, summary }: RiskGaugeProps) {
  const active = outcome ?? riskLevelToPreScreeningOutcome(level);
  const config = PRE_SCREENING_CONFIG[active];
  const styles = OUTCOME_STYLES[active];
  const Icon = styles.icon;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-border bg-card">
      <div
        className={cn(
          "relative flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border-2 ring-4 px-2",
          styles.bg,
          styles.border,
          styles.ring
        )}
      >
        <Icon className={cn("h-9 w-9", styles.text)} strokeWidth={2} />
        <span className={cn("mt-2 text-center text-[11px] font-bold leading-tight", styles.text)}>
          {config.shortLabel}
        </span>
      </div>

      <div className="flex-1 min-w-0 text-center sm:text-left">
        <p className="text-caption text-muted-foreground uppercase tracking-wider">
          Pre-Screening Recommendation
        </p>
        <p className={cn("text-h3 font-semibold mt-1", styles.text)}>{config.label}</p>

        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
          {PRE_SCREENING_OUTCOMES.map((key) => {
            const isActive = key === active;
            return (
              <span
                key={key}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide border transition-colors",
                  isActive
                    ? OUTCOME_STYLES[key].segment
                    : "bg-muted/40 text-muted-foreground border-transparent"
                )}
              >
                {PRE_SCREENING_CONFIG[key].shortLabel}
              </span>
            );
          })}
        </div>

        <p className="text-body text-muted-foreground mt-3 max-w-md">
          {summary || config.summary}
        </p>
      </div>
    </div>
  );
}
