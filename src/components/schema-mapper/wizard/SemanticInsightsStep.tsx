import { useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fieldClusters } from "@/data/schema-mapper-mock";
import type { FieldCluster, FieldClusterAction } from "@/types/schema-mapper";

interface SemanticInsightsStepProps {
  clusters: FieldCluster[];
  onClustersChange?: (clusters: FieldCluster[]) => void;
  onComplete: () => void;
}

const CLUSTER_ACTIONS: { value: FieldClusterAction; label: string }[] = [
  { value: "merge", label: "Merge under canonical" },
  { value: "keep_alias", label: "Keep alias" },
  { value: "flag_duplicate", label: "Flag duplicate" },
];

export function SemanticInsightsStep({
  clusters: initialClusters,
  onClustersChange,
  onComplete,
}: SemanticInsightsStepProps) {
  const [clusters, setClusters] = useState<FieldCluster[]>(initialClusters);

  const setClusterAction = useCallback(
    (id: string, action: FieldClusterAction) => {
      const next = clusters.map((c) => (c.id === id ? { ...c, action } : c));
      setClusters(next);
      onClustersChange?.(next);
    },
    [clusters, onClustersChange],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">Global Field Clusters Impact</h3>

        <div className="space-y-4">
          {clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="rounded-lg border border-border p-3 space-y-2.5 sm:space-y-2"
            >
              <p className="text-body font-medium text-foreground">{cluster.canonicalLabel}</p>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                <span className="text-caption text-muted-foreground">Fields found across platform:</span>
                {cluster.fieldNames.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[9px] font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-caption text-muted-foreground">Action:</span>
                <Select
                  value={cluster.action ?? ""}
                  onValueChange={(v) => setClusterAction(cluster.id, v as FieldClusterAction)}
                >
                  <SelectTrigger className="h-8 w-full min-w-0 sm:w-[200px] text-caption">
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CLUSTER_ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-caption font-medium text-muted-foreground mb-1">Graph view</p>
          <p className="text-[11px] text-muted-foreground">
            Schema relationships: Retail Credit v1 ↔ Telecom v2 ↔ Utility v1 (shared field clusters drive similarity).
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onComplete} className="gap-1.5">
          Proceed to Storage Visibility
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
