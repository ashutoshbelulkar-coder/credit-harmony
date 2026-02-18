import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, ChevronDown, ChevronUp, Pencil, Check, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { SchemaTreeView } from "@/components/schema-mapper/shared/SchemaTreeView";
import { MappingSummaryBanner } from "@/components/schema-mapper/shared/MappingSummaryBanner";
import { MasterFieldDrawer } from "./MasterFieldDrawer";
import { EnumReconciliationDrawer } from "./EnumReconciliationDrawer";
import { cn } from "@/lib/utils";
import { telecomParsedFields, masterSchemaTree } from "@/data/schema-mapper-mock";
import type {
  ParsedSourceField,
  AIMappingResult,
  AIMappingSummary,
  MatchType,
  EnumReconciliation,
  MasterSchemaField,
} from "@/types/schema-mapper";

interface AIMappingStepProps {
  parsedFields: ParsedSourceField[];
  initialResults: AIMappingResult[];
  initialSummary: AIMappingSummary;
  initialEnums: EnumReconciliation[];
  onComplete: (results: AIMappingResult[], summary: AIMappingSummary, enums: EnumReconciliation[]) => void;
}

function confidenceBarColor(c: number) {
  if (c >= 85) return "bg-success";
  if (c >= 60) return "bg-warning";
  return "bg-destructive";
}

function confidenceTextColor(c: number) {
  if (c >= 85) return "text-success";
  if (c >= 60) return "text-warning";
  return "text-destructive";
}

const MATCH_LABELS: Record<MatchType, string> = {
  exact: "Exact",
  semantic: "Semantic",
  contextual: "Contextual",
  derived: "Derived",
};

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

