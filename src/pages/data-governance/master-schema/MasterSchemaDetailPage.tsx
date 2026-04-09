import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, GitCompare, FileJson, ShieldCheck } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMasterSchemaDetail, useSubmitMasterSchemaApproval } from "@/hooks/api/useMasterSchemas";
import type { MasterSchemaDataType, MasterSchemaField, MasterSchemaStatus } from "@/types/master-schema";
import type { SourceType } from "@/types/schema-mapper";

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

const MASKING_LABELS = {
  none: "None",
  partial: "Partial",
  full: "Full",
} as const;

const DATA_TYPES: MasterSchemaDataType[] = [
  "string",
  "number",
  "integer",
  "decimal",
  "boolean",
  "date",
  "enum",
  "object",
  "array",
];

const SOURCE_LABELS: Record<SourceType, string> = {
  telecom: "Telecom",
  utility: "Utility",
  bank: "Bank",
  gst: "GST",
  custom: "Custom",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function normalizeFieldName(name: string) {
  return String(name ?? "").trim().toLowerCase();
}

function diffFields(oldFields: MasterSchemaField[], newFields: MasterSchemaField[]) {
  const oldMap = new Map(oldFields.map((f) => [f.name, f]));
  const newMap = new Map(newFields.map((f) => [f.name, f]));
  const diffs: { fieldName: string; changeType: "added" | "removed" | "modified"; oldValue: string | null; newValue: string | null }[] = [];

  for (const [name, nf] of newMap) {
    const of = oldMap.get(name);
    if (!of) {
      diffs.push({ fieldName: name, changeType: "added", oldValue: null, newValue: `${nf.dataType}` });
      continue;
    }
    const changed =
      of.dataType !== nf.dataType ||
      of.required !== nf.required ||
      of.masking !== nf.masking ||
      of.description !== nf.description;
    if (changed) {
      diffs.push({
        fieldName: name,
        changeType: "modified",
        oldValue: `${of.dataType}${of.required ? " (required)" : ""}`,
        newValue: `${nf.dataType}${nf.required ? " (required)" : ""}`,
      });
    }
  }
  for (const [name, of] of oldMap) {
    if (!newMap.has(name)) {
      diffs.push({ fieldName: name, changeType: "removed", oldValue: `${of.dataType}`, newValue: null });
    }
  }
  return diffs;
}

type FieldDialogState =
  | { open: false }
  | { open: true; mode: "add"; initial?: undefined }
  | { open: true; mode: "edit"; initial: MasterSchemaField; index: number };

export function MasterSchemaDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const schemaId = String(id ?? "");

  const { data: schema, isLoading, isError, error, refetch } = useMasterSchemaDetail(schemaId, { allowMockFallback: true });
  const submitApproval = useSubmitMasterSchemaApproval();

  const [tab, setTab] = useState("overview");

  const [fieldDialog, setFieldDialog] = useState<FieldDialogState>({ open: false });
  const [fieldDraft, setFieldDraft] = useState<MasterSchemaField>({
    name: "",
    dataType: "string",
    required: false,
    masking: "none",
    description: "",
  });
  const [pendingDelete, setPendingDelete] = useState<{ index: number; field: MasterSchemaField } | null>(null);
  const [pendingTypeChange, setPendingTypeChange] = useState<{ next: MasterSchemaField; index: number } | null>(null);

  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");

  const versions = schema?.versions ?? [];
  const [compareLeft, setCompareLeft] = useState<string>(versions[1]?.id ?? versions[0]?.id ?? "");
  const [compareRight, setCompareRight] = useState<string>(versions[0]?.id ?? "");

  const existingNames = useMemo(() => {
    const set = new Set((schema?.fields ?? []).map((f) => normalizeFieldName(f.name)));
    return set;
  }, [schema?.fields]);

  const openAddField = useCallback(() => {
    setFieldDraft({ name: "", dataType: "string", required: false, masking: "none", description: "" });
    setFieldDialog({ open: true, mode: "add" });
  }, []);

  const openEditField = useCallback((field: MasterSchemaField, index: number) => {
    setFieldDraft({ ...field });
    setFieldDialog({ open: true, mode: "edit", initial: field, index });
  }, []);

  const closeFieldDialog = useCallback(() => {
    setFieldDialog({ open: false });
    setPendingTypeChange(null);
  }, []);

  const fieldNameError = useMemo(() => {
    const draftName = normalizeFieldName(fieldDraft.name);
    if (!draftName) return "Field name is required";
    const dup =
      fieldDialog.open && fieldDialog.mode === "edit"
        ? normalizeFieldName(fieldDialog.initial.name) !== draftName && existingNames.has(draftName)
        : existingNames.has(draftName);
    if (dup) return "Duplicate field name";
    return null;
  }, [existingNames, fieldDraft.name, fieldDialog]);

  const canSaveField = !fieldNameError && Boolean(schema);

  const applyFieldChangeLocally = useCallback(
    (next: MasterSchemaField, index?: number) => {
      if (!schema) return;
      const list = [...(schema.fields ?? [])];
      if (index == null) list.unshift(next);
      else list.splice(index, 1, next);

      // In mock MVP, the authoritative update+versioning happens in the editor flow.
      // Here we only provide inline UX; persistence is handled later via Edit page.
      // For now we navigate to Edit to complete changes.
      navigate(`/data-governance/master-schema/${encodeURIComponent(schema.id)}/edit`, {
        state: { draftFields: list },
      });
    },
    [navigate, schema],
  );

  const handleSaveField = useCallback(() => {
    if (!schema || !canSaveField) return;
    if (fieldDialog.open && fieldDialog.mode === "edit") {
      const prev = fieldDialog.initial;
      const changedType = prev.dataType !== fieldDraft.dataType;
      if (changedType) {
        setPendingTypeChange({ next: fieldDraft, index: fieldDialog.index });
        return;
      }
      applyFieldChangeLocally(fieldDraft, fieldDialog.index);
      closeFieldDialog();
      return;
    }
    applyFieldChangeLocally(fieldDraft);
    closeFieldDialog();
  }, [applyFieldChangeLocally, canSaveField, closeFieldDialog, fieldDialog, fieldDraft, schema]);

  const handleConfirmTypeChange = useCallback(() => {
    if (!pendingTypeChange) return;
    applyFieldChangeLocally(pendingTypeChange.next, pendingTypeChange.index);
    setPendingTypeChange(null);
    closeFieldDialog();
  }, [applyFieldChangeLocally, closeFieldDialog, pendingTypeChange]);

  const openDeleteField = useCallback((field: MasterSchemaField, index: number) => {
    setPendingDelete({ field, index });
  }, []);

  const confirmDeleteField = useCallback(() => {
    if (!schema || !pendingDelete) return;
    const list = [...(schema.fields ?? [])];
    list.splice(pendingDelete.index, 1);
    navigate(`/data-governance/master-schema/${encodeURIComponent(schema.id)}/edit`, {
      state: { draftFields: list },
    });
    setPendingDelete(null);
  }, [navigate, pendingDelete, schema]);

  const isDeletingRequired = pendingDelete?.field.required ?? false;

  const leftVer = versions.find((v) => v.id === compareLeft);
  const rightVer = versions.find((v) => v.id === compareRight);
  const compareDiff = useMemo(() => {
    const lf = leftVer?.schemaSnapshot?.fields ?? [];
    const rf = rightVer?.schemaSnapshot?.fields ?? [];
    if (!leftVer || !rightVer) return [];
    return diffFields(lf, rf);
  }, [leftVer, rightVer]);

  const loadJsonDraft = useCallback(() => {
    if (!schema) return;
    setJsonDraft(JSON.stringify(schema.rawJson ?? {}, null, 2));
  }, [schema]);

  const toggleJsonMode = useCallback(() => {
    setJsonEditMode((cur) => {
      const next = !cur;
      if (next) loadJsonDraft();
      return next;
    });
  }, [loadJsonDraft]);

  return (
    <>
      <PageBreadcrumb
        segments={[
          { label: "Data Governance", href: "/data-governance/dashboard" },
          { label: "Master Schema Management", href: "/data-governance/master-schema" },
          { label: schema?.name ?? schemaId },
        ]}
      />

      <div className="space-y-5 pt-2 animate-fade-in pb-4 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link to="/data-governance/master-schema" aria-label="Back to registry">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-h2 font-semibold text-foreground truncate">
                  {schema?.name ?? "Master Schema"}
                </h1>
                <p className="mt-0.5 text-caption text-muted-foreground truncate">
                  ID: {schemaId}
                </p>
              </div>
            </div>
          </div>
          {schema && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => navigate(`/data-governance/master-schema/${encodeURIComponent(schema.id)}/edit`)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit schema
              </Button>
              <Button
                className="gap-1.5"
                disabled={submitApproval.isPending || schema.status === "pending"}
                onClick={() => submitApproval.mutate(schema.id)}
              >
                Submit for approval
              </Button>
            </div>
          )}
        </div>

        {isLoading && <SkeletonTable rows={6} cols={6} />}
        {isError && <ApiErrorCard error={error} onRetry={() => refetch()} />}

        {schema && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="json">JSON View</TabsTrigger>
              <TabsTrigger value="versions">Version History</TabsTrigger>
              <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <Card className="lg:col-span-7 border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-h4 font-semibold text-foreground">Schema metadata</h2>
                      <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[schema.status])}>
                        {STATUS_LABELS[schema.status]}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-caption text-muted-foreground">Source type</p>
                        <p className="text-body font-medium text-foreground">
                          {SOURCE_LABELS[schema.sourceType] ?? schema.sourceType}
                        </p>
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">Version</p>
                        <p className="text-body font-medium text-foreground tabular-nums">{schema.version}</p>
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">Created by</p>
                        <p className="text-body font-medium text-foreground">{schema.createdBy}</p>
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">Updated by</p>
                        <p className="text-body font-medium text-foreground">{schema.updatedBy}</p>
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">Created</p>
                        <p className="text-body text-foreground tabular-nums">{formatDateTime(schema.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">Last updated</p>
                        <p className="text-body text-foreground tabular-nums">{formatDateTime(schema.updatedAt)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-caption text-muted-foreground">Description</p>
                      <p className="text-body text-foreground">{schema.description || "—"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-5 border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-h4 font-semibold text-foreground">Governance summary</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-caption text-muted-foreground">Fields</p>
                        <p className="text-h3 font-bold tabular-nums text-foreground">{schema.fields.length}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-caption text-muted-foreground">Versions</p>
                        <p className="text-h3 font-bold tabular-nums text-foreground">{schema.versions.length}</p>
                      </div>
                    </div>
                    <p className="text-caption text-muted-foreground">
                      Updates create a new immutable version. Use the editor to apply changes and submit for approval.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fields">
              <div className="py-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-h4 font-semibold text-foreground">Fields</h2>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Add, edit, or delete field definitions (changes are applied via the editor).
                  </p>
                </div>
                <Button className="gap-1.5" onClick={openAddField}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </Button>
              </div>

              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="max-h-[60vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={cn(tableHeaderClasses, "min-w-[170px]")}>Field Name</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[120px] text-center")}>Data Type</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[120px] text-center")}>Required</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center")}>Masking</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[260px]")}>Description</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center")}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schema.fields.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-28 text-center text-body text-muted-foreground">
                            No fields defined yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        schema.fields.map((f, idx) => (
                          <TableRow key={`${f.name}-${idx}`}>
                            <TableCell className="text-body font-medium text-foreground">{f.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                                {f.dataType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-body text-foreground">{f.required ? "Yes" : "No"}</TableCell>
                            <TableCell className="text-center text-body text-foreground">{MASKING_LABELS[f.masking]}</TableCell>
                            <TableCell className="text-body text-muted-foreground">{f.description || "—"}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditField(f, idx)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openDeleteField(f, idx)}
                                  aria-label="Delete field"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="json">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-h4 font-semibold text-foreground">JSON View</h2>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    View the raw schema JSON. Editing is staged; save changes in the editor.
                  </p>
                </div>
                <Button variant="outline" className="gap-1.5" onClick={toggleJsonMode}>
                  <FileJson className="h-3.5 w-3.5" />
                  {jsonEditMode ? "Exit edit mode" : "Edit JSON"}
                </Button>
              </div>

              {!jsonEditMode ? (
                <pre className="rounded-xl border border-border bg-card p-4 overflow-auto text-[11px] leading-[16px] text-foreground">
                  {JSON.stringify(schema.rawJson ?? {}, null, 2)}
                </pre>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={jsonDraft}
                    onChange={(e) => setJsonDraft(e.target.value)}
                    className="min-h-[320px] font-mono text-[11px] leading-[16px]"
                    spellCheck={false}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setJsonEditMode(false); setJsonDraft(""); }}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        try {
                          JSON.parse(jsonDraft);
                          navigate(`/data-governance/master-schema/${encodeURIComponent(schema.id)}/edit`, {
                            state: { draftRawJson: jsonDraft },
                          });
                        } catch {
                          // Keep UX minimal; detailed validation is in editor.
                        }
                      }}
                    >
                      Apply in editor
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="versions">
              <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-4">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-h4 font-semibold text-foreground">Version history</h2>
                </div>

                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Badge variant="outline" className="text-[9px] leading-[12px] font-mono">
                          {v.version}
                        </Badge>
                        <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[v.status])}>
                          {STATUS_LABELS[v.status]}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body text-foreground truncate">{v.changesSummary}</p>
                        <p className="text-[9px] leading-[12px] text-muted-foreground">
                          {v.createdBy} · {formatDateTime(v.createdAt)}
                        </p>
                      </div>
                      <div className="text-[9px] leading-[12px] text-muted-foreground shrink-0">
                        {v.diff?.length ?? 0} change(s)
                      </div>
                    </div>
                  ))}
                </div>

                {versions.length >= 2 && (
                  <div className="pt-2 border-t border-border space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-caption font-medium text-muted-foreground uppercase tracking-wider">Compare versions</p>
                      <div className="flex items-center gap-2">
                        <Select value={compareLeft} onValueChange={setCompareLeft}>
                          <SelectTrigger className="h-8 w-28 text-caption">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {versions.map((v) => (
                              <SelectItem key={v.id} value={v.id} className="text-caption font-mono">
                                {v.version}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-caption text-muted-foreground">vs</span>
                        <Select value={compareRight} onValueChange={setCompareRight}>
                          <SelectTrigger className="h-8 w-28 text-caption">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {versions.map((v) => (
                              <SelectItem key={v.id} value={v.id} className="text-caption font-mono">
                                {v.version}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="min-w-0 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className={cn(tableHeaderClasses, "min-w-[90px]")}>Change</TableHead>
                            <TableHead className={cn(tableHeaderClasses, "min-w-[200px]")}>Field</TableHead>
                            <TableHead className={cn(tableHeaderClasses, "min-w-[220px]")}>Previous</TableHead>
                            <TableHead className={cn(tableHeaderClasses, "min-w-[220px]")}>New</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {compareDiff.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-20 text-center text-body text-muted-foreground">
                                No differences detected for the selected versions.
                              </TableCell>
                            </TableRow>
                          ) : (
                            compareDiff.map((d, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal capitalize">
                                    {d.changeType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-body font-medium text-foreground">{d.fieldName}</TableCell>
                                <TableCell className="text-body text-muted-foreground">{d.oldValue ?? "—"}</TableCell>
                                <TableCell className="text-body text-foreground">{d.newValue ?? "—"}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="impact">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <Card className="lg:col-span-4 border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-h4 font-semibold text-foreground">APIs</h3>
                    {(schema.impact.apis ?? []).length === 0 ? (
                      <p className="text-body text-muted-foreground">No linked APIs.</p>
                    ) : (
                      <ul className="space-y-1">
                        {schema.impact.apis.map((a) => (
                          <li key={a.id} className="text-body">
                            {a.href ? (
                              <Link to={a.href} className="text-primary hover:underline">
                                {a.name}
                              </Link>
                            ) : (
                              <span className="text-foreground">{a.name}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card className="lg:col-span-4 border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-h4 font-semibold text-foreground">Products</h3>
                    {(schema.impact.products ?? []).length === 0 ? (
                      <p className="text-body text-muted-foreground">No linked products.</p>
                    ) : (
                      <ul className="space-y-1">
                        {schema.impact.products.map((p) => (
                          <li key={p.id} className="text-body">
                            {p.href ? (
                              <Link to={p.href} className="text-primary hover:underline">
                                {p.name}
                              </Link>
                            ) : (
                              <span className="text-foreground">{p.name}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card className="lg:col-span-4 border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-h4 font-semibold text-foreground">Institutions</h3>
                    {(schema.impact.institutions ?? []).length === 0 ? (
                      <p className="text-body text-muted-foreground">No linked institutions.</p>
                    ) : (
                      <ul className="space-y-1">
                        {schema.impact.institutions.map((i) => (
                          <li key={i.id} className="text-body">
                            {i.href ? (
                              <Link to={i.href} className="text-primary hover:underline">
                                {i.name}
                              </Link>
                            ) : (
                              <span className="text-foreground">{i.name}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Add/Edit Field Dialog */}
      <Dialog open={fieldDialog.open} onOpenChange={(open) => !open && closeFieldDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fieldDialog.open && fieldDialog.mode === "edit" ? "Edit Field" : "Add Field"}</DialogTitle>
            <DialogDescription>
              Define field metadata. Duplicate field names are not allowed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-caption text-muted-foreground">Field name</label>
              <Input
                value={fieldDraft.name}
                onChange={(e) => setFieldDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. consumer_id"
              />
              {fieldNameError && <p className="text-caption text-destructive">{fieldNameError}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-caption text-muted-foreground">Data type</label>
                <Select
                  value={fieldDraft.dataType}
                  onValueChange={(v) => setFieldDraft((d) => ({ ...d, dataType: v as MasterSchemaDataType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-caption text-muted-foreground">Masking</label>
                <Select
                  value={fieldDraft.masking}
                  onValueChange={(v) => setFieldDraft((d) => ({ ...d, masking: v as MasterSchemaField["masking"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="required"
                type="checkbox"
                checked={fieldDraft.required}
                onChange={(e) => setFieldDraft((d) => ({ ...d, required: e.target.checked }))}
              />
              <label htmlFor="required" className="text-body text-foreground">
                Required
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-muted-foreground">Description</label>
              <Textarea
                value={fieldDraft.description}
                onChange={(e) => setFieldDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Optional field description…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeFieldDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveField} disabled={!canSaveField}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Risk warning: data type change */}
      <AlertDialog open={!!pendingTypeChange} onOpenChange={(open) => !open && setPendingTypeChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Risk warning</AlertDialogTitle>
            <AlertDialogDescription>
              Changing a field’s data type can break downstream ingestion, validation, and mappings. Proceed only if you’ve validated impact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTypeChange}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation (extra warning for required fields) */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field?</AlertDialogTitle>
            <AlertDialogDescription>
              {isDeletingRequired
                ? "This field is marked Required. Deleting it can invalidate existing payloads and downstream contracts."
                : "This will remove the field from the schema."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteField}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MasterSchemaDetailPage;
