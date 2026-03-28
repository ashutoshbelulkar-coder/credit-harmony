import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuditLogs } from "@/hooks/api/useAuditLogs";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";

const PAGE_SIZE = 10;

const KNOWN_ACTIONS = [
  "LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE",
  "APPROVE", "REJECT", "SUSPEND", "ACTIVATE", "EXPORT",
  "UPLOAD", "DOWNLOAD", "VIEW", "UNKNOWN",
];

export function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);

  const { data, isLoading, error, refetch } = useAuditLogs({
    actionType: actionFilter !== "All" ? actionFilter : undefined,
    page,
    size: PAGE_SIZE,
  });

  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Client-side search filter (search across current page)
  const filtered = useMemo(() => {
    const entries = data?.content ?? [];
    return entries.filter((a) => {
      const matchSearch = !search || (
        (a.userEmail ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (a.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        a.actionType.toLowerCase().includes(search.toLowerCase())
      );
      const matchStatus = statusFilter === "All" ||
        (statusFilter === "Success" && a.auditOutcome === "SUCCESS") ||
        (statusFilter === "Failed" && a.auditOutcome !== "SUCCESS");
      return matchSearch && matchStatus;
    });
  }, [data?.content, search, statusFilter]);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (email?: string) => {
    if (!email) return "?";
    const parts = email.split("@")[0].split(/[._-]/);
    return parts
      .map((p) => p[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");
  };

  return (
    <>
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Activity Log</h1>
        <p className="text-caption text-muted-foreground mt-1">
          Audit trail of user actions, logins, and system events.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mt-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search activity…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Actions</SelectItem>
            {KNOWN_ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Success">Success</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {error ? (
        <div className="mt-4">
          <ApiErrorCard error={error} onRetry={refetch} />
        </div>
      ) : isLoading ? (
        <div className="mt-4">
          <SkeletonTable rows={PAGE_SIZE} cols={6} />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)] mt-4">
          <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      No activity found
                    </TableCell>
                  </TableRow>
                ) : filtered.map((a) => {
                  const isSuccess = a.auditOutcome === "SUCCESS";
                  const initials = getInitials(a.userEmail);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(a.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">{a.userEmail ?? "System"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{a.actionType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {a.description ?? `${a.actionType} on ${a.entityType}/${a.entityId}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                        {a.ipAddressHash ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-[10px] ${isSuccess ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                          {isSuccess ? "Success" : "Failed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-caption text-muted-foreground">
              {totalElements > 0
                ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalElements)} of ${totalElements} entries`
                : "0 entries"}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-caption text-muted-foreground px-2">
                {page + 1} / {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
