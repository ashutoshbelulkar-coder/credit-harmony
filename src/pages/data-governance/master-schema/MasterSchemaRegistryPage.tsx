import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileText, CheckCircle2, Clock } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkeletonKpiCards, SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { useMasterSchemasList } from "@/hooks/api/useMasterSchemas";
import type { MasterSchemaStatus } from "@/types/master-schema";

const STATUS_LABELS: Record<MasterSchemaStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  active: "Active",
  deprecated: "Deprecated",
  rejected: "Rejected",
  changes_requested: "Changes Requested",
};

const STATUS_STYLES: Record<MasterSchemaStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning",
  active: "bg-success/15 text-success",
  deprecated: "bg-muted text-muted-foreground opacity-80",
  rejected: "bg-destructive/15 text-destructive",
  changes_requested: "bg-info/15 text-info",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function MasterSchemaRegistryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MasterSchemaStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const listParams = useMemo(
    () => ({ search, sourceType: "all" as const, status, page, size }),
    [search, status, page, size],
  );

  const { data, isLoading, isError, error, refetch } = useMasterSchemasList(listParams, { allowMockFallback: true });
  const { data: kpiData } = useMasterSchemasList(
    { search, sourceType: "all", status, page: 0, size: 500 },
    { allowMockFallback: true, enabled: true },
  );

  const rows = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const kpis = useMemo(() => {
    const allForKpi = kpiData?.content ?? rows;
    const active = allForKpi.filter((r) => r.status === "active").length;
    const pending = allForKpi.filter((r) => r.status === "pending").length;
    return [
      { label: "Total Schemas", value: total, icon: FileText, accent: "text-primary" },
      { label: "Active Schemas", value: active, icon: CheckCircle2, accent: "text-success" },
      { label: "Pending Approval", value: pending, icon: Clock, accent: "text-warning" },
    ] as const;
  }, [kpiData?.content, rows, total]);

  const resetToFirstPage = useCallback(() => setPage(0), []);
  const handleStatusChange = useCallback((v: string) => {
    setStatus(v as MasterSchemaStatus | "all");
    resetToFirstPage();
  }, [resetToFirstPage]);

  const showLoading = isLoading && !data;

  return (
    <>
      <PageBreadcrumb
        segments={[
          { label: "Data Governance", href: "/data-governance/dashboard" },
          { label: "Master Schema Management" },
        ]}
      />

      <div className="space-y-5 pt-2 animate-fade-in pb-4 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-h2 font-semibold text-foreground">Master Schema Management</h1>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Central registry for enterprise master schemas across source types
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/data-governance/master-schema/new")} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Create New Schema
            </Button>
          </div>
        </div>

        {/* KPIs */}
        {showLoading && <SkeletonKpiCards count={3} />}
        {isError && <ApiErrorCard error={error} onRetry={() => refetch()} />}
        {!showLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted", kpi.accent)}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-h3 font-bold tabular-nums text-foreground">{kpi.value}</p>
                    <p className="text-caption text-muted-foreground">{kpi.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search schema name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetToFirstPage();
              }}
              className="h-9 pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.keys(STATUS_LABELS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s as MasterSchemaStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {showLoading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(tableHeaderClasses, "min-w-[220px]")}>Source Type Name</TableHead>
                  <TableHead className={cn(tableHeaderClasses, "min-w-[80px] text-center")}>Version</TableHead>
                  <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center")}>Number of Fields</TableHead>
                  <TableHead className={cn(tableHeaderClasses, "min-w-[120px] text-center")}>Status</TableHead>
                  <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center hidden md:table-cell")}>Last Updated</TableHead>
                  <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-body text-muted-foreground">
                      No schemas match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} className="group">
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-body font-medium text-foreground truncate">{r.name}</p>
                          <p className="text-[9px] leading-[12px] text-muted-foreground">ID: {r.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-body font-medium tabular-nums text-foreground">
                        {r.version}
                      </TableCell>
                      <TableCell className="text-center text-body tabular-nums text-foreground">
                        {r.fieldCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[r.status])}>
                          {STATUS_LABELS[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-caption text-muted-foreground hidden md:table-cell tabular-nums">
                        {formatDateTime(r.updatedAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/data-governance/master-schema/${encodeURIComponent(r.id)}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/data-governance/master-schema/${encodeURIComponent(r.id)}/edit`)}
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!showLoading && !isError && totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(0, p - 1));
                  }}
                  aria-disabled={page <= 0}
                  className={cn(page <= 0 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-caption text-muted-foreground">
                  Page {page + 1} of {totalPages} • {total} total
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                  }}
                  aria-disabled={page >= totalPages - 1}
                  className={cn(page >= totalPages - 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </>
  );
}

export default MasterSchemaRegistryPage;
