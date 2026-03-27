import { useState } from "react";
import { ArrowLeft, GitCompare, RotateCcw, Plus, Minus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { mappingVersionHistory, sampleVersionDiff } from "@/data/schema-mapper-mock";
import type { MappingVersionEntry, SchemaDiffEntry, DiffChangeType, SchemaStatus } from "@/types/schema-mapper";

interface VersionDiffViewerProps {
  onBack: () => void;
}

const CHANGE_ICONS: Record<DiffChangeType, React.ElementType> = {
  added: Plus,
  removed: Minus,
  modified: Pencil,
};

const CHANGE_COLORS: Record<DiffChangeType, string> = {
  added: "text-success bg-success/10",
  removed: "text-destructive bg-destructive/10",
  modified: "text-warning bg-warning/10",
};

const STATUS_STYLES: Record<SchemaStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-info/15 text-info",
  approved: "bg-success/15 text-success",
  active: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground opacity-60",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function VersionDiffViewer({ onBack }: VersionDiffViewerProps) {
  const [leftVersion, setLeftVersion] = useState(mappingVersionHistory[1]?.id ?? "");
  const [rightVersion, setRightVersion] = useState(mappingVersionHistory[0]?.id ?? "");

  const leftEntry = mappingVersionHistory.find((v) => v.id === leftVersion);
  const rightEntry = mappingVersionHistory.find((v) => v.id === rightVersion);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-h2 font-semibold text-foreground">Version Control & Audit</h2>
          <p className="text-caption text-muted-foreground">
            Compare mapping versions and view change history
          </p>
        </div>
      </div>

      {/* Version History Timeline */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-3">Version History</h3>
        <div className="space-y-2">
          {mappingVersionHistory.map((ver) => (
            <div
              key={ver.id}
              className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex items-center gap-2 min-w-[100px]">
                <Badge variant="outline" className="text-[9px] leading-[12px] font-mono">
                  {ver.mappingVersion}
                </Badge>
                <Badge className={cn("text-[9px] leading-[12px] border-0", STATUS_STYLES[ver.status])}>
                  {ver.status}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body text-foreground truncate">{ver.changesSummary}</p>
                <p className="text-[9px] leading-[12px] text-muted-foreground">
                  {ver.createdBy} &middot; {formatDate(ver.createdAt)}
                  {ver.approvedBy && ` &middot; Approved by ${ver.approvedBy}`}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[9px] leading-[12px] text-muted-foreground shrink-0">
                <span>Master: {ver.masterSchemaVersion}</span>
                <span>&middot;</span>
                <span>Rules: {ver.ruleSetVersion}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diff Comparison */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-h4 font-semibold text-foreground">Compare Versions</h3>
          </div>
          <div className="flex items-center gap-2">
            <Select value={leftVersion} onValueChange={setLeftVersion}>
              <SelectTrigger className="h-8 w-28 text-caption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mappingVersionHistory.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-caption font-mono">
                    {v.mappingVersion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-caption text-muted-foreground">vs</span>
            <Select value={rightVersion} onValueChange={setRightVersion}>
              <SelectTrigger className="h-8 w-28 text-caption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mappingVersionHistory.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-caption font-mono">
                    {v.mappingVersion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(tableHeaderClasses, "min-w-[50px]")}>Change</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[80px]")}>Data Category</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[150px]")}>Field / Item</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[150px]")}>Previous</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[150px]")}>New</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleVersionDiff.map((diff, idx) => {
                const Icon = CHANGE_ICONS[diff.changeType];
                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className={cn("flex h-5 w-5 items-center justify-center rounded", CHANGE_COLORS[diff.changeType])}>
                        <Icon className="h-3 w-3" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal capitalize">
                        {diff.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-body font-medium">{diff.field}</TableCell>
                    <TableCell className="text-body text-muted-foreground">
                      {diff.oldValue ?? "—"}
                    </TableCell>
                    <TableCell className="text-body text-foreground">
                      {diff.newValue ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Rollback */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Rollback to Previous Version
        </Button>
      </div>
    </div>
  );
}
