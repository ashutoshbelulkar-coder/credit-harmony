import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import batchConsoleData from "@/data/batch-console.json";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  Pause,
  Play,
  RefreshCw,
  Search,
  Square,
  XCircle,
} from "lucide-react";
import type { BatchDetail } from "@/data/monitoring-mock";
import type {
  BatchConsoleData,
  BatchPhase,
  BatchStage,
  BatchStatus,
} from "@/data/monitoring-mock";
import { toast } from "@/hooks/use-toast";

const CARD = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

const statusStyles: Record<BatchStatus, string> = {
  Completed: "bg-success/15 text-success",
  Processing: "bg-primary/15 text-primary",
  Failed: "bg-destructive/15 text-destructive",
  Queued: "bg-muted text-muted-foreground",
  Suspended: "bg-warning/15 text-warning",
};

const statusDotColors: Record<BatchStatus, string> = {
  Completed: "bg-success",
  Processing: "bg-primary",
  Failed: "bg-destructive",
  Queued: "bg-muted-foreground",
  Suspended: "bg-warning",
};

const phaseStatusStyles: Record<string, string> = {
  Completed: "bg-success/15 text-success",
  Processing: "bg-primary/15 text-primary",
  Failed: "bg-destructive/15 text-destructive",
  Queued: "bg-muted text-muted-foreground",
  Suspended: "bg-warning/15 text-warning",
};

export interface BatchExecutionConsoleProps {
  detail: BatchDetail;
  /** Status from the BatchJob (BatchDetail has no status field). */
  status: BatchStatus;
  consoleData: BatchConsoleData | undefined;
  institutionName: string;
  onBack: () => void;
}

