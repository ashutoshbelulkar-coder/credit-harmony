/**
 * Data Management screen.
 *
 * Subject-centric workspace for the Data Governance layer. Lets users:
 *  - Look up subjects by ID via a search button
 *  - View subject attributes + linked data sources
 *  - Edit / create / delete subjects (with mandatory change comment)
 *  - Link / unlink data sources (with confirmation + audit log)
 *  - Review the audit history per subject
 *
 * Search and detail cards are stacked vertically. The subject list only
 * appears after a search has been executed via the search button.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  History,
  Info,
  Link2,
  Pencil,
  PlusCircle,
  Save,
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  type SubjectStatus,
} from "@/types/data-management";
import { SubjectForm, type SubjectFormValues } from "@/components/data-governance/data-management/SubjectForm";
import { ChangeCommentDialog } from "@/components/data-governance/data-management/ChangeCommentDialog";
import { LinkSourceDialog } from "@/components/data-governance/data-management/LinkSourceDialog";
import { LinkedSourcesTable } from "@/components/data-governance/data-management/LinkedSourcesTable";
import { SubjectAuditTab } from "@/components/data-governance/data-management/SubjectAuditTab";

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

const SOURCE_FILTERS_STORAGE_KEY = "hcb_dm_source_filters_v1";

const STATUS_TONE: Record<SubjectStatus, string> = {
  ACTIVE: "bg-success/10 text-success border-success/20",
  INACTIVE: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-warning/10 text-warning border-warning/20",
};

/**
 * Rich sample data attributes for HCB data sources, keyed by sourceId.
 */
