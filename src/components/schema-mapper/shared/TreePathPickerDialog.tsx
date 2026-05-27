import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Check, FolderTree, ListOrdered, Braces } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMasterPathCatalog } from "@/hooks/api/useMasterPathCatalog";
import type { TreePathNode } from "@/types/datasource-onboarding";

export interface TreePathPickerDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title?: string;
  /** Initial value to seed the picker (and the manual override input). */
  initialValue?: string;
  /** When true, only leaf paths (FIELD) are selectable. Default true. */
  leavesOnly?: boolean;
  onConfirm: (path: string) => void;
}

const INDENT_PX = 14;

function iconForNode(node: TreePathNode) {
  if (node.nodeType === "OBJECT") return <FolderTree className="h-3 w-3 shrink-0 text-info" />;
  if (node.nodeType === "ARRAY") return <ListOrdered className="h-3 w-3 shrink-0 text-warning" />;
  return <Braces className="h-3 w-3 shrink-0 text-muted-foreground" />;
}

/** Fuzzy: every character of `q` appears in order somewhere in the haystack. */
function fuzzyMatch(haystack: string, q: string): boolean {
  if (!q) return true;
  const hs = haystack.toLowerCase();
  const qs = q.toLowerCase();
  if (hs.includes(qs)) return true;
  let i = 0;
  for (const ch of hs) {
    if (ch === qs[i]) i += 1;
    if (i >= qs.length) return true;
  }
  return false;
}

function collectMatches(tree: TreePathNode[], q: string): Set<string> {
  const matched = new Set<string>();
  if (!q) return matched;
  const ancestors: string[] = [];
  const visit = (n: TreePathNode) => {
    ancestors.push(n.fullPath);
    if (fuzzyMatch(`${n.key} ${n.fullPath}`, q)) {
      for (const a of ancestors) matched.add(a);
    }
    for (const c of n.children ?? []) visit(c);
    ancestors.pop();
  };
  for (const root of tree) visit(root);
  return matched;
}

interface RowProps {
  node: TreePathNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedPath: string;
  onSelect: (path: string) => void;
  searchMatches: Set<string>;
  searchActive: boolean;
  leavesOnly: boolean;
}

function Row({ node, depth, expanded, onToggle, selectedPath, onSelect, searchMatches, searchActive, leavesOnly }: RowProps) {
  if (searchActive && searchMatches.size > 0 && !searchMatches.has(node.fullPath)) return null;

  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = searchActive || expanded.has(node.fullPath);
  const isSelected = selectedPath === node.fullPath;
  const isSelectable = leavesOnly ? node.isLeaf : true;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) onToggle(node.fullPath);
          if (isSelectable) onSelect(node.fullPath);
        }}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md py-1.5 text-left transition-colors hover:bg-muted/50",
          isSelected && "bg-primary/10 ring-1 ring-primary/30",
          !isSelectable && "text-muted-foreground",
        )}
        style={{ paddingLeft: `${depth * INDENT_PX + 8}px`, paddingRight: 8 }}
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
        {iconForNode(node)}
        <span className="text-body font-medium text-foreground truncate">{node.key}</span>
        <Badge variant="secondary" className="ml-auto text-[9px] leading-[12px] font-normal px-1.5 py-0">
          {node.dataType}
        </Badge>
        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
      </button>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((c) => (
            <Row
              key={c.fullPath}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
              searchMatches={searchMatches}
              searchActive={searchActive}
              leavesOnly={leavesOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreePathPickerDialog({
  open,
  onOpenChange,
  title = "Pick a master path",
  initialValue = "",
  leavesOnly = true,
  onConfirm,
}: TreePathPickerDialogProps) {
  const catalog = useMasterPathCatalog();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string>(initialValue);
  const [manualPath, setManualPath] = useState<string>(initialValue);

  useEffect(() => {
    if (open) {
      setSelected(initialValue);
      setManualPath(initialValue);
      setSearch("");
    }
  }, [open, initialValue]);

  const searchMatches = useMemo(
    () => collectMatches(catalog.trees, search),
    [catalog.trees, search],
  );

  const isManualValid = manualPath.trim().length > 0 && (catalog.byPath.has(manualPath.trim()) || catalog.byPath.size === 0);
  const isSelectedValid = selected.length > 0 && catalog.byPath.has(selected);
  const canConfirm = isSelectedValid || isManualValid;

  const onToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const onSelect = (path: string) => {
    setSelected(path);
    setManualPath(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick a path from the master record model or any registered master schema, or paste a known path below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (substring or fuzzy on key & full path)…"
              className="h-9 pl-8"
            />
          </div>

          <ScrollArea className="h-[320px] rounded-lg border border-border bg-card">
            <div className="p-2">
              {catalog.trees.length === 0 ? (
                <p className="p-4 text-center text-body text-muted-foreground">Loading master path catalog…</p>
              ) : (
                catalog.trees.map((root) => (
                  <Row
                    key={root.fullPath}
                    node={root}
                    depth={0}
                    expanded={expanded}
                    onToggle={onToggle}
                    selectedPath={selected}
                    onSelect={onSelect}
                    searchMatches={searchMatches}
                    searchActive={search.trim().length > 0}
                    leavesOnly={leavesOnly}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          <div className="space-y-1">
            <label className="text-caption text-muted-foreground">Manual path</label>
            <Input
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="BasicInformation.CompanyName"
              className="h-9 font-mono"
            />
            {manualPath && !catalog.byPath.has(manualPath.trim()) && catalog.byPath.size > 0 && (
              <p className="text-caption text-destructive">Path is not in the master catalog.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!canConfirm}
            onClick={() => {
              const value = (selected || manualPath).trim();
              if (!value) return;
              onConfirm(value);
              onOpenChange(false);
            }}
          >
            Use this path
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
