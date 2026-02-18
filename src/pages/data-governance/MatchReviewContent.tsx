import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReasonInputDialog } from "@/components/data-governance/ReasonInputDialog";
import { matchClusters, reasonCodes, approvalConfig } from "@/data/data-governance-mock";
import type { MatchCluster } from "@/types/data-governance";
import { AlertTriangle, Merge, RotateCcw, X, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const DATA_SOURCES = ["CBS Core", "Alternate Data", "Bureau Incoming"];
const INSTITUTIONS = ["First National Bank", "Metro Credit Union", "All"];

export default function MatchReviewContent() {
  const [confidenceRange, setConfidenceRange] = useState([60, 100]);
  const [dataSource, setDataSource] = useState("all");
  const [institution, setInstitution] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<MatchCluster | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    clusterId: string;
    action: "merge" | "override" | "reject" | "flag";
  } | null>(null);

  const filtered = matchClusters.filter(
    (c) => c.confidence >= confidenceRange[0] && c.confidence <= confidenceRange[1]
  );

  const handleActionConfirm = (payload: { reason: string; reasonCode?: string; comment?: string }) => {
    setActionDialog(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Match Review</h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Review match clusters and resolve conflicts
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label className="text-caption">Confidence range</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={confidenceRange}
                onValueChange={setConfidenceRange}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="w-16 text-caption tabular-nums">
                {confidenceRange[0]}–{confidenceRange[1]}%
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-caption">Data source</Label>
            <Select value={dataSource} onValueChange={setDataSource}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {DATA_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-caption">Institution</Label>
            <Select value={institution} onValueChange={setInstitution}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {INSTITUTIONS.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-caption">Date from</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-caption">Date to</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
          </div>
        </div>
      </div>

      {/* Cluster cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((cluster) => (
          <div
            key={cluster.id}
            className={cn(
              "cursor-pointer rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:border-primary/30",
              selectedCluster?.id === cluster.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedCluster(cluster)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-body font-semibold text-foreground">Cluster {cluster.id}</p>
                <p className="mt-1 text-caption text-muted-foreground">
                  {cluster.recordCount} record(s) · {cluster.confidence}% confidence
                </p>
              </div>
              {cluster.hasConflicts && (
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              )}
            </div>
            {cluster.conflictIndicators.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {cluster.conflictIndicators.map((ind) => (
                  <Badge key={ind} variant="secondary" className="text-caption">
                    {ind}
                  </Badge>
                ))}
              </div>
            )}
            {cluster.isHighRiskOverride && (
              <Badge className="mt-2 bg-destructive/15 text-destructive">High-risk override</Badge>
            )}
          </div>
        ))}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedCluster} onOpenChange={(open) => !open && setSelectedCluster(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedCluster && (
            <>
              <SheetHeader>
                <SheetTitle>Cluster {selectedCluster.id}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
                    Similarity breakdown
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {selectedCluster.records[0]?.similarity && (
                      <>
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-caption text-muted-foreground">Name</p>
                          <p className="text-body font-semibold">{selectedCluster.records[0].similarity.name}%</p>
                        </div>
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-caption text-muted-foreground">DOB</p>
                          <p className="text-body font-semibold">{selectedCluster.records[0].similarity.dob}%</p>
                        </div>
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-caption text-muted-foreground">PAN</p>
                          <p className="text-body font-semibold">{selectedCluster.records[0].similarity.pan}%</p>
                        </div>
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-caption text-muted-foreground">Address</p>
                          <p className="text-body font-semibold">{selectedCluster.records[0].similarity.address}%</p>
                        </div>
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-caption text-muted-foreground">Overall</p>
                          <p className="text-body font-semibold">{selectedCluster.records[0].similarity.overall}%</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
                    Record comparison
                  </p>
                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-caption font-medium text-muted-foreground">Record A</p>
                      {selectedCluster.records[0] && (
                        <ul className="mt-2 space-y-1 text-body">
                          {Object.entries(selectedCluster.records[0].recordA).map(([k, v]) => (
                            <li key={k} className={cn(
                              selectedCluster.records[0].mismatchedFields.includes(k) && "text-destructive font-medium"
                            )}>
                              <span className="text-muted-foreground">{k}:</span> {v}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-caption font-medium text-muted-foreground">Record B</p>
                      {selectedCluster.records[0] && (
                        <ul className="mt-2 space-y-1 text-body">
                          {Object.entries(selectedCluster.records[0].recordB).map(([k, v]) => (
                            <li key={k} className={cn(
                              selectedCluster.records[0].mismatchedFields.includes(k) && "text-destructive font-medium"
                            )}>
                              <span className="text-muted-foreground">{k}:</span> {v}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {approvalConfig.dualApprovalRequired && selectedCluster.approvalState === "first_approved" && (
                  <div className="rounded-lg border border-info/30 bg-info/10 px-4 py-2 text-caption text-info">
                    Pending second approval
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-2" onClick={() => setActionDialog({ clusterId: selectedCluster.id, action: "merge" })}>
                    <Merge className="h-3.5 w-3.5" />
                    Merge
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setActionDialog({ clusterId: selectedCluster.id, action: "override" })}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Override
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setActionDialog({ clusterId: selectedCluster.id, action: "reject" })}>
                    <X className="h-3.5 w-3.5" />
                    Reject merge
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setActionDialog({ clusterId: selectedCluster.id, action: "flag" })}>
                    <Flag className="h-3.5 w-3.5" />
                    Flag for investigation
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reason dialog for actions */}
      {actionDialog && (
        <ReasonInputDialog
          open={true}
          onOpenChange={(open) => !open && setActionDialog(null)}
          title={
            actionDialog.action === "merge"
              ? "Merge records"
              : actionDialog.action === "override"
                ? "Override"
                : actionDialog.action === "reject"
                  ? "Reject merge"
                  : "Flag for investigation"
          }
          reasonCodes={reasonCodes}
          requireReasonCode
          onConfirm={handleActionConfirm}
          confirmLabel="Submit"
        />
      )}
    </div>
  );
}
