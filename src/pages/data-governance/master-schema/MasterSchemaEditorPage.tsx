import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Pencil, Trash2, FileJson, AlertTriangle } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateMasterSchema,
  useMasterSchemaDetail,
  useMasterSchemaSourceTypes,
  useUpdateMasterSchema,
} from "@/hooks/api/useMasterSchemas";
import type { MasterSchemaDataType, MasterSchemaField } from "@/types/master-schema";
import type { SourceType } from "@/types/schema-mapper";

const SOURCE_LABELS: Record<SourceType, string> = {
  telecom: "Telecom",
  utility: "Utility",
  bank: "Bank",
  gst: "GST",
  custom: "Custom",
};

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

function normalizeFieldName(name: string) {
  return String(name ?? "").trim().toLowerCase();
}

function buildDefaultRawJson(name: string, fields: MasterSchemaField[]): unknown {
  return {
    title: name,
    type: "object",
    properties: Object.fromEntries(fields.map((f) => [f.name, { type: f.dataType }])),
  };
}

type FieldDialogState =
  | { open: false }
  | { open: true; mode: "add"; initial?: undefined }
  | { open: true; mode: "edit"; initial: MasterSchemaField; index: number };

export function MasterSchemaEditorPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const schemaId = String(id ?? "");

  const { data: sourceTypesData } = useMasterSchemaSourceTypes({ allowMockFallback: true });
  const sourceTypes = sourceTypesData?.sourceTypes ?? [];

  const isEdit = mode === "edit";
  const { data: schema, isLoading, isError, error, refetch } = useMasterSchemaDetail(
    isEdit ? schemaId : null,
    { allowMockFallback: true, enabled: isEdit },
  );

  const createMutation = useCreateMasterSchema();
  const updateMutation = useUpdateMasterSchema();

  const navState = (location.state ?? {}) as { draftFields?: MasterSchemaField[]; draftRawJson?: string };

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType | "telecom">("telecom");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<MasterSchemaField[]>([]);

  const [jsonEditMode, setJsonEditMode] = useState(false);
  const [rawJsonText, setRawJsonText] = useState("");

  const [fieldDialog, setFieldDialog] = useState<FieldDialogState>({ open: false });
  const [fieldDraft, setFieldDraft] = useState<MasterSchemaField>({
    name: "",
    dataType: "string",
    required: false,
    masking: "none",
    description: "",
  });

  const [pendingRequiredDelete, setPendingRequiredDelete] = useState<null | { removedNames: string[] }>(null);
  const [pendingTypeRisk, setPendingTypeRisk] = useState<null | { changes: { name: string; from: string; to: string }[] }>(null);

  const originalFields = schema?.fields ?? [];

  useEffect(() => {
    if (!isEdit) return;
    if (!schema) return;
    setName(schema.name);
    setSourceType(schema.sourceType);
    setDescription(schema.description ?? "");
    setFields(navState.draftFields ?? schema.fields ?? []);
    if (navState.draftRawJson) {
      setJsonEditMode(true);
      setRawJsonText(navState.draftRawJson);
    } else {
      setJsonEditMode(false);
      setRawJsonText(JSON.stringify(schema.rawJson ?? buildDefaultRawJson(schema.name, schema.fields ?? []), null, 2));
    }
    // only hydrate once per schema load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema?.id]);

  useEffect(() => {
    if (isEdit) return;
    // Create mode defaults
    setName("New Master Schema");
    setDescription("");
    setFields([]);
    setRawJsonText(JSON.stringify(buildDefaultRawJson("New Master Schema", []), null, 2));
    setJsonEditMode(false);
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return;
    if (sourceTypes.length > 0) setSourceType(sourceTypes[0] as SourceType);
  }, [isEdit, sourceTypes]);

  const fieldNameSet = useMemo(() => new Set(fields.map((f) => normalizeFieldName(f.name))), [fields]);

  const schemaNameError = useMemo(() => {
    if (!String(name).trim()) return "Schema name is required";
    return null;
  }, [name]);

  const sourceTypeError = useMemo(() => {
    if (!sourceType) return "Source type is required";
    return null;
  }, [sourceType]);

  const rawJsonError = useMemo(() => {
    if (!jsonEditMode) return null;
    try {
      JSON.parse(rawJsonText);
      return null;
    } catch {
      return "Invalid JSON";
    }
  }, [jsonEditMode, rawJsonText]);

  const canSave =
    !schemaNameError &&
    !sourceTypeError &&
    !rawJsonError &&
    !createMutation.isPending &&
    !updateMutation.isPending;

  const openAddField = useCallback(() => {
    setFieldDraft({ name: "", dataType: "string", required: false, masking: "none", description: "" });
    setFieldDialog({ open: true, mode: "add" });
  }, []);

  const openEditField = useCallback((field: MasterSchemaField, index: number) => {
    setFieldDraft({ ...field });
    setFieldDialog({ open: true, mode: "edit", initial: field, index });
  }, []);

  const closeFieldDialog = useCallback(() => setFieldDialog({ open: false }), []);

  const fieldNameError = useMemo(() => {
    const n = normalizeFieldName(fieldDraft.name);
    if (!n) return "Field name is required";
    const dup =
      fieldDialog.open && fieldDialog.mode === "edit"
        ? normalizeFieldName(fieldDialog.initial.name) !== n && fieldNameSet.has(n)
        : fieldNameSet.has(n);
    if (dup) return "Duplicate field name";
    return null;
  }, [fieldDialog, fieldDraft.name, fieldNameSet]);

  const saveField = useCallback(() => {
    if (fieldNameError) return;
    if (!fieldDialog.open) return;
    if (fieldDialog.mode === "add") {
      setFields((prev) => [fieldDraft, ...prev]);
    } else {
      setFields((prev) => prev.map((f, i) => (i === fieldDialog.index ? fieldDraft : f)));
    }
    closeFieldDialog();
  }, [closeFieldDialog, fieldDialog, fieldDraft, fieldNameError]);

  const deleteField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const evaluateWarnings = useCallback(() => {
    if (!isEdit || !schema) return true;

    const oldByName = new Map(originalFields.map((f) => [normalizeFieldName(f.name), f]));
    const newByName = new Map(fields.map((f) => [normalizeFieldName(f.name), f]));

    const removedRequired = [...oldByName.entries()]
      .filter(([, f]) => f.required && !newByName.has(normalizeFieldName(f.name)))
      .map(([, f]) => f.name);

    const typeChanges: { name: string; from: string; to: string }[] = [];
    for (const [key, nf] of newByName.entries()) {
      const of = oldByName.get(key);
      if (!of) continue;
      if (of.dataType !== nf.dataType) typeChanges.push({ name: nf.name, from: of.dataType, to: nf.dataType });
    }

    if (removedRequired.length > 0) {
      setPendingRequiredDelete({ removedNames: removedRequired });
      return false;
    }
    if (typeChanges.length > 0) {
      setPendingTypeRisk({ changes: typeChanges });
      return false;
    }
    return true;
  }, [fields, isEdit, originalFields, schema]);

  const performSave = useCallback(async () => {
    if (!canSave) return;
    const parsedRawJson = jsonEditMode ? JSON.parse(rawJsonText) : buildDefaultRawJson(name, fields);

    if (!isEdit) {
      const created = await createMutation.mutateAsync({
        name: String(name).trim(),
        sourceType,
        description: String(description ?? ""),
        fields,
        rawJson: parsedRawJson,
      });
      navigate(`/data-governance/master-schema/${encodeURIComponent(created.id)}`);
      return;
    }
    if (!schema) return;
    const ok = evaluateWarnings();
    if (!ok) return;
    const updated = await updateMutation.mutateAsync({
      id: schema.id,
      body: {
        name: String(name).trim(),
        description: String(description ?? ""),
        fields,
        rawJson: parsedRawJson,
      },
    });
    navigate(`/data-governance/master-schema/${encodeURIComponent(updated.id)}`);
  }, [canSave, createMutation, description, evaluateWarnings, fields, isEdit, jsonEditMode, name, navigate, rawJsonText, schema, sourceType, updateMutation]);

  const continueAfterRequiredDelete = useCallback(async () => {
    setPendingRequiredDelete(null);
    // After acknowledging required deletes, we still want to warn about type changes if present.
    if (pendingTypeRisk) return;
    await performSave();
  }, [pendingTypeRisk, performSave]);

  const continueAfterTypeRisk = useCallback(async () => {
    setPendingTypeRisk(null);
    await performSave();
  }, [performSave]);

  return (
    <>
      <PageBreadcrumb
        segments={[
          { label: "Data Governance", href: "/data-governance/dashboard" },
          { label: "Master Schema Management", href: "/data-governance/master-schema" },
          { label: mode === "create" ? "Create schema" : `Edit: ${schema?.name ?? schemaId}` },
        ]}
      />

      <div className="space-y-5 animate-fade-in pb-4 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link
                  to={isEdit ? `/data-governance/master-schema/${encodeURIComponent(schemaId)}` : "/data-governance/master-schema"}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-h2 font-semibold text-foreground truncate">
                  {mode === "create" ? "Create New Schema" : "Edit Schema"}
                </h1>
                {isEdit && (
                  <p className="mt-0.5 text-caption text-muted-foreground truncate">
                    ID: {schemaId}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="gap-1.5" onClick={() => void performSave()} disabled={!canSave}>
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>

        {isEdit && isLoading && <SkeletonTable rows={6} cols={6} />}
        {isEdit && isError && <ApiErrorCard error={error} onRetry={() => refetch()} />}

        {(!isEdit || schema) && (
          <div className="grid grid-cols-1 gap-4">
            <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <CardContent className="p-4 space-y-4">
                <div>
                  <h2 className="text-h4 font-semibold text-foreground">Schema metadata</h2>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Name, source type, and description.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-caption text-muted-foreground">Schema name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  {schemaNameError && <p className="text-caption text-destructive">{schemaNameError}</p>}
                </div>

                <div className="space-y-1">
                  {/* Source type is intentionally hidden in the editor UI to reduce duplication/noise.
                     It is still preserved on create/edit in component state and sent to the service layer. */}
                </div>

                <div className="space-y-1">
                  <label className="text-caption text-muted-foreground">Description</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>

                {isEdit && schema?.status && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                    <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                      Current status
                    </Badge>
                    <span className="text-body font-medium text-foreground">{schema.status}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-h4 font-semibold text-foreground">Fields definition</h2>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      Add, edit, or delete field definitions. No duplicate names allowed.
                    </p>
                  </div>
                  <Button className="gap-1.5" onClick={openAddField}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Field
                  </Button>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={cn(tableHeaderClasses, "min-w-[170px]")}>Field Name</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[120px] text-center")}>Data Type</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[120px] text-center")}>Required</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center")}>Masking</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[220px]")}>Description</TableHead>
                        <TableHead className={cn(tableHeaderClasses, "min-w-[140px] text-center")}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-body text-muted-foreground">
                            No fields defined yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        fields.map((f, idx) => (
                          <TableRow key={`${f.name}-${idx}`}>
                            <TableCell className="text-body font-medium text-foreground">{f.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                                {f.dataType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-body text-foreground">{f.required ? "Yes" : "No"}</TableCell>
                            <TableCell className="text-center text-body text-foreground">{f.masking}</TableCell>
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
                                  aria-label="Delete field"
                                  onClick={() => deleteField(idx)}
                                >
                                  <Trash2 className={cn("h-4 w-4", f.required ? "text-warning" : "text-destructive")} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                    <div>
                      <p className="text-body font-medium text-foreground">Validation rules</p>
                      <p className="text-caption text-muted-foreground">
                        Duplicate field names are blocked. Required-field deletions and data-type changes show governance warnings at save.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-caption text-muted-foreground">Raw schema JSON</p>
                    <p className="text-caption text-muted-foreground">
                      {jsonEditMode ? "Editing enabled" : "Auto-generated from fields"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setJsonEditMode((v) => !v)}>
                    <FileJson className="h-3.5 w-3.5" />
                    {jsonEditMode ? "Disable" : "Enable"}
                  </Button>
                </div>

                {jsonEditMode && (
                  <div className="space-y-1">
                    <Textarea
                      value={rawJsonText}
                      onChange={(e) => setRawJsonText(e.target.value)}
                      className="min-h-[220px] font-mono text-[11px] leading-[16px]"
                      spellCheck={false}
                    />
                    {rawJsonError && <p className="text-caption text-destructive">{rawJsonError}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Field dialog */}
      <Dialog open={fieldDialog.open} onOpenChange={(open) => !open && closeFieldDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fieldDialog.open && fieldDialog.mode === "edit" ? "Edit Field" : "Add Field"}</DialogTitle>
            <DialogDescription>Define field metadata. Duplicate field names are not allowed.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-caption text-muted-foreground">Field name</label>
              <Input value={fieldDraft.name} onChange={(e) => setFieldDraft((d) => ({ ...d, name: e.target.value }))} />
              {fieldNameError && <p className="text-caption text-destructive">{fieldNameError}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-caption text-muted-foreground">Data type</label>
                <Select value={fieldDraft.dataType} onValueChange={(v) => setFieldDraft((d) => ({ ...d, dataType: v as MasterSchemaDataType }))}>
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
                <Select value={fieldDraft.masking} onValueChange={(v) => setFieldDraft((d) => ({ ...d, masking: v as MasterSchemaField["masking"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">none</SelectItem>
                    <SelectItem value="partial">partial</SelectItem>
                    <SelectItem value="full">full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input id="required" type="checkbox" checked={fieldDraft.required} onChange={(e) => setFieldDraft((d) => ({ ...d, required: e.target.checked }))} />
              <label htmlFor="required" className="text-body text-foreground">Required</label>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-muted-foreground">Description</label>
              <Textarea value={fieldDraft.description} onChange={(e) => setFieldDraft((d) => ({ ...d, description: e.target.value }))} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeFieldDialog}>Cancel</Button>
            <Button onClick={saveField} disabled={!!fieldNameError}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Required field deletion warning */}
      <AlertDialog open={!!pendingRequiredDelete} onOpenChange={(open) => !open && setPendingRequiredDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Required field deletion</AlertDialogTitle>
            <AlertDialogDescription>
              You removed required field(s): {pendingRequiredDelete?.removedNames.join(", ")}. This may break existing payloads and integrations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void continueAfterRequiredDelete()}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Data type risk warning */}
      <AlertDialog open={!!pendingTypeRisk} onOpenChange={(open) => !open && setPendingTypeRisk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data type change risk</AlertDialogTitle>
            <AlertDialogDescription>
              You changed field data type(s):{" "}
              {pendingTypeRisk?.changes.map((c) => `${c.name} (${c.from} → ${c.to})`).join(", ")}. Proceed only if downstream impact has been assessed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void continueAfterTypeRisk()}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MasterSchemaEditorPage;
