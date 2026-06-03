import { AlertTriangle, Clock, Database, FileQuestion, ServerCrash } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import type { RebErrorType } from "@/lib/real-estate-bureau/types";

const ERROR_CONFIG: Record<
  RebErrorType,
  { icon: React.ElementType; title: string; description: string }
> = {
  no_property: {
    icon: FileQuestion,
    title: "No Property Found",
    description:
      "No matching property records were found across member submissions, CERSAI, or proprietary data sources for the given search parameters.",
  },
  no_cersai: {
    icon: Database,
    title: "No CERSAI Match Found",
    description:
      "Property ownership records were located but no corresponding CERSAI security interest registration was found. Manual verification recommended.",
  },
  timeout: {
    icon: Clock,
    title: "External Data Source Timeout",
    description:
      "One or more external data sources did not respond within the configured SLA. Partial results may be available after retry.",
  },
  partial_data: {
    icon: AlertTriangle,
    title: "Partial Data Available",
    description:
      "The report was generated with incomplete data from one or more sources. Review flagged sections before making credit decisions.",
  },
  system_error: {
    icon: ServerCrash,
    title: "System Error",
    description:
      "An unexpected error occurred while processing your inquiry. Please retry or contact CRIF support if the issue persists.",
  },
};

interface RebErrorStateProps {
  errorType: RebErrorType;
  onRetry?: () => void;
}

export function RebErrorState({ errorType, onRetry }: RebErrorStateProps) {
  const config = ERROR_CONFIG[errorType];
  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      actionLabel={onRetry ? "Retry inquiry" : undefined}
      onAction={onRetry}
    />
  );
}
