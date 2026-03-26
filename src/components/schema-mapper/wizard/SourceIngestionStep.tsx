import { useState, useCallback } from "react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { SchemaTreeView } from "@/components/schema-mapper/shared/SchemaTreeView";
import {
  telecomParsedFields,
  telecomFieldStatistics,
  ingestedSourceMetadataTelecom,
  similarityRankingForBarChart,
  previouslyIngestedSchemas,
  utilityParsedFields,
  utilityFieldStatistics,
} from "@/data/schema-mapper-mock";
import type { IngestedSourceMetadata, ParsedSourceField, SourceFieldStatistics, SourceType } from "@/types/schema-mapper";

const similarityChartConfig = {
  similarity: { label: "Similarity %", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const SAMPLE_JSON = `{
  "subscriber_id": "SUB-99821",
  "customer_name": "Ravi Sharma",
  "dob": "1990-08-14",
  "mobile_no": "9876543210",
  "avg_monthly_bill": 1450.75,
  "last_payment_status": "DELAYED",
  "payment_delay_days": 12,
  "city": "Pune",
  "account_active": true
}`;

interface SourceIngestionStepProps {
  initialMetadata: IngestedSourceMetadata | null;
  onComplete: (metadata: IngestedSourceMetadata, parsedFields: ParsedSourceField[], fieldStats: SourceFieldStatistics) => void;
}

export function SourceIngestionStep({ initialMetadata, onComplete }: SourceIngestionStepProps) {
  const categoryOptions = [
    "Financial Data",
    "Business Data",
    "Behavioral Data",
    "Consortium Data",
    "Fraud Signals",
    "Synthetic / Test",
  ] as const;

  const [sourceName, setSourceName] = useState(initialMetadata?.sourceName ?? "");
  const [sourceType, setSourceType] = useState<SourceType>(initialMetadata?.sourceType ?? "telecom");
  const [packetCategory, setPacketCategory] = useState<(typeof categoryOptions)[number]>("Behavioral Data");
  const [effectiveDate, setEffectiveDate] = useState(initialMetadata?.effectiveDate ?? "2026-03-01");
  const [versionNumber, setVersionNumber] = useState(initialMetadata?.versionNumber ?? "v1.0");
  const [schemaInput, setSchemaInput] = useState<"upload_json" | "upload_csv" | "paste_json" | "select_previous">("paste_json");
  const [rawJson, setRawJson] = useState(SAMPLE_JSON);
  const [selectedPreviousId, setSelectedPreviousId] = useState<string>("");
  const [isParsed, setIsParsed] = useState(false);

  const handleParse = useCallback(() => {
    setIsParsed(true);
  }, []);

  const handleSelectPrevious = useCallback(() => {
    if (selectedPreviousId) setIsParsed(true);
  }, [selectedPreviousId]);

  const handleProceed = useCallback(() => {
    const baseMeta = initialMetadata ?? ingestedSourceMetadataTelecom;
    const meta: IngestedSourceMetadata = {
      ...baseMeta,
      sourceName: sourceName.trim() || baseMeta.sourceName,
      sourceType,
      effectiveDate,
      versionNumber,
    };
    const fields = selectedPreviousId === "utility-sample" ? utilityParsedFields : telecomParsedFields;
    const stats = selectedPreviousId === "utility-sample" ? utilityFieldStatistics : telecomFieldStatistics;
    onComplete(meta, fields, stats);
  }, [initialMetadata, sourceName, sourceType, effectiveDate, versionNumber, selectedPreviousId, onComplete]);

  const parsedFields = selectedPreviousId === "utility-sample" ? utilityParsedFields : telecomParsedFields;
  const fieldStats = selectedPreviousId === "utility-sample" ? utilityFieldStatistics : telecomFieldStatistics;
  const metadata = initialMetadata ?? ingestedSourceMetadataTelecom;
  const similarityData = similarityRankingForBarChart;

  const isFormValid = isParsed && sourceName.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Source Metadata */}
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="telecom">Telecom</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="gst">GST</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Effective Date</Label>
            <DatePicker value={effectiveDate} onChange={setEffectiveDate} className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Data Category</Label>
            <Select
              value={packetCategory}
              onValueChange={(v) => setPacketCategory(v as (typeof categoryOptions)[number])}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Version</Label>
            <Input value={versionNumber} disabled className="h-8 bg-muted" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">Upload & Analyze Source Schema</h3>

        <Tabs value={schemaInput} onValueChange={(v) => { setSchemaInput(v as typeof schemaInput); setIsParsed(false); }}>
          <div className="overflow-x-auto -mx-1 mb-4">
            <TabsList className="mb-0 w-max min-w-0 h-auto min-h-10 flex flex-nowrap">
                <TabsTrigger value="upload_json" className="gap-1.5 text-caption shrink-0">
                <FileJson className="h-3 w-3" /> Upload JSON
              </TabsTrigger>
              <TabsTrigger value="upload_csv" className="gap-1.5 text-caption shrink-0">
                <Upload className="h-3 w-3" /> Upload CSV
              </TabsTrigger>
              <TabsTrigger value="paste_json" className="gap-1.5 text-caption shrink-0">
                <Code className="h-3 w-3" /> Paste JSON Schema
              </TabsTrigger>
              <TabsTrigger value="select_previous" className="gap-1.5 text-caption shrink-0">
                <Globe className="h-3 w-3" /> Select Previously Ingested Schema
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload_json">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8">
              <div className="text-center">
                <FileJson className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-body text-muted-foreground">Drop a JSON schema file here or click to browse</p>
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
                <p className="text-body text-muted-foreground">Drop a CSV sample file to auto-detect schema</p>
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

          <TabsContent value="select_previous">
            <div className="space-y-2">
              <Label className="text-caption text-muted-foreground">Previously Ingested Schema</Label>
              <Select value={selectedPreviousId} onValueChange={setSelectedPreviousId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a schema..." />
                </SelectTrigger>
                <SelectContent>
                  {previouslyIngestedSchemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label} ({s.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isParsed && (
                <Button size="sm" className="mt-2" onClick={handleSelectPrevious} disabled={!selectedPreviousId}>
                  Load Schema
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {isParsed && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in">
          <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-muted-foreground">
              Parsed Schema
            </p>
            <ScrollArea className="h-[280px]">
              <SchemaTreeView
                nodes={parsedFields}
                showSamples
                showNullAndDistinct
              />
            </ScrollArea>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-muted-foreground">
              Auto-detected Metadata
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-caption text-muted-foreground">Source Category</span>
                <Badge variant="secondary" className="text-[9px] capitalize">{metadata.sourceCategory}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-caption text-muted-foreground">Configured Data Category</span>
                <Badge variant="secondary" className="text-[9px]">{packetCategory}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-caption text-muted-foreground">Detection Confidence</span>
                <span className="text-body font-semibold tabular-nums">{metadata.detectionConfidence}%</span>
              </div>
              <div>
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Similar Existing Schemas (Top 3)
                </p>
                <ul className="space-y-1">
                  {metadata.similarSchemas.slice(0, 3).map((s) => (
                    <li key={s.schemaId} className="flex items-center justify-between text-caption">
                      <span>{s.label}</span>
                      <span className="tabular-nums">{s.similarityPercent}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="h-[160px]">
                <ChartContainer config={similarityChartConfig} className="h-full w-full">
                  <BarChart data={similarityData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={10} domain={[0, 100]} />
                    <Bar dataKey="similarity" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {isParsed && (
        <div className="flex justify-center sm:justify-end">
          <Button onClick={handleProceed} disabled={!isFormValid} className="gap-1.5">
            Proceed to Similarity Analysis
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
