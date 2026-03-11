import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Download, Eye, Filter, MoreHorizontal, Search, Shield, ShieldOff, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { mockUsers, institutionOptions, type ManagedUser, type UserRole, type UserStatus } from "@/data/user-management-mock";
import { InviteUserModal } from "@/components/user-management/InviteUserModal";
import { UserDetailDrawer } from "@/components/user-management/UserDetailDrawer";
import { exportToCsv } from "@/lib/csv-export";

const statusColor: Record<string, string> = {
  Active: "bg-success/20 text-success",
  Invited: "bg-primary/20 text-primary",
  Suspended: "bg-warning/20 text-warning",
  Deactivated: "bg-destructive/20 text-destructive",
};

const roleColor: Record<string, string> = {
  "Super Admin": "bg-destructive/15 text-destructive",
  "Bureau Admin": "bg-primary/15 text-primary",
  Analyst: "bg-accent/15 text-accent",
  Viewer: "bg-muted text-muted-foreground",
  "API User": "bg-warning/15 text-warning",
};

const roles: UserRole[] = ["Super Admin", "Bureau Admin", "Analyst", "Viewer", "API User"];
const statuses: UserStatus[] = ["Active", "Invited", "Suspended", "Deactivated"];

const PAGE_SIZE = 10;

export function UsersListPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [institutionFilter, setInstitutionFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    search.trim().length > 0,
    roleFilter !== "All",
    statusFilter !== "All",
    institutionFilter !== "All",
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    return mockUsers.filter((u) => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "All" || u.role === roleFilter;
      const matchStatus = statusFilter === "All" || u.status === statusFilter;
      const matchInst = institutionFilter === "All" || u.institution === institutionFilter;
      return matchSearch && matchRole && matchStatus && matchInst;
    });
  }, [search, roleFilter, statusFilter, institutionFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const openDrawer = (user: ManagedUser) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Users</h1>
          <p className="text-caption text-muted-foreground mt-1">
            Manage platform users, roles, and access across institutions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCsv("users", filtered, [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "role", label: "Role" },
                { key: "institution", label: "Institution" },
                { key: "status", label: "Status" },
                { key: "lastActive", label: "Last Active" },
              ])
            }
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Invite User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 rounded-xl border border-border bg-card overflow-hidden">
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-body font-medium text-foreground">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            <span className="ml-auto">
              {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </span>
          </button>
          {filtersOpen && (
            <div className="border-t border-border px-4 py-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 h-8" placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-caption text-muted-foreground">Role</label>
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
                  <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-caption text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-caption text-muted-foreground">Institution</label>
                <Select value={institutionFilter} onValueChange={(v) => { setInstitutionFilter(v); setPage(0); }}>
                  <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Institutions</SelectItem>
                    {institutionOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-8" placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
            <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Roles</SelectItem>
              {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={institutionFilter} onValueChange={(v) => { setInstitutionFilter(v); setPage(0); }}>
            <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Institutions</SelectItem>
              {institutionOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)] mt-4">
        <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No users found</TableCell></TableRow>
              ) : paged.map((u) => {
                const initials = u.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                return (
                  <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDrawer(u)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={`border-0 text-[10px] ${roleColor[u.role]}`}>{u.role}</Badge></TableCell>
                    <TableCell className="text-sm text-foreground">{u.institution}</TableCell>
                    <TableCell><Badge className={`border-0 text-[10px] ${statusColor[u.status]}`}>{u.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.lastActive}</TableCell>
                    <TableCell>
                      <Badge variant={u.mfaEnabled ? "default" : "outline"} className="text-[10px]">
                        {u.mfaEnabled ? "On" : "Off"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDrawer(u); }}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Edit role — coming soon"); }}>
                            <Shield className="w-3.5 h-3.5 mr-2" /> Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.warning(`${u.name} suspended`); }}>
                            <ShieldOff className="w-3.5 h-3.5 mr-2" /> Suspend
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); toast.error(`${u.name} deactivated`); }}>
                            <XCircle className="w-3.5 h-3.5 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-caption text-muted-foreground">
            {filtered.length > 0
              ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} users`
              : "0 users"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-caption text-muted-foreground px-2">{page + 1} / {Math.max(1, totalPages)}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <InviteUserModal open={inviteOpen} onOpenChange={setInviteOpen} />
      <UserDetailDrawer user={selectedUser} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
