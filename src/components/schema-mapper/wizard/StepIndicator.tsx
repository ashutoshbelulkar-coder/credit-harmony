import { Check, FileInput, Target, Sparkles, ShieldCheck, SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "@/types/schema-mapper";

const STEPS: { key: WizardStep; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { key: "source_definition", label: "Source Definition", shortLabel: "Source", icon: FileInput },
  { key: "target_schema", label: "Target Schema", shortLabel: "Target", icon: Target },
  { key: "ai_mapping", label: "AI Mapping", shortLabel: "AI Map", icon: Sparkles },
  { key: "validation_rules", label: "Validation Rules", shortLabel: "Rules", icon: ShieldCheck },
  { key: "confirmation", label: "Confirmation", shortLabel: "Confirm", icon: SendHorizonal },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  className?: string;
}

export function StepIndicator({ currentStep, completedSteps, className }: StepIndicatorProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden",
        className,
      )}
    >
      {/* Desktop / tablet: horizontal bar */}
      <div className="hidden sm:flex items-stretch">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.has(step.key);
          const isCurrent = step.key === currentStep;
          const isPast = idx < currentIdx;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex min-w-0 flex-1 items-stretch">
              {idx > 0 && (
                <div className="flex items-center">
                  <div
                    className={cn(
                      "h-px w-3 lg:w-5",
                      isPast || isCompleted ? "bg-secondary" : "bg-border",
                    )}
                  />
                </div>
              )}

              <div
                className={cn(
                  "flex flex-1 items-center gap-2 px-2.5 py-2 transition-colors",
                  isCurrent && "bg-primary/8",
                )}
              >
                {/* Number circle */}
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold leading-none transition-colors",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                </div>

                {/* Text — always visible, adapts size */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[11px] font-medium leading-[18px] truncate",
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {/* Full label on xl+, short label on sm-lg */}
                    <span className="hidden xl:inline">{step.label}</span>
                    <span className="xl:hidden">{step.shortLabel}</span>
                  </p>
                </div>

                {/* Active dot indicator */}
                {isCurrent && (
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: compact horizontal with numbers + active label */}
      <div className="flex sm:hidden items-center px-2 py-2 gap-1">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.has(step.key);
          const isCurrent = step.key === currentStep;
          const isPast = idx < currentIdx;

          return (
            <div key={step.key} className="flex items-center gap-1">
              {idx > 0 && (
                <div
                  className={cn(
                    "h-px w-2",
                    isPast || isCompleted ? "bg-secondary" : "bg-border",
                  )}
                />
              )}

              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors",
                  isCurrent && "bg-primary/10",
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold leading-none",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                </div>

                {isCurrent && (
                  <span className="text-[11px] font-medium leading-[18px] text-foreground whitespace-nowrap">
                    {step.shortLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { STEPS };
