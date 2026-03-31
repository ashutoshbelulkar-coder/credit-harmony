import { useState, useCallback, useEffect } from "react";
import { ArrowRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MasterFieldDrawer } from "./MasterFieldDrawer";
import { EnumReconciliationDrawer } from "./EnumReconciliationDrawer";
import { MappingSummaryBanner } from "@/components/schema-mapper/shared/MappingSummaryBanner";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { masterSchemaTree, telecomMappingSummary, telecomEnumReconciliations } from "@/data/schema-mapper-mock";
import type {
  LLMFieldIntelligenceRow,
  LLMFieldAction,
  MasterSchemaField,
  EnumReconciliation,
  MasterFieldDefinition,
} from "@/types/schema-mapper";

function flattenMasterFields(fields: MasterSchemaField[]): { id: string; label: string; dataType: string }[] {
  const result: { id: string; label: string; dataType: string }[] = [];
  function walk(nodes: MasterSchemaField[]) {
    for (const n of nodes) {
      result.push({ id: n.id, label: n.path, dataType: n.dataType });
      if (n.children) walk(n.children);
    }
  }
  walk(fields);
  return result;
}

interface LLMFieldIntelligenceStepProps {
  initialRows: LLMFieldIntelligenceRow[];
  initialEnums: EnumReconciliation[];
  /** When API-backed mapping job finishes, rows sync from server field mappings */
  apiSyncedRows?: LLMFieldIntelligenceRow[] | null;
  /** Mapping job status from API (`queued` | `processing` | …) */
  mappingJobStatus?: string | null;
  onComplete: (rows: LLMFieldIntelligenceRow[], enums: EnumReconciliation[]) => void | Promise<void>;
}

const ACTION_OPTIONS: { value: LLMFieldAction; label: string }[] = [
  { value: "map_existing", label: "Map to existing canonical" },
  { value: "create_new", label: "Create new canonical field" },
  { value: "source_only", label: "Mark as source-only field" },
];

