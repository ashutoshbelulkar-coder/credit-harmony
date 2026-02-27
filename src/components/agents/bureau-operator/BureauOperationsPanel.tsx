import { Activity, AlertTriangle, Bell, Clock, FileUp, Database, ShieldCheck, BarChart3, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  mockCRIFSLAMetrics,
  mockCRIFRequestFlow,
  mockCRIFDataSubmission,
  mockCRIFAlternateData,
  mockCRIFDataQuality,
  mockCRIFConsentOps,
  mockAlertsFeed,
} from "@/data/bureau-operator-mock";
import type { OperationsAlert, SegmentFilter } from "@/types/agents";

interface Props {
  onAlertClick: (alert: OperationsAlert) => void;
  timeRange: string;
  segment: SegmentFilter;
}

const SEGMENT_ENQUIRY: SegmentFilter[] = ["All", "Enquiry"];
const SEGMENT_DATA_SUBMISSION: SegmentFilter[] = ["All", "Data Submission"];
const SEGMENT_ALTERNATE_DATA: SegmentFilter[] = ["All", "Alternate Data"];
const SEGMENT_PARSING: SegmentFilter[] = ["All", "Parsing"];
const SEGMENT_CONSENT: SegmentFilter[] = ["All", "Consent"];

export function BureauOperationsPanel({ onAlertClick, timeRange, segment }: Props) {
  const showDataSubmission = SEGMENT_DATA_SUBMISSION.includes(segment);
  const showAlternateData = SEGMENT_ALTERNATE_DATA.includes(segment);
  const showDataQuality = SEGMENT_PARSING.includes(segment);
  const showConsent = SEGMENT_CONSENT.includes(segment);

  return (
    <ScrollArea className="flex-1 min-h-0 h-0 basis-0">
      <div className="space-y-4 pr-1 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-caption font-semibold text-foreground uppercase tracking-wider">CRIF Operations Monitor</h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] text-muted-foreground">Live · {timeRange}</span>
          </div>
        </div>

        {/* Section 1: SLA Monitoring (CRIF only) */}
        <CRIFSLASection />

        {/* Section 2: Request Flow Breakdown */}
        <RequestFlowSection />

        {/* Section 3: Data Submission Monitoring */}
        {showDataSubmission && <DataSubmissionSection />}

        {/* Section 4: Alternate Data Operations */}
        {showAlternateData && <AlternateDataSection />}

        {/* Section 5: Data Quality & Parsing Health */}
        {showDataQuality && <DataQualitySection />}

        {/* Section 6: Consent Operations */}
        {showConsent && <ConsentSection />}

        {/* Alerts Feed */}
        <AlertsFeedSection onAlertClick={onAlertClick} />
      </div>
    </ScrollArea>
  );
}

function CRIFSLASection() {
  const sla = mockCRIFSLAMetrics;
  const slaColor = sla.overall >= 99 ? "text-success" : sla.overall >= 98 ? "text-warning" : "text-destructive";
  const slaCardColor = sla.overall >= 99 ? "border-success/20 bg-success/5" : sla.overall >= 98 ? "border-warning/20 bg-warning/5" : "border-destructive/20 bg-destructive/5";

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-caption font-semibold text-foreground">SLA Monitoring (CRIF)</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-lg border p-3 flex flex-col gap-1", slaCardColor)}>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Overall SLA</span>
          <span className={cn("text-h4 font-bold", slaColor)}>{sla.overall}%</span>
          <span className="text-[9px] text-muted-foreground">Compliance</span>
        </div>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Active Breaches</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-h4 font-bold text-destructive">{sla.activeBreaches}</span>
            <Badge className="text-[9px] h-4 px-1.5 bg-destructive/15 text-destructive border-0 font-semibold">
              {sla.critical} Critical
            </Badge>
          </div>
          <span className="text-[9px] text-muted-foreground">Right now</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Avg Response</span>
          <span className="text-h4 font-bold text-foreground">{sla.avgResponseTime}s</span>
          <span className="text-[9px] text-muted-foreground">Target: &lt;2.0s</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">P95 Latency</span>
          <span className="text-h4 font-bold text-foreground">{sla.p95Latency}s</span>
          <span className="text-[9px] text-muted-foreground">Target: &lt;3.0s</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Timeout %</span>
          <span className={cn("text-h4 font-bold", sla.timeoutPct > 1 ? "text-warning" : "text-foreground")}>{sla.timeoutPct}%</span>
          <span className="text-[9px] text-muted-foreground">Target: &lt;1%</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Retry %</span>
          <span className={cn("text-h4 font-bold", sla.retryPct > 2 ? "text-warning" : "text-foreground")}>{sla.retryPct}%</span>
          <span className="text-[9px] text-muted-foreground">Target: &lt;2%</span>
        </div>
      </div>
    </section>
  );
}

