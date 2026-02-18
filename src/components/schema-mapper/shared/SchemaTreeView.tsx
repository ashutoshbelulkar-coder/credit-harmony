import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TreeNode {
  id: string;
  name: string;
  dataType?: string;
  description?: string;
  depth: number;
  children?: TreeNode[];
  sampleValues?: string[];
  nullFrequency?: number;
  enumValues?: string[];
}

interface SchemaTreeViewProps {
  nodes: TreeNode[];
  highlightedId?: string | null;
  onNodeClick?: (id: string) => void;
  className?: string;
  showSamples?: boolean;
}

function TreeNodeItem({
  node,
  highlightedId,
  onNodeClick,
  showSamples,
}: {
  node: TreeNode;
  highlightedId?: string | null;
  onNodeClick?: (id: string) => void;
  showSamples?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isHighlighted = node.id === highlightedId;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onNodeClick?.(node.id);
        }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/50",
          isHighlighted && "bg-primary/10 ring-1 ring-primary/30",
        )}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="text-body font-medium text-foreground">{node.name}</span>
        {node.dataType && (
          <Badge variant="secondary" className="ml-auto text-[9px] leading-[12px] font-normal px-1.5 py-0">
            {node.dataType}
          </Badge>
        )}
      </button>

      {showSamples && node.sampleValues && node.sampleValues.length > 0 && (
        <div
          className="mb-0.5 text-[9px] leading-[12px] text-muted-foreground truncate"
          style={{ paddingLeft: `${node.depth * 16 + 28}px` }}
        >
          e.g. {node.sampleValues.slice(0, 3).join(", ")}
        </div>
      )}

      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              highlightedId={highlightedId}
              onNodeClick={onNodeClick}
              showSamples={showSamples}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SchemaTreeView({
  nodes,
  highlightedId,
  onNodeClick,
  className,
  showSamples,
}: SchemaTreeViewProps) {
  return (
    <div className={cn("space-y-0.5", className)}>
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          highlightedId={highlightedId}
          onNodeClick={onNodeClick}
          showSamples={showSamples}
        />
      ))}
    </div>
  );
}