const HCB_SOURCE_ATTRIBUTES: Record<string, { label: string; value: string; editable?: boolean }[]> = {
  "S-001": [
    { label: "masked_account_number", value: "XXXXXX445566", editable: true },
    { label: "currency", value: "INR", editable: false },
    { label: "account_subtype", value: "Savings", editable: true },
    { label: "holder_name", value: "Alice Smith", editable: true },
    { label: "drawing_limit", value: "50,000.00 INR", editable: true },
    { label: "nominee_name", value: "Bob Smith", editable: true },
    { label: "as_of_date", value: "2026-05-01", editable: false },
    { label: "status", value: "ACTIVE", editable: false },
  ],
  "S-002": [
    { label: "document_type", value: "Aadhaar", editable: false },
    { label: "national_id_no", value: "XXXX-XXXX-4321", editable: false },
    { label: "issue_date", value: "2015-06-10", editable: false },
    { label: "issuing_authority", value: "UIDAI", editable: false },
    { label: "address", value: "12 MG Road, Bangalore 560001", editable: false },
    { label: "full_name", value: "Alice Smith", editable: false },
    { label: "date_of_birth", value: "1985-07-12", editable: false },
    { label: "is_valid", value: "true", editable: false },
  ],
  "S-003": [
    { label: "MSISDN", value: "+91-9876543210", editable: true },
    { label: "Plan", value: "Postpaid", editable: true },
    { label: "Operator", value: "Reliance Jio", editable: false },
    { label: "Circle", value: "Karnataka", editable: false },
    { label: "SIM Type", value: "4G LTE", editable: false },
    { label: "Activation Date", value: "2020-01-15", editable: false },
    { label: "Monthly Bill", value: "599 INR", editable: true },
    { label: "Data Usage (Avg)", value: "32 GB/month", editable: false },
    { label: "Outstanding Balance", value: "0.00 INR", editable: false },
    { label: "Auto-Pay", value: "Enabled", editable: true },
    { label: "Contract End", value: "2027-01-14", editable: false },
  ],
  "S-004": [
    { label: "contract_status", value: "ACTIVE", editable: false },
    { label: "credit_limit", value: "5,00,000 INR", editable: true },
    { label: "outstanding_balance", value: "1,14,800 INR", editable: false },
    { label: "monthly_payment_amount", value: "5,740 INR", editable: false },
    { label: "overdue_days", value: "0", editable: false },
    { label: "currency", value: "INR", editable: false },
    { label: "holder_name", value: "Priya Iyer", editable: true },
    { label: "masked_account_number", value: "XXXX4421", editable: false },
    { label: "contract_start_date", value: "2022-08-01", editable: false },
  ],
  "S-005": [
    { label: "Check Type", value: "Full KYC", editable: false },
    { label: "Result", value: "Verified", editable: false },
    { label: "Verification Date", value: "2026-04-12", editable: false },
    { label: "PAN Verified", value: "Yes", editable: false },
    { label: "Aadhaar Verified", value: "Yes", editable: false },
    { label: "Face Match Score", value: "96.7%", editable: false },
    { label: "Liveness Check", value: "Passed", editable: false },
    { label: "Address Verified", value: "Yes", editable: false },
    { label: "Risk Score", value: "Low (12/100)", editable: false },
    { label: "AML Screening", value: "Clear", editable: false },
    { label: "PEP Check", value: "Not PEP", editable: false },
    { label: "Sanctions Check", value: "Clear", editable: false },
    { label: "Provider", value: "HyperVerge", editable: false },
    { label: "Reference ID", value: "HV-2026-0412-7789", editable: false },
  ],
  "S-006": [
    { label: "Account ID", value: "001ABCDEF", editable: false },
    { label: "Segment", value: "Retail", editable: true },
    { label: "Lead Source", value: "Website", editable: true },
    { label: "Customer Since", value: "2023-05-20", editable: false },
    { label: "Lifetime Value", value: "2,45,000 INR", editable: false },
    { label: "Last Interaction", value: "2026-04-18", editable: false },
    { label: "Assigned Rep", value: "Rahul Mehta", editable: true },
    { label: "Open Tickets", value: "0", editable: false },
    { label: "NPS Score", value: "9", editable: false },
    { label: "Communication Pref", value: "Email + WhatsApp", editable: true },
    { label: "Product Interest", value: "Home Loan, Insurance", editable: true },
  ],
  "S-007": [
    { label: "masked_account_number", value: "XXXXXX6655", editable: true },
    { label: "currency", value: "INR", editable: false },
    { label: "account_subtype", value: "Savings", editable: true },
    { label: "holder_name", value: "Bob Kumar", editable: true },
    { label: "as_of_date", value: "2026-03-29", editable: false },
    { label: "status", value: "INACTIVE", editable: false },
    { label: "nominee_name", value: "None", editable: true },
  ],
  "S-008": [
    { label: "enquiry_amount", value: "250,000 INR", editable: false },
    { label: "enquiry_purpose", value: "PERSONAL_LOAN", editable: false },
    { label: "enquiry_member_id", value: "MEM-HDFC-001", editable: false },
    { label: "status", value: "COMPLETED", editable: false },
  ],
  "S-009": [
    { label: "event_code", value: "SUIT_FILED", editable: false },
    { label: "event_date", value: "2026-04-12", editable: false },
    { label: "event_status", value: "OPEN", editable: false },
    { label: "event_detail", value: "Recovery suit — card facility XXXX4421", editable: false },
  ],
  "S-010": [
    { label: "order_id", value: "ORD-4417-8821", editable: false },
    { label: "trade_rate", value: "187.45", editable: false },
    { label: "transaction_id", value: "TXN-INV-99012", editable: false },
    { label: "status", value: "SETTLED", editable: false },
  ],
  "S-011": [
    { label: "document_type", value: "Electricity bill", editable: false },
    { label: "valid_from", value: "2026-03-01", editable: false },
    { label: "valid_to", value: "2026-03-31", editable: false },
    { label: "address", value: "12 MG Road, Bangalore 560001", editable: false },
    { label: "issuing_authority", value: "BESCOM", editable: false },
  ],
};

function getSourceAttributes(source: DataSource): { label: string; value: string; editable?: boolean }[] {
  const hardcoded = HCB_SOURCE_ATTRIBUTES[source.sourceId];
  if (hardcoded) return hardcoded;
  return Object.entries(source.details).map(([key, value]) => ({
    label: key,
    value,
    editable: false,
  }));
}