function RequestFlowSection() {
  const flow = mockCRIFRequestFlow;
  const hardPct = ((flow.hardEnquiries / flow.totalEnquiries) * 100).toFixed(1);
  const softPct = ((flow.softEnquiries / flow.totalEnquiries) * 100).toFixed(1);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-caption font-semibold text-foreground">Request Flow Breakdown</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Total Enquiries Today" value={flow.totalEnquiries.toLocaleString()} sub="CRIF" variant="neutral" />
        <StatTile label="Data Submissions Today" value={flow.dataSubmissions.toString()} sub="files" variant="neutral" />
        <StatTile label="Alternate Data Pulls" value={flow.alternateDataPulls.toString()} sub="jobs" variant="neutral" />
        <StatTile label="Hard Enquiries" value={`${hardPct}%`} sub="of total" variant="neutral" />
        <StatTile label="Soft Enquiries" value={`${softPct}%`} sub="of total" variant="neutral" />
        <StatTile label="Failed Requests %" value={`${flow.failedPct}%`} sub="failure rate" variant={flow.failedPct > 2 ? "warn" : "ok"} />
      </div>
    </section>
  );
}

function DataSubmissionSection() {
  const d = mockCRIFDataSubmission;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <FileUp className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-caption font-semibold text-foreground">Data Submission Monitoring</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Files Submitted Today" value={d.filesSubmitted.toString()} sub="count" variant="neutral" />
        <StatTile label="Records Processed" value={d.recordsProcessed.toString()} sub="count" variant="neutral" />
        <StatTile label="Records Rejected" value={d.recordsRejected.toString()} sub="schema/validation" variant={d.recordsRejected > 10 ? "warn" : "neutral"} />
        <StatTile label="Schema Validation Errors" value={d.schemaValidationErrors.toString()} sub="count" variant="neutral" />
        <StatTile label="HIL Mapping Pending" value={d.hilMappingPending.toString()} sub="count" variant="neutral" />
        <StatTile label="Ack Pending from CRIF" value={d.ackPending.toString()} sub="count" variant={d.ackPending > 0 ? "warn" : "ok"} />
      </div>
    </section>
  );
}

function AlternateDataSection() {
  const a = mockCRIFAlternateData;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-caption font-semibold text-foreground">Alternate Data Operations</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Bank Statement Requests" value={a.bankStatementRequests.toString()} sub="today" variant="neutral" />
        <StatTile label="GST Data Pulls" value={a.gstPulls.toString()} sub="today" variant="neutral" />
        <StatTile label="OCR Parsing Jobs" value={a.ocrParsingJobs.toString()} sub="today" variant="neutral" />
        <StatTile label="Alternate Data Failures" value={a.alternateDataFailures.toString()} sub="count" variant={a.alternateDataFailures > 5 ? "warn" : "neutral"} />
        <StatTile label="Avg Processing Time" value={`${(a.avgProcessingTimeMs / 1000).toFixed(2)}s`} sub="target &lt;2.5s" variant={a.avgProcessingTimeMs > 2500 ? "warn" : "neutral"} />
      </div>
    </section>
  );
}

