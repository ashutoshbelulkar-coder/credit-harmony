import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
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
import { governanceAuditLogs } from "@/data/data-governance-mock";
import type { GovernanceAuditLogEntry } from "@/types/data-governance";
import { ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_TYPES = [
  "mapping_approved",
  "mapping_rejected",
  "rule_created",
  "rule_updated",
  "rule_activated",
  "merge_performed",
  "override_performed",
  "config_changed",
];

const USERS = Array.from(new Set(governanceAuditLogs.map((e) => e.user)));
const INSTITUTIONS = ["First National Bank", "Metro Credit Union", "Pacific Finance Corp", "All"];

export default function GovernanceAuditLogsContent() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [institutionFilter, setInstitutionFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<GovernanceAuditLogEntry | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return governanceAuditLogs.filter((entry) => {
      if (dateFrom && entry.timestamp < dateFrom) return false;
      if (dateTo && entry.timestamp > dateTo + "T23:59:59") return false;
      if (userFilter !== "all" && entry.user !== userFilter) return false;
      if (actionFilter !== "all" && entry.actionType !== actionFilter) return false;
      return true;
    });
  }, [dateFrom, dateTo, userFilter, actionFilter]);

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label className="text-caption">Date from</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-caption">Date to</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-caption">User</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {USERS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-caption">Action type</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-caption">Institution</Label>
                <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {INSTITUTIONS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Desktop: always-visible filters */}
      <div className="hidden rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] md:block">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label className="text-caption">Date from</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-caption">Date to</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-caption">User</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {USERS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-caption">Action type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-caption">Institution</Label>
            <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {INSTITUTIONS.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table – scrollable on mobile */}
      <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={tableHeaderClasses}>Change ID</TableHead>
              <TableHead className={tableHeaderClasses}>User</TableHead>
              <TableHead className={tableHeaderClasses}>Role</TableHead>
              <TableHead className={tableHeaderClasses}>Action Type</TableHead>
              <TableHead className={tableHeaderClasses}>Entity Affected</TableHead>
              <TableHead className={tableHeaderClasses}>Old Value</TableHead>
              <TableHead className={tableHeaderClasses}>New Value</TableHead>
              <TableHead className={tableHeaderClasses}>Timestamp</TableHead>
              <TableHead className={tableHeaderClasses}>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => (
              <TableRow
                key={entry.changeId}
                className="cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <TableCell className="text-body font-medium">{entry.changeId}</TableCell>
                <TableCell className="text-body">{entry.user}</TableCell>
                <TableCell className="text-body">{entry.role}</TableCell>
                <TableCell className="text-body">{entry.actionType.replace(/_/g, " ")}</TableCell>
                <TableCell className="max-w-[200px] truncate text-body" title={entry.entityAffected}>
                  {entry.entityAffected}
                </TableCell>
                <TableCell className="max-w-[120px] truncate text-body" title={entry.oldValue}>
                  {entry.oldValue}
                </TableCell>
                <TableCell className="max-w-[120px] truncate text-body" title={entry.newValue}>
                  {entry.newValue}
                </TableCell>
                <TableCell className="whitespace-nowrap text-caption text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString()}
                </TableCell>
                <TableCell className="text-caption">{entry.ipAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail modal – read-only */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <ScrollArea className="max-h-[70vh]">
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-2 text-body">
                  <span className="text-muted-foreground">Change ID</span>
                  <span className="font-medium">{selectedEntry.changeId}</span>
                  <span className="text-muted-foreground">User</span>
                  <span className="font-medium">{selectedEntry.user}</span>
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{selectedEntry.role}</span>
                  <span className="text-muted-foreground">Action Type</span>
                  <span className="font-medium">{selectedEntry.actionType.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">Entity Affected</span>
                  <span className="font-medium">{selectedEntry.entityAffected}</span>
                  <span className="text-muted-foreground">Timestamp</span>
                  <span className="font-medium">{new Date(selectedEntry.timestamp).toLocaleString()}</span>
                  <span className="text-muted-foreground">IP Address</span>
                  <span className="font-medium">{selectedEntry.ipAddress}</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
                    Value comparison
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-caption text-muted-foreground">Old value</p>
                      <p className="mt-1 break-words font-mono text-body">{selectedEntry.oldValue}</p>
                    </div>
                    <div>
                      <p className="text-caption text-muted-foreground">New value</p>
                      <p className="mt-1 break-words font-mono text-body">{selectedEntry.newValue}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
