import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ApiSubmissionRequest } from "@/data/monitoring-mock";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  apiRequestIsFailedForRetry,
  apiRequestShowsValidationFailures,
  apiRequestStatusLabel,
  apiRequestStatusTextClass,
} from "@/lib/status-badges";

interface RequestDetailDrawerProps {
  request: ApiSubmissionRequest | null;
  onClose: () => void;
}

export function RequestDetailDrawer({ request, onClose }: RequestDetailDrawerProps) {
  if (!request) return null;

  const handleRetry = () => {
    // Stub: could trigger toast or API call
    onClose();
  };

  return (
    <Sheet open={!!request} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-h4">Request {request.request_id}</SheetTitle>
          <SheetDescription className="text-caption">
            Request metadata and validation details
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div>
            <h4 className="text-body font-semibold text-foreground mb-2">Request Metadata</h4>
            <dl className="space-y-1.5 text-caption">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Request ID</dt>
                <dd className="font-medium">{request.request_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">API Key</dt>
                <dd className="font-medium">{request.api_key}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Endpoint</dt>
                <dd className="font-medium">{request.endpoint}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className={cn(apiRequestStatusTextClass(request.status))}>
                  {apiRequestStatusLabel(request.status)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Response Time</dt>
                <dd className="font-medium">{request.response_time_ms} ms</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="font-medium">{request.timestamp}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="text-body font-semibold text-foreground mb-2">Payload Summary</h4>
            <p className="text-caption text-muted-foreground">
              Records submitted: <span className="font-medium text-foreground">{request.records}</span>
            </p>
          </div>

          {request.error_code && (
            <div>
              <h4 className="text-body font-semibold text-foreground mb-2">Error Details</h4>
              <p className="text-caption text-muted-foreground">
                Error code: <span className="font-medium text-destructive">{request.error_code}</span>
              </p>
              <p className="text-caption text-muted-foreground mt-1">
                Validation or processing failed for this request. Use Retry to resubmit.
              </p>
            </div>
          )}

          <div>
            <h4 className="text-body font-semibold text-foreground mb-2">Validation Failures</h4>
            <p className="text-caption text-muted-foreground">
              {apiRequestShowsValidationFailures(request.status)
                ? "See error code and payload for details."
                : "No validation failures."}
            </p>
          </div>
        </div>

        <SheetFooter className="mt-6">
          {apiRequestIsFailedForRetry(request.status) && (
            <Button variant="default" size="sm" className="gap-2" onClick={handleRetry}>
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
