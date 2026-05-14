import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SchemaRegistryView } from "@/components/schema-mapper/registry/SchemaRegistryView";
import { WizardContainer } from "@/components/schema-mapper/wizard/WizardContainer";
import { VersionDiffViewer } from "@/components/schema-mapper/shared/VersionDiffViewer";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "registry" | "wizard" | "version_diff";

export default function AutoMappingReview() {
  const [view, setView] = useState<ViewMode>("registry");
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const mappingFromQuery = searchParams.get("mapping");
  useEffect(() => {
    if (!mappingFromQuery) return;
    toast({
      title: "Approval queue link",
      description: `Mapping ${mappingFromQuery} — open Approval Queue to review status, or continue workflows from the registry.`,
    });
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("mapping");
        return n;
      },
      { replace: true },
    );
  }, [mappingFromQuery, setSearchParams, toast]);

  const handleCreateNew = useCallback(() => setView("wizard"), []);
  const handleEditEntry = useCallback((_entryId: string) => setView("wizard"), []);
  const handleViewAudit = useCallback((_entryId: string) => setView("version_diff"), []);
  const handleBackToRegistry = useCallback(() => setView("registry"), []);

  return (
    <div className="min-h-0">
      {view === "registry" && (
        <SchemaRegistryView
          onCreateNew={handleCreateNew}
          onEditEntry={handleEditEntry}
          onViewAudit={handleViewAudit}
        />
      )}
      {view === "wizard" && (
        <WizardContainer
          onCancel={handleBackToRegistry}
          onComplete={handleBackToRegistry}
        />
      )}
      {view === "version_diff" && (
        <VersionDiffViewer onBack={handleBackToRegistry} />
      )}
    </div>
  );
}
