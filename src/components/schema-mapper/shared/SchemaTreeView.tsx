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

const INDENT_PX = 16;
const CHEVRON_W = 14;
const GAP = 6;

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

  const indent = node.depth * INDENT_PX;
  const textIndent = indent + CHEVRON_W + GAP;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onNodeClick?.(node.id);
        }}
        className={cn(
          "group grid w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
          isHighlighted && "bg-primary/10 ring-1 ring-primary/30",
        )}
        style={{
          gridTemplateColumns: "1fr auto",
          paddingLeft: `${indent + 8}px`,
        }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <span className="text-body font-medium text-foreground truncate">{node.name}</span>
        </span>

        {node.dataType && (
          <Badge
            variant="secondary"
            className="text-[9px] leading-[12px] font-normal px-1.5 py-0 ml-3 shrink-0 self-center"
          >
            {node.dataType}
          </Badge>
        )}
      </button>

      {showSamples && node.sampleValues && node.sampleValues.length > 0 && (
        <p
          className="pb-0.5 text-[9px] leading-[12px] text-muted-foreground truncate"
          style={{ paddingLeft: `${textIndent + 8}px` }}
        >
          e.g. {node.sampleValues.slice(0, 3).join(", ")}
        </p>
      )}

      {!showSamples && node.description && (
        <p
          className="pb-0.5 text-[9px] leading-[12px] text-muted-foreground/70 truncate"
          style={{ paddingLeft: `${textIndent + 8}px` }}
        >
          {node.description}
        </p>
      )}

      {node.enumValues && node.enumValues.length > 0 && expanded && (
        <div
          className="flex flex-wrap gap-1 pb-1"
          style={{ paddingLeft: `${textIndent + 8}px` }}
        >
          {node.enumValues.map((v) => (
            <Badge
              key={v}
              variant="outline"
              className="text-[8px] leading-[10px] px-1 py-0 font-normal text-muted-foreground"
            >
              {v}
            </Badge>
          ))}
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
