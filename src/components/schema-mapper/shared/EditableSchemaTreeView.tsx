import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X, FolderTree, Braces, ListOrdered, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NodeType, SchemaDataType, SchemaNode, TreeMappingFilter } from "@/types/datasource-onboarding";

const INDENT_PX = 16;

export interface EditableSchemaTreeViewProps {
  nodes: SchemaNode[];
  selectedId?: string | null;
  expandedIds: Set<string>;
  search?: string;
  /** When not `all`, hides FIELD branches that do not match; keeps OBJECT/ARRAY if any child remains. */
  mappingFilter?: TreeMappingFilter;
  onSelect?: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  onAddChild?: (parentId: string | null, nodeType: NodeType) => void;
  onRenameNode?: (id: string, name: string) => void;
  onDeleteNode?: (id: string) => void;
  className?: string;
}

function nodeIcon(nodeType: NodeType, dataType: SchemaDataType) {
  if (nodeType === "OBJECT") return <FolderTree className="h-3 w-3 shrink-0 text-info" />;
  if (nodeType === "ARRAY") return <ListOrdered className="h-3 w-3 shrink-0 text-warning" />;
  if (dataType === "NUMBER") return <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />;
  return <Braces className="h-3 w-3 shrink-0 text-muted-foreground" />;
}

function flattenIdsForSearch(nodes: SchemaNode[], term: string): Set<string> {
  if (!term) return new Set();
  const t = term.toLowerCase();
  const matched = new Set<string>();
  const ancestors: string[] = [];
  const visit = (node: SchemaNode) => {
    ancestors.push(node.id);
    const haystack = `${node.name} ${node.code}`.toLowerCase();
    if (haystack.includes(t)) {
      for (const a of ancestors) matched.add(a);
    }
    for (const c of node.children ?? []) visit(c);
    ancestors.pop();
  };
  for (const n of nodes) visit(n);
  return matched;
}

/** FIELD fully mapped when both catalog paths are non-empty on the profile. */
function fieldFullyMapped(node: SchemaNode): boolean {
  if (node.nodeType !== "FIELD" || !node.fieldProfile) return false;
  const sp = node.fieldProfile.SourceMapping.SourcePath.trim();
  const tp = node.fieldProfile.SourceMapping.TargetPath.trim();
  return !!(sp && tp);
}

function fieldMatchesMappingFilter(node: SchemaNode, filter: TreeMappingFilter): boolean {
  if (filter === "all") return true;
  if (node.nodeType !== "FIELD") return false;
  if (filter === "mapped") return fieldFullyMapped(node);
  if (filter === "unmapped") return node.fieldProfile ? !fieldFullyMapped(node) : true;
  if (filter === "low_confidence") return node.mappingConfidence === "LOW";
  return true;
}

/** Drop FIELD branches that fail the filter; drop containers with no visible descendants. */
function pruneTreeByMapping(nodes: SchemaNode[], filter: TreeMappingFilter): SchemaNode[] {
  if (filter === "all") return nodes;
  const visit = (node: SchemaNode): SchemaNode | null => {
    const rawKids = node.children ?? [];
    const kids = rawKids.map(visit).filter((x): x is SchemaNode => x != null);
    if (node.nodeType === "FIELD") {
      return fieldMatchesMappingFilter(node, filter) ? { ...node, children: [] } : null;
    }
    if (kids.length > 0) return { ...node, children: kids };
    return null;
  };
  return nodes.map(visit).filter((x): x is SchemaNode => x != null);
}

function rowFieldAccent(node: SchemaNode): string {
  if (node.nodeType !== "FIELD" || !node.fieldProfile) return "";
  const sp = node.fieldProfile.SourceMapping.SourcePath.trim();
  const tp = node.fieldProfile.SourceMapping.TargetPath.trim();
  if (!sp || !tp) return "border-l-2 border-muted-foreground/70 ml-0.5 pl-1";
  if (node.mappingConfidence === "LOW") return "border-l-2 border-warning ml-0.5 pl-1";
  if (node.mappingConfidence === "MEDIUM") return "border-l-2 border-info/60 ml-0.5 pl-1";
  return "border-l-2 border-success/50 ml-0.5 pl-1";
}

interface TreeNodeItemProps extends EditableSchemaTreeViewProps {
  node: SchemaNode;
  depth: number;
  searchMatches: Set<string>;
}

