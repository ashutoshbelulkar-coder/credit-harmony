import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { tableHeaderClasses } from "@/lib/typography";
import { InstitutionFilterSelect } from "@/components/shared/InstitutionFilterSelect";
import { ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLogs } from "@/hooks/api/useAuditLogs";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import type { AuditLogEntry } from "@/services/auditLogs.service";

const ACTION_TYPES = [
  "MAPPING_APPROVED",
  "MAPPING_REJECTED",
  "RULE_CREATED",
  "RULE_UPDATED",
  "RULE_ACTIVATED",
  "MERGE_PERFORMED",
  "OVERRIDE_PERFORMED",
  "CONFIG_CHANGED",
];

interface SelectedEntry {
  id: number;
  userEmail: string;
  actionType: string;
  entityType: string;
  entityId: string;
  description?: string;
  ipAddressHash?: string;
  auditOutcome: string;
  occurredAt: string;
}

export default function GovernanceAuditLogs() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [institutionId, setInstitutionId] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading } = useAuditLogs({
    entityType: "GOVERNANCE",
    actionType: actionFilter !== "all" ? actionFilter : undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    institutionId: institutionId !== "all" ? institutionId : undefined,
    size: 50,
  });

  const entries: AuditLogEntry[] = data?.content ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Governance Audit Logs</h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Read-only audit trail of all governance actions
        </p>
      </div>

      {/* Advanced filters – collapsible on mobile */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 md:hidden">
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Date from</Label>
                <DatePicker value={dateFrom} onChange={setDateFrom} className="h-9 text-caption" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Date to</Label>
                <DatePicker value={dateTo} onChange={setDateTo} className="h-9 text-caption" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-caption text-muted-foreground">Action type</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-9 text-caption">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-caption">
                      All actions
                    </SelectItem>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a} value={a} className="text-caption">
                        {a.replace(/_/g, " ").toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <InstitutionFilterSelect
                id="governance-audit-institution-mobile"
                mode="all"
                value={institutionId}
                onValueChange={setInstitutionId}
                triggerClassName="h-9 min-w-[200px]"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Desktop: always-visible filters */}
      <div className="hidden rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] md:block">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Date from</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} className="h-9 text-caption" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Date to</Label>
            <DatePicker value={dateTo} onChange={setDateTo} className="h-9 text-caption" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Action type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 text-caption">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-caption">
                  All actions
                </SelectItem>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a} value={a} className="text-caption">
                    {a.replace(/_/g, " ").toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <InstitutionFilterSelect
            id="governance-audit-institution-desktop"
            mode="all"
            value={institutionId}
            onValueChange={setInstitutionId}
            triggerClassName="h-9 min-w-[200px]"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={tableHeaderClasses}>Log ID</TableHead>
                <TableHead className={tableHeaderClasses}>User</TableHead>
                <TableHead className={tableHeaderClasses}>Action Type</TableHead>
                <TableHead className={tableHeaderClasses}>Entity</TableHead>
                <TableHead className={tableHeaderClasses}>Description</TableHead>
                <TableHead className={tableHeaderClasses}>Outcome</TableHead>
                <TableHead className={tableHeaderClasses}>Timestamp</TableHead>
                <TableHead className={tableHeaderClasses}>IP Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No governance audit logs found
                  </TableCell>
                </TableRow>
              ) : entries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <TableCell className="text-body font-medium">{entry.id}</TableCell>
                  <TableCell className="text-body">{entry.userEmail ?? "System"}</TableCell>
                  <TableCell className="text-body">
                    {entry.actionType.replace(/_/g, " ").toLowerCase()}
                  </TableCell>
                  <TableCell className="text-body">
                    {entry.entityType}/{entry.entityId}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-body" title={entry.description}>
                    {entry.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-body">{entry.auditOutcome}</TableCell>
                  <TableCell className="whitespace-nowrap text-caption text-muted-foreground">
                    {new Date(entry.occurredAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-caption font-mono">
                    {entry.ipAddressHash ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <ScrollArea className="max-h-[70vh]">
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-2 text-body">
                  <span className="text-muted-foreground">Log ID</span>
                  <span className="font-medium">{selectedEntry.id}</span>
                  <span className="text-muted-foreground">User</span>
                  <span className="font-medium">{selectedEntry.userEmail ?? "System"}</span>
                  <span className="text-muted-foreground">Action Type</span>
                  <span className="font-medium">{selectedEntry.actionType.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">Entity</span>
                  <span className="font-medium">{selectedEntry.entityType}/{selectedEntry.entityId}</span>
                  <span className="text-muted-foreground">Outcome</span>
                  <span className="font-medium">{selectedEntry.auditOutcome}</span>
                  <span className="text-muted-foreground">Timestamp</span>
                  <span className="font-medium">{new Date(selectedEntry.occurredAt).toLocaleString()}</span>
                  <span className="text-muted-foreground">IP Hash</span>
                  <span className="font-medium font-mono text-caption">{selectedEntry.ipAddressHash ?? "—"}</span>
                </div>
                {selectedEntry.description && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-2 text-body">{selectedEntry.description}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
