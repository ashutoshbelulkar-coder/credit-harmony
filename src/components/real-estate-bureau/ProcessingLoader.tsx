import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Loader2 } from "lucide-react";
import { PROCESSING_MESSAGES } from "@/lib/real-estate-bureau/mock-data";
import { cn } from "@/lib/utils";

const DURATION_MIN_MS = 7000;
const DURATION_MAX_MS = 10000;

interface ProcessingLoaderProps {
  onComplete: () => void;
}

export function ProcessingLoader({ onComplete }: ProcessingLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const durationMs =
      DURATION_MIN_MS +
      Math.floor(Math.random() * (DURATION_MAX_MS - DURATION_MIN_MS + 1));
    const messageIntervalMs = durationMs / PROCESSING_MESSAGES.length;
    const start = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      const idx = Math.min(
        PROCESSING_MESSAGES.length - 1,
        Math.floor(elapsed / messageIntervalMs)
      );
      setMessageIndex(idx);
      if (elapsed >= durationMs) {
        window.clearInterval(tick);
        onComplete();
      }
    }, 50);
    return () => window.clearInterval(tick);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6"
      role="status"
      aria-live="polite"
      aria-label="Generating property report"
    >
      <div
        className={cn(
          "flex w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-md",
          "max-h-[min(100dvh-2rem,32rem)] overflow-hidden"
        )}
      >
        <div className="border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            </div>
            <div className="min-w-0 text-left">
              <h2 className="text-h4 font-semibold text-foreground truncate">
                Generating Property Report
              </h2>
              <p className="text-caption text-muted-foreground mt-0.5 truncate">
                {PROCESSING_MESSAGES[messageIndex]}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-muted-foreground">Progress</span>
              <span className="text-caption font-medium tabular-nums text-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <ScrollArea className="h-[min(28vh,11rem)] sm:h-[min(32vh,12.5rem)] -mx-1 px-1">
            <ul className="space-y-1 pr-2">
              {PROCESSING_MESSAGES.map((msg, i) => {
                const done = i < messageIndex;
                const active = i === messageIndex;
                return (
                  <li
                    key={msg}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-2 py-1.5 text-[11px] leading-[18px] transition-colors",
                      done && "text-success",
                      active && "bg-muted/60 font-medium text-foreground",
                      !done && !active && "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full",
                        done
                          ? "bg-success/15 text-success"
                          : active
                            ? "bg-primary/15"
                            : "bg-muted"
                      )}
                      aria-hidden
                    >
                      {done ? (
                        <Check className="h-2 w-2" strokeWidth={3} />
                      ) : active ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                      )}
                    </span>
                    <span className="min-w-0 break-words">{msg}</span>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
