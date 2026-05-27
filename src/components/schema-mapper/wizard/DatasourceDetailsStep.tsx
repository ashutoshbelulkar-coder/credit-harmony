import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SourceType } from "@/types/schema-mapper";
import type { Datasource, SourceMappingType } from "@/types/datasource-onboarding";
import { SOURCE_MAPPING_TYPES } from "@/types/datasource-onboarding";
import {
  buildDatasourceFormSchema,
  type DatasourceFormShape,
} from "@/lib/datasource-onboarding-validation";
import { useInstitutions } from "@/hooks/api/useInstitutions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

const FILE_FORMAT_LABELS: Record<SourceMappingType, string> = {
  JSON: "JSON",
  XML: "XML",
  CSV: "CSV",
  YAML: "YAML",
  NDJSON: "NDJSON",
  TSV: "TSV",
  TXT: "Plain text",
  PARQUET: "Apache Parquet",
  AVRO: "Apache Avro",
  ORC: "Apache ORC",
  XLSX: "Excel (XLSX)",
  XLS: "Excel (XLS)",
  PDF: "PDF",
  PROTOBUF: "Protocol Buffers",
  MSGPACK: "MessagePack",
};

const DOMAIN_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "telecom", label: "Telecom" },
  { value: "utility", label: "Utility" },
  { value: "bank", label: "Bank" },
  { value: "gst", label: "GST" },
  { value: "custom", label: "Create new…" },
];

const DATA_LAYOUT_OPTIONS: { value: DatasourceFormShape["dataLayout"]; label: string }[] = [
  { value: "STRUCTURED", label: "Structured data" },
  { value: "UNSTRUCTURED", label: "Unstructured data" },
];

export interface DatasourceDetailsStepProps {
  initial: DatasourceFormShape;
  existingNames: Set<string>;
  existingCustomTypeNames: Set<string>;
  onComplete: (form: DatasourceFormShape) => void;
}

function institutionLabel(row: { name: string; tradingName?: string }): string {
  return (row.tradingName?.trim() || row.name).trim();
}

export function DatasourceDetailsStep({
  initial,
  existingNames,
  existingCustomTypeNames,
  onComplete,
}: DatasourceDetailsStepProps) {
  const schema = useMemo(
    () => buildDatasourceFormSchema({ existingNames, existingCustomTypeNames }),
    [existingNames, existingCustomTypeNames],
  );

  const form = useForm<DatasourceFormShape>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: initial,
  });

  const { data: submittersPage, isLoading: submittersLoading } = useInstitutions(
    { page: 0, size: 300, role: "dataSubmitter" },
    { allowMockFallback: true },
  );
  const submitters = submittersPage?.content ?? [];

  useEffect(() => {
    form.reset(initial);
  }, [initial, form]);

  const values = form.watch();
  const domainType = form.watch("domainSourceType");

  useEffect(() => {
    if (domainType !== "custom") {
      form.setValue("customDataSourceTypeName", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [domainType, form]);

  const submitterLabel = useMemo(() => {
    const id = values.dataSubmitterInstitutionId;
    if (!id) return "—";
    const row = submitters.find((s) => String(s.id) === id);
    return row ? institutionLabel(row) : id;
  }, [submitters, values.dataSubmitterInstitutionId]);

  const dataSourceTypeSnapshot = useMemo(() => {
    if (values.domainSourceType === "custom" && values.customDataSourceTypeName?.trim()) {
      return values.customDataSourceTypeName.trim();
    }
    return DOMAIN_OPTIONS.find((o) => o.value === values.domainSourceType)?.label ?? values.domainSourceType;
  }, [values.domainSourceType, values.customDataSourceTypeName]);

  const handleSubmit = form.handleSubmit((data) => {
    onComplete({
      ...data,
      name: data.name.trim(),
      pkPattern: data.pkPattern.trim(),
      customDataSourceTypeName:
        data.domainSourceType === "custom" ? data.customDataSourceTypeName.trim() : "",
      dataSubmitterInstitutionId: data.dataSubmitterInstitutionId.trim(),
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="border-border shadow-sm lg:col-span-8">
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="text-h4 font-semibold text-foreground">Datasource details</h2>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  Define a new datasource. Name must be unique across the workspace.
                </p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Source name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Airtel Telecom Onboarding"
                        className="h-9"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataSubmitterInstitutionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Data submitter *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={submittersLoading}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={submittersLoading ? "Loading…" : "Select institution"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {submitters.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {institutionLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-caption text-muted-foreground">
                      Institution with the data-submitter role for this onboarding.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!submittersLoading && submitters.length === 0 && (
                <Alert variant="destructive">
                  <AlertTitle>No data submitters found</AlertTitle>
                  <AlertDescription className="text-caption">
                    Register an institution with data submission enabled before continuing.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-caption text-muted-foreground">File format *</FormLabel>
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as SourceMappingType)}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72">
                          {SOURCE_MAPPING_TYPES.map((fmt) => (
                            <SelectItem key={fmt} value={fmt}>
                              {FILE_FORMAT_LABELS[fmt]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domainSourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-caption text-muted-foreground">Data source type *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v as SourceType);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DOMAIN_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {domainType === "custom" && (
                  <FormField
                    control={form.control}
                    name="customDataSourceTypeName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-caption text-muted-foreground">New type name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Capital Markets"
                            className="h-9"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormDescription className="text-caption text-muted-foreground">
                          Must not match a built-in type or an existing custom type (case-insensitive).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="dataLayout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-caption text-muted-foreground">Data layout *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DATA_LAYOUT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pkPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-caption text-muted-foreground">PK Pattern</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. AIRTEL#TELECOM#{consumerId}"
                          className="h-9 font-mono"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormDescription className="text-caption text-muted-foreground">
                        Optional — preserved from POC for downstream KV stores.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm lg:col-span-4">
            <CardContent className="p-4 space-y-3">
              <div>
                <h2 className="text-h4 font-semibold text-foreground">Snapshot</h2>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  Live preview of the datasource you are creating.
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-caption text-muted-foreground">Source name</p>
                  <p className="text-body font-medium text-foreground truncate">
                    {values.name?.trim() || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">Data submitter</p>
                  <p className="text-body font-medium text-foreground truncate">{submitterLabel}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                    {values.sourceType}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                    {dataSourceTypeSnapshot}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                    {values.dataLayout === "STRUCTURED" ? "Structured" : "Unstructured"}
                  </Badge>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">PK Pattern</p>
                  <p className="text-body font-mono text-foreground truncate">
                    {values.pkPattern?.trim() || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            className="gap-1.5"
            disabled={!form.formState.isValid || (!submittersLoading && submitters.length === 0)}
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function deriveExistingNames(datasources: { id: string; name: string }[], excludeId?: string): Set<string> {
  const set = new Set<string>();
  for (const d of datasources) {
    if (excludeId && d.id === excludeId) continue;
    set.add(d.name.trim().toLowerCase());
  }
  return set;
}

export type { DatasourceFormShape } from "@/lib/datasource-onboarding-validation";
export type { Datasource };
