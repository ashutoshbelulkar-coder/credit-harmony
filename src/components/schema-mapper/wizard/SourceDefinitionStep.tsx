import { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, FileJson, Code, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SchemaTreeView } from "@/components/schema-mapper/shared/SchemaTreeView";
import { FieldStatisticsPanel } from "@/components/schema-mapper/shared/FieldStatisticsPanel";
import {
  getParsedSourceFieldsForSourceType,
  getSourceFieldStatisticsForSourceType,
} from "@/data/schema-mapper-mock";
import type { SourceMetadata, SourceType } from "@/types/schema-mapper";
import { useSchemaMapperWizardMetadata } from "@/hooks/api/useSchemaMapper";
import { FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS } from "@/lib/schema-mapper-wizard-metadata";

interface SourceDefinitionStepProps {
  initialMetadata: SourceMetadata | null;
  onComplete: (metadata: SourceMetadata) => void;
}

const SAMPLE_JSON = `{
  "subscriber_id": "string",
  "customer_name": "string",
  "dob": "string",
  "mobile_no": "string",
  "avg_monthly_bill": "number",
  "payment_delay_days": "number",
  "last_payment_status": "string"
}`;

export function SourceDefinitionStep({ initialMetadata, onComplete }: SourceDefinitionStepProps) {
  const { data: wizardMeta, isLoading: wizardMetaLoading, isError: wizardMetaError, error: wizardMetaErrorObj } =
    useSchemaMapperWizardMetadata();
  const sourceTypeOptions = wizardMeta?.sourceTypeOptions ?? FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS;

  const [sourceName, setSourceName] = useState(initialMetadata?.sourceName ?? "");
  const [sourceType, setSourceType] = useState<SourceType>(initialMetadata?.sourceType ?? "telecom");

  useEffect(() => {
    setSourceType((prev) => {
      const ok = sourceTypeOptions.some((o) => o.value === prev);
      if (ok) return prev;
      return (sourceTypeOptions[0]?.value ?? "telecom") as SourceType;
    });
  }, [sourceTypeOptions]);
  const [effectiveDate, setEffectiveDate] = useState(initialMetadata?.effectiveDate ?? "2026-03-01");
  const [version] = useState(initialMetadata?.versionNumber ?? "v1.0");

  const [schemaInput, setSchemaInput] = useState<"upload_json" | "upload_csv" | "paste_json" | "api_import">("paste_json");
  const [rawJson, setRawJson] = useState(SAMPLE_JSON);
  const [isParsed, setIsParsed] = useState(false);

  const handleParse = useCallback(() => {
    setIsParsed(true);
  }, []);

  const handleProceed = useCallback(() => {
    onComplete({
      sourceName,
      sourceType,
      institutionScope: [],
      effectiveDate,
      versionNumber: version,
    });
  }, [sourceName, sourceType, effectiveDate, version, onComplete]);

  const previewParsedFields = useMemo(
    () => getParsedSourceFieldsForSourceType(sourceType),
    [sourceType],
  );
  const previewFieldStats = useMemo(
    () => getSourceFieldStatisticsForSourceType(sourceType),
    [sourceType],
  );

  const isFormValid = sourceName.trim().length > 0 && sourceType && isParsed;

  return (
    <div className="space-y-6">
      {/* Section A: Source Metadata */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">Source Metadata</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Source Name *</Label>
            <Input
              placeholder="e.g. Jio Telecom"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Source Type *</Label>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={wizardMetaLoading ? "Loading…" : undefined} />
              </SelectTrigger>
              <SelectContent>
                {sourceTypeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground leading-tight">
              From <span className="font-medium text-foreground">GET /api/v1/schema-mapper/wizard-metadata</span>
              {wizardMetaLoading ? " (loading…)" : ""}.
            </p>
            {wizardMetaError && (
              <p className="text-[10px] text-destructive" role="alert">
                {wizardMetaErrorObj instanceof Error ? wizardMetaErrorObj.message : "Using offline defaults."}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Effective Date</Label>
            <DatePicker value={effectiveDate} onChange={setEffectiveDate} className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Version</Label>
            <Input value={version} disabled className="h-8 bg-muted" />
          </div>
        </div>
      </div>

      {/* Section B: Schema Input */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">Schema Input</h3>

        <Tabs value={schemaInput} onValueChange={(v) => { setSchemaInput(v as typeof schemaInput); setIsParsed(false); }}>
          <TabsList className="mb-4">
            <TabsTrigger value="upload_json" className="gap-1.5 text-caption">
              <FileJson className="h-3 w-3" /> Upload JSON
            </TabsTrigger>
            <TabsTrigger value="upload_csv" className="gap-1.5 text-caption">
              <Upload className="h-3 w-3" /> Upload CSV
            </TabsTrigger>
            <TabsTrigger value="paste_json" className="gap-1.5 text-caption">
              <Code className="h-3 w-3" /> Paste JSON
            </TabsTrigger>
            <TabsTrigger value="api_import" className="gap-1.5 text-caption">
              <Globe className="h-3 w-3" /> API Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload_json">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8">
              <div className="text-center">
                <FileJson className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-body text-muted-foreground">
                  Drop a JSON schema file here or click to browse
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleParse}>
                  Select File
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload_csv">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-body text-muted-foreground">
                  Drop a CSV sample file to auto-detect schema
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleParse}>
                  Select File
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paste_json">
            <Textarea
              value={rawJson}
              onChange={(e) => { setRawJson(e.target.value); setIsParsed(false); }}
              rows={8}
              className="font-mono text-caption resize-none"
              placeholder="Paste your JSON schema here..."
            />
            {!isParsed && (
              <Button size="sm" className="mt-3" onClick={handleParse}>
                Parse Schema
              </Button>
            )}
          </TabsContent>

          <TabsContent value="api_import">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8">
              <div className="text-center">
                <Globe className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-body text-muted-foreground">
                  API schema import — coming soon
                </p>
                <Badge variant="secondary" className="mt-2 text-[9px]">Future Release</Badge>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Parsed Result */}
      {isParsed && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in">
          <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-muted-foreground">
              Source Schema Tree
            </p>
            <ScrollArea className="h-[280px]">
              <SchemaTreeView nodes={previewParsedFields} showSamples />
            </ScrollArea>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-muted-foreground">
              Field Statistics
            </p>
            <FieldStatisticsPanel stats={previewFieldStats} />
            <div className="mt-4 space-y-2">
              <p className="text-caption font-medium text-muted-foreground">Validation Notes</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-caption text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  No duplicate field names detected
                </div>
                <div className="flex items-center gap-2 text-caption text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  All data types recognized
                </div>
                <div className="flex items-center gap-2 text-caption text-info">
                  <span className="h-1.5 w-1.5 rounded-full bg-info" />
                  1 enum candidate auto-detected
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proceed */}
      {isParsed && (
        <div className="flex justify-end">
          <Button onClick={handleProceed} disabled={!isFormValid} className="gap-1.5">
            Proceed to Target Schema
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
