import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, AlertCircle } from "lucide-react";

export type AlertType = "info" | "warning" | "critical";

interface MonitoringAlertBannerProps {
  type: AlertType;
  title: string;
  description?: string;
  className?: string;
}

const typeConfig: Record<
  AlertType,
  { icon: typeof Info; className: string }
> = {
  info: {
    icon: Info,
    className: "border-primary/50 bg-primary/5 [&>svg]:text-primary",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-warning/50 bg-warning/5 [&>svg]:text-warning",
  },
  critical: {
    icon: AlertCircle,
    className: "border-destructive/50 bg-destructive/5 [&>svg]:text-destructive",
  },
};

export function MonitoringAlertBanner({
  type,
  title,
  description,
  className,
}: MonitoringAlertBannerProps) {
  const { icon: Icon, className: typeClass } = typeConfig[type];
  return (
    <Alert className={cn(typeClass, className)}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="text-body font-semibold">{title}</AlertTitle>
      {description && (
        <AlertDescription className="text-caption mt-0.5">
          {description}
        </AlertDescription>
      )}
    </Alert>
  );
}
