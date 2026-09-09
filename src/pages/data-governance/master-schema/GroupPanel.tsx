import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AttributeGroup } from "./types";

interface GroupPanelProps {
  group: AttributeGroup | { group: string; scope: string; appliesTo: string; description: string };
  attributeCount: number;
}

export function GroupPanel({ group, attributeCount }: GroupPanelProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div>
          <h2 className="text-h4 font-semibold text-foreground">{group.group}</h2>
          <p className="mt-1 text-caption text-muted-foreground">{group.scope}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{group.scope}</Badge>
          {group.appliesTo && (
            <Badge variant="outline" className="text-[10px]">{group.appliesTo}</Badge>
          )}
        </div>
        {group.description && (
          <p className="text-body text-muted-foreground">{group.description}</p>
        )}
        <p className="text-caption text-muted-foreground tabular-nums">{attributeCount} attributes</p>
        <p className="text-caption text-muted-foreground">
          Attributes are managed in the list. Add attribute adds to this group.
        </p>
      </CardContent>
    </Card>
  );
}
