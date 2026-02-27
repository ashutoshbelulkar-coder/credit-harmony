import { useState, useCallback } from "react";
import { X } from "lucide-react";
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
  similarSchemasForTelecom,
  llmFieldIntelligenceRowsTelecom,
  telecomEnumReconciliations,
  generatedValidationRules,
  fieldClusters,
  storageMetadataSummary,
  lineagePreview,
  governanceSummaryDefault,
} from "@/data/schema-mapper-mock";

interface WizardContainerProps {
  onCancel: () => void;
  onComplete: () => void;
}

export function WizardContainer({ onCancel, onComplete }: WizardContainerProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("source_ingestion");
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());

  const [ingestedMetadata, setIngestedMetadata] = useState<IngestedSourceMetadata | null>(null);
  const [parsedFields, setParsedFields] = useState<ParsedSourceField[]>([]);
  const [fieldStats, setFieldStats] = useState<SourceFieldStatistics | null>(null);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [llmRows, setLlmRows] = useState<LLMFieldIntelligenceRow[]>(llmFieldIntelligenceRowsTelecom);
  const [enumReconciliations, setEnumReconciliations] = useState<EnumReconciliation[]>(telecomEnumReconciliations);
  const [validationRules, setValidationRules] = useState<GeneratedValidationRule[]>(generatedValidationRules);
  const [clusters, setClusters] = useState<FieldCluster[]>(fieldClusters);
  const [storageMetadata, setStorageMetadata] = useState<StorageMetadataSummary | null>(storageMetadataSummary);
  const [lineage, setLineage] = useState<LineageEntry[]>(lineagePreview);
  const [governanceSummary, setGovernanceSummary] = useState<GovernanceSummary | null>(governanceSummaryDefault);

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
    (meta: IngestedSourceMetadata, fields: ParsedSourceField[], stats: SourceFieldStatistics) => {
      setIngestedMetadata(meta);
      setParsedFields(fields);
      setFieldStats(stats);
      goNext();
    },
    [goNext],
  );

  const handleMultiSchemaComplete = useCallback(
    (schemaId: string | null, _createNew: boolean) => {
      setSelectedSchemaId(schemaId);
      goNext();
    },
    [goNext],
  );

  const handleLLMComplete = useCallback(
    (rows: LLMFieldIntelligenceRow[], enums: EnumReconciliation[]) => {
      setLlmRows(rows);
      setEnumReconciliations(enums);
      goNext();
    },
    [goNext],
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

  const handleGovernanceSubmit = useCallback(() => {
    setGovernanceSummary((prev) => ({ ...(prev ?? governanceSummaryDefault), evolutionQueueStatus: "AI Proposed" }));
    onComplete();
  }, [onComplete]);

  const handleGovernanceSaveDraft = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleGovernanceReject = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const stepLabel = STEPS[currentIdx]?.label ?? "";

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
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
            similarSchemas={ingestedMetadata?.similarSchemas ?? similarSchemasForTelecom}
            selectedSchemaId={selectedSchemaId}
            onComplete={handleMultiSchemaComplete}
          />
        )}
        {currentStep === "llm_field_intelligence" && (
          <LLMFieldIntelligenceStep
            initialRows={llmRows}
            initialEnums={enumReconciliations}
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
            onSubmitToQueue={handleGovernanceSubmit}
            onSaveDraft={handleGovernanceSaveDraft}
            onReject={handleGovernanceReject}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}
