import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Info,
} from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SkeletonKpiCards, SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChangeCommentDialog } from "@/components/data-governance/data-management/ChangeCommentDialog";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { AttrStatus, ClassName, EntityKind, Sensitivity, TargetTable } from "./types";
import { KIND_LABELS, KIND_ORDER } from "./types";
import {
  emptyAttribute,
  firstAppliesToHref,
  formatDateEnIn,
  KIND_BADGE_LABELS,
  overflowChips,
  SENSITIVITY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
} from "./msm-helpers";
import { completenessIssueCount } from "./validate-dictionary";
import {
  addAttributeGroup,
  loadDictFilters,
  saveDictFilters,
} from "./dictionary-store";
import {
  useAllAttributes,
  useAllEntityTypes,
  useBulkApprove,
  useBulkDeprecate,
  useBulkReject,
  useCanMutateMsm,
  useDictionarySnapshot,
  useIsSuperAdmin,
  useSaveProfile,
} from "./useMasterDictionary";
import { DomainsDrawer } from "./DomainsDrawer";
import { AttributeProfileEditor } from "./AttributeProfileEditor";
import { AttributePickerDialog } from "./AttributePickerDialog";

function ChipOverflow({ values, max }: { values: string[]; max: number }) {
  const { shown, extra } = overflowChips(values, max);
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {shown.map((s) => (
        <Badge key={s} variant="secondary" className="text-[9px] leading-[12px]">{s}</Badge>
      ))}
      {extra > 0 && <Badge variant="outline" className="text-[9px] leading-[12px]">+{extra}</Badge>}
    </div>
  );
}

