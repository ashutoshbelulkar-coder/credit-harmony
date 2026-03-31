import { useState, useCallback, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { StepIndicator, STEPS } from "./StepIndicator";
import { SourceIngestionStep } from "./SourceIngestionStep";
import { MultiSchemaMatchingStep } from "./MultiSchemaMatchingStep";
import { LLMFieldIntelligenceStep } from "./LLMFieldIntelligenceStep";
import { ValidationRuleStep } from "./ValidationRuleStep";
import { SemanticInsightsStep } from "./SemanticInsightsStep";
import { StorageVisibilityStep } from "./StorageVisibilityStep";
import { GovernanceActionsStep } from "./GovernanceActionsStep";
import type {
  WizardStep,
  IngestedSourceMetadata,
  ParsedSourceField,
  SourceFieldStatistics,
  LLMFieldIntelligenceRow,
  EnumReconciliation,
  GeneratedValidationRule,
  FieldCluster,
  StorageMetadataSummary,
  LineageEntry,
  GovernanceSummary,
} from "@/types/schema-mapper";
import {
  llmFieldIntelligenceRowsTelecom,
  telecomEnumReconciliations,
  generatedValidationRules,
  fieldClusters,
  storageMetadataSummary,
  lineagePreview,
  governanceSummaryDefault,
  masterSchemaTree,
} from "@/data/schema-mapper-mock";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { fieldMappingsToLlmRows, llmRowsToFieldMappings } from "@/lib/schema-mapper-api";
import { QK } from "@/lib/query-keys";
import { fetchMapping } from "@/services/schema-mapper.service";
import {
  useIngestSchema,
  useCreateMappingJob,
  usePatchMapping,
  useSubmitMappingApproval,
  useSchemaMappingDetail,
  useSchemaRegistryList,
  useSchemaMapperWizardMetadata,
} from "@/hooks/api/useSchemaMapper";
import { fetchSourceTypeFields } from "@/services/schema-mapper.service";
import {
  buildMultiSchemaMatchRows,
  pathsFromParsedFields,
} from "@/lib/build-multi-schema-match-rows";
import {
  FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS,
  FALLBACK_WIZARD_DATA_CATEGORY_OPTIONS,
} from "@/lib/schema-mapper-wizard-metadata";
import { schemaRegistryEntries } from "@/data/schema-mapper-mock";
import type { SourceType } from "@/types/schema-mapper";

interface WizardContainerProps {
  onCancel: () => void;
  onComplete: () => void;
}

export function WizardContainer({ onCancel, onComplete }: WizardContainerProps) {
  const apiMode = !clientMockFallbackEnabled;
  const queryClient = useQueryClient();
  const ingestMutation = useIngestSchema();
  const createJobMutation = useCreateMappingJob();
  const patchMutation = usePatchMapping();
  const submitApprovalMutation = useSubmitMappingApproval();

  const [currentStep, setCurrentStep] = useState<WizardStep>("source_ingestion");
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());

  const [ingestedMetadata, setIngestedMetadata] = useState<IngestedSourceMetadata | null>(null);
  const [parsedFields, setParsedFields] = useState<ParsedSourceField[]>([]);
  const [fieldStats, setFieldStats] = useState<SourceFieldStatistics | null>(null);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [schemaVersionId, setSchemaVersionId] = useState<string | null>(null);
  const [mappingId, setMappingId] = useState<string | null>(null);
  const [llmRows, setLlmRows] = useState<LLMFieldIntelligenceRow[]>(llmFieldIntelligenceRowsTelecom);
  const [enumReconciliations, setEnumReconciliations] = useState<EnumReconciliation[]>(telecomEnumReconciliations);
  const [validationRules, setValidationRules] = useState<GeneratedValidationRule[]>(generatedValidationRules);
  const [clusters, setClusters] = useState<FieldCluster[]>(fieldClusters);
  const [storageMetadata, setStorageMetadata] = useState<StorageMetadataSummary | null>(storageMetadataSummary);
  const [lineage, setLineage] = useState<LineageEntry[]>(lineagePreview);
  const [governanceSummary, setGovernanceSummary] = useState<GovernanceSummary | null>(governanceSummaryDefault);

  const { data: mappingData } = useSchemaMappingDetail(apiMode ? mappingId : null);

  const allowMockForQueries = !apiMode;
  const registryListParams = useMemo(() => ({ page: 0, size: 500 }), []);
  const { data: wizardMetaForMatch } = useSchemaMapperWizardMetadata({
    allowMockFallback: allowMockForQueries,
  });
  const { data: registryPageForMatch, isLoading: registryMatchLoading } = useSchemaRegistryList(
    registryListParams,
    {
      enabled: currentStep === "multi_schema_matching",
      allowMockFallback: allowMockForQueries,
    },
  );

  const sourceTypeOptionValues = useMemo(() => {
    const opts = wizardMetaForMatch?.sourceTypeOptions ?? FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS;
    return opts
      .map((o) => String(o.value ?? "").trim())
      .filter(Boolean) as SourceType[];
  }, [wizardMetaForMatch?.sourceTypeOptions]);

  const refPathQueries = useQueries({
    queries: sourceTypeOptionValues.map((st) => ({
      queryKey: [...QK.schemaMapper.sourceTypeFields(st), "wizard-ref-paths", allowMockForQueries ? "mock" : "api"] as const,
      queryFn: async () => {
        const r = await fetchSourceTypeFields(st, { allowMockFallback: allowMockForQueries });
        return r.fields.map((f) => String(f.path ?? "").trim()).filter(Boolean);
      },
      enabled: currentStep === "multi_schema_matching" && sourceTypeOptionValues.length > 0,
      staleTime: 60 * 1000,
    })),
  });

  const refPathsBySourceType = useMemo(() => {
    const m: Partial<Record<SourceType, string[]>> = {};
    sourceTypeOptionValues.forEach((st, i) => {
      const paths = refPathQueries[i]?.data;
      if (paths?.length) m[st] = paths;
    });
    return m;
  }, [sourceTypeOptionValues, refPathQueries]);

  const refPathsLoading =
    currentStep === "multi_schema_matching" &&
    refPathQueries.some((q) => q.isLoading || q.isFetching);

  const multiSchemaMatchRows = useMemo(() => {
    const opts = wizardMetaForMatch?.sourceTypeOptions ?? FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS;
    const dcOpts = wizardMetaForMatch?.dataCategoryOptions ?? FALLBACK_WIZARD_DATA_CATEGORY_OPTIONS;
    const entries = registryPageForMatch?.content ?? schemaRegistryEntries;
    const incoming = pathsFromParsedFields(parsedFields);
    return buildMultiSchemaMatchRows({
      sourceTypeOptions: opts,
      dataCategoryOptions: dcOpts,
      registryEntries: entries,
      incomingPaths: incoming,
      referencePathsBySourceType: refPathsBySourceType,
      preferredSourceType: ingestedMetadata?.sourceType,
    });
  }, [
    wizardMetaForMatch?.sourceTypeOptions,
    wizardMetaForMatch?.dataCategoryOptions,
    registryPageForMatch?.content,
    parsedFields,
    refPathsBySourceType,
    ingestedMetadata?.sourceType,
  ]);

  const apiSyncedRows = useMemo(() => {
    if (!mappingData?.fieldMappings?.length) return null;
    return fieldMappingsToLlmRows(mappingData.fieldMappings);
  }, [mappingData?.fieldMappings]);

  useEffect(() => {
    if (!mappingData?.fieldMappings?.length) return;
    const fm = mappingData.fieldMappings;
    const mapped = fm.filter((f) => f.canonicalPath).length;
    const pct = Math.round((mapped / fm.length) * 100);
    setGovernanceSummary((prev) => ({
      ...(prev ?? governanceSummaryDefault),
      mappingCoveragePercent: pct,
    }));
  }, [mappingData?.fieldMappings]);

  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);
  const isFirst = currentIdx === 0;

  const markComplete = useCallback((step: WizardStep) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const goNext = useCallback(() => {
    markComplete(currentStep);
    if (currentIdx < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIdx + 1].key);
    }
  }, [currentIdx, currentStep, markComplete]);

  const goBack = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentStep(STEPS[currentIdx - 1].key);
    }
  }, [currentIdx]);

  const handleSourceComplete = useCallback(
    async (meta: IngestedSourceMetadata, fields: ParsedSourceField[], stats: SourceFieldStatistics) => {
      setIngestedMetadata(meta);
      setParsedFields(fields);
      setFieldStats(stats);
      if (apiMode) {
        try {
          const res = await ingestMutation.mutateAsync({
            sourceName: meta.sourceName,
            sourceType: meta.sourceType,
            dataCategory: meta.dataCategory,
            versionNumber: meta.versionNumber,
            effectiveDate: meta.effectiveDate,
            parsedFields: fields as unknown[],
            fieldStats: stats as unknown,
          });
          setSchemaVersionId(res.schemaVersionId);
          await queryClient.invalidateQueries({ queryKey: ["schema-mapper", "registry"] });
          await queryClient.invalidateQueries({
            queryKey: [...QK.schemaMapper.sourceTypeFields(meta.sourceType)],
          });
        } catch {
          return;
        }
      }
      goNext();
    },
    [apiMode, goNext, ingestMutation, queryClient],
  );

  const handleMultiSchemaComplete = useCallback(
    async (schemaId: string | null, _createNew: boolean) => {
      setSelectedSchemaId(schemaId);
      if (apiMode && schemaVersionId) {
        try {
          const job = await createJobMutation.mutateAsync({ schemaVersionId });
          setMappingId(job.mappingId);
        } catch {
          return;
        }
      }
      goNext();
    },
    [apiMode, schemaVersionId, createJobMutation, goNext],
  );

  const handleLLMComplete = useCallback(
    async (rows: LLMFieldIntelligenceRow[], enums: EnumReconciliation[]) => {
      setLlmRows(rows);
      setEnumReconciliations(enums);
      if (apiMode && mappingId) {
        try {
          const latest = await queryClient.fetchQuery({
            queryKey: QK.schemaMapper.mapping(mappingId),
            queryFn: () => fetchMapping(mappingId),
          });
          const body = llmRowsToFieldMappings(rows, masterSchemaTree, latest.fieldMappings);
          await patchMutation.mutateAsync({ id: mappingId, body: { fieldMappings: body } });
        } catch {
          return;
        }
      }
      goNext();
    },
    [apiMode, mappingId, queryClient, patchMutation, goNext],
  );

  const handleRulesComplete = useCallback(
    (rules: GeneratedValidationRule[]) => {
      setValidationRules(rules);
      setGovernanceSummary((prev) =>
        prev ? { ...prev, rulesGenerated: rules.length } : { ...governanceSummaryDefault, rulesGenerated: rules.length },
      );
      goNext();
    },
    [goNext],
  );

  const handleGovernanceSubmitToQueue = useCallback(async () => {
    setGovernanceSummary((prev) => ({
      ...(prev ?? governanceSummaryDefault),
      evolutionQueueStatus: "AI Proposed",
    }));
    if (apiMode && mappingId) {
      await submitApprovalMutation.mutateAsync(mappingId);
    }
  }, [apiMode, mappingId, submitApprovalMutation]);

  const handleGovernanceSaveDraft = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleGovernanceReject = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const stepLabel = STEPS[currentIdx]?.label ?? "";

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-4 md:pb-6">
      <div className="flex items-center justify-between gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="cursor-pointer text-caption" onClick={onCancel}>
                Schema Registry
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className="text-caption">Create Mapping</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-caption">{stepLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 gap-1 px-2 text-caption shrink-0">
          <X className="h-3 w-3" />
          <span className="hidden sm:inline">Cancel</span>
        </Button>
      </div>

      <div className="shrink-0">
        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          onBack={goBack}
          isFirst={isFirst}
        />
      </div>

      <div className="min-h-0 flex-1">
        {currentStep === "source_ingestion" && (
          <SourceIngestionStep
            initialMetadata={ingestedMetadata}
            onComplete={handleSourceComplete}
          />
        )}
        {currentStep === "multi_schema_matching" && (
          <MultiSchemaMatchingStep
            similarSchemas={multiSchemaMatchRows}
            isLoading={registryMatchLoading || refPathsLoading}
            selectedSchemaId={selectedSchemaId}
            onComplete={handleMultiSchemaComplete}
          />
        )}
        {currentStep === "llm_field_intelligence" && (
          <LLMFieldIntelligenceStep
            initialRows={llmRows}
            initialEnums={enumReconciliations}
            apiSyncedRows={apiSyncedRows}
            mappingJobStatus={mappingData?.status ?? null}
            onComplete={handleLLMComplete}
          />
        )}
        {currentStep === "auto_rule_preview" && (
          <ValidationRuleStep
            initialRules={validationRules}
            onComplete={handleRulesComplete}
          />
        )}
        {currentStep === "semantic_insights" && (
          <SemanticInsightsStep
            clusters={clusters}
            onClustersChange={setClusters}
            onComplete={goNext}
          />
        )}
        {currentStep === "storage_visibility" && (
          <StorageVisibilityStep
            storageMetadata={storageMetadata}
            lineagePreview={lineage}
            onComplete={goNext}
          />
        )}
        {currentStep === "governance_actions" && (
          <GovernanceActionsStep
            governanceSummary={governanceSummary}
            onSubmitToQueue={handleGovernanceSubmitToQueue}
            onSaveDraft={handleGovernanceSaveDraft}
            onReject={handleGovernanceReject}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}
