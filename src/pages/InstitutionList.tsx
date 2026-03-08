import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { institutions, statusStyles } from "@/data/institutions-mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

type SortKey = "name" | "type" | "status" | "apisEnabled" | "slaHealth" | "lastUpdated";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 5;

const roleLabels: Record<string, string> = {
  dataSubmitter: "Data Submission Institutions",
  subscriber: "Subscriber Institutions",
};

const InstitutionList = ({ roleFilter }: { roleFilter?: "dataSubmitter" | "subscriber" }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastUpdated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    let result = institutions.filter((inst) => {
      if (roleFilter === "dataSubmitter" && !inst.isDataSubmitter) return false;
      if (roleFilter === "subscriber" && !inst.isSubscriber) return false;
      const matchSearch = inst.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inst.status === statusFilter;
      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      let cmp = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [search, statusFilter, sortKey, sortDir, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-h2 font-semibold text-foreground">
              {roleFilter ? roleLabels[roleFilter] : "Institutions"}
            </h1>
            <p className="text-caption text-muted-foreground mt-1">
              {roleFilter
                ? `Manage ${roleLabels[roleFilter].toLowerCase()} and their configurations`
                : "Manage onboarded institutions and their configurations"}
            </p>
          </div>
          <Button onClick={() => navigate("/institutions/register")} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Register Institution
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search institutions..."
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["active", "pending", "suspended", "draft"].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <tr className="border-b border-border">
                  {([
                    { label: "Institution Name", key: "name" as SortKey, align: "text-left" },
                    { label: "Type", key: "type" as SortKey, align: "text-left" },
                    { label: "Status", key: "status" as SortKey, align: "text-left" },
                    { label: "APIs Enabled", key: "apisEnabled" as SortKey, align: "text-right" },
                    { label: "SLA Health", key: "slaHealth" as SortKey, align: "text-right" },
                    { label: "Last Updated", key: "lastUpdated" as SortKey, align: "text-left" },
                  ]).map((h) => (
                    <th
                      key={h.label}
                      className={cn("px-5 py-3", tableHeaderClasses, h.align)}
                    >
                      <span
                        onClick={() => handleSort(h.key)}
                        className={cn(
                          "flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none",
                          h.align === "text-right" && "justify-end"
                        )}
                      >
                        {h.label}
                        <SortIcon col={h.key} />
                      </span>
                    </th>
                  ))}
                  <th className={cn("px-5 py-3", tableHeaderClasses)} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((inst) => (
                  <tr
                    key={inst.id}
                    onClick={() => navigate(`/institutions/${inst.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="text-body font-medium text-foreground">{inst.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-body text-muted-foreground">{inst.type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full capitalize", badgeTextClasses, statusStyles[inst.status])}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-body text-foreground">{inst.apisEnabled}/3</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {inst.slaHealth > 0 ? (
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                inst.slaHealth >= 99 ? "bg-success" : inst.slaHealth >= 95 ? "bg-warning" : "bg-destructive"
                              )}
                              style={{ width: `${inst.slaHealth}%` }}
                            />
                          </div>
                          <span className="text-caption text-muted-foreground">{inst.slaHealth}%</span>
                        </div>
                      ) : (
                        <span className="text-caption text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-body text-muted-foreground">{inst.lastUpdated}</span>
                    </td>
                    <td className="px-5 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/institutions/${inst.id}`); }}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/institutions/${inst.id}`); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => e.stopPropagation()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="w-3.5 h-3.5 mr-2" /> Suspend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-caption text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} institutions
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-body font-medium transition-colors",
                    p === currentPage
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InstitutionList;