export default function DataManagement() {
  const { user } = useAuth();
  const canMutate = useCanManageData();

  const [searchInput, setSearchInput] = useState("");
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");

  const [sourceFilters, setSourceFilters] = useState<SourceFiltersState>(() => {
    if (typeof window === "undefined") return DEFAULT_SOURCE_FILTERS;
    try {
      const raw = window.sessionStorage.getItem(SOURCE_FILTERS_STORAGE_KEY);
      if (!raw) return DEFAULT_SOURCE_FILTERS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SOURCE_FILTERS, ...parsed };
    } catch {
      return DEFAULT_SOURCE_FILTERS;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(SOURCE_FILTERS_STORAGE_KEY, JSON.stringify(sourceFilters));
    } catch { /* ignore */ }
  }, [sourceFilters]);

  const subjectsQuery = useSubjects(
    {
      query: activeQuery,
      status: "ALL",
      sortKey: "updatedAt",
      sortDirection: "desc",
    },
    { enabled: searchExecuted }
  );

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
  const [viewSourceEdits, setViewSourceEdits] = useState<Record<string, string>>({});
  const [viewSourceEditMode, setViewSourceEditMode] = useState(false);

  useEffect(() => {
    setEditMode(false);
    setStagedEdit(null);
    setActiveTab("details");
  }, [selectedSubjectId]);

  const handleSearch = useCallback(() => {
    if (!searchInput.trim()) return;
    setActiveQuery(searchInput.trim());
    setSearchExecuted(true);
    setSelectedSubjectId(null);
  }, [searchInput]);

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
    if (!searchInput.trim()) return null;
    if (!isValidSubjectId(searchInput.trim())) {
      return "Subject IDs must be 4–32 alphanumerics or a UUID.";
    }
    return null;
  }, [searchInput]);

  const showLookupNotFound =
    searchExecuted &&
    !subjectsQuery.isLoading &&
    activeQuery.length > 0 &&
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

      {/* Vertically stacked: search on top, detail below */}
      <div className="space-y-4">
        <SubjectSearchPanel
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={handleSearch}
          searchExecuted={searchExecuted}
          lookupErrorMessage={lookupErrorMessage}
          showLookupNotFound={showLookupNotFound}
          subjects={subjectsQuery.data ?? []}
          isLoading={searchExecuted && subjectsQuery.isLoading}
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
          activeQuery={activeQuery}
        />

        <section className="min-w-0">
          {showCreateForm ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
                <div>
                  <CardTitle className="text-body font-semibold">Create new subject</CardTitle>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Fields marked with <span className="text-destructive">*</span> are required.
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)} aria-label="Close create form">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <SubjectForm
                  mode="create"
                  busy={createMutation.isPending}
                  externalErrors={fieldErrorsFromMutation(createMutation.error)}
                  onCancel={() => setShowCreateForm(false)}
                  onSubmit={(values) => setStagedEdit(values)}
                />
                <ChangeCommentDialog
                  open={stagedEdit !== null && showCreateForm}
                  onOpenChange={(open) => { if (!open) setStagedEdit(null); }}
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
                  title={searchExecuted ? "Select a subject" : "Search for a subject"}
                  description={
                    searchExecuted
                      ? "Pick a subject from the search results above to view their attributes, linked data sources and audit history."
                      : "Enter a Subject ID above and click Search to find subjects."
                  }
                  actionLabel={canMutate ? "Create new subject" : undefined}
                  onAction={canMutate ? () => setShowCreateForm(true) : undefined}
                />
              </CardContent>
            </Card>
          ) : subjectQuery.isLoading ? (
            <Card>
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-5 w-1/2" />
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
              onViewSource={(source) => {
                setViewSource(source);
                setViewSourceEdits({});
                setViewSourceEditMode(false);
              }}
              sourceFilters={sourceFilters}
              onSourceFiltersChange={setSourceFilters}
              onEditSubmit={(values) => setStagedEdit(values)}
              updateBusy={updateMutation.isPending}
              updateErrors={fieldErrorsFromMutation(updateMutation.error)}
            />
          )}
        </section>
      </div>

      <ChangeCommentDialog
        open={stagedEdit !== null && Boolean(selectedSubjectId) && !showCreateForm}
        onOpenChange={(open) => { if (!open) setStagedEdit(null); }}
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

      {selectedSubjectId && (
        <LinkSourceDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          subjectId={selectedSubjectId}
          busy={linkMutation.isPending}
          onConfirm={(sourceIds, comment) => {
            linkMutation.mutate(
              { sourceIds, comment },
              { onSuccess: () => { setLinkDialogOpen(false); setActiveTab("sources"); } }
            );
          }}
        />
      )}

      <ChangeCommentDialog
        open={Boolean(unlinkTarget)}
        onOpenChange={(open) => { if (!open) setUnlinkTarget(null); }}
        title={`Unlink "${unlinkTarget?.name ?? "source"}"?`}
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
            { onSuccess: () => setUnlinkTarget(null) }
          );
        }}
      />

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
            onSuccess: () => { setDeleteConfirmOpen(false); setSelectedSubjectId(null); },
          });
        }}
      />

      <ViewSourceDialog
        source={viewSource}
        onClose={() => { setViewSource(null); setViewSourceEditMode(false); }}
        edits={viewSourceEdits}
        onEditsChange={setViewSourceEdits}
        editMode={viewSourceEditMode}
        setEditMode={setViewSourceEditMode}
        canMutate={canMutate}
      />
    </div>
  );
}

