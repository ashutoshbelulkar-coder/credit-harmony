import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

interface ApiErrorCardProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  /** Compact inline variant — no card border, just icon + message. */
  inline?: boolean;
}

function getErrorMessage(error: unknown): { title: string; description: string; isNetwork: boolean } {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) {
      return { title: "Session expired", description: "Please sign in again.", isNetwork: false };
    }
    if (error.isForbidden) {
      return { title: "Access denied", description: "You don't have permission to view this content.", isNetwork: false };
    }
    if (error.isNotFound) {
      return { title: "Not found", description: "The requested resource could not be found.", isNetwork: false };
    }
    if (error.isServerError) {
      return { title: "Server error", description: "The server encountered an error. Please try again.", isNetwork: false };
    }
    return { title: "Request failed", description: error.message, isNetwork: false };
  }
  // Network / unknown error
  return {
    title: "Connection error",
    description: "Unable to reach the server. Check your connection and try again.",
    isNetwork: true,
  };
}

/**
 * Standardised error display card for API call failures.
 * Provides a retry button when onRetry is supplied.
 */
export function ApiErrorCard({ error, onRetry, className, inline = false }: ApiErrorCardProps) {
  const { title, description, isNetwork } = getErrorMessage(error);

  if (inline) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
        {isNetwork ? <WifiOff className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
        <span>{description}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-1 underline underline-offset-2 hover:no-underline">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center",
        className
      )}
    >
      {isNetwork ? (
        <WifiOff className="h-10 w-10 text-destructive/60" />
      ) : (
        <AlertCircle className="h-10 w-10 text-destructive/60" />
      )}
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
