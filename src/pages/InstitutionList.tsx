import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  Pencil,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Download,
} from "lucide-react";
import { institutionManagedApiSlotCount } from "@/lib/institutionManagedApiSlots";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { institutionLifecycleStatusBadgeClass } from "@/lib/status-badges";
import { exportToCsv } from "@/lib/csv-export";
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
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { useInstitutions, useSuspendInstitution } from "@/hooks/api/useInstitutions";
import type { InstitutionResponse } from "@/services/institutions.service";

type SortKey = "name" | "institutionType" | "institutionLifecycleStatus" | "apisEnabledCount" | "slaHealthPercent" | "updatedAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 5;
/** Match Fastify `pageSlice` max (200) so the list is not missing newly registered members beyond the first API page. */
const INSTITUTIONS_FETCH_PAGE_SIZE = 200;

const roleLabels: Record<string, string> = {
  dataSubmitter: "Data Submission Institutions",
  subscriber: "Subscriber Institutions",
};

const InstitutionList = ({ roleFilter }: { roleFilter?: "dataSubmitter" | "subscriber" }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<{ id: number | string; name: string } | null>(null);

  const { data: pagedData, isLoading, error, refetch } = useInstitutions(
    {
      page: 0,
      size: INSTITUTIONS_FETCH_PAGE_SIZE,
    },
    /** Real members only — mock catalogue has no user-registered rows (e.g. BSNL would “vanish”). */
    { allowMockFallback: false }
  );
  const suspendMutation = useSuspendInstitution();

  const institutions = pagedData?.content ?? [];

  const filtered = useMemo(() => {
    let result = institutions.filter((inst) => {
      if (roleFilter === "dataSubmitter" && !inst.isDataSubmitter) return false;
      if (roleFilter === "subscriber" && !inst.isSubscriber) return false;
      const matchSearch = inst.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inst.institutionLifecycleStatus === statusFilter;
      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      let cmp = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB;
      } else {
        cmp = String(valA ?? "").localeCompare(String(valB ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [search, statusFilter, sortKey, sortDir, roleFilter, institutions]);

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

  const handleSuspendConfirm = () => {
    if (!suspendTarget) return;
    suspendMutation.mutate(suspendTarget.id, {
      onSettled: () => setSuspendTarget(null),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-h2 font-semibold text-foreground">
              {roleFilter ? roleLabels[roleFilter] : "Member Institutions"}
            </h1>
            <p className="text-caption text-muted-foreground mt-1">
              {roleFilter
                ? `Manage ${roleLabels[roleFilter].toLowerCase()} and their configurations`
                : "Manage member institutions and their configurations"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCsv("institutions", filtered as unknown as Record<string, unknown>[], [
                  { key: "name", label: "Name" },
                  { key: "institutionType", label: "Type" },
                  { key: "institutionLifecycleStatus", label: "Status" },
                  { key: "apisEnabledCount", label: "APIs Enabled" },
                  { key: "slaHealthPercent", label: "SLA Health %" },
                  { key: "updatedAt", label: "Last Updated" },
                ])
              }
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
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

        {/* Loading / Error / Table */}
        {isLoading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : error ? (
          <ApiErrorCard error={error} onRetry={refetch} />
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                  <tr className="border-b border-border">
                    {([
                      { label: "Institution Name", key: "name" as SortKey, align: "text-left" },
                      { label: "Type", key: "institutionType" as SortKey, align: "text-left" },
                      { label: "Status", key: "institutionLifecycleStatus" as SortKey, align: "text-left" },
                      { label: "APIs Enabled", key: "apisEnabledCount" as SortKey, align: "text-right" },
                      { label: "SLA Health", key: "slaHealthPercent" as SortKey, align: "text-right" },
                      { label: "Last Updated", key: "updatedAt" as SortKey, align: "text-left" },
                    ]).map((h) => {
                      const sorted = sortKey === h.key;
                      const ariaSort: "none" | "ascending" | "descending" = sorted
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none";
                      return (
                      <th
                        key={h.label}
                        scope="col"
                        aria-sort={ariaSort}
                        className={cn("px-5 py-3", tableHeaderClasses, h.align)}
                      >
                        <button
                          type="button"
                          onClick={() => handleSort(h.key)}
                          className={cn(
                            "flex w-full items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none font-inherit bg-transparent border-0 p-0 text-inherit",
                            h.align === "text-right" && "justify-end"
                          )}
                        >
                          {h.label}
                          <SortIcon col={h.key} />
                        </button>
                      </th>
                    );
                    })}
                    <th className={cn("px-5 py-3", tableHeaderClasses)} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-0">
                        <EmptyState
                          title="No institutions found"
                          description="Try adjusting your search or status filter."
                          actionLabel="Clear filters"
                          onAction={() => { setSearch(""); setStatusFilter("all"); setPage(1); }}
                        />
                      </td>
                    </tr>
                  ) : paginated.map((inst: InstitutionResponse) => {
                    const apiSlots = institutionManagedApiSlotCount(inst);
                    return (
                    <tr
                      key={inst.id}
                      onClick={() => navigate(`/institutions/${inst.id}`)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="text-body font-medium text-foreground">{inst.name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-body text-muted-foreground">{inst.institutionType}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full capitalize", badgeTextClasses, institutionLifecycleStatusBadgeClass(inst.institutionLifecycleStatus))}>
                          {inst.institutionLifecycleStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-body text-foreground">
                          {apiSlots > 0 ? `${inst.apisEnabledCount}/${apiSlots}` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(inst.slaHealthPercent ?? 0) > 0 ? (
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  (inst.slaHealthPercent ?? 0) >= 99 ? "bg-success" : (inst.slaHealthPercent ?? 0) >= 95 ? "bg-warning" : "bg-destructive"
                                )}
                                style={{ width: `${inst.slaHealthPercent ?? 0}%` }}
                              />
                            </div>
                            <span className="text-caption text-muted-foreground">{inst.slaHealthPercent}%</span>
                          </div>
                        ) : (
                          <span className="text-caption text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-body text-muted-foreground">{inst.updatedAt}</span>
                      </td>
                      <td className="px-5 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/institutions/${inst.id}`); }}>
                              <Eye className="w-3.5 h-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/institutions/${inst.id}`); }}>
                              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setSuspendTarget({ id: inst.id, name: inst.name }); }}
                              className="text-destructive focus:text-destructive"
                              disabled={inst.institutionLifecycleStatus === "suspended"}
                            >
                              <Ban className="w-3.5 h-3.5 mr-2" /> Suspend
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <span className="text-caption text-muted-foreground">
                {filtered.length > 0
                  ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} institutions`
                  : "0 institutions"}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
                <span className="text-caption text-muted-foreground px-2">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Institution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{suspendTarget?.name}</strong>? This will disable all API access and data submissions for this institution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleSuspendConfirm}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? "Suspending…" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default InstitutionList;