function DataQualitySection() {
  const q = mockCRIFDataQuality;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Database className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-caption font-semibold text-foreground">Data Quality & Parsing Health</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Missing Mandatory Fields" value={q.missingMandatoryFields.toString()} sub="count" variant="neutral" />
        <StatTile label="PAN Mismatch %" value={`${q.panMismatchPct}%`} sub="rate" variant={q.panMismatchPct > 0.5 ? "warn" : "neutral"} />
        <StatTile label="DPD Inconsistency" value={q.dpdInconsistencyCount.toString()} sub="count" variant="neutral" />
        <StatTile label="Tradeline Mapping Errors" value={q.tradelineMappingErrors.toString()} sub="count" variant="neutral" />
        <StatTile label="Duplicate Record Detection" value={q.duplicateRecordCount.toString()} sub="count" variant="neutral" />
        <StatTile label="Score Missing Cases" value={q.scoreMissingCases.toString()} sub="count" variant={q.scoreMissingCases > 5 ? "warn" : "neutral"} />
      </div>
    </section>
  );
}

function ConsentSection() {
  const c = mockCRIFConsentOps;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-caption font-semibold text-foreground">Consent Operations</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Consent Success Rate" value={`${c.successRate}%`} sub="DPDP" variant={c.successRate >= 95 ? "ok" : "warn"} />
        <StatTile label="OTP Failure %" value={`${c.otpFailurePct}%`} sub="target ≤3%" variant="neutral" />
        <StatTile label="Expired Consent %" value={`${c.expiredConsentPct}%`} sub="target ≤2%" variant="neutral" />
        <StatTile label="Consent Latency Avg" value={`${c.consentLatencyAvgMs}ms`} sub="target ≤1,000ms" variant={c.consentLatencyAvgMs <= 1000 ? "ok" : "warn"} />
        <StatTile label="Revoked Consent Count" value={c.revokedConsentCount.toString()} sub="today" variant="neutral" />
      </div>
    </section>
  );
}

function AlertsFeedSection({ onAlertClick }: { onAlertClick: (alert: OperationsAlert) => void }) {
  const alerts = mockAlertsFeed;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-primary" />
          <h4 className="text-caption font-semibold text-foreground">Alert Feed</h4>
        </div>
        <Badge className="text-[9px] h-4 px-1.5 bg-destructive/15 text-destructive border-0">
          {alerts.filter((a) => a.severity === "Critical").length} Critical
        </Badge>
      </div>
      <div className="space-y-1.5">
        {alerts.map((alert) => (
          <button
            key={alert.id}
            onClick={() => onAlertClick(alert)}
            className={cn(
              "w-full text-left rounded-lg border p-2.5 transition-all duration-150 group",
              "hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              alert.severity === "Critical"
                ? "border-destructive/30 bg-destructive/5"
                : alert.severity === "Medium"
                  ? "border-warning/30 bg-warning/5"
                  : "border-border bg-card"
            )}
          >
            <div className="flex items-start gap-2">
              <SeverityDot severity={alert.severity} />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-semibold text-foreground">{alert.type}</span>
                  {alert.institution && <span className="text-[9px] text-muted-foreground">· {alert.institution}</span>}
                </div>
                <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed">{alert.message}</p>
                <span className="text-[9px] text-muted-foreground/70">{formatAlertTime(alert.timestamp)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function StatTile({ label, value, sub, variant }: { label: string; value: string; sub: string; variant: "neutral" | "ok" | "warn" | "error" }) {
  const valueColor = variant === "ok" ? "text-success" : variant === "warn" ? "text-warning" : variant === "error" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 flex flex-col gap-0.5">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={cn("text-body font-bold", valueColor)}>{value}</span>
      <span className="text-[9px] text-muted-foreground">{sub}</span>
    </div>
  );
}

function SeverityDot({ severity }: { severity: "Low" | "Medium" | "Critical" }) {
  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full shrink-0 mt-0.5",
        severity === "Critical" ? "bg-destructive" : severity === "Medium" ? "bg-warning" : "bg-muted-foreground/50"
      )}
    />
  );
}

function formatAlertTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