export function MasterSchemaRegistryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "dictionary" ? "dictionary" : "entity-types";
  const { user } = useAuth();
  const canMutate = useCanMutateMsm();
  const isSuperAdmin = useIsSuperAdmin();

  const snap = useDictionarySnapshot();
  const snapshot = snap.data;

  const [etSearch, setEtSearch] = useState("");
  const [etKind, setEtKind] = useState<EntityKind | "all">("all");
  const [etTable, setEtTable] = useState<string>("__all");
  const [etPage, setEtPage] = useState(0);

  const [filters, setFilters] = useState(() => loadDictFilters());
  const [dictPage, setDictPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [domainsOpen, setDomainsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ passed: string[]; failed: { attributeId: string; reasons: string[] }[] } | null>(null);
  const [commentAction, setCommentAction] = useState<"reject" | "deprecate" | null>(null);
  const [successorOpen, setSuccessorOpen] = useState(false);
  const [successorId, setSuccessorId] = useState<string | undefined>();

  const size = 10;

  const entityTypesQuery = useAllEntityTypes();
  const attrsQuery = useAllAttributes(view === "dictionary" ? filters : undefined);
  const saveProfile = useSaveProfile();
  const bulkApprove = useBulkApprove();
  const bulkReject = useBulkReject();
  const bulkDeprecate = useBulkDeprecate();

  const entityTypes = entityTypesQuery.data ?? snapshot?.entityTypes ?? [];
  const allAttrs = snapshot?.attributes ?? [];
  const filteredAttrs = attrsQuery.data ?? allAttrs;
  const enums = snapshot?.enums;
  const groups = snapshot?.attributeGroups ?? [];
  const domains = snapshot?.domains ?? [];

  const setView = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "dictionary") next.set("view", "dictionary");
    else next.delete("view");
    setParams(next, { replace: true });
  };

  const updateFilters = useCallback((patch: Partial<typeof filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      saveDictFilters(next);
      return next;
    });
    setDictPage(0);
    setSelectedIds(new Set());
  }, []);

  const filteredTypes = useMemo(() => {
    const q = etSearch.toLowerCase();
    return entityTypes
      .filter((e) => {
        if (q && !e.displayName.toLowerCase().includes(q) && !e.entityType.toLowerCase().includes(q)) return false;
        if (etKind !== "all" && e.kind !== etKind) return false;
        if (etTable !== "__all" && e.targetTable !== etTable) return false;
        return true;
      })
      .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }, [entityTypes, etSearch, etKind, etTable]);

  const etTotalPages = Math.max(1, Math.ceil(filteredTypes.length / size));
  const etSlice = filteredTypes.slice(etPage * size, (etPage + 1) * size);

  const dictTotal = filteredAttrs.length;
  const dictTotalPages = Math.max(1, Math.ceil(dictTotal / size));
  const dictSlice = filteredAttrs.slice(dictPage * size, (dictPage + 1) * size);

  const etKpis = useMemo(() => {
    const attrs = snapshot?.attributes ?? [];
    const active = attrs.filter((a) => a.status === "active").length;
    const pending = attrs.filter((a) => a.status === "pending" || a.status === "proposed").length;
    const completeness = completenessIssueCount(attrs);
    return [
      { label: "Entity types", value: entityTypes.length, icon: FileText, accent: "text-primary" },
      { label: "Active attributes", value: active, icon: CheckCircle2, accent: "text-success" },
      { label: "Pending approval", value: pending, icon: Clock, accent: "text-warning" },
      { label: "Completeness issues", value: completeness, icon: AlertTriangle, accent: "text-warning", tip: "Ungrouped or seed-level definitions." },
    ] as const;
  }, [entityTypes.length, snapshot?.attributes]);

  const dictKpis = useMemo(() => {
    const attrs = filteredAttrs;
    return [
      { label: "Attributes", value: attrs.length, icon: Layers, accent: "text-primary" },
      { label: "Active", value: attrs.filter((a) => a.status === "active").length, icon: CheckCircle2, accent: "text-success" },
      { label: "Pending approval", value: attrs.filter((a) => a.status === "pending" || a.status === "proposed").length, icon: Clock, accent: "text-warning" },
      { label: "Deprecated", value: attrs.filter((a) => a.status === "deprecated").length, icon: AlertTriangle, accent: "text-muted-foreground" },
    ] as const;
  }, [filteredAttrs]);

  const kpis = view === "dictionary" ? dictKpis : etKpis;
  const showLoading = (snap.isLoading || entityTypesQuery.isLoading) && !snapshot;
  const isError = snap.isError && entityTypesQuery.isError;

  const newDraft = useMemo(
    () => emptyAttribute({ targetTable: "entity_master", appliesTo: [], status: "pending" }),
    [addOpen],
  );

  const groupedRows = useMemo(() => {
    const rows: { type: "header"; kind: EntityKind } | { type: "row"; et: (typeof etSlice)[0] }[] = [];
    let last: EntityKind | null = null;
    const ordered = [...etSlice].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    for (const et of ordered) {
      if (et.kind !== last) {
        rows.push({ type: "header", kind: et.kind });
        last = et.kind;
      }
      rows.push({ type: "row", et });
    }
    return rows;
  }, [etSlice]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 animate-fade-in pb-4 sm:pb-6">
        <PageBreadcrumb
          segments={[
            { label: "Data Governance", href: "/data-governance/dashboard" },
            { label: "Master Schema Management" },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h2 font-semibold text-foreground">Master Schema Management</h1>
              <Badge variant="secondary" className="text-[10px]">
                Dictionary {snapshot?.dictionaryVersion ?? "v13"}
              </Badge>
            </div>
            <p className="mt-1 text-caption text-muted-foreground">
              Central registry of entity types and the canonical attribute dictionary.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" className="gap-1.5" onClick={() => setDomainsOpen(true)}>
              Domains
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={!canMutate}
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add attribute
            </Button>
            <Button
              className="gap-1.5"
              disabled={!canMutate}
              onClick={() => navigate("/data-governance/master-schema/new")}
            >
              <Plus className="h-3.5 w-3.5" />
              Register entity type
            </Button>
          </div>
        </div>

        {!canMutate && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
            <Info className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
            <p className="text-caption text-foreground">
              You have read-only access. Mutations are disabled for your role ({user?.roles.join(", ") || "no role"}).
            </p>
          </div>
        )}

        <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v)} className="justify-start">
          <ToggleGroupItem value="entity-types">Entity types</ToggleGroupItem>
          <ToggleGroupItem value="dictionary">Attribute dictionary</ToggleGroupItem>
        </ToggleGroup>

        {showLoading && <SkeletonKpiCards count={4} />}
        {isError && <ApiErrorCard error={snap.error} onRetry={() => { void snap.refetch(); void entityTypesQuery.refetch(); }} />}
        {!showLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border-border shadow-sm">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted", kpi.accent)}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-h3 font-bold tabular-nums text-foreground">{kpi.value}</p>
                    {"tip" in kpi && kpi.tip ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-caption text-muted-foreground cursor-help underline decoration-dotted">{kpi.label}</p>
                        </TooltipTrigger>
                        <TooltipContent>{kpi.tip}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <p className="text-caption text-muted-foreground">{kpi.label}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {view === "entity-types" && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search entity type…"
                  value={etSearch}
                  onChange={(e) => {
                    setEtSearch(e.target.value);
                    setEtPage(0);
                  }}
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Select value={etKind} onValueChange={(v) => { setEtKind(v as EntityKind | "all"); setEtPage(0); }}>
                  <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Kind" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All kinds</SelectItem>
                    {KIND_ORDER.map((k) => (
                      <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={etTable} onValueChange={(v) => { setEtTable(v); setEtPage(0); }}>
                  <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Table" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All tables</SelectItem>
                    {(enums?.targetTable ?? []).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showLoading ? (
              <SkeletonTable rows={6} cols={6} />
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn(tableHeaderClasses, "min-w-[220px]")}>Entity type</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[140px]")}>Target table</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center")}>Attributes</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[80px] text-center")}>Groups</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center hidden md:table-cell")}>Last updated</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center")}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-body text-muted-foreground">
                          No entity types match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedRows.map((row, i) =>
                        row.type === "header" ? (
                          <TableRow key={`h-${row.kind}-${i}`} className="hover:bg-transparent bg-muted/40">
                            <TableCell colSpan={6} className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
                              {KIND_LABELS[row.kind]}
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={row.et.entityType} className="group">
                            <TableCell>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="text-body font-medium text-foreground truncate">{row.et.displayName}</p>
                                  <Badge variant="secondary" className="text-[9px] leading-[12px]">{KIND_BADGE_LABELS[row.et.kind]}</Badge>
                                  {row.et.legacy && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-warning/15 text-warning text-[9px] leading-[12px] font-medium border-0">Legacy</Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>{row.et.note}</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <p className="text-[9px] leading-[12px] text-muted-foreground">code: {row.et.entityType}</p>
                                {row.et.kind === "subject" && row.et.subjectClass && (
                                  <p className="text-[9px] leading-[12px] text-muted-foreground">{row.et.subjectClass}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-caption text-foreground">{row.et.targetTable}</TableCell>
                            <TableCell className="text-center text-caption text-foreground">
                              {row.et.attributeCount - (row.et.pendingCount ?? 0) >= 0
                                ? `${Math.max(0, (snapshot?.attributes.filter((a) => (a.appliesTo.includes(row.et.entityType) || (a.class === "Reserved" && a.appliesTo.includes("all rows"))) && a.status === "active").length) ?? 0)} active · ${snapshot?.attributes.filter((a) => (a.appliesTo.includes(row.et.entityType) || (a.class === "Reserved" && a.appliesTo.includes("all rows"))) && (a.status === "pending" || a.status === "proposed")).length ?? row.et.pendingCount} pending`
                                : `${row.et.attributeCount} · ${row.et.pendingCount} pending`}
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-body tabular-nums cursor-help">{row.et.groups.length}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">{row.et.groups.join(", ") || "—"}</TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-center text-caption text-muted-foreground hidden md:table-cell tabular-nums">
                              {formatDateEnIn(row.et.lastUpdated)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/data-governance/master-schema/${encodeURIComponent(row.et.entityType)}`)}>
                                  View
                                </Button>
                                <Button variant="ghost" size="sm" disabled={!canMutate} onClick={() => navigate(`/data-governance/master-schema/${encodeURIComponent(row.et.entityType)}/edit`)}>
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ),
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {!showLoading && etTotalPages > 1 && (
              <Pager page={etPage} totalPages={etTotalPages} total={filteredTypes.length} onPage={setEtPage} />
            )}
          </>
        )}

        {view === "dictionary" && (
          <>
            <div className="flex flex-col gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search id, qualifier, definition, synonyms…"
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="h-9 pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={filters.status} onValueChange={(v) => updateFilters({ status: v as AttrStatus | "all" })}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {(enums?.status ?? ["proposed", "pending", "active", "deprecated", "rejected"]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s as AttrStatus]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.table === "all" ? "__all" : filters.table}
                  onValueChange={(v) => updateFilters({ table: (v === "__all" ? "all" : v) as TargetTable | "all" })}
                >
                  <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Table" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All tables</SelectItem>
                    {(enums?.targetTable ?? []).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.className} onValueChange={(v) => updateFilters({ className: v as ClassName | "all" })}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {(enums?.class ?? []).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.sensitivity} onValueChange={(v) => updateFilters({ sensitivity: v as Sensitivity | "all" })}>
                  <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Sensitivity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sensitivity</SelectItem>
                    {(enums?.sensitivity ?? []).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.group} onValueChange={(v) => updateFilters({ group: v })}>
                  <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    <SelectItem value="__ungrouped">Ungrouped</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.group} value={g.group}>{g.group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canMutate && selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="h-8" onClick={() => {
                    bulkApprove.mutate(Array.from(selectedIds), {
                      onSuccess: (res) => setBulkResult(res),
                    });
                  }}>
                    Approve selected
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => { setSuccessorId(undefined); setSuccessorOpen(true); }}>
                    Deprecate selected
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setCommentAction("reject")}>
                    Reject selected
                  </Button>
                </div>
              )}
            </div>

            {showLoading ? (
              <SkeletonTable rows={8} cols={9} />
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {canMutate && <TableHead className={cn(tableHeaderClasses, "w-8")} />}
                      <TableHead className={cn(tableHeaderClasses, "min-w-[180px]")}>Attribute id</TableHead>
                      <TableHead className={cn(tableHeaderClasses)}>Qualifier</TableHead>
                      <TableHead className={cn(tableHeaderClasses)}>Class</TableHead>
                      <TableHead className={cn(tableHeaderClasses)}>Table</TableHead>
                      <TableHead className={cn(tableHeaderClasses)}>Applies to</TableHead>
                      <TableHead className={cn(tableHeaderClasses)}>Group</TableHead>
                      <TableHead className={cn(tableHeaderClasses)}>Sensitivity</TableHead>
                      <TableHead className={cn(tableHeaderClasses)}>Status</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "hidden md:table-cell")}>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dictSlice.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canMutate ? 10 : 9} className="h-32 text-center text-body text-muted-foreground">
                          No attributes match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      dictSlice.map((a) => (
                        <TableRow
                          key={a.attributeId}
                          className="cursor-pointer"
                          onClick={() => navigate(firstAppliesToHref(a, entityTypes))}
                        >
                          {canMutate && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(a.attributeId)}
                                onCheckedChange={(c) => {
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    if (c) next.add(a.attributeId);
                                    else next.delete(a.attributeId);
                                    return next;
                                  });
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-mono text-caption text-foreground">{a.attributeId}</TableCell>
                          <TableCell className="font-mono text-caption">{a.canonicalQualifier}</TableCell>
                          <TableCell className="text-caption">{a.class}</TableCell>
                          <TableCell className="font-mono text-caption">{a.targetTable}</TableCell>
                          <TableCell><ChipOverflow values={a.appliesTo} max={1} /></TableCell>
                          <TableCell className="text-caption">{a.attributeGroup ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", SENSITIVITY_STYLES[a.sensitivity])}>{a.sensitivity}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <Badge className={cn("text-[9px] leading-[12px] font-medium border-0 w-fit", STATUS_STYLES[a.status])}>{STATUS_LABELS[a.status]}</Badge>
                              {a.status === "deprecated" && a.supersededBy && (
                                <button
                                  type="button"
                                  className="text-[10px] text-primary hover:underline text-left font-mono"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const successor = allAttrs.find((x) => x.attributeId === a.supersededBy);
                                    if (successor) navigate(firstAppliesToHref(successor, entityTypes));
                                  }}
                                >
                                  Superseded by {a.supersededBy}
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-caption text-muted-foreground hidden md:table-cell">{formatDateEnIn(a.updatedAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            {!showLoading && dictTotalPages > 1 && (
              <Pager page={dictPage} totalPages={dictTotalPages} total={dictTotal} onPage={setDictPage} />
            )}
          </>
        )}
      </div>

      <DomainsDrawer
        open={domainsOpen}
        onOpenChange={setDomainsOpen}
        domains={domains}
        attributes={allAttrs}
        canMutate={canMutate}
        onOpenAttribute={(id) => {
          const a = allAttrs.find((x) => x.attributeId === id);
          if (a) navigate(firstAppliesToHref(a, entityTypes));
        }}
      />

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="p-4">
            <SheetTitle>Add attribute</SheetTitle>
          </SheetHeader>
          {snapshot && addOpen && (
            <div className="px-4 pb-6">
              <AttributeProfileEditor
                attribute={newDraft}
                isNew
                allAttributes={allAttrs}
                entityTypes={entityTypes}
                groups={groups}
                domains={domains}
                enums={snapshot.enums}
                retentionPolicy={snapshot.retentionPolicy}
                readOnly={false}
                canMutate={canMutate}
                isSuperAdmin={isSuperAdmin}
                snapshotAttributes={allAttrs}
                onSaveProfile={(attr) => {
                  if (attr.attributeGroup && !groups.some((g) => g.group === attr.attributeGroup)) {
                    addAttributeGroup(attr.attributeGroup);
                  }
                  saveProfile.mutate([attr], { onSuccess: () => setAddOpen(false) });
                }}
                onRequestRevision={() => undefined}
                onRequestDeprecate={() => undefined}
                onOpenDomain={() => {
                  setAddOpen(false);
                  setDomainsOpen(true);
                }}
                onOpenAttribute={(id) => {
                  const a = allAttrs.find((x) => x.attributeId === id);
                  if (a) {
                    setAddOpen(false);
                    navigate(firstAppliesToHref(a, entityTypes));
                  }
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!bulkResult} onOpenChange={(o) => !o && setBulkResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk approve result</DialogTitle>
            <DialogDescription>
              {bulkResult?.passed.length ?? 0} passed, {bulkResult?.failed.length ?? 0} failed.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-60 overflow-auto text-caption space-y-1">
            {bulkResult?.passed.map((id) => (
              <li key={id} className="text-success font-mono">{id} — approved</li>
            ))}
            {bulkResult?.failed.map((f) => (
              <li key={f.attributeId} className="text-destructive font-mono">{f.attributeId} — {f.reasons.join("; ")}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => setBulkResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChangeCommentDialog
        open={commentAction === "reject"}
        onOpenChange={(o) => !o && setCommentAction(null)}
        title="Reject selected"
        variant="destructive"
        onConfirm={(comment) => {
          bulkReject.mutate({ ids: Array.from(selectedIds), comment });
          setCommentAction(null);
        }}
      />
      <ChangeCommentDialog
        open={commentAction === "deprecate"}
        onOpenChange={(o) => !o && setCommentAction(null)}
        title="Deprecate selected"
        onConfirm={(comment) => {
          bulkDeprecate.mutate({ ids: Array.from(selectedIds), comment, successorId });
          setCommentAction(null);
        }}
      />
      <AttributePickerDialog
        open={successorOpen}
        onOpenChange={(o) => {
          setSuccessorOpen(o);
          if (!o) setCommentAction("deprecate");
        }}
        title="Optional successor"
        attributes={allAttrs}
        onConfirm={(id) => {
          setSuccessorId(id);
          setCommentAction("deprecate");
        }}
      />
    </TooltipProvider>
  );
}

function Pager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (n: number) => void;
}) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPage(Math.max(0, page - 1));
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
              onPage(Math.min(totalPages - 1, page + 1));
            }}
            aria-disabled={page >= totalPages - 1}
            className={cn(page >= totalPages - 1 && "pointer-events-none opacity-50")}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default MasterSchemaRegistryPage;
