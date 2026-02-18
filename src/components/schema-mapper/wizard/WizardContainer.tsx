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
import { SourceDefinitionStep } from "./SourceDefinitionStep";
import { TargetSchemaStep } from "./TargetSchemaStep";
import { AIMappingStep } from "./AIMappingStep";
import { ValidationRuleStep } from "./ValidationRuleStep";
import { ConfirmationStep } from "./ConfirmationStep";
import type { WizardStep, SourceMetadata, ParsedSourceField, SourceFieldStatistics, AIMappingResult, AIMappingSummary, EnumReconciliation, GeneratedValidationRule } from "@/types/schema-mapper";
import {
  telecomParsedFields,
  telecomFieldStatistics,
  telecomMappingResults,
  telecomMappingSummary,
  telecomEnumReconciliations,
  generatedValidationRules,
} from "@/data/schema-mapper-mock";

interface WizardContainerProps {
  onCancel: () => void;
  onComplete: () => void;
}

export function WizardContainer({ onCancel, onComplete }: WizardContainerProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("source_definition");
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());

  const [sourceMetadata, setSourceMetadata] = useState<SourceMetadata | null>(null);
  const [parsedFields, setParsedFields] = useState<ParsedSourceField[]>([]);
  const [fieldStats, setFieldStats] = useState<SourceFieldStatistics | null>(null);
  const [selectedMasterVersion, setSelectedMasterVersion] = useState<string | null>(null);
  const [mappingResults, setMappingResults] = useState<AIMappingResult[]>([]);
  const [mappingSummary, setMappingSummary] = useState<AIMappingSummary | null>(null);
  const [enumReconciliations, setEnumReconciliations] = useState<EnumReconciliation[]>([]);
  const [validationRules, setValidationRules] = useState<GeneratedValidationRule[]>([]);

  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);
  const isFirst = currentIdx === 0;

  const markComplete = useCallback(
    (step: WizardStep) => {
      setCompletedSteps((prev) => new Set([...prev, step]));
    },
    [],
  );

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
    (meta: SourceMetadata) => {
      setSourceMetadata(meta);
      setParsedFields(telecomParsedFields);
      setFieldStats(telecomFieldStatistics);
      goNext();
    },
    [goNext],
  );

  const handleTargetComplete = useCallback(
    (versionId: string) => {
      setSelectedMasterVersion(versionId);
      goNext();
    },
    [goNext],
  );

  const handleMappingComplete = useCallback(
    (results: AIMappingResult[], summary: AIMappingSummary, enums: EnumReconciliation[]) => {
      setMappingResults(results);
      setMappingSummary(summary);
      setEnumReconciliations(enums);
      goNext();
    },
    [goNext],
  );

  const handleRulesComplete = useCallback(
    (rules: GeneratedValidationRule[]) => {
      setValidationRules(rules);
      goNext();
    },
    [goNext],
  );

  const stepLabel = STEPS[currentIdx]?.label ?? "";

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Top bar: breadcrumb + cancel */}
      <div className="flex items-center justify-between gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer text-caption"
                onClick={onCancel}
              >
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

      {/* Step indicator with integrated Back navigation */}
      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onBack={goBack}
        isFirst={isFirst}
      />

      {/* Step content */}
      <div className="min-h-0">
        {currentStep === "source_definition" && (
          <SourceDefinitionStep
            initialMetadata={sourceMetadata}
            onComplete={handleSourceComplete}
          />
        )}
        {currentStep === "target_schema" && (
          <TargetSchemaStep
            selectedVersionId={selectedMasterVersion}
            onComplete={handleTargetComplete}
          />
        )}
        {currentStep === "ai_mapping" && (
          <AIMappingStep
            parsedFields={parsedFields}
            initialResults={telecomMappingResults}
            initialSummary={telecomMappingSummary}
            initialEnums={telecomEnumReconciliations}
            onComplete={handleMappingComplete}
          />
        )}
        {currentStep === "validation_rules" && (
          <ValidationRuleStep
            initialRules={generatedValidationRules}
            onComplete={handleRulesComplete}
          />
        )}
        {currentStep === "confirmation" && (
          <ConfirmationStep
            mappingSummary={mappingSummary}
            rulesCount={validationRules.length || generatedValidationRules.length}
            enumReconciliations={enumReconciliations}
            onSubmit={onComplete}
          />
        )}
      </div>
    </div>
  );
}
