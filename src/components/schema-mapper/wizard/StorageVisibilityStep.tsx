import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StorageMetadataSummary, LineageEntry } from "@/types/schema-mapper";

interface StorageVisibilityStepProps {
  storageMetadata: StorageMetadataSummary | null;
  lineagePreview: LineageEntry[];
  onComplete: () => void;
}

export function StorageVisibilityStep({
  storageMetadata,
  lineagePreview,
  onComplete,
}: StorageVisibilityStepProps) {
  const meta = storageMetadata ?? {
    rawPayloadStored: true,
    normalizedPayloadGenerated: true,
    mappingMetadataStored: true,
    lineageCaptured: true,
    schemaVersion: "v1.2",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">
          Storage Model Visibility (Schema-less Alignment)
        </h3>

        <div className="space-y-3">
          <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Metadata summary
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2 text-body">
              {meta.rawPayloadStored ? <Check className="h-4 w-4 text-success shrink-0" /> : null}
              Raw Payload Stored: {meta.rawPayloadStored ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2 text-body">
              {meta.normalizedPayloadGenerated ? <Check className="h-4 w-4 text-success shrink-0" /> : null}
              Normalized Payload Generated: {meta.normalizedPayloadGenerated ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2 text-body">
              {meta.mappingMetadataStored ? <Check className="h-4 w-4 text-success shrink-0" /> : null}
              Mapping Metadata Stored: {meta.mappingMetadataStored ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2 text-body">
              {meta.lineageCaptured ? <Check className="h-4 w-4 text-success shrink-0" /> : null}
              Lineage Captured: {meta.lineageCaptured ? "✓" : "—"}
            </li>
            <li className="flex items-center gap-2 text-body">
              Schema Version Assigned: <span className="font-mono text-caption">{meta.schemaVersion}</span>
            </li>
          </ul>

          <div className="mt-4">
            <p className="text-caption font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Lineage preview
            </p>
            <pre className="rounded-lg border border-border bg-muted/30 p-3 text-[10px] font-mono text-foreground overflow-x-auto">
              {JSON.stringify(lineagePreview.length ? lineagePreview[0] : {
                source_field: "mobile_no",
                mapped_to: "phone_number",
                confidence: 0.95,
                llm_model: "gpt-4.1",
                timestamp: "2026-02-21",
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onComplete} className="gap-1.5">
          Proceed to Governance
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
