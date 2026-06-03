import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/real-estate-bureau/types";

export type BureauDecision = "Pass" | "Refer" | "Fail";

const DECISIONS: BureauDecision[] = ["Pass", "Refer", "Fail"];

const DECISION_CONFIG: Record<
  BureauDecision,
  {
    icon: typeof CheckCircle2;
    label: string;
    summary: string;
    ring: string;
    bg: string;
    text: string;
    border: string;
    segment: string;
  }
> = {
  Pass: {
    icon: CheckCircle2,
    label: "Pass",
    summary: "Property bureau checks cleared. Proceed with standard underwriting.",
    ring: "ring-success/25",
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/35",
    segment: "bg-success text-success-foreground",
  },
  Refer: {
    icon: AlertCircle,
    label: "Refer",
    summary: "Additional verification or senior review recommended before approval.",
    ring: "ring-[hsl(var(--risk-medium))]/25",
    bg: "bg-[hsl(var(--risk-medium))]/10",
    text: "text-[hsl(var(--risk-medium))]",
    border: "border-[hsl(var(--risk-medium))]/35",
    segment: "bg-[hsl(var(--risk-medium))] text-white",
  },
  Fail: {
    icon: XCircle,
    label: "Fail",
    summary: "Material bureau or encumbrance concerns identified. Do not proceed without escalation.",
    ring: "ring-destructive/25",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/35",
    segment: "bg-destructive text-destructive-foreground",
  },
};

export function riskLevelToBureauDecision(level: RiskLevel): BureauDecision {
  if (level === "Low") return "Pass";
  if (level === "High") return "Fail";
  return "Refer";
}

interface RiskGaugeProps {
  level: RiskLevel;
  decision?: BureauDecision;
}

export function RiskGauge({ level, decision }: RiskGaugeProps) {
  const active = decision ?? riskLevelToBureauDecision(level);
  const config = DECISION_CONFIG[active];
  const Icon = config.icon;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-border bg-card">
      <div
        className={cn(
          "relative flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border-2 ring-4",
          config.bg,
          config.border,
          config.ring
        )}
      >
        <Icon className={cn("h-10 w-10", config.text)} strokeWidth={2} />
        <span className={cn("mt-2 text-xl font-bold tracking-wide", config.text)}>
          {config.label}
        </span>
      </div>

      <div className="flex-1 min-w-0 text-center sm:text-left">
        <p className="text-caption text-muted-foreground uppercase tracking-wider">
          Bureau Decision
        </p>
        <p className={cn("text-h2 font-semibold mt-1", config.text)}>{config.label}</p>

        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
          {DECISIONS.map((d) => {
            const isActive = d === active;
            return (
              <span
                key={d}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border transition-colors",
                  isActive
                    ? DECISION_CONFIG[d].segment
                    : "bg-muted/40 text-muted-foreground border-transparent"
                )}
              >
                {d}
              </span>
            );
          })}
        </div>

        <p className="text-body text-muted-foreground mt-3 max-w-md">{config.summary}</p>
      </div>
    </div>
  );
}
