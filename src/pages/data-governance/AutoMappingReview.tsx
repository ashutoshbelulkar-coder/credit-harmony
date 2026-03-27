import { useState, useCallback } from "react";
import { SchemaRegistryView } from "@/components/schema-mapper/registry/SchemaRegistryView";
import { WizardContainer } from "@/components/schema-mapper/wizard/WizardContainer";
import { VersionDiffViewer } from "@/components/schema-mapper/shared/VersionDiffViewer";

type ViewMode = "registry" | "wizard" | "version_diff";

export default function AutoMappingReview() {
  const [view, setView] = useState<ViewMode>("registry");

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
