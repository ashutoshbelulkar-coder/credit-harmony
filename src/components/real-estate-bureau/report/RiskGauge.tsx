import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/real-estate-bureau/types";

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
}

function riskRingColor(level: RiskLevel): string {
  if (level === "Low") return "text-success";
  if (level === "High") return "text-destructive";
  return "text-[hsl(var(--risk-medium))]";
}

export function RiskGauge({ score, level }: RiskGaugeProps) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-border bg-card">
      <div className="relative h-32 w-32 shrink-0">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-1000", riskRingColor(level))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{score}</span>
        </div>
      </div>
      <div className="text-center sm:text-left">
        <p className="text-caption text-muted-foreground uppercase tracking-wider">
          Property Risk Score
        </p>
        <p className="text-h2 font-semibold text-foreground mt-1">Risk: {level}</p>
        <p className="text-body text-muted-foreground mt-2 max-w-sm">
          Composite score based on encumbrance, ownership stability, document completeness, and
          exposure trends across bureau sources.
        </p>
      </div>
    </div>
  );
}
