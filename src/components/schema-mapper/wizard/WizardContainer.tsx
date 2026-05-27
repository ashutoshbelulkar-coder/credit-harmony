/**
 * WizardContainer — Datasource Onboarding (3-step POC flow).
 *
 * Replaces the legacy 4-step Schema Mapper wizard with the migrated POC
 * sequence: Datasource Details → Profile Generation → Profile Review.
 *
 * Behavioural notes:
 *  - The container hosts wizard chrome (breadcrumb, Cancel, StepIndicator).
 *  - Step components are presentational; state is fully held here.
 *  - Persistence goes through React Query mutations (`useCreateDatasource`,
 *    `useUpdateDatasource`, `useSubmitDatasourceForApproval`,
 *    `useSubmitDatasourceReview`). No localStorage is used.
 *  - Feature flag `useDatasourceOnboardingFlow()` gates the new body; when
 *    OFF, the entire flow falls back to a graceful 1-line message so a
 *    rollback only requires flipping the env var.
 */
import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { StepIndicator } from "./StepIndicator";
import { DatasourceDetailsStep, type DatasourceFormShape } from "./DatasourceDetailsStep";
import { ProfileGenerationStep, type ProfileGenerationFiles } from "./ProfileGenerationStep";
import { ProfileReviewStep } from "./ProfileReviewStep";
import {
  useCreateDatasource,
  useDatasourceDetail,
  useDatasourcesList,
  useSubmitDatasourceForApproval,
  useSubmitDatasourceReview,
  useUpdateDatasource,
} from "@/hooks/api/useDatasourceOnboarding";
import { useDatasourceOnboardingFlow } from "@/lib/feature-flags";
import type {
  Datasource,
  DatasourceWizardStep,
  SchemaNode,
} from "@/types/datasource-onboarding";

interface WizardContainerProps {
  onCancel: () => void;
  onComplete: () => void;
  /** Optional datasource id when editing an existing record. */
  datasourceId?: string | null;
}

const STEP_LABELS: Record<DatasourceWizardStep, string> = {
  datasource_details: "Datasource Details",
  profile_generation: "Profile Generation",
  profile_review: "Profile Review",
};

const STEP_KEYS: DatasourceWizardStep[] = ["datasource_details", "profile_generation", "profile_review"];

const EMPTY_FILES: ProfileGenerationFiles = {
  sampleFiles: [],
  jsonSchemaFile: null,
  guideDocFile: null,
};

function defaultDatasourceForm(): DatasourceFormShape {
  return {
    name: "",
    sourceType: "JSON",
    domainSourceType: "telecom",
    customDataSourceTypeName: "",
    dataLayout: "STRUCTURED",
    dataSubmitterInstitutionId: "",
    pkPattern: "",
  };
}