export function LLMFieldIntelligenceStep({
  initialRows,
  initialEnums,
  apiSyncedRows,
  mappingJobStatus,
  onComplete,
}: LLMFieldIntelligenceStepProps) {
  const [rows, setRows] = useState<LLMFieldIntelligenceRow[]>(initialRows);
  const [enums, setEnums] = useState<EnumReconciliation[]>(initialEnums);

  useEffect(() => {
    if (apiSyncedRows && apiSyncedRows.length > 0) {
      setRows(apiSyncedRows);
    }
  }, [apiSyncedRows]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [masterFieldDrawerOpen, setMasterFieldDrawerOpen] = useState(false);
  const [enumDrawerOpen, setEnumDrawerOpen] = useState(false);
  const [activeEnumFieldId, setActiveEnumFieldId] = useState<string | null>(null);
  const [createNewSourceRowId, setCreateNewSourceRowId] = useState<string | null>(null);

  const masterFieldOptions = flattenMasterFields(masterSchemaTree);

  const handleCanonicalChange = useCallback(
    (rowId: string, canonicalMatchId: string | null, canonicalMatch: string | null) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, canonicalMatchId, canonicalMatch: canonicalMatch ?? null }
            : r,
        ),
      );
      setEditingRowId(null);
    },
    [],
  );

  const handleActionChange = useCallback((rowId: string, action: LLMFieldAction) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, action } : r)));
  }, []);

  const handlePiiChange = useCallback((rowId: string, pii: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, pii } : r)));
  }, []);

  const openCreateNewDrawer = useCallback((rowId: string) => {
    setCreateNewSourceRowId(rowId);
    setMasterFieldDrawerOpen(true);
  }, []);

  const handleFieldCreated = useCallback(
    (field: MasterFieldDefinition) => {
      if (createNewSourceRowId) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === createNewSourceRowId
              ? {
                  ...r,
                  canonicalMatch: field.fieldName,
                  canonicalMatchId: null,
                  action: undefined,
                }
              : r,
          ),
        );
        setCreateNewSourceRowId(null);
      }
      setMasterFieldDrawerOpen(false);
    },
    [createNewSourceRowId],
  );

  const openEnumDrawer = (fieldId: string) => {
    setActiveEnumFieldId(fieldId);
    setEnumDrawerOpen(true);
  };

  const coveragePercent = rows.filter((r) => r.canonicalMatch != null).length > 0
    ? Math.round((rows.filter((r) => r.canonicalMatch != null).length / rows.length) * 100)
    : telecomMappingSummary.coveragePercent;

  const jobPending =
    mappingJobStatus === "queued" || mappingJobStatus === "processing";

  return (
    <div className="space-y-3 animate-fade-in">
      {jobPending && (
        <p className="text-caption text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
          AI mapping job running… suggestions will appear when complete (typically under a few seconds).
        </p>
      )}
      <MappingSummaryBanner
        summary={{
          ...telecomMappingSummary,
          coveragePercent,
        }}
      />

      <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <p className="p-3 text-caption font-medium uppercase tracking-wider text-muted-foreground">
          LLM Field Intelligence
        </p>
        <div className="min-w-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(tableHeaderClasses, "sticky left-0 z-10 min-w-[130px] px-4 align-middle text-left bg-[hsl(var(--table-header-bg))] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]")}>
                  Source Field
                </TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[140px] px-4 align-middle text-left")}>
                  LLM Meaning
                </TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[140px] px-4 align-middle text-left")}>
                  Canonical Match
                </TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[160px] px-4 align-middle text-left")}>
                  Similar Fields Across System
                </TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[80px] w-[80px] px-4 align-middle text-right")}>
                  Confidence
                </TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[76px] w-[76px] px-2 align-middle text-center")}>
                  PII
                </TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[160px] px-4 align-middle text-left")}>
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isEditing = editingRowId === row.id;

                return (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-10 bg-card px-4 align-middle py-2 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-2 flex-nowrap min-w-0">
                        <span className="text-body font-medium truncate min-w-0">{row.sourceField}</span>
                        <Badge variant="secondary" className="text-[8px] font-normal shrink-0 flex-shrink-0">
                          {row.sourceFieldType}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-caption px-4 align-middle py-2 text-left">{row.llmMeaning}</TableCell>
                    <TableCell className="px-4 align-middle py-2 text-left">
                      {isEditing ? (
                        <Select
                          value={row.canonicalMatchId ?? undefined}
                          onValueChange={(v) => {
                            const opt = masterFieldOptions.find((o) => o.id === v);
                            handleCanonicalChange(row.id, v, opt?.label ?? null);
                          }}
                        >
                          <SelectTrigger className="h-6 text-[9px] w-full font-medium">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {masterFieldOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id} className="text-caption">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <span className="text-body truncate min-w-0">{row.canonicalMatch ?? "—"}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={() => setEditingRowId(row.id)}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-caption px-4 align-middle py-2 text-left">
                      {row.similarFieldsAcrossSystem.length > 0
                        ? row.similarFieldsAcrossSystem.join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium px-4 align-middle py-2 text-right w-[80px]">
                      {row.confidence > 0 ? `${row.confidence}%` : "—"}
                    </TableCell>
                    <TableCell className="px-2 align-middle py-2 text-center w-[76px]">
                      <Select
                        value={row.pii ? "yes" : "no"}
                        onValueChange={(v) => handlePiiChange(row.id, v === "yes")}
                      >
                        <SelectTrigger className="h-6 text-[9px] w-full min-w-0 font-medium" aria-label={`PII for ${row.sourceField}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes" className="text-caption">
                            Yes
                          </SelectItem>
                          <SelectItem value="no" className="text-caption">
                            No
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-4 align-middle py-2 text-left">
                      {row.canonicalMatch == null ? (
                        <Select
                          value={row.action ?? ""}
                          onValueChange={(v) => handleActionChange(row.id, v as LLMFieldAction)}
                        >
                          <SelectTrigger className="h-6 text-[9px] w-full font-medium">
                            <SelectValue placeholder="Action..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-caption text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {enums.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <p className="text-body font-medium text-foreground mb-1.5">Enum Reconciliation Required</p>
          <div className="space-y-1.5">
            {enums.map((e) => (
              <div
                key={e.sourceFieldId}
                className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5"
              >
                <span className="text-body font-medium">{e.sourceFieldName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[9px] px-2 shrink-0"
                  onClick={() => openEnumDrawer(e.sourceFieldId)}
                >
                  Reconcile
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          onClick={() => void Promise.resolve(onComplete(rows, enums))}
          className="gap-1.5"
          disabled={jobPending && rows.length === 0}
        >
          Confirm & Generate Rules
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <MasterFieldDrawer
        open={masterFieldDrawerOpen}
        onOpenChange={(open) => { if (!open) setCreateNewSourceRowId(null); setMasterFieldDrawerOpen(open); }}
        onFieldCreated={handleFieldCreated}
      />
      <EnumReconciliationDrawer
        open={enumDrawerOpen}
        onOpenChange={setEnumDrawerOpen}
        reconciliation={enums.find((e) => e.sourceFieldId === activeEnumFieldId) ?? null}
        onSave={(updated) => {
          setEnums((prev) =>
            prev.map((e) => (e.sourceFieldId === updated.sourceFieldId ? updated : e)),
          );
          setEnumDrawerOpen(false);
        }}
      />
    </div>
  );
}
