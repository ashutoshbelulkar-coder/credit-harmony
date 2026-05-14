/**
 * Data Management screen.
 *
 * Subject-centric workspace for the Data Governance layer. Lets users:
 *  - Look up / search subjects by ID, name or email
 *  - View subject attributes + linked data sources
 *  - Edit / create / delete subjects (with mandatory change comment)
 *  - Link / unlink data sources (with confirmation + audit log)
 *  - Review the audit history per subject
 *
 * The detail pane lives in-page (right-hand column on desktop) so users can
 * scan the subject list and jump between subjects without losing context.
 * Filters are persisted in `sessionStorage` so they survive navigation – per
 * the spec's "non-sticky filters are painful" requirement.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  History,
  Info,
  Link2,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { badgeTextClasses, detailPageTabTriggerBaseClasses } from "@/lib/typography";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCanManageData,
  useCreateSubject,
  useDeleteSubject,
  useLinkSources,
  useSubject,
  useSubjectAudit,
  useSubjects,
  useUnlinkSource,
  useUpdateSubject,
} from "@/hooks/api/useDataManagement";
import {
  isValidSubjectId,
  validateSubjectFields,
} from "@/services/dataManagement.service";
import {
  DataManagementValidationError,
  type DataSource,
  type DataSourceType,
  type SortDirection,
  type Subject,
  type SubjectListFilters,
  type SubjectStatus,
} from "@/types/data-management";

type SourceFiltersState = {
  query: string;
  type: DataSourceType | "ALL";
  sortKey: "lastUpdated" | "name" | "type";
  sortDirection: SortDirection;
};

const DEFAULT_SOURCE_FILTERS: SourceFiltersState = {
  query: "",
  type: "ALL",
  sortKey: "lastUpdated",
  sortDirection: "desc",
};

function fieldErrorsFromMutation(err: unknown): Record<string, string> | undefined {
  if (err instanceof DataManagementValidationError) return err.fieldErrors;
  return undefined;
}
import { SubjectForm, type SubjectFormValues } from "@/components/data-governance/data-management/SubjectForm";
import { ChangeCommentDialog } from "@/components/data-governance/data-management/ChangeCommentDialog";
import { LinkSourceDialog } from "@/components/data-governance/data-management/LinkSourceDialog";
import { LinkedSourcesTable } from "@/components/data-governance/data-management/LinkedSourcesTable";
import { SubjectAuditTab } from "@/components/data-governance/data-management/SubjectAuditTab";

const FILTERS_STORAGE_KEY = "hcb_dm_subject_filters_v1";
const SOURCE_FILTERS_STORAGE_KEY = "hcb_dm_source_filters_v1";

const DEFAULT_FILTERS: SubjectListFilters = {
  query: "",
  status: "ALL",
  sortKey: "updatedAt",
  sortDirection: "desc",
};

function loadFilters<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function saveFilters<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

const STATUS_TONE: Record<SubjectStatus, string> = {
  ACTIVE: "bg-success/10 text-success border-success/20",
  INACTIVE: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-warning/10 text-warning border-warning/20",
};

export default function DataManagement() {
  const { user } = useAuth();
  const canMutate = useCanManageData();

  const [filters, setFilters] = useState<SubjectListFilters>(() =>
    loadFilters(FILTERS_STORAGE_KEY, DEFAULT_FILTERS)
  );
  useEffect(() => {
    saveFilters(FILTERS_STORAGE_KEY, filters);
  }, [filters]);

  const [sourceFilters, setSourceFilters] = useState<SourceFiltersState>(() =>
    loadFilters(SOURCE_FILTERS_STORAGE_KEY, DEFAULT_SOURCE_FILTERS)
  );
  useEffect(() => {
    saveFilters(SOURCE_FILTERS_STORAGE_KEY, sourceFilters);
  }, [sourceFilters]);

  const subjectsQuery = useSubjects({
    query: filters.query,
    status: filters.status,
    sortKey: filters.sortKey,
    sortDirection: filters.sortDirection,
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "sources" | "audit">("details");

  const subjectQuery = useSubject(selectedSubjectId ?? undefined);
  const auditQuery = useSubjectAudit(selectedSubjectId ?? undefined);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [stagedEdit, setStagedEdit] = useState<SubjectFormValues | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<DataSource | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewSource, setViewSource] = useState<DataSource | null>(null);

  // Auto-pick first subject in the list when nothing is selected yet
  useEffect(() => {
    if (!selectedSubjectId && subjectsQuery.data && subjectsQuery.data.length > 0) {
      setSelectedSubjectId(subjectsQuery.data[0].subjectId);
    }
  }, [selectedSubjectId, subjectsQuery.data]);

  // Reset transient detail-pane state whenever the selected subject changes
  useEffect(() => {
    setEditMode(false);
    setStagedEdit(null);
    setActiveTab("details");
  }, [selectedSubjectId]);

  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject(selectedSubjectId ?? "");
  const deleteMutation = useDeleteSubject(selectedSubjectId ?? "");
  const linkMutation = useLinkSources(selectedSubjectId ?? "");
  const unlinkMutation = useUnlinkSource(selectedSubjectId ?? "");

  const subjectDetail = subjectQuery.data ?? null;
  const subject = subjectDetail?.subject ?? null;
  const linkedSources = subjectDetail?.linkedSources ?? [];
  const auditEntries = auditQuery.data ?? [];

  const lookupErrorMessage = useMemo(() => {
    if (!filters.query.trim()) return null;
    if (!isValidSubjectId(filters.query.trim())) {
      return "Subject IDs must be 4–32 alphanumerics or a UUID.";
    }
    return null;
  }, [filters.query]);

  const showLookupNotFound =
    !subjectsQuery.isLoading &&
    filters.query.trim().length > 0 &&
    (subjectsQuery.data?.length ?? 0) === 0 &&
    !lookupErrorMessage;

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Data Management</h1>
          <p className="mt-1 text-caption text-muted-foreground">
            Search a subject and manage their linked data sources, with audit-traced edits and link/unlink controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            disabled={
              filters.query === DEFAULT_FILTERS.query &&
              filters.status === DEFAULT_FILTERS.status &&
              filters.sortKey === DEFAULT_FILTERS.sortKey &&
              filters.sortDirection === DEFAULT_FILTERS.sortDirection
            }
          >
            Reset filters
          </Button>
          <Button
            type="button"
            disabled={!canMutate}
            onClick={() => {
              setSelectedSubjectId(null);
              setShowCreateForm(true);
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" /> New subject
          </Button>
        </div>
      </header>

      {!canMutate && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          <Info className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
          <p className="text-caption text-foreground">
            You have read-only access. Subject edit, link, unlink and delete actions are disabled for your role
            ({user?.roles.join(", ") || "no role"}).
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <SubjectListPanel
          filters={filters}
          onFiltersChange={setFilters}
          subjects={subjectsQuery.data ?? []}
          isLoading={subjectsQuery.isLoading}
          lookupErrorMessage={lookupErrorMessage}
          showLookupNotFound={showLookupNotFound}
          selectedSubjectId={selectedSubjectId}
          onSelect={(id) => {
            setShowCreateForm(false);
            setSelectedSubjectId(id);
          }}
          canMutate={canMutate}
          onCreateNew={() => {
            setSelectedSubjectId(null);
            setShowCreateForm(true);
          }}
        />

        <section className="min-w-0">
          {showCreateForm ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-h3">Create new subject</CardTitle>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Fields marked with <span className="text-destructive">*</span> are required.
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)} aria-label="Close create form">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <SubjectForm
                  mode="create"
                  busy={createMutation.isPending}
                  externalErrors={fieldErrorsFromMutation(createMutation.error)}
                  onCancel={() => setShowCreateForm(false)}
                  onSubmit={(values) => {
                    setStagedEdit(values);
                  }}
                />
                <ChangeCommentDialog
                  open={stagedEdit !== null && showCreateForm}
                  onOpenChange={(open) => {
                    if (!open) setStagedEdit(null);
                  }}
                  title="Comment required"
                  description="Add a comment describing why this subject is being created."
                  confirmLabel="Create subject"
                  busy={createMutation.isPending}
                  onConfirm={(comment) => {
                    if (!stagedEdit) return;
                    createMutation.mutate(
                      { ...stagedEdit, comment },
                      {
                        onSuccess: (created) => {
                          setShowCreateForm(false);
                          setStagedEdit(null);
                          setSelectedSubjectId(created.subjectId);
                        },
                      }
                    );
                  }}
                />
              </CardContent>
            </Card>
          ) : !selectedSubjectId ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Search}
                  title="Select a subject"
                  description="Pick a subject from the list to view their attributes, linked data sources and audit history."
                  actionLabel={canMutate ? "Create new subject" : undefined}
                  onAction={canMutate ? () => setShowCreateForm(true) : undefined}
                />
              </CardContent>
            </Card>
          ) : subjectQuery.isLoading ? (
            <Card>
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : !subject ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  title="Subject not found"
                  description="This subject may have been deleted in another session."
                  actionLabel="Back to list"
                  onAction={() => setSelectedSubjectId(null)}
                />
              </CardContent>
            </Card>
          ) : (
            <SubjectDetailPane
              subject={subject}
              linkedSources={linkedSources}
              auditEntries={auditEntries}
              auditLoading={auditQuery.isLoading}
              canMutate={canMutate}
              editMode={editMode}
              setEditMode={setEditMode}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onStartLink={() => setLinkDialogOpen(true)}
              onUnlinkSource={(source) => setUnlinkTarget(source)}
              onDeleteSubject={() => setDeleteConfirmOpen(true)}
              onViewSource={(source) => setViewSource(source)}
              sourceFilters={sourceFilters}
              onSourceFiltersChange={setSourceFilters}
              onEditSubmit={(values) => setStagedEdit(values)}
              updateBusy={updateMutation.isPending}
              updateErrors={fieldErrorsFromMutation(updateMutation.error)}
            />
          )}
        </section>
      </div>

      {/* Edit confirmation – ask for change comment */}
      <ChangeCommentDialog
        open={stagedEdit !== null && Boolean(selectedSubjectId) && !showCreateForm}
        onOpenChange={(open) => {
          if (!open) setStagedEdit(null);
        }}
        title="Comment required"
        description="Add a comment describing why this subject is being updated."
        confirmLabel="Save changes"
        busy={updateMutation.isPending}
        onConfirm={(comment) => {
          if (!stagedEdit || !subject) return;
          updateMutation.mutate(
            { ...stagedEdit, comment, expectedVersion: subject.version },
            {
              onSuccess: () => {
                setEditMode(false);
                setStagedEdit(null);
              },
            }
          );
        }}
      />

      {/* Link sources dialog */}
      {selectedSubjectId && (
        <LinkSourceDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          subjectId={selectedSubjectId}
          busy={linkMutation.isPending}
          onConfirm={(sourceIds, comment) => {
            linkMutation.mutate(
              { sourceIds, comment },
              {
                onSuccess: () => {
                  setLinkDialogOpen(false);
                  setActiveTab("sources");
                },
              }
            );
          }}
        />
      )}

      {/* Unlink confirmation */}
      <ChangeCommentDialog
        open={Boolean(unlinkTarget)}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
        title={`Unlink “${unlinkTarget?.name ?? "source"}”?`}
        description={
          unlinkTarget
            ? `Source ${unlinkTarget.sourceId} (${unlinkTarget.type}) will be disconnected from this subject. This action is logged.`
            : undefined
        }
        confirmLabel="Unlink"
        variant="destructive"
        busy={unlinkMutation.isPending}
        onConfirm={(comment) => {
          if (!unlinkTarget) return;
          unlinkMutation.mutate(
            { sourceId: unlinkTarget.sourceId, comment },
            {
              onSuccess: () => setUnlinkTarget(null),
            }
          );
        }}
      />

      {/* Delete subject confirmation */}
      <ChangeCommentDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this subject?"
        description={
          subject
            ? `Subject ${subject.firstName} ${subject.lastName} and all ${linkedSources.length} linked source association${linkedSources.length === 1 ? "" : "s"} will be removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete subject"
        variant="destructive"
        busy={deleteMutation.isPending}
        onConfirm={(comment) => {
          deleteMutation.mutate(comment, {
            onSuccess: () => {
              setDeleteConfirmOpen(false);
              setSelectedSubjectId(null);
            },
          });
        }}
      />

      {/* View source detail */}
      <Dialog open={!!viewSource} onOpenChange={(open) => !open && setViewSource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewSource?.name}</DialogTitle>
            <DialogDescription>
              {viewSource?.sourceId} · {viewSource?.type} · {viewSource?.provider}
            </DialogDescription>
          </DialogHeader>
          {viewSource && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-caption">
                <span className="text-muted-foreground">Last updated</span>
                <span className="text-foreground">{new Date(viewSource.lastUpdated).toLocaleString()}</span>
                <span className="text-muted-foreground">Status</span>
                <span className="text-foreground">{viewSource.status}</span>
              </div>
              {Object.keys(viewSource.details).length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-caption uppercase tracking-wider text-muted-foreground">
                    Source-specific metadata
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-caption">
                    {Object.entries(viewSource.details).map(([key, value]) => (
                      <div key={key} className="contents">
                        <dt className="text-muted-foreground">{key}</dt>
                        <dd className="font-mono text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Subject list panel ──────────────────────────────────────────────────────

interface SubjectListPanelProps {
  filters: SubjectListFilters;
  onFiltersChange: (next: SubjectListFilters) => void;
  subjects: { subjectId: string; firstName: string; lastName: string; email: string; status: SubjectStatus; linkedSourceCount: number; updatedAt: string }[];
  isLoading: boolean;
  lookupErrorMessage: string | null;
  showLookupNotFound: boolean;
  selectedSubjectId: string | null;
  onSelect: (subjectId: string) => void;
  canMutate: boolean;
  onCreateNew: () => void;
}

function SubjectListPanel({
  filters,
  onFiltersChange,
  subjects,
  isLoading,
  lookupErrorMessage,
  showLookupNotFound,
  selectedSubjectId,
  onSelect,
  canMutate,
  onCreateNew,
}: SubjectListPanelProps) {
  function toggleSort(key: SubjectListFilters["sortKey"]) {
    if (filters.sortKey === key) {
      onFiltersChange({
        ...filters,
        sortDirection: filters.sortDirection === "asc" ? "desc" : "asc",
      });
    } else {
      onFiltersChange({ ...filters, sortKey: key, sortDirection: "asc" });
    }
  }
  function sortIcon(key: SubjectListFilters["sortKey"]) {
    if (filters.sortKey !== key) return null;
    return filters.sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  }

  return (
    <aside aria-label="Subjects" className="lg:sticky lg:top-4 lg:self-start">
      <Card>
        <CardHeader className="space-y-3">
          <div>
            <Label htmlFor="subject-search" className="text-caption text-muted-foreground">
              Subject ID, name or email
            </Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="subject-search"
                value={filters.query}
                onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
                placeholder="Type to search"
                className="pl-8"
                aria-invalid={lookupErrorMessage ? true : undefined}
                aria-describedby={lookupErrorMessage ? "subject-search-error" : undefined}
              />
            </div>
            {lookupErrorMessage && (
              <p id="subject-search-error" className="mt-1 text-caption text-destructive">
                {lookupErrorMessage}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.status}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, status: v as SubjectStatus | "ALL" })
              }
            >
              <SelectTrigger className="h-9 flex-1 text-caption" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={filters.sortKey === "name" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-9 gap-1"
                    onClick={() => toggleSort("name")}
                  >
                    Name {sortIcon("name")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sort by name</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={filters.sortKey === "updatedAt" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-9 gap-1"
                    onClick={() => toggleSort("updatedAt")}
                  >
                    Recent {sortIcon("updatedAt")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sort by last update</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : showLookupNotFound ? (
            <div className="space-y-3 p-4 text-center">
              <p className="text-caption text-muted-foreground">
                Subject not found for{" "}
                <span className="font-mono text-foreground">{filters.query}</span>.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={!canMutate}
                onClick={onCreateNew}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create new subject
              </Button>
              {!canMutate && (
                <p className="text-caption text-muted-foreground">
                  You don’t have permission to create subjects.
                </p>
              )}
            </div>
          ) : subjects.length === 0 ? (
            <EmptyState
              title="No subjects match"
              description="Adjust the search or status filter."
              actionLabel="Reset filters"
              onAction={() => onFiltersChange(DEFAULT_FILTERS)}
            />
          ) : (
            <ScrollArea className="h-[460px]">
              <ul className="space-y-1 p-2">
                {subjects.map((subject) => {
                  const isActive = subject.subjectId === selectedSubjectId;
                  return (
                    <li key={subject.subjectId}>
                      <button
                        type="button"
                        onClick={() => onSelect(subject.subjectId)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-muted"
                        )}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-body font-medium text-foreground">
                            {subject.firstName} {subject.lastName}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(badgeTextClasses, STATUS_TONE[subject.status])}
                          >
                            {subject.status}
                          </Badge>
                        </div>
                        <p className="text-caption text-muted-foreground">{subject.email}</p>
                        <p className="text-caption text-muted-foreground">
                          {subject.linkedSourceCount} source{subject.linkedSourceCount === 1 ? "" : "s"}
                          {" · updated "}
                          {new Date(subject.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

// ─── Subject detail pane ─────────────────────────────────────────────────────

interface SubjectDetailPaneProps {
  subject: Subject;
  linkedSources: DataSource[];
  auditEntries: ReturnType<typeof useSubjectAudit>["data"] extends infer T
    ? Exclude<T, undefined>
    : never;
  auditLoading: boolean;
  canMutate: boolean;
  editMode: boolean;
  setEditMode: (next: boolean) => void;
  activeTab: "details" | "sources" | "audit";
  setActiveTab: (next: "details" | "sources" | "audit") => void;
  onStartLink: () => void;
  onUnlinkSource: (source: DataSource) => void;
  onDeleteSubject: () => void;
  onViewSource: (source: DataSource) => void;
  sourceFilters: Parameters<typeof LinkedSourcesTable>[0]["filters"];
  onSourceFiltersChange: Parameters<typeof LinkedSourcesTable>[0]["onFiltersChange"];
  onEditSubmit: (values: SubjectFormValues) => void;
  updateBusy: boolean;
  updateErrors?: Record<string, string>;
}

function SubjectDetailPane({
  subject,
  linkedSources,
  auditEntries,
  auditLoading,
  canMutate,
  editMode,
  setEditMode,
  activeTab,
  setActiveTab,
  onStartLink,
  onUnlinkSource,
  onDeleteSubject,
  onViewSource,
  sourceFilters,
  onSourceFiltersChange,
  onEditSubmit,
  updateBusy,
  updateErrors,
}: SubjectDetailPaneProps) {
  // Surface inline form errors before we even open the comment dialog.
  const blockingErrors = useMemo(
    () => validateSubjectFields(subject),
    [subject]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-h3 truncate">
            {subject.firstName} {subject.lastName}
          </CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn(badgeTextClasses, STATUS_TONE[subject.status])}>
              {subject.status}
            </Badge>
            <span className="text-caption text-muted-foreground">
              {subject.govIdType}: <span className="font-mono">{subject.govIdNumber}</span>
            </span>
            <span className="text-caption text-muted-foreground">
              v{subject.version}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
              disabled={!canMutate}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
              <X className="mr-2 h-4 w-4" /> Cancel edit
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={onStartLink}
            disabled={!canMutate}
          >
            <Link2 className="mr-2 h-4 w-4" /> Link Data Source
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSubject}
            disabled={!canMutate}
            aria-label="Delete subject"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "details" | "sources" | "audit")}>
          <TabsList className="mb-4 flex w-full flex-wrap gap-1 bg-muted/60 p-1">
            <TabsTrigger value="details" className={detailPageTabTriggerBaseClasses}>
              Subject info
            </TabsTrigger>
            <TabsTrigger value="sources" className={detailPageTabTriggerBaseClasses}>
              Linked sources
              <Badge variant="secondary" className={cn("ml-2", badgeTextClasses)}>
                {linkedSources.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="audit" className={detailPageTabTriggerBaseClasses}>
              <History className="mr-1 h-3 w-3" />
              Audit history
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {editMode ? (
              <SubjectForm
                mode="edit"
                subject={subject}
                busy={updateBusy}
                externalErrors={updateErrors}
                onCancel={() => setEditMode(false)}
                onSubmit={onEditSubmit}
              />
            ) : (
              <SubjectReadOnly subject={subject} blockingErrors={blockingErrors} />
            )}
          </TabsContent>

          <TabsContent value="sources">
            <LinkedSourcesTable
              sources={linkedSources}
              canMutate={canMutate}
              onView={onViewSource}
              onUnlink={onUnlinkSource}
              filters={sourceFilters}
              onFiltersChange={onSourceFiltersChange}
            />
          </TabsContent>

          <TabsContent value="audit">
            {auditLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <SubjectAuditTab entries={auditEntries ?? []} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SubjectReadOnly({
  subject,
  blockingErrors,
}: {
  subject: Subject;
  blockingErrors: Record<string, string>;
}) {
  const hasIssues = Object.keys(blockingErrors).length > 0;
  return (
    <div className="space-y-3">
      {hasIssues && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-caption text-foreground">
          Some fields are out of compliance: {Object.entries(blockingErrors).map(([k, v]) => `${k}: ${v}`).join("; ")}
        </div>
      )}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        <Detail label="Subject ID" value={subject.subjectId} mono />
        <Detail label="Status" value={subject.status} />
        <Detail label="First name" value={subject.firstName} />
        <Detail label="Last name" value={subject.lastName} />
        <Detail label="Date of birth" value={subject.dateOfBirth} />
        <Detail label="Government ID" value={`${subject.govIdType}: ${subject.govIdNumber}`} mono />
        <Detail label="Email" value={subject.email} />
        <Detail label="Phone" value={subject.phone || "—"} />
        <Detail label="Address" value={subject.address || "—"} className="md:col-span-2" />
        <Detail label="Created" value={`${new Date(subject.createdAt).toLocaleString()} by ${subject.createdBy}`} />
        <Detail label="Last updated" value={`${new Date(subject.updatedAt).toLocaleString()} by ${subject.updatedBy}`} />
      </dl>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-caption uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-body text-foreground break-words",
          mono && "font-mono"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