export function WizardContainer({ onCancel, onComplete, datasourceId }: WizardContainerProps) {
  const flagOn = useDatasourceOnboardingFlow();

  if (!flagOn) {
    return (
      <div className="space-y-4 animate-fade-in pb-4 sm:pb-6">
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer text-caption" onClick={onCancel}>
                  Schema Registry
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-caption">Datasource Onboarding</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 gap-1 px-2 text-caption">
            <X className="h-3 w-3" />
            <span className="hidden sm:inline">Cancel</span>
          </Button>
        </div>
        <Card className="border-border shadow-sm">
          <CardContent className="p-8 text-center text-body text-muted-foreground">
            Datasource onboarding flow is disabled in this environment.
            Set <code className="font-mono text-foreground">VITE_USE_DATASOURCE_ONBOARDING_FLOW=true</code> to enable.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <DatasourceOnboardingWizard onCancel={onCancel} onComplete={onComplete} datasourceId={datasourceId} />;
}

function DatasourceOnboardingWizard({ onCancel, onComplete, datasourceId }: WizardContainerProps) {
  // Server data
  const { data: detail } = useDatasourceDetail(datasourceId ?? null, { allowMockFallback: true, enabled: !!datasourceId });
  const { data: listing } = useDatasourcesList({ page: 0, size: 200 }, { allowMockFallback: true });
  const createMutation = useCreateDatasource();
  const updateMutation = useUpdateDatasource();
  const submitApprovalMutation = useSubmitDatasourceForApproval();
  const submitReviewMutation = useSubmitDatasourceReview();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<DatasourceWizardStep>("datasource_details");
  const [completedSteps, setCompletedSteps] = useState<Set<DatasourceWizardStep>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(datasourceId ?? null);

  const initialForm: DatasourceFormShape = useMemo(() => {
    if (detail) {
      return {
        name: detail.name,
        sourceType: detail.sourceType,
        domainSourceType: detail.domainSourceType,
        customDataSourceTypeName: detail.customDataSourceTypeName ?? "",
        dataLayout: detail.dataLayout ?? "STRUCTURED",
        dataSubmitterInstitutionId: detail.dataSubmitterInstitutionId ?? "",
        pkPattern: detail.pkPattern,
      };
    }
    return defaultDatasourceForm();
  }, [detail]);

  const [datasourceForm, setDatasourceForm] = useState<DatasourceFormShape>(initialForm);
  const [files, setFiles] = useState<ProfileGenerationFiles>(EMPTY_FILES);
  const [nodes, setNodes] = useState<SchemaNode[]>(detail?.nodes ?? []);

  // Hydrate when detail arrives.
  useMemo(() => {
    if (detail) {
      setDatasourceForm(initialForm);
      setNodes(detail.nodes ?? []);
    }
  }, [detail?.id, initialForm, detail]);

  const existingNames = useMemo(() => {
    const set = new Set<string>();
    for (const d of listing?.content ?? []) {
      if (d.id !== (datasourceId ?? activeId)) set.add(d.name.trim().toLowerCase());
    }
    return set;
  }, [listing?.content, datasourceId, activeId]);

  const existingCustomTypeNames = useMemo(() => {
    const set = new Set<string>();
    for (const d of listing?.content ?? []) {
      if (d.id === (datasourceId ?? activeId)) continue;
      if (d.domainSourceType === "custom" && d.customDataSourceTypeName?.trim()) {
        set.add(d.customDataSourceTypeName.trim().toLowerCase());
      }
    }
    return set;
  }, [listing?.content, datasourceId, activeId]);

  const currentIdx = STEP_KEYS.findIndex((k) => k === currentStep);
  const isFirst = currentIdx === 0;

  const markComplete = useCallback((step: DatasourceWizardStep) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const goBack = useCallback(() => {
    if (currentIdx > 0) setCurrentStep(STEP_KEYS[currentIdx - 1]);
  }, [currentIdx]);

  const handleDetailsComplete = useCallback(
    async (form: DatasourceFormShape) => {
      setDatasourceForm(form);
      markComplete("datasource_details");

      // Persist immediately (explicit save convention).
      try {
        if (activeId) {
          await updateMutation.mutateAsync({
            id: activeId,
            body: {
              name: form.name,
              sourceType: form.sourceType,
              domainSourceType: form.domainSourceType,
              customDataSourceTypeName:
                form.domainSourceType === "custom" ? form.customDataSourceTypeName.trim() : undefined,
              status: "ACTIVE",
              dataLayout: form.dataLayout,
              dataSubmitterInstitutionId: form.dataSubmitterInstitutionId,
              pkPattern: form.pkPattern,
            },
          });
        } else {
          const created = await createMutation.mutateAsync({
            name: form.name,
            sourceType: form.sourceType,
            domainSourceType: form.domainSourceType,
            customDataSourceTypeName:
              form.domainSourceType === "custom" ? form.customDataSourceTypeName.trim() : undefined,
            status: "ACTIVE",
            dataLayout: form.dataLayout,
            dataSubmitterInstitutionId: form.dataSubmitterInstitutionId,
            pkPattern: form.pkPattern,
          });
          setActiveId(created.id);
        }
        setCurrentStep("profile_generation");
      } catch {
        // Mutation hook surfaces a toast on error; stay on current step.
      }
    },
    [activeId, createMutation, updateMutation, markComplete],
  );

  const handleGenerationComplete = useCallback(
    async ({ files: nextFiles, nodes: nextNodes }: { files: ProfileGenerationFiles; nodes: SchemaNode[] }) => {
      setFiles(nextFiles);
      setNodes(nextNodes);
      markComplete("profile_generation");

      if (activeId) {
        try {
          await updateMutation.mutateAsync({
            id: activeId,
            body: { nodes: nextNodes },
          });
        } catch {
          return;
        }
      }
      setCurrentStep("profile_review");
    },
    [activeId, updateMutation, markComplete],
  );

  const handleNodesChange = useCallback((next: SchemaNode[]) => {
    setNodes(next);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!activeId) return;
    await updateMutation.mutateAsync({ id: activeId, body: { nodes } });
  }, [activeId, updateMutation, nodes]);

  const handleSubmitApproval = useCallback(async () => {
    if (!activeId) return;
    await updateMutation.mutateAsync({ id: activeId, body: { nodes } });
    await submitApprovalMutation.mutateAsync(activeId);
  }, [activeId, nodes, submitApprovalMutation, updateMutation]);

  const handleFinish = useCallback(async () => {
    if (!activeId) {
      onComplete();
      return;
    }
    await updateMutation.mutateAsync({ id: activeId, body: { nodes } });
    markComplete("profile_review");
    onComplete();
  }, [activeId, nodes, onComplete, updateMutation, markComplete]);

  const handleSubmitReview = useCallback(
    async ({ action, comment }: { action: Parameters<typeof submitReviewMutation.mutateAsync>[0]["body"]["action"]; comment: string }) => {
      if (!activeId) return;
      await submitReviewMutation.mutateAsync({ id: activeId, body: { action, comment } });
    },
    [activeId, submitReviewMutation],
  );

  // Build a synthetic datasource for the review step when we are creating.
  const reviewDatasource: Datasource = useMemo(() => {
    if (detail) {
      return { ...detail, nodes };
    }
    const now = new Date().toISOString();
    return {
      id: activeId ?? "ds-new",
      name: datasourceForm.name,
      sourceType: datasourceForm.sourceType,
      domainSourceType: datasourceForm.domainSourceType,
      customDataSourceTypeName:
        datasourceForm.domainSourceType === "custom"
          ? datasourceForm.customDataSourceTypeName.trim() || undefined
          : undefined,
      status: "ACTIVE",
      dataLayout: datasourceForm.dataLayout,
      dataSubmitterInstitutionId: datasourceForm.dataSubmitterInstitutionId,
      pkPattern: datasourceForm.pkPattern,
      profileReviewStatus: "PENDING",
      reviewComments: [],
      nodes,
      createdAt: now,
      updatedAt: now,
      createdBy: "You",
      updatedBy: "You",
    };
  }, [detail, activeId, datasourceForm, nodes]);

  const stepLabel = STEP_LABELS[currentStep];

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-4 md:pb-6 h-full">
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
              <BreadcrumbLink className="text-caption">
                {datasourceId ? `Edit: ${reviewDatasource.name}` : "Create Datasource"}
              </BreadcrumbLink>
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
        {currentStep === "datasource_details" && (
          <DatasourceDetailsStep
            initial={datasourceForm}
            existingNames={existingNames}
            existingCustomTypeNames={existingCustomTypeNames}
            onComplete={(form) => void handleDetailsComplete(form)}
          />
        )}
        {currentStep === "profile_generation" && (
          <ProfileGenerationStep
            datasourceName={datasourceForm.name}
            initialFiles={files}
            initialNodes={nodes}
            onComplete={(payload) => void handleGenerationComplete(payload)}
          />
        )}
        {currentStep === "profile_review" && (
          <ProfileReviewStep
            datasource={reviewDatasource}
            nodes={nodes}
            onNodesChange={handleNodesChange}
            onSaveDraft={handleSaveDraft}
            onFinish={handleFinish}
            onSubmitApproval={handleSubmitApproval}
            onSubmitReview={handleSubmitReview}
            isSaving={updateMutation.isPending}
            isSubmittingApproval={submitApprovalMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