export function BatchExecutionConsole({
  detail,
  status,
  consoleData,
  institutionName,
  onBack,
}: BatchExecutionConsoleProps) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logSeverityFilter, setLogSeverityFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState("");
  const [stageDetailTab, setStageDetailTab] = useState("detail");
  const [diagnosticSearch, setDiagnosticSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [newPriority, setNewPriority] = useState<string>("normal");

  const phases = consoleData?.phases ?? [];
  const stages = consoleData?.stages ?? [];
  const flowSegments = consoleData?.flow_segments ?? [];
  const logs = consoleData?.logs ?? [];

  useEffect(() => {
    if (phases.length > 0 && selectedPhaseId === null) {
      setSelectedPhaseId(phases[0].phase_id);
    }
  }, [phases.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stages.length > 0 && selectedStageId === null) {
      setSelectedStageId(stages[0].stage_id);
    }
  }, [stages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPhase = phases.find((p) => p.phase_id === selectedPhaseId) ?? phases[0] ?? null;
  const selectedStage = stages.find((s) => s.stage_id === selectedStageId) ?? stages[0] ?? null;

  const displayFileName = consoleData?.file_name ?? detail.file_name;
  const displayInstitution = consoleData?.institution_name ?? institutionName;
  const displayProcessingTime =
    consoleData?.processing_time_display ?? (detail.duration_seconds > 0 ? `${detail.duration_seconds}s` : "—");
  const submissionType = consoleData?.submission_type ?? "Batch Upload";

  const successRate =
    detail.total_records > 0
      ? Math.round((detail.success_records / detail.total_records) * 1000) / 10
      : 0;

  const hasSystemError = phases.some((p) => p.system_status === "Error");
  const hasBusinessError = phases.some((p) => p.business_status === "Error");
  const showSlaAlert = status !== "Queued" && successRate > 0 && successRate < 95;
  const showBusinessErrorAlert = hasBusinessError && detail.failed_records > 0;
  const showSystemErrorAlert = hasSystemError;

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (logSeverityFilter !== "all" && log.severity !== logSeverityFilter) return false;
        if (logSearch.trim() && !log.message.toLowerCase().includes(logSearch.trim().toLowerCase()))
          return false;
        return true;
      }),
    [logs, logSeverityFilter, logSearch],
  );

  const filteredDiagnostics = useMemo(() => {
    const lines = selectedStage?.diagnostic_lines ?? [];
    if (!diagnosticSearch.trim()) return lines;
    const q = diagnosticSearch.trim().toLowerCase();
    return lines.filter((line) => line.toLowerCase().includes(q));
  }, [selectedStage?.diagnostic_lines, diagnosticSearch]);

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Back to Batch Jobs
      </Button>

      {/* ── 1. Header Summary ── */}
      <div className={cn(CARD, "overflow-hidden")}>
        {/* Colored top bar indicator */}
        <div className={cn("h-1 w-full", statusDotColors[status])} />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-h4 font-semibold text-foreground">Batch Execution Console</h2>
              <p className="text-caption text-muted-foreground mt-0.5">
                {displayFileName} · {displayInstitution}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, statusStyles[status])}
              >
                {status}
              </span>
              {/* Operational controls inline */}
              {status === "Processing" && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-caption">
                    <Square className="w-3 h-3" />
                    Stop
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-caption">
                    <Pause className="w-3 h-3" />
                    Suspend
                  </Button>
                </>
              )}
              {status === "Failed" && (
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-caption">
                  <RefreshCw className="w-3 h-3" />
                  Restart
                </Button>
              )}
              {(status === "Suspended" || status === "Queued") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-caption"
                  onClick={() =>
                    toast({
                      title: "Continue flow",
                      description: `Resume request submitted for batch ${detail.batch_id}. The batch will be processed when a slot is available.`,
                    })
                  }
                >
                  <Play className="w-3 h-3" />
                  Continue
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-caption"
                onClick={() => setPriorityDialogOpen(true)}
              >
                Change Priority
              </Button>
            </div>
          </div>

          {/* Change Priority dialog */}
          <Dialog open={priorityDialogOpen} onOpenChange={setPriorityDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-h4">Change batch priority</DialogTitle>
                <DialogDescription className="text-caption">
                  Select the new priority for batch {detail.batch_id}. Higher priority batches are processed first when slots are available.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-caption text-muted-foreground">New priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="text-caption">Low</SelectItem>
                      <SelectItem value="normal" className="text-caption">Normal</SelectItem>
                      <SelectItem value="high" className="text-caption">High</SelectItem>
                      <SelectItem value="critical" className="text-caption">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-caption text-muted-foreground">
                  Confirm to set priority to <span className="font-medium text-foreground capitalize">{newPriority}</span> for this batch.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPriorityDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Priority updated",
                      description: `Batch ${detail.batch_id} priority set to ${newPriority}. It will be processed accordingly when a slot is available.`,
                    });
                    setPriorityDialogOpen(false);
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <SummaryField label="Batch ID" value={detail.batch_id} />
            <SummaryField label="Institution" value={displayInstitution} />
            <SummaryField label="Submission Type" value={submissionType} />
            <SummaryField label="Upload Time" value={detail.upload_time} />
            <SummaryField label="Processing Start" value={detail.processing_start} />
            <SummaryField label="Processing End" value={detail.processing_end} />
            <SummaryField label="Total Records" value={detail.total_records.toLocaleString()} />
            <SummaryField
              label="Success"
              value={detail.success_records.toLocaleString()}
              valueClass="text-success"
            />
            <SummaryField
              label="Failed"
              value={detail.failed_records.toLocaleString()}
              valueClass={detail.failed_records > 0 ? "text-destructive" : undefined}
            />
            <SummaryField
              label="Success Rate"
              value={detail.total_records > 0 ? `${successRate}%` : "—"}
              valueClass={showSlaAlert ? "text-warning" : undefined}
            />
            <SummaryField label="Processing Time" value={displayProcessingTime} />
          </div>
        </div>
      </div>

      {/* ── 2. Alerts (list format matching Data Quality / drift alerts) ── */}
      {(showSlaAlert || showBusinessErrorAlert || showSystemErrorAlert || (detail.schema_drift && detail.schema_drift.length > 0)) && (
        <div className={cn(CARD, "p-6")}>
          <h2 className="text-h4 font-semibold text-foreground">Alerts</h2>
          <p className="mt-1 text-caption text-muted-foreground">Batch and validation alerts</p>
          <ul className="mt-4 space-y-2">
            {showSlaAlert && (
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/50 bg-warning/5 px-4 py-3">
                <div>
                  <p className="text-body font-medium text-foreground">Success rate below SLA threshold</p>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    Current success rate is {successRate}%. Minimum threshold is 95%.
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5", badgeTextClasses, "bg-warning/15 text-warning")}>
                  Warning
                </span>
              </li>
            )}
            {showBusinessErrorAlert && (
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/50 bg-warning/5 px-4 py-3">
                <div>
                  <p className="text-body font-medium text-foreground">High Business Error Rate detected in Validation Phase</p>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    {detail.failed_records} records failed business validation rules.
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5", badgeTextClasses, "bg-warning/15 text-warning")}>
                  Warning
                </span>
              </li>
            )}
            {showSystemErrorAlert && (
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3">
                <div>
                  <p className="text-body font-medium text-foreground">System errors detected</p>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    One or more phases reported system errors. Check phase and stage details below.
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5", badgeTextClasses, "bg-destructive/15 text-destructive")}>
                  Error
                </span>
              </li>
            )}
            {detail.schema_drift && detail.schema_drift.length > 0 && (
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/50 bg-warning/5 px-4 py-3">
                <div>
                  <p className="text-body font-medium text-foreground">Schema drift detected</p>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    New fields detected. Review suggested mappings below.
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5", badgeTextClasses, "bg-warning/15 text-warning")}>
                  Warning
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ── 3. Flow Progress ── */}
      {flowSegments.length > 0 && (
        <div className={cn(CARD, "p-5")}>
          <h4 className="text-body font-semibold text-foreground mb-3">Flow Progress</h4>
          <FlowProgressBar segments={flowSegments} />
        </div>
      )}

      {/* ── 4. Quick Filters (collapsible) ── */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="w-3.5 h-3.5" />
            Quick Filters
            <ChevronDown
              className={cn("w-3.5 h-3.5 transition-transform ml-auto", filtersOpen && "rotate-180")}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={cn(CARD, "p-4 mt-2")}>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Date Range</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 w-[140px] text-caption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-caption">All</SelectItem>
                    <SelectItem value="24h" className="text-caption">Last 24h</SelectItem>
                    <SelectItem value="7d" className="text-caption">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Phase Status</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 w-[140px] text-caption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-caption">All</SelectItem>
                    <SelectItem value="Completed" className="text-caption">Completed</SelectItem>
                    <SelectItem value="Failed" className="text-caption">Failed</SelectItem>
                    <SelectItem value="Processing" className="text-caption">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Stage Status</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 w-[140px] text-caption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-caption">All</SelectItem>
                    <SelectItem value="Completed" className="text-caption">Completed</SelectItem>
                    <SelectItem value="Failed" className="text-caption">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Flow UID</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input placeholder="Flow UID…" className="h-9 pl-7 w-[160px] text-caption" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Batch ID</Label>
                <Input
                  className="h-9 w-[200px] text-caption"
                  defaultValue={detail.batch_id}
                  readOnly
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── 5. Phase Execution Table | Phase Details ── */}
      <div className="grid grid-cols-1 gap-4">
        {/* Phase Table */}
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="px-5 py-3 border-b border-border">
            <h4 className="text-body font-semibold text-foreground">Phase Execution</h4>
            <p className="text-caption text-muted-foreground mt-0.5">
              Select a row to view phase details
            </p>
          </div>
          <div className="min-w-0 overflow-x-auto">
            <PhaseTable
              phases={phases}
              selectedPhaseId={selectedPhase?.phase_id ?? null}
              onSelectPhase={setSelectedPhaseId}
            />
          </div>
        </div>

        {/* Phase Details */}
        <div className={cn(CARD, "p-5")}>
          <h4 className="text-body font-semibold text-foreground mb-4">
            {selectedPhase ? `${selectedPhase.name} Details` : "Phase Details"}
          </h4>
          {selectedPhase ? (
            <PhaseDetailsPanel phase={selectedPhase} />
          ) : (
            <p className="text-caption text-muted-foreground">Select a phase to view details.</p>
          )}
        </div>
      </div>

      {/* ── 6. Stage Tree | Stage Details ── */}
      <div className="grid grid-cols-1 gap-4">
        {/* Stage Tree */}
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="px-5 py-3 border-b border-border">
            <h4 className="text-body font-semibold text-foreground">Stage Execution Tree</h4>
            <p className="text-caption text-muted-foreground mt-0.5">
              Select a stage to view details
            </p>
          </div>
          <StageTree
            phases={phases}
            stages={stages}
            selectedStageId={selectedStage?.stage_id ?? null}
            onSelectStage={setSelectedStageId}
          />
        </div>

        {/* Stage Details */}
        <div className={cn(CARD, "p-5")}>
          <h4 className="text-body font-semibold text-foreground mb-4">
            {selectedStage ? `${selectedStage.name} Details` : "Stage Execution Details"}
          </h4>
          {selectedStage ? (
            <StageDetailsPanel
              stage={selectedStage}
              activeTab={stageDetailTab}
              onTabChange={setStageDetailTab}
              diagnosticSearch={diagnosticSearch}
              onDiagnosticSearchChange={setDiagnosticSearch}
              filteredDiagnostics={filteredDiagnostics}
            />
          ) : (
            <p className="text-caption text-muted-foreground">Select a stage to view details.</p>
          )}
        </div>
      </div>

      {/* ── 7. Processing Logs (expandable) ── */}
      <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
        <div className={cn(CARD, "overflow-hidden")}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-3 border-b border-border hover:bg-muted/30 transition-colors"
            >
              <div className="text-left">
                <h4 className="text-body font-semibold text-foreground">
                  Processing Logs
                </h4>
                <p className="text-caption text-muted-foreground mt-0.5">
                  {logs.length} entries · expand to view
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  logsOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-5 space-y-4 border-t border-border">
              {/* Log filters */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">Severity</Label>
                  <Select value={logSeverityFilter} onValueChange={setLogSeverityFilter}>
                    <SelectTrigger className="h-9 w-[120px] text-caption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-caption">All</SelectItem>
                      <SelectItem value="INFO" className="text-caption">INFO</SelectItem>
                      <SelectItem value="WARNING" className="text-caption">WARNING</SelectItem>
                      <SelectItem value="ERROR" className="text-caption">ERROR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1 min-w-[180px]">
                  <Label className="text-caption text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search log messages…"
                      className="h-9 pl-8 text-caption"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {/* Log table */}
              <div className="min-w-0 overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn(tableHeaderClasses, "px-4 py-3")}>
                        Timestamp
                      </TableHead>
                      <TableHead className={cn(tableHeaderClasses, "px-4 py-3")}>
                        Component
                      </TableHead>
                      <TableHead className={cn(tableHeaderClasses, "px-4 py-3")}>
                        Severity
                      </TableHead>
                      <TableHead className={cn(tableHeaderClasses, "px-4 py-3")}>
                        Message
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-caption text-muted-foreground py-8"
                        >
                          No log entries match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="text-caption px-4 py-3">{log.timestamp}</TableCell>
                          <TableCell className="text-caption px-4 py-3">{log.component}</TableCell>
                          <TableCell className="px-4 py-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full",
                                badgeTextClasses,
                                log.severity === "ERROR" && "bg-destructive/15 text-destructive",
                                log.severity === "WARNING" && "bg-warning/15 text-warning",
                                log.severity === "INFO" && "bg-muted text-muted-foreground",
                              )}
                            >
                              {log.severity}
                            </span>
                          </TableCell>
                          <TableCell className="text-caption px-4 py-3">{log.message}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SummaryField({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
      <p
        className={cn("text-[10px] leading-tight font-semibold text-foreground mt-0.5 truncate", valueClass)}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
}

function FlowProgressBar({ segments }: { segments: BatchConsoleData["flow_segments"] }) {
  const segCount = segments.length;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex w-full rounded-lg overflow-hidden border border-border h-10 bg-muted/30">
        {segments.map((seg, i) => {
          const bg =
            seg.status === "Completed"
              ? "bg-success"
              : seg.status === "Processing"
                ? "bg-primary"
                : seg.status === "Failed"
                  ? "bg-destructive"
                  : "bg-muted/50";
          const textColor =
            seg.status === "Queued" ? "text-muted-foreground" : "text-white";
          return (
            <Tooltip key={seg.phase_id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center px-2 min-w-0 border-r border-white/20 last:border-r-0 cursor-default",
                    bg,
                    i === 0 && "rounded-l-lg",
                    i === segCount - 1 && "rounded-r-lg",
                  )}
                  style={{ flex: `1 1 ${100 / segCount}%` }}
                >
                  <span className={cn("text-[9px] font-semibold uppercase tracking-wide truncate w-full text-center", textColor)}>
                    {seg.label}
                  </span>
                  {seg.elapsed_time && (
                    <span className={cn("text-[9px] tabular-nums", textColor, "opacity-80")}>
                      {seg.elapsed_time}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="space-y-1 text-caption">
                <p className="font-semibold">{seg.label}</p>
                <p>Status: {seg.status}</p>
                {seg.start && <p>Start: {seg.start}</p>}
                {seg.end && <p>End: {seg.end}</p>}
                {seg.elapsed_time && <p>Elapsed: {seg.elapsed_time}</p>}
                {seg.record_count != null && <p>Records: {seg.record_count.toLocaleString()}</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function PhaseTable({
  phases,
  selectedPhaseId,
  onSelectPhase,
}: {
  phases: BatchPhase[];
  selectedPhaseId: string | null;
  onSelectPhase: (id: string) => void;
}) {
  if (phases.length === 0) {
    return (
      <p className="text-caption text-muted-foreground px-5 py-8 text-center">
        No phase data available.
      </p>
    );
  }
  return (
    <table className="w-full min-w-max">
      <thead className="bg-[hsl(var(--table-header-bg))]">
        <tr className="border-b border-border">
          <th className={cn(tableHeaderClasses, "text-left px-4 py-3")}>Phase Name</th>
          <th className={cn(tableHeaderClasses, "text-left px-4 py-3 hidden sm:table-cell")}>ID</th>
          <th className={cn(tableHeaderClasses, "text-left px-4 py-3")}>Status</th>
          <th className={cn(tableHeaderClasses, "text-center px-4 py-3")}>System Status</th>
          <th className={cn(tableHeaderClasses, "text-left px-4 py-3 hidden md:table-cell")}>Elapsed</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {phases.map((p) => (
          <tr
            key={p.phase_id}
            className={cn(
              "cursor-pointer hover:bg-muted/30 transition-colors",
              selectedPhaseId === p.phase_id && "bg-primary/5",
            )}
            onClick={() => onSelectPhase(p.phase_id)}
          >
            <td className="px-4 py-3">
              <p className="text-body font-medium text-foreground">{p.name}</p>
            </td>
            <td className="px-4 py-3 hidden sm:table-cell">
              <span className="text-caption text-muted-foreground">{p.phase_id}</span>
            </td>
            <td className="px-4 py-3">
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full",
                  badgeTextClasses,
                  phaseStatusStyles[p.status] ?? "bg-muted",
                )}
              >
                {p.status}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              {p.system_status === "OK" ? (
                <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive mx-auto" />
              )}
            </td>
            <td className="px-4 py-3 hidden md:table-cell">
              <span className="text-caption tabular-nums text-muted-foreground">
                {p.elapsed_ms != null ? `${(p.elapsed_ms / 1000).toFixed(1)}s` : "—"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PhaseDetailsPanel({ phase }: { phase: BatchPhase }) {
  const elapsed =
    phase.elapsed_ms != null ? `${(phase.elapsed_ms / 1000).toFixed(1)}s` : "—";
  const c = phase.counters;

  return (
    <div className="space-y-5">
      {/* Metadata */}
      <div>
        <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Phase Metadata
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <MetaRow label="Flow UID" value={phase.flow_uid ?? "—"} />
          <MetaRow label="Phase UID" value={phase.phase_uid ?? "—"} />
          <MetaRow label="Version" value={phase.version ?? "—"} />
          <MetaRow label="Start Time" value={phase.start} />
          <MetaRow label="End Time" value={phase.end ?? "—"} />
          <MetaRow label="Elapsed" value={elapsed} />
        </div>
      </div>

      {/* Counters */}
      {c && (
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Processing Counters
          </p>
          <div className="grid grid-cols-2 gap-2">
            <CounterCard label="Total records" value={c.total_records} />
            <CounterCard label="Processing" value={c.processing} />
            <CounterCard label="Completed" value={c.business_ok} variant="success" />
            <CounterCard label="System Errors" value={c.system_ko} variant={c.system_ko > 0 ? "error" : "default"} />
            <CounterCard label="Business Errors" value={c.business_ko} variant={c.business_ko > 0 ? "warning" : "default"} />
          </div>
        </div>
      )}

    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="text-caption text-foreground font-medium truncate" title={value}>
        {value}
      </span>
    </>
  );
}

function CounterCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "error" | "warning" | "success";
}) {
  const numClass =
    variant === "error"
      ? "text-destructive"
      : variant === "warning"
        ? "text-warning"
        : variant === "success"
          ? "text-success"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("text-body font-semibold tabular-nums mt-0.5", numClass)}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StageTree({
  phases,
  stages,
  selectedStageId,
  onSelectStage,
}: {
  phases: BatchPhase[];
  stages: BatchStage[];
  selectedStageId: string | null;
  onSelectStage: (id: string) => void;
}) {
  if (stages.length === 0) {
    return (
      <p className="text-caption text-muted-foreground px-5 py-8 text-center">
        No stage data available.
      </p>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {phases.map((phase) => {
        const phaseStages = stages.filter((s) => s.phase_id === phase.phase_id);
        if (phaseStages.length === 0) return null;
        return (
          <div key={phase.phase_id}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  phaseStatusStyles[phase.status]
                    ? phase.status === "Completed"
                      ? "bg-success"
                      : phase.status === "Failed"
                        ? "bg-destructive"
                        : phase.status === "Processing"
                          ? "bg-primary"
                          : "bg-muted-foreground"
                    : "bg-muted-foreground",
                )}
              />
              <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
                {phase.name}
              </p>
            </div>
            <ul className="space-y-1 ml-3 border-l-2 border-border pl-3">
              {phaseStages.map((stage) => (
                <li key={stage.stage_id}>
                  <button
                    type="button"
                    onClick={() => onSelectStage(stage.stage_id)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50",
                      selectedStageId === stage.stage_id && "bg-primary/5 ring-1 ring-primary/20",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-foreground truncate">{stage.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {stage.records_processed.toLocaleString()} records
                        {stage.errors != null && stage.errors > 0 && (
                          <span className="text-destructive"> · {stage.errors} errors</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 px-2 py-0.5 rounded-full",
                        badgeTextClasses,
                        phaseStatusStyles[stage.status] ?? "bg-muted",
                      )}
                    >
                      {stage.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Dummy diagnostic lines shown in Stage Details Error logs tab when the stage has none. */
const STAGE_DIAGNOSTIC_DUMMY_LINES = batchConsoleData.stageDiagnosticDummyLines;

type StageErrorRow = { record_id: string; field_name: string; error_code: string; error_description: string };

const STAGE_ERROR_DUMMY_ROWS: StageErrorRow[] = batchConsoleData.stageErrorDummyRows;
const DUMMY_ERRORS_BY_STAGE: Record<string, StageErrorRow[]> = batchConsoleData.dummyErrorsByStage;

function exportStageErrorsCSV(
  stage: BatchStage,
  errorRows: {
    record_id: string;
    field_name: string;
    error_code: string;
    error_description: string;
  }[],
) {
  const headers = ["Record ID", "Field Name", "Error Code", "Error Description"];
  const rows = errorRows.map((r) => [
    r.record_id,
    r.field_name,
    r.error_code,
    r.error_description,
  ]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stage-${stage.stage_id}-errors.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StageDetailsPanel({
  stage,
  activeTab,
  onTabChange,
  diagnosticSearch,
  onDiagnosticSearchChange,
  filteredDiagnostics,
}: {
  stage: BatchStage;
  activeTab: string;
  onTabChange: (v: string) => void;
  diagnosticSearch: string;
  onDiagnosticSearchChange: (v: string) => void;
  filteredDiagnostics: string[];
}) {
  const errorRows = stage.error_rows ?? [];
  const stageErrorCount = stage.errors ?? 0;
  const hasRealErrors = errorRows.length > 0;
  const errorCount = hasRealErrors ? errorRows.length : stageErrorCount;
  const errorRowsToShow = hasRealErrors
    ? errorRows
    : stageErrorCount > 0
      ? (DUMMY_ERRORS_BY_STAGE[stage.name] ?? STAGE_ERROR_DUMMY_ROWS).slice(0, stageErrorCount)
      : [];
  const isShowingDummy = !hasRealErrors && stageErrorCount > 0;
  const elapsed =
    stage.start && stage.end
      ? (
          new Date(`1970-01-01T${stage.end}`).getTime() -
          new Date(`1970-01-01T${stage.start}`).getTime()
        ) / 1000
      : null;

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="w-full mb-4">
        <TabsTrigger value="detail" className="flex-1 text-caption">
          Detail
        </TabsTrigger>
        <TabsTrigger value="error" className="flex-1 text-caption">
          Error {errorCount > 0 && `(${errorCount})`}
        </TabsTrigger>
        <TabsTrigger value="diagnostic" className="flex-1 text-caption">
          Error logs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="detail" className="mt-0 space-y-4">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Execution Info
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <MetaRow label="Stage ID" value={stage.stage_id} />
            <MetaRow label="Execution Start" value={stage.start ?? "—"} />
            <MetaRow label="Execution End" value={stage.end ?? "—"} />
            <MetaRow
              label="Elapsed Time"
              value={elapsed != null ? `${elapsed.toFixed(1)}s` : "—"}
            />
            <MetaRow
              label="System Return Code"
              value={String(stage.system_return_code ?? "—")}
            />
            <MetaRow
              label="Business Return Code"
              value={String(stage.business_return_code ?? "—")}
            />
          </div>
        </div>
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Record Counters
          </p>
          <div className="grid grid-cols-3 gap-2">
            <CounterCard label="Processed" value={stage.processed ?? stage.records_processed} variant="success" />
            <CounterCard label="Errors" value={stage.errors ?? 0} variant={stage.errors && stage.errors > 0 ? "error" : "default"} />
            <CounterCard label="Skipped" value={stage.skipped ?? 0} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="error" className="mt-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption text-muted-foreground">
            {errorCount} error{errorCount !== 1 ? "s" : ""} recorded
            {isShowingDummy && " (sample data)"}
          </p>
          {errorRowsToShow.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => exportStageErrorsCSV(stage, errorRowsToShow)}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          )}
        </div>
        <div className="min-w-0 overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(tableHeaderClasses, "px-4 py-3")}>Record ID</TableHead>
                <TableHead className={cn(tableHeaderClasses, "px-4 py-3")}>Field</TableHead>
                <TableHead className={cn(tableHeaderClasses, "px-4 py-3")}>Code</TableHead>
                <TableHead className={cn(tableHeaderClasses, "px-4 py-3")}>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errorRowsToShow.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-caption text-muted-foreground text-center py-6">
                    No errors recorded for this stage.
                  </TableCell>
                </TableRow>
              ) : (
                errorRowsToShow.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="text-caption px-4 py-3 font-medium">{row.record_id}</TableCell>
                    <TableCell className="text-caption px-4 py-3">{row.field_name}</TableCell>
                    <TableCell className="text-caption px-4 py-3">{row.error_code}</TableCell>
                    <TableCell className="text-caption px-4 py-3">{row.error_description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="diagnostic" className="mt-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search diagnostic output…"
            className="pl-8 text-caption"
            value={diagnosticSearch}
            onChange={(e) => onDiagnosticSearchChange(e.target.value)}
          />
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 overflow-y-auto max-h-[220px]">
          {(() => {
            const linesToShow =
              filteredDiagnostics.length > 0
                ? filteredDiagnostics
                : diagnosticSearch.trim()
                  ? STAGE_DIAGNOSTIC_DUMMY_LINES.filter((l) =>
                      l.toLowerCase().includes(diagnosticSearch.trim().toLowerCase()),
                    )
                  : STAGE_DIAGNOSTIC_DUMMY_LINES;
            if (linesToShow.length === 0) {
              return (
                <p className="text-caption text-muted-foreground">No matching lines.</p>
              );
            }
            return (
              <pre className="text-[10px] font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {linesToShow.join("\n")}
              </pre>
            );
          })()}
        </div>
      </TabsContent>
    </Tabs>
  );
}
