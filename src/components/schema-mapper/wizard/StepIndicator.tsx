import { Check, FileInput, Sparkles, ShieldCheck, SendHorizonal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WizardStep } from "@/types/schema-mapper";

const STEPS: { key: WizardStep; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { key: "source_ingestion", label: "Upload Source Schema", shortLabel: "Upload", icon: FileInput },
  { key: "llm_field_intelligence", label: "LLM Field Intelligence", shortLabel: "Field Intel", icon: Sparkles },
  { key: "auto_rule_preview", label: "Validation Rules", shortLabel: "Rules", icon: ShieldCheck },
  { key: "governance_actions", label: "Governance Actions", shortLabel: "Governance", icon: SendHorizonal },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  onBack?: () => void;
  isFirst?: boolean;
  className?: string;
}

export function StepIndicator({ currentStep, completedSteps, onBack, isFirst, className }: StepIndicatorProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden",
        className,
      )}
    >
      {/* Desktop / tablet: horizontal bar - scrollable to prevent overlap on laptop */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="flex items-stretch flex-nowrap min-w-0">
          {!isFirst && onBack && (
            <div className="flex items-center border-r border-border shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-full rounded-none px-2.5 gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" />
                <span className="hidden lg:inline">Back</span>
              </Button>
            </div>
          )}

          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps.has(step.key);
            const isCurrent = step.key === currentStep;
            const isPast = idx < currentIdx;

            return (
              <div key={step.key} className="flex shrink-0 items-stretch min-w-[100px]">
                {idx > 0 && (
                  <div className="flex items-center shrink-0">
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
                    "flex items-center gap-2 px-2.5 py-2 transition-colors shrink-0",
                    isCurrent && "bg-primary/8",
                  )}
                >
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

                  <div className="min-w-0 max-w-[140px]">
                    <p
                      className={cn(
                        "text-[11px] font-medium leading-[18px] truncate whitespace-nowrap",
                        isCurrent
                          ? "text-foreground"
                          : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                      title={step.label}
                    >
                      {/* Use short labels to avoid overlap on laptop; full label only on very wide (2xl) */}
                      <span className="hidden 2xl:inline">{step.label}</span>
                      <span className="2xl:hidden">{step.shortLabel}</span>
                    </p>
                  </div>

                  {isCurrent && (
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: back button + compact steps */}
      <div className="flex sm:hidden items-center px-2 py-2 gap-1">
        {!isFirst && onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-6 w-6 p-0 shrink-0 mr-1"
          >
            <ArrowLeft className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}

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
