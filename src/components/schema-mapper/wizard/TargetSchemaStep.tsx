import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SchemaTreeView } from "@/components/schema-mapper/shared/SchemaTreeView";
import { masterSchemaVersions, masterSchemaTree } from "@/data/schema-mapper-mock";

interface TargetSchemaStepProps {
  selectedVersionId: string | null;
  onComplete: (versionId: string) => void;
}

export function TargetSchemaStep({ selectedVersionId, onComplete }: TargetSchemaStepProps) {
  const [versionId, setVersionId] = useState(selectedVersionId ?? "master-v1.1");
  const selectedVersion = masterSchemaVersions.find((v) => v.id === versionId);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">
          Select Target Master Schema
        </h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left: version selector */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-caption text-muted-foreground">Master Schema Version</label>
              <Select value={versionId} onValueChange={setVersionId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {masterSchemaVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="new" disabled>
                    + Create New Master Version
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedVersion && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-body font-medium text-foreground">{selectedVersion.label}</p>
                <p className="text-caption text-muted-foreground">{selectedVersion.description}</p>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-[9px] leading-[12px]">
                    {selectedVersion.fieldCount} fields
                  </Badge>
                  <span className="text-[9px] leading-[12px] text-muted-foreground">
                    Updated: {new Date(selectedVersion.lastUpdated).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={() => onComplete(versionId)}
              disabled={!versionId || versionId === "new"}
              className="gap-1.5 w-full sm:w-auto"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Start AI Mapping
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Right: canonical tree preview */}
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="mb-2 text-caption font-medium uppercase tracking-wider text-muted-foreground">
              Canonical Schema Tree
            </p>
            <ScrollArea className="h-[340px]">
              <SchemaTreeView nodes={masterSchemaTree} />
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