function TreeNodeItem(props: TreeNodeItemProps) {
  const {
    node,
    depth,
    selectedId,
    expandedIds,
    search,
    searchMatches,
    onSelect,
    onToggleExpand,
    onAddChild,
    onRenameNode,
    onDeleteNode,
  } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const [pendingDelete, setPendingDelete] = useState(false);

  const isProtected = node.name === "[*]";
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(node.id);
  const isHighlighted = node.id === selectedId;
  const indent = depth * INDENT_PX;

  if (search && searchMatches.size > 0 && !searchMatches.has(node.id)) {
    return null;
  }

  const beginEdit = () => {
    setEditValue(node.name);
    setIsEditing(true);
  };

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === node.name) {
      setIsEditing(false);
      return;
    }
    onRenameNode?.(node.id, trimmed);
    setIsEditing(false);
  };

  return (
    <div>
      <div
        className={cn(
          "group grid w-full items-center rounded-md py-1.5 text-left transition-colors hover:bg-muted/50",
          isHighlighted && "bg-primary/10 ring-1 ring-primary/30",
          rowFieldAccent(node),
        )}
        style={{ gridTemplateColumns: "1fr auto", paddingLeft: `${indent + 8}px`, paddingRight: 4 }}
      >
        <button
          type="button"
          onClick={() => {
            if (hasChildren) onToggleExpand?.(node.id);
            onSelect?.(node.id);
          }}
          className="flex items-center gap-1.5 min-w-0 text-left"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          {nodeIcon(node.nodeType, node.dataType)}
          {isEditing ? (
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setIsEditing(false);
                }
              }}
              className="h-6 max-w-[180px] text-body"
            />
          ) : (
            <span className="text-body font-medium text-foreground truncate">{node.name}</span>
          )}
          <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal px-1.5 py-0 shrink-0">
            {node.dataType}
          </Badge>
        </button>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {!isProtected && (node.nodeType === "OBJECT" || node.nodeType === "ARRAY") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Add child">
                  <Plus className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {node.nodeType === "OBJECT" && (
                  <>
                    <DropdownMenuItem onSelect={() => onAddChild?.(node.id, "FIELD")}>+ Field</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onAddChild?.(node.id, "OBJECT")}>+ Object</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onAddChild?.(node.id, "ARRAY")}>+ Array</DropdownMenuItem>
                  </>
                )}
                {node.nodeType === "ARRAY" && (
                  <DropdownMenuItem disabled>ARRAY children are managed via [*]</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!isProtected && (
            <>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Rename" onClick={beginEdit}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Delete node"
                onClick={() => setPendingDelete(true)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </>
          )}
          {isEditing && (
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Cancel" onClick={() => setIsEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              {...props}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      <AlertDialog open={pendingDelete} onOpenChange={(open) => !open && setPendingDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{node.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasChildren
                ? `This will remove the node and all ${node.children!.length} descendant node(s). Any field profiles attached will be deleted.`
                : "This will remove the field profile from the tree."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDeleteNode?.(node.id); setPendingDelete(false); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function EditableSchemaTreeView(props: EditableSchemaTreeViewProps) {
  const { nodes, search, className, onAddChild, mappingFilter = "all" } = props;
  const displayNodes = useMemo(
    () => pruneTreeByMapping(nodes, mappingFilter),
    [nodes, mappingFilter],
  );
  const searchMatches = useMemo(
    () => flattenIdsForSearch(displayNodes, search ?? ""),
    [displayNodes, search],
  );

  const handleAddRoot = useCallback(
    (t: NodeType) => onAddChild?.(null, t),
    [onAddChild],
  );

  const addRootMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-9">
          <Plus className="h-3 w-3" />
          Add root
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => handleAddRoot("OBJECT")}>+ Object</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleAddRoot("ARRAY")}>+ Array</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleAddRoot("FIELD")}>+ Field</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className={cn("space-y-0.5", className)}>
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-body font-medium text-foreground">No nodes yet</p>
          <p className="text-caption text-muted-foreground">Add the first OBJECT, ARRAY, or FIELD to start building the tree.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => handleAddRoot("OBJECT")}>
              <Plus className="h-3 w-3" />
              Object
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => handleAddRoot("ARRAY")}>
              <Plus className="h-3 w-3" />
              Array
            </Button>
            <Button size="sm" className="h-9 gap-1.5" onClick={() => handleAddRoot("FIELD")}>
              <Plus className="h-3 w-3" />
              Field
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-end pb-2">{addRootMenu}</div>
          {displayNodes.map((node) => (
            <TreeNodeItem
              key={node.id}
              {...props}
              node={node}
              depth={0}
              searchMatches={searchMatches}
            />
          ))}
        </>
      )}
    </div>
  );
}
