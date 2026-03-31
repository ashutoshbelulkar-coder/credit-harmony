import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { EnquiryLogEntry } from "@/data/monitoring-mock";
import { cn } from "@/lib/utils";
import { enquiryStatusLabel, enquiryStatusTextClass } from "@/lib/status-badges";

interface EnquiryDetailDrawerProps {
  enquiry: EnquiryLogEntry | null;
  onClose: () => void;
  /** Mirrors list filters (subscriber institution, date range) from monitoring. */
  filterContextSummary?: string;
}

export function EnquiryDetailDrawer({ enquiry, onClose, filterContextSummary }: EnquiryDetailDrawerProps) {
  if (!enquiry) return null;

  return (
    <Sheet open={!!enquiry} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-h4">Enquiry {enquiry.enquiry_id}</SheetTitle>
          <SheetDescription className="text-caption">
            Enquiry parameters and response summary
          </SheetDescription>
          {filterContextSummary ? (
            <p className="text-caption text-muted-foreground mt-2 rounded-md border border-border bg-muted/40 px-3 py-2">
              Active filters: {filterContextSummary}
            </p>
          ) : null}
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div>
            <h4 className="text-body font-semibold text-foreground mb-2">Enquiry Parameters</h4>
            <dl className="space-y-1.5 text-caption">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Enquiry ID</dt>
                <dd className="font-medium">{enquiry.enquiry_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Product</dt>
                <dd className="font-medium">{enquiry.product}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Product ID</dt>
                <dd className="font-mono text-caption">{enquiry.product_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Consumer ID</dt>
                <dd className="font-medium">{enquiry.consumer_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">API Key</dt>
                <dd className="font-medium">{enquiry.api_key}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="text-body font-semibold text-foreground mb-2">Consent & Sources</h4>
            <p className="text-caption text-muted-foreground">
              Consent ID: <span className="font-medium text-foreground">CONS-{enquiry.enquiry_id.slice(-6)}</span>
            </p>
            <p className="text-caption text-muted-foreground mt-1">
              Data sources queried: Core bureau {enquiry.alternate_data_used > 0 ? `+ ${enquiry.alternate_data_used} alternate` : ""}
            </p>
          </div>

          <div>
            <h4 className="text-body font-semibold text-foreground mb-2">Response Summary</h4>
            <dl className="space-y-1.5 text-caption">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className={cn(enquiryStatusTextClass(enquiry.status))}>
                  {enquiryStatusLabel(enquiry.status)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Response Time</dt>
                <dd className="font-medium">{enquiry.response_time_ms} ms</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Alternate Data Calls</dt>
                <dd className="font-medium">{enquiry.alternate_data_used}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="font-medium">{enquiry.timestamp}</dd>
              </div>
            </dl>
          </div>

          {enquiry.status === "Failed" && (
            <div>
              <h4 className="text-body font-semibold text-foreground mb-2">Error Details</h4>
              <p className="text-caption text-muted-foreground">
                This enquiry failed. Check consent validity and data source availability.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
