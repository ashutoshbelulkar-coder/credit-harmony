import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Copy, Plus, Archive, History } from "lucide-react";
import { MappingCoverageBar } from "@/components/schema-mapper/shared/MappingCoverageBar";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import type { SchemaRegistryEntry, SchemaStatus, SourceType } from "@/types/schema-mapper";

interface SchemaRegistryTableProps {
  entries: SchemaRegistryEntry[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onClone?: (id: string) => void;
  onNewVersion?: (id: string) => void;
  onArchive?: (id: string) => void;
  onAuditHistory?: (id: string) => void;
}

const STATUS_STYLES: Record<SchemaStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-info/15 text-info",
  approved: "bg-success/15 text-success",
  active: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground opacity-60",
};

const STATUS_LABELS: Record<SchemaStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  active: "Active",
  archived: "Archived",
};

const SOURCE_LABELS: Record<SourceType, string> = {
  telecom: "Telecom",
  utility: "Utility",
  bank: "Bank",
  gst: "GST",
  custom: "Custom",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SchemaRegistryTable({
  entries,
  onView,
  onEdit,
  onClone,
  onNewVersion,
  onArchive,
  onAuditHistory,
}: SchemaRegistryTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden min-h-0 flex flex-col">
      <div className="min-w-0 min-h-0 overflow-x-auto overflow-y-visible table-scroll-fade pb-4 [-webkit-overflow-scrolling:touch]">
        <Table className="w-full min-w-max border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className={cn(tableHeaderClasses, "sticky left-0 z-10 min-w-[140px] rounded-tl-xl overflow-hidden border-r border-border bg-[hsl(var(--table-header-bg))] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] text-center")}>
                Source Name
              </TableHead>
              <TableHead className={cn(tableHeaderClasses, "min-w-[80px] text-center hidden sm:table-cell")}>Source Type</TableHead>
              <TableHead className={cn(tableHeaderClasses, "min-w-[150px] text-center hidden md:table-cell")}>Coverage</TableHead>
              <TableHead className={cn(tableHeaderClasses, "min-w-[80px] text-center hidden md:table-cell")}>Unmapped</TableHead>
              <TableHead className={cn(tableHeaderClasses, "min-w-[70px] text-center hidden md:table-cell")}>Rules</TableHead>
              <TableHead className={cn(tableHeaderClasses, "min-w-[100px] text-center")}>Status</TableHead>
              <TableHead className={cn(tableHeaderClasses, "min-w-[100px] text-center hidden lg:table-cell")}>Last Modified</TableHead>
              <TableHead className={cn(tableHeaderClasses, "min-w-[60px] text-center")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow className="border-b border-border">
                <TableCell colSpan={8} className="h-32 text-center text-body text-muted-foreground">
                  No schema mappings found. Create a new mapping to get started.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id} className="group border-b border-border last:border-b-0">
                  <TableCell className="sticky left-0 z-10 min-w-0 overflow-hidden border-r border-border bg-card group-hover:bg-muted shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                    <div>
                      <p className="text-body font-medium text-foreground">{entry.sourceName}</p>
                      <p className="text-[9px] leading-[12px] text-muted-foreground">{entry.version}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                      {SOURCE_LABELS[entry.sourceType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <MappingCoverageBar value={entry.mappingCoverage} />
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <span
                      className={cn(
                        "text-body tabular-nums font-medium",
                        entry.unmappedFields > 0 ? "text-warning" : "text-success",
                      )}
                    >
                      {entry.unmappedFields}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-body tabular-nums text-foreground hidden md:table-cell">
                    {entry.ruleCount}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[entry.status])}>
                      {STATUS_LABELS[entry.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div>
                      <p className="text-body text-foreground">{formatDate(entry.lastModifiedAt)}</p>
                      <p className="text-[9px] leading-[12px] text-muted-foreground">{entry.lastModifiedBy}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onView?.(entry.id)}>
                          <Eye className="mr-2 h-3.5 w-3.5" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(entry.id)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onClone?.(entry.id)}>
                          <Copy className="mr-2 h-3.5 w-3.5" /> Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onNewVersion?.(entry.id)}>
                          <Plus className="mr-2 h-3.5 w-3.5" /> Create New Version
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onArchive?.(entry.id)}>
                          <Archive className="mr-2 h-3.5 w-3.5" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAuditHistory?.(entry.id)}>
                          <History className="mr-2 h-3.5 w-3.5" /> View Audit History
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
