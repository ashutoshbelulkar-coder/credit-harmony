import { useState, useCallback } from "react";
import { SchemaRegistryView } from "@/components/schema-mapper/registry/SchemaRegistryView";
import { WizardContainer } from "@/components/schema-mapper/wizard/WizardContainer";
import { VersionDiffViewer } from "@/components/schema-mapper/shared/VersionDiffViewer";

type ViewMode = "registry" | "wizard" | "version_diff";

export default function AutoMappingReviewContent() {
  const [view, setView] = useState<ViewMode>("registry");

  const handleCreateNew = useCallback(() => setView("wizard"), []);
  const handleViewAudit = useCallback(() => setView("version_diff"), []);
  const handleBackToRegistry = useCallback(() => setView("registry"), []);

  return (
    <div className="min-h-0">
      {view === "registry" && (
        <SchemaRegistryView
          onCreateNew={handleCreateNew}
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
