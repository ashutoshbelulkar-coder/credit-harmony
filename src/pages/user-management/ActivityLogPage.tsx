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
import { mockActivity } from "@/data/user-management-mock";

const actionTypes = [...new Set(mockActivity.map((a) => a.action))];
const PAGE_SIZE = 10;

export function ActivityLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return mockActivity.filter((a) => {
      const matchSearch = !search || a.userName.toLowerCase().includes(search.toLowerCase()) || a.details.toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === "All" || a.action === actionFilter;
      const matchStatus = statusFilter === "All" || a.status === statusFilter;
      return matchSearch && matchAction && matchStatus;
    });
  }, [search, actionFilter, statusFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
          <Input className="pl-9" placeholder="Search activity…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Actions</SelectItem>
            {actionTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
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
      <div className="border rounded-lg mt-4 overflow-x-auto">
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
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No activity found</TableCell></TableRow>
            ) : paged.map((a) => {
              const initials = a.userName.split(" ").map((n) => n[0]).join("").slice(0, 2);
              return (
                <TableRow key={a.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatTimestamp(a.timestamp)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{a.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{a.action}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{a.details}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono text-xs">{a.ipAddress}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-[10px] ${a.status === "Success" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                      {a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">{filtered.length} entries</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}