// ─── Subject search panel (replaces old side-by-side SubjectListPanel) ───────

interface SubjectSearchPanelProps {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearch: () => void;
  searchExecuted: boolean;
  lookupErrorMessage: string | null;
  showLookupNotFound: boolean;
  subjects: { subjectId: string; firstName: string; lastName: string; email: string; status: SubjectStatus; linkedSourceCount: number; updatedAt: string }[];
  isLoading: boolean;
  selectedSubjectId: string | null;
  onSelect: (subjectId: string) => void;
  canMutate: boolean;
  onCreateNew: () => void;
  activeQuery: string;
}

function SubjectSearchPanel({
  searchInput,
  onSearchInputChange,
  onSearch,
  searchExecuted,
  lookupErrorMessage,
  showLookupNotFound,
  subjects,
  isLoading,
  selectedSubjectId,
  onSelect,
  canMutate,
  onCreateNew,
  activeQuery,
}: SubjectSearchPanelProps) {
  return (
    <Card>
      <CardHeader className="px-4 py-3 space-y-2">
        <CardTitle className="text-body font-semibold">Subject Search</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="subject-search"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
              placeholder="Enter Subject ID"
              className="pl-8 h-9 text-caption"
              aria-invalid={lookupErrorMessage ? true : undefined}
              aria-describedby={lookupErrorMessage ? "subject-search-error" : undefined}
            />
          </div>
          <Button
            size="sm"
            className="h-9"
            onClick={onSearch}
            disabled={!searchInput.trim() || !!lookupErrorMessage}
          >
            <Search className="mr-1.5 h-3.5 w-3.5" /> Search
          </Button>
        </div>
        {lookupErrorMessage && (
          <p id="subject-search-error" className="text-caption text-destructive">
            {lookupErrorMessage}
          </p>
        )}
      </CardHeader>

      {/* Results: only shown after search is executed */}
      {searchExecuted && (
        <CardContent className="p-0 border-t border-border">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : showLookupNotFound ? (
            <div className="space-y-3 p-4 text-center">
              <p className="text-caption text-muted-foreground">
                No subject found for{" "}
                <span className="font-mono text-foreground">{activeQuery}</span>.
              </p>
              <Button size="sm" variant="outline" disabled={!canMutate} onClick={onCreateNew}>
                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                Create new subject
              </Button>
              {!canMutate && (
                <p className="text-caption text-muted-foreground">
                  You don't have permission to create subjects.
                </p>
              )}
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No subjects match"
                description="Try a different Subject ID."
              />
            </div>
          ) : (
            <ScrollArea className="max-h-[320px]">
              <ul className="space-y-1 p-2">
                {subjects.map((subj) => {
                  const isActive = subj.subjectId === selectedSubjectId;
                  return (
                    <li key={subj.subjectId}>
                      <button
                        type="button"
                        onClick={() => onSelect(subj.subjectId)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-muted"
                        )}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-caption font-medium text-foreground">
                            {subj.firstName} {subj.lastName}
                          </span>
                          <Badge variant="outline" className={cn(badgeTextClasses, STATUS_TONE[subj.status])}>
                            {subj.status}
                          </Badge>
                        </div>
                        <p className="text-caption text-muted-foreground">{subj.email}</p>
                        <p className="text-caption text-muted-foreground">
                          {subj.linkedSourceCount} source{subj.linkedSourceCount === 1 ? "" : "s"}
                          {" · updated "}
                          {new Date(subj.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
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
  const blockingErrors = useMemo(
    () => validateSubjectFields(subject),
    [subject]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-body font-semibold truncate">
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
        {/* Only Delete remains in the header; Edit and Link moved into tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSubject}
            disabled={!canMutate}
            aria-label="Delete subject"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "details" | "sources" | "audit")}>
          <TabsList className="mb-3 flex w-full flex-wrap gap-1 bg-muted/60 p-1">
            <TabsTrigger value="details" className={detailPageTabTriggerBaseClasses}>
              Subject info
            </TabsTrigger>
            <TabsTrigger value="sources" className={detailPageTabTriggerBaseClasses}>
              Linked sources
              <Badge variant="secondary" className={cn("ml-1.5", badgeTextClasses)}>
                {linkedSources.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="audit" className={detailPageTabTriggerBaseClasses}>
              <History className="mr-1 h-3 w-3" />
              Audit history
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3">
            {/* Edit button inside Subject info tab */}
            <div className="flex justify-end">
              {!editMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  disabled={!canMutate}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Cancel edit
                </Button>
              )}
            </div>
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

          <TabsContent value="sources" className="space-y-3">
            {/* Link Data Source button inside Linked sources tab */}
            <div className="flex justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={onStartLink}
                disabled={!canMutate}
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5" /> Link Data Source
              </Button>
            </div>
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
    <div className="space-y-2">
      {hasIssues && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-caption text-foreground">
          Some fields are out of compliance: {Object.entries(blockingErrors).map(([k, v]) => `${k}: ${v}`).join("; ")}
        </div>
      )}
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
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
      <dt className="text-[10px] leading-[14px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-body font-medium text-foreground break-words",
          mono && "font-mono"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

// ─── View Source Dialog (expanded with all data attributes + edit) ────────────

interface ViewSourceDialogProps {
  source: DataSource | null;
  onClose: () => void;
  edits: Record<string, string>;
  onEditsChange: (next: Record<string, string>) => void;
  editMode: boolean;
  setEditMode: (next: boolean) => void;
  canMutate: boolean;
}

function ViewSourceDialog({
  source,
  onClose,
  edits,
  onEditsChange,
  editMode,
  setEditMode,
  canMutate,
}: ViewSourceDialogProps) {
  if (!source) return null;

  const attributes = getSourceAttributes(source);
  const editableCount = attributes.filter((a) => a.editable).length;

  function handleSave() {
    setEditMode(false);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-body font-semibold">{source.name}</DialogTitle>
          <DialogDescription className="text-caption">
            {source.sourceId} · {source.type} · {source.provider}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-caption">
              <span className="text-muted-foreground">Last updated</span>
              <span className="text-foreground">{new Date(source.lastUpdated).toLocaleString()}</span>
              <span className="text-muted-foreground">Status</span>
              <span className="text-foreground">{source.status}</span>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] leading-[14px] uppercase tracking-wider text-muted-foreground font-medium">
                  Data Attributes ({attributes.length})
                </p>
                {canMutate && editableCount > 0 && !editMode && (
                  <Button variant="outline" size="sm" className="h-7 text-caption" onClick={() => setEditMode(true)}>
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                )}
                {editMode && (
                  <Button variant="ghost" size="sm" className="h-7 text-caption" onClick={() => { setEditMode(false); onEditsChange({}); }}>
                    <X className="mr-1 h-3 w-3" /> Cancel
                  </Button>
                )}
              </div>
              <dl className="grid grid-cols-[1fr_1.5fr] gap-x-3 gap-y-1.5 text-caption">
                {attributes.map((attr) => {
                  const isEditing = editMode && attr.editable;
                  const currentValue = edits[attr.label] ?? attr.value;
                  return (
                    <div key={attr.label} className="contents">
                      <dt className="text-muted-foreground flex items-center gap-1 py-0.5">
                        {attr.label}
                        {attr.editable && !editMode && (
                          <Pencil className="h-2.5 w-2.5 text-muted-foreground/50" />
                        )}
                      </dt>
                      <dd className="py-0.5">
                        {isEditing ? (
                          <Input
                            className="h-7 text-caption"
                            value={currentValue}
                            onChange={(e) =>
                              onEditsChange({ ...edits, [attr.label]: e.target.value })
                            }
                          />
                        ) : (
                          <span className="font-mono text-foreground">{currentValue}</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </ScrollArea>

        {editMode && (
          <DialogFooter className="mt-3">
            <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); onEditsChange({}); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save changes
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