export function AIMappingStep({
  parsedFields,
  initialResults,
  initialSummary,
  initialEnums,
  onComplete,
}: AIMappingStepProps) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AIMappingResult[]>(initialResults);
  const [summary] = useState<AIMappingSummary>(initialSummary);
  const [enums, setEnums] = useState<EnumReconciliation[]>(initialEnums);
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);
  const [highlightedMasterId, setHighlightedMasterId] = useState<string | null>(null);
  const [masterFieldDrawerOpen, setMasterFieldDrawerOpen] = useState(false);
  const [enumDrawerOpen, setEnumDrawerOpen] = useState(false);
  const [activeEnumFieldId, setActiveEnumFieldId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const masterFieldOptions = flattenMasterFields(masterSchemaTree);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsProcessing(false), 300);
          return 100;
        }
        return p + 4;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const unmappedResults = results.filter((r) => r.status === "unmapped");
  const mappedResults = results.filter((r) => r.status !== "unmapped");

  const handleChangeMasterField = useCallback(
    (resultId: string, masterFieldId: string) => {
      const masterOpt = masterFieldOptions.find((o) => o.id === masterFieldId);
      setResults((prev) =>
        prev.map((r) =>
          r.id === resultId
            ? {
                ...r,
                suggestedMasterFieldId: masterFieldId,
                suggestedMasterFieldName: masterOpt?.label ?? null,
                masterFieldType: masterOpt?.dataType ?? "string",
                confidence: 100,
                matchType: "exact" as MatchType,
                mappingReason: "Manually reassigned by user",
              }
            : r,
        ),
      );
      setEditingRowId(null);
    },
    [masterFieldOptions],
  );

  const handleRowHover = (r: AIMappingResult) => {
    setHighlightedSourceId(r.sourceFieldId);
    setHighlightedMasterId(r.suggestedMasterFieldId);
  };

  const handleOpenEnumDrawer = (fieldId: string) => {
    setActiveEnumFieldId(fieldId);
    setEnumDrawerOpen(true);
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-4"
        >
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>
        <h3 className="text-h4 font-semibold text-foreground mb-1">AI Mapping Engine</h3>
        <p className="text-caption text-muted-foreground mb-4">
          Analyzing fields and matching to master schema...
        </p>
        <div className="w-full max-w-xs">
          <Progress value={progress} className="h-1.5" />
          <p className="mt-1.5 text-center text-[9px] tabular-nums text-muted-foreground">
            {progress}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <MappingSummaryBanner summary={summary} />

      <Tabs defaultValue="mappings" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="mappings" className="text-caption gap-1">
            Mapping Results
            <Badge variant="secondary" className="text-[8px] leading-[10px] px-1 py-0 ml-0.5">
              {mappedResults.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="source" className="text-caption">Source Schema</TabsTrigger>
          <TabsTrigger value="master" className="text-caption">Master Schema</TabsTrigger>
        </TabsList>

        {/* TAB: Mapping Results — side-by-side cards */}
        <TabsContent value="mappings" className="mt-3">
          <ScrollArea className="max-h-[460px]">
            <div className="space-y-2">
              {mappedResults.map((r) => {
                const isEditing = editingRowId === r.id;

                return (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border bg-card p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:border-primary/20 transition-colors"
                    onMouseEnter={() => handleRowHover(r)}
                  >
                    {/* Row 1: Source ──> Target side-by-side */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
                          Source
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-body font-semibold text-foreground truncate">
                            {r.sourceFieldName}
                          </span>
                          <Badge variant="secondary" className="text-[8px] leading-[10px] px-1 py-0 font-normal shrink-0">
                            {r.sourceFieldType}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center pt-4 shrink-0 px-1">
                        <div className="h-px w-4 bg-border sm:w-6" />
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <div className="h-px w-4 bg-border sm:w-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
                          Target
                        </p>
                        {isEditing ? (
                          <Select
                            value={r.suggestedMasterFieldId ?? undefined}
                            onValueChange={(v) => handleChangeMasterField(r.id, v)}
                          >
                            <SelectTrigger className="h-7 text-[11px]">
                              <SelectValue placeholder="Select master field..." />
                            </SelectTrigger>
                            <SelectContent>
                              {masterFieldOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id} className="text-caption">
                                  {opt.label}
                                  <span className="ml-1 text-muted-foreground">({opt.dataType})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-body font-semibold text-primary truncate">
                              {r.suggestedMasterFieldName ?? "—"}
                            </span>
                            {r.masterFieldType && (
                              <Badge variant="secondary" className="text-[8px] leading-[10px] px-1 py-0 font-normal shrink-0">
                                {r.masterFieldType}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Edit / confirm toggle */}
                      <div className="pt-3.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setEditingRowId(isEditing ? null : r.id)}
                        >
                          {isEditing ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Row 2: Confidence bar + match type */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", confidenceBarColor(r.confidence))}
                          style={{ width: `${r.confidence}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px] font-bold tabular-nums shrink-0", confidenceTextColor(r.confidence))}>
                        {r.confidence}%
                      </span>
                      <Badge variant="outline" className="text-[8px] leading-[10px] px-1.5 py-0 font-normal shrink-0">
                        {MATCH_LABELS[r.matchType]}
                      </Badge>
                    </div>

                    {/* Row 3: AI reasoning comment */}
                    {r.mappingReason && (
                      <div className="mt-1.5 flex items-start gap-1.5">
                        <MessageSquareText className="h-3 w-3 text-muted-foreground shrink-0 mt-px" />
                        <p className="text-[10px] leading-[14px] text-muted-foreground">
                          {r.mappingReason}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* TAB: Source Schema Tree */}
        <TabsContent value="source" className="mt-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="mb-2 text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Source Schema
            </p>
            <ScrollArea className="h-[380px]">
              <SchemaTreeView
                nodes={parsedFields.length ? parsedFields : telecomParsedFields}
                highlightedId={highlightedSourceId}
                showSamples
              />
            </ScrollArea>
          </div>
        </TabsContent>

        {/* TAB: Master Schema Tree */}
        <TabsContent value="master" className="mt-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="mb-2 text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
              HCB Master Schema
            </p>
            <ScrollArea className="h-[380px]">
              <SchemaTreeView
                nodes={masterSchemaTree}
                highlightedId={highlightedMasterId}
              />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Unmapped Fields — collapsible */}
      {unmappedResults.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <button
            type="button"
            onClick={() => setShowUnmapped(!showUnmapped)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
          >
            <Badge variant="destructive" className="text-[8px] leading-[10px] px-1.5 py-0">{unmappedResults.length}</Badge>
            <span className="text-body font-medium text-foreground">Unmapped Fields</span>
            {showUnmapped ? (
              <ChevronUp className="ml-auto h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="ml-auto h-3 w-3 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {showUnmapped && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border px-3 py-2 space-y-2">
                  {unmappedResults.map((r) => {
                    const sourceField = (parsedFields.length ? parsedFields : telecomParsedFields).find(
                      (f) => f.id === r.sourceFieldId,
                    );
                    return (
                      <div key={r.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2 sm:flex-row sm:items-center sm:gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-body font-medium text-foreground">{r.sourceFieldName}</span>
                          <Badge variant="secondary" className="ml-1.5 text-[8px] leading-[10px] px-1 py-0">
                            {r.sourceFieldType}
                          </Badge>
                          {sourceField?.sampleValues && (
                            <p className="text-[9px] leading-[12px] text-muted-foreground mt-0.5 truncate">
                              e.g. {sourceField.sampleValues.slice(0, 3).join(", ")}
                            </p>
                          )}
                          {r.mappingReason && (
                            <div className="flex items-start gap-1 mt-1">
                              <MessageSquareText className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-px" />
                              <p className="text-[9px] leading-[12px] text-muted-foreground">
                                {r.mappingReason}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Select onValueChange={(v) => handleChangeMasterField(r.id, v)}>
                            <SelectTrigger className="h-6 w-32 text-[9px]">
                              <SelectValue placeholder="Map to field..." />
                            </SelectTrigger>
                            <SelectContent>
                              {masterFieldOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id} className="text-caption">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[9px] px-2"
                            onClick={() => setMasterFieldDrawerOpen(true)}
                          >
                            New Field
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Enum reconciliation */}
      {enums.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <p className="text-body font-medium text-foreground mb-1.5">Enum Reconciliation Required</p>
          <div className="space-y-1.5">
            {enums.map((e) => (
              <div
                key={e.sourceFieldId}
                className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <span className="text-body font-medium">{e.sourceFieldName}</span>
                  <span className="ml-1.5 text-[9px] text-muted-foreground">
                    {e.detectedValues.length} values
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[9px] px-2 shrink-0"
                  onClick={() => handleOpenEnumDrawer(e.sourceFieldId)}
                >
                  Reconcile
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proceed */}
      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          onClick={() => onComplete(results, summary, enums)}
          className="gap-1.5"
        >
          Confirm & Generate Rules
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Drawers */}
      <MasterFieldDrawer
        open={masterFieldDrawerOpen}
        onOpenChange={setMasterFieldDrawerOpen}
        onFieldCreated={() => setMasterFieldDrawerOpen(false)}
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
