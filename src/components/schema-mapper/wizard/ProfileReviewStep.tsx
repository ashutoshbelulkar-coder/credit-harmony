import { useCallback, useMemo, useState } from "react";
import { Search, AlertCircle, Save, SendHorizonal, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApprovalHistoryTimeline } from "@/components/data-governance/ApprovalHistoryTimeline";
import { ReasonInputDialog } from "@/components/data-governance/ReasonInputDialog";
import { EditableSchemaTreeView } from "@/components/schema-mapper/shared/EditableSchemaTreeView";
import { NodeProfileEditor } from "@/components/schema-mapper/shared/NodeProfileEditor";
import { useMasterPathCatalog } from "@/hooks/api/useMasterPathCatalog";
import { validateTree, rewriteProfilePaths } from "@/lib/datasource-onboarding-validation";
import type {
  Datasource,
  NodeType,
  ProfileReviewAction,
  SchemaDataType,
  SchemaNode,
  SchemaValidationIssue,
  TreeMappingFilter,
} from "@/types/datasource-onboarding";
import type { ApprovalEvent } from "@/types/data-governance";

export interface ProfileReviewStepProps {
  datasource: Datasource;
  nodes: SchemaNode[];
  approvalEvents?: ApprovalEvent[];
  isSaving?: boolean;
  isSubmittingApproval?: boolean;
  onNodesChange: (next: SchemaNode[]) => void;
  onSaveDraft: () => void | Promise<void>;
  onFinish: () => void | Promise<void>;
  onSubmitApproval: () => void | Promise<void>;
  onSubmitReview?: (payload: { action: ProfileReviewAction; comment: string }) => void | Promise<void>;
}

function findNodeById(nodes: SchemaNode[], id: string): SchemaNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const c = findNodeById(n.children ?? [], id);
    if (c) return c;
  }
  return null;
}

function mapTree(
  nodes: SchemaNode[],
  fn: (node: SchemaNode, parent: SchemaNode | null) => SchemaNode,
  parent: SchemaNode | null = null,
): SchemaNode[] {
  return nodes.map((n) => {
    const next = fn(n, parent);
    return { ...next, children: mapTree(next.children ?? [], fn, next) };
  });
}

function removeFromTree(nodes: SchemaNode[], id: string): SchemaNode[] {
  const result: SchemaNode[] = [];
  for (const n of nodes) {
    if (n.id === id) continue;
    result.push({ ...n, children: removeFromTree(n.children ?? [], id) });
  }
  return result;
}

function insertChild(nodes: SchemaNode[], parentId: string | null, child: SchemaNode): SchemaNode[] {
  if (parentId == null) {
    return [...nodes, child];
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children ?? []), child] };
    }
    return { ...n, children: insertChild(n.children ?? [], parentId, child) };
  });
}

function makeChildNode(
  parent: SchemaNode | null,
  nodeType: NodeType,
  index: number,
): SchemaNode {
  const baseName =
    nodeType === "FIELD"
      ? `NewField${index}`
      : nodeType === "OBJECT"
        ? `NewObject${index}`
        : `NewArray${index}`;
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const dataType: SchemaDataType = nodeType === "FIELD" ? "STRING" : nodeType === "OBJECT" ? "OBJECT" : "ARRAY";
  const parentPath = parent?.destinationMapping ?? parent?.name ?? "";
  const fullPath = parentPath ? `${parentPath}.${baseName}` : baseName;

  const child: SchemaNode = {
    id,
    name: baseName,
    code: baseName.toUpperCase(),
    nodeType,
    dataType,
    sourceMapping: fullPath,
    destinationMapping: fullPath,
    validations: [],
    businessRules: [],
    transformations: [],
    children: [],
  };

  // ARRAYs always carry a `[*]` direct child.
  if (nodeType === "ARRAY") {
    const itemId = `${id}-item`;
    const itemPath = `${fullPath}[*]`;
    child.children = [
      {
        id: itemId,
        name: "[*]",
        code: "ITEM",
        nodeType: "OBJECT",
        dataType: "OBJECT",
        sourceMapping: itemPath,
        destinationMapping: itemPath,
        validations: [],
        businessRules: [],
        transformations: [],
        children: [],
      },
    ];
  }
  return child;
}

function approvalEventsFromComments(ds: Datasource): ApprovalEvent[] {
  return (ds.reviewComments ?? []).map((c, idx) => ({
    id: c.id ?? `rev-${idx}`,
    timestamp: c.createdAt,
    approverName: c.author ?? "—",
    approverRole: "Reviewer",
    action: c.action === "APPROVE" ? "approve" : c.action === "REJECT" ? "reject" : "submit",
    comment: c.comment,
  }));
}

export function ProfileReviewStep({
  datasource,
  nodes,
  approvalEvents,
  isSaving,
  isSubmittingApproval,
  onNodesChange,
  onSaveDraft,
  onFinish,
  onSubmitApproval,
  onSubmitReview,
}: ProfileReviewStepProps) {
  const catalog = useMasterPathCatalog();
  const validPaths = catalog.byPath.size > 0 ? new Set(catalog.byPath.keys()) : undefined;

  const [selectedId, setSelectedId] = useState<string | null>(() => nodes[0]?.id ?? null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    const visit = (n: SchemaNode) => {
      s.add(n.id);
      for (const c of n.children ?? []) visit(c);
    };
    for (const n of nodes) visit(n);
    return s;
  });
  const [search, setSearch] = useState("");
  const [mappingFilter, setMappingFilter] = useState<TreeMappingFilter>("all");
  const [activeTab, setActiveTab] = useState<"tree" | "review">("tree");
  const [reviewDialog, setReviewDialog] = useState<{ action: ProfileReviewAction } | null>(null);

  const validation = useMemo(() => validateTree(nodes, { validPaths }), [nodes, validPaths]);
  const blockingErrors = validation.errors.filter((e) => e.severity === "Error");

  const selectedNode = selectedId ? findNodeById(nodes, selectedId) : null;

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = useCallback(
    (parentId: string | null, nodeType: NodeType) => {
      const parent = parentId ? findNodeById(nodes, parentId) : null;
      if (parent?.nodeType === "ARRAY") {
        // ARRAY direct children are managed via [*]; silently no-op for FIELD/OBJECT additions on ARRAY.
        return;
      }
      const indexAtLevel =
        (parent?.children ?? nodes).filter((c) => c.nodeType === nodeType).length + 1;
      const child = makeChildNode(parent, nodeType, indexAtLevel);
      const next = insertChild(nodes, parentId, child);
      onNodesChange(next);
      setSelectedId(child.id);
      setExpanded((prev) => {
        const s = new Set(prev);
        if (parentId) s.add(parentId);
        s.add(child.id);
        return s;
      });
    },
    [nodes, onNodesChange],
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      const node = findNodeById(nodes, id);
      if (!node || node.name === "[*]") return;
      const oldFullPath = node.destinationMapping;
      const parentSegments = oldFullPath.split(".");
      parentSegments[parentSegments.length - 1] = name;
      const newFullPath = parentSegments.join(".");
      const updated = mapTree(nodes, (n) => {
        if (n.id !== id) {
          // Rewrite descendant paths if this node is renamed
          if (n.destinationMapping.startsWith(`${oldFullPath}.`)) {
            const updatedPath = n.destinationMapping.replace(oldFullPath, newFullPath);
            return {
              ...n,
              destinationMapping: updatedPath,
              fieldProfile: n.fieldProfile
                ? rewriteProfilePaths(n.fieldProfile, oldFullPath, newFullPath)
                : n.fieldProfile,
            };
          }
          return n;
        }
        return {
          ...n,
          name,
          destinationMapping: newFullPath,
          fieldProfile: n.fieldProfile
            ? rewriteProfilePaths(n.fieldProfile, oldFullPath, newFullPath)
            : n.fieldProfile,
        };
      });
      onNodesChange(updated);
    },
    [nodes, onNodesChange],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const next = removeFromTree(nodes, id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      onNodesChange(next);
    },
    [nodes, onNodesChange, selectedId],
  );

  const handleNodeSave = useCallback(
    (updated: SchemaNode) => {
      const next = mapTree(nodes, (n) => (n.id === updated.id ? updated : n));
      onNodesChange(next);
    },
    [nodes, onNodesChange],
  );

  const submittedEvents: ApprovalEvent[] = approvalEvents ?? approvalEventsFromComments(datasource);

  const handleReviewDialogConfirm = ({ comment }: { reason: string; comment?: string }) => {
    if (!reviewDialog) return;
    void onSubmitReview?.({ action: reviewDialog.action, comment: comment ?? "" });
    setReviewDialog(null);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tree" | "review")}>
          <TabsList>
            <TabsTrigger value="tree">Tree</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => void onSaveDraft()} disabled={isSaving}>
            <Save className="h-3.5 w-3.5" />
            Save draft
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={blockingErrors.length > 0 || isSubmittingApproval}
            onClick={() => void onSubmitApproval()}
          >
            <SendHorizonal className="h-3.5 w-3.5" />
            Submit for approval
          </Button>
          <Button
            className="gap-1.5"
            disabled={blockingErrors.length > 0}
            onClick={() => void onFinish()}
          >
            Finish
          </Button>
        </div>
      </div>

      {blockingErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{blockingErrors.length} validation issue(s) must be resolved</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4 text-caption">
              {blockingErrors.slice(0, 8).map((e: SchemaValidationIssue, idx) => (
                <li key={idx} className="break-words">
                  <span className="font-medium">{e.path || "(root)"}</span> — {e.message}
                </li>
              ))}
              {blockingErrors.length > 8 && (
                <li className="text-muted-foreground">…and {blockingErrors.length - 8} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tree" | "review")} className="flex-1 min-h-0 flex flex-col">
        <TabsContent value="tree" className="m-0 flex-1 min-h-0">
          {/* Stack on small screens, two-pane on lg+ */}
          <div className="hidden lg:block h-[calc(100vh-340px)] min-h-[480px]">
            <ResizablePanelGroup direction="horizontal" className="rounded-xl border border-border bg-card">
              <ResizablePanel defaultSize={32} minSize={22} maxSize={50}>
                <div className="flex h-full flex-col">
                  <div className="p-3 border-b border-border space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search nodes…"
                        className="h-8 pl-8"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-caption text-muted-foreground">Mapping</span>
                      <Select
                        value={mappingFilter}
                        onValueChange={(v) => setMappingFilter(v as TreeMappingFilter)}
                      >
                        <SelectTrigger className="h-9 text-caption">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All nodes</SelectItem>
                          <SelectItem value="mapped">Mapped fields</SelectItem>
                          <SelectItem value="unmapped">Not mapped</SelectItem>
                          <SelectItem value="low_confidence">Low confidence</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-2">
                      <EditableSchemaTreeView
                        nodes={nodes}
                        selectedId={selectedId}
                        expandedIds={expanded}
                        search={search}
                        mappingFilter={mappingFilter}
                        onSelect={handleSelect}
                        onToggleExpand={handleToggle}
                        onAddChild={handleAdd}
                        onRenameNode={handleRename}
                        onDeleteNode={handleDelete}
                      />
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={68} minSize={50}>
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {selectedNode ? (
                      <NodeProfileEditor
                        node={selectedNode}
                        validPaths={validPaths}
                        onSave={handleNodeSave}
                        onRenameContainer={(id, name) => handleRename(id, name)}
                      />
                    ) : (
                      <Card className="border-border shadow-sm">
                        <CardContent className="p-8 text-center text-body text-muted-foreground">
                          Select a node from the tree to view or edit its profile.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* Single-column mobile/tablet */}
          <div className="lg:hidden grid grid-cols-1 gap-3">
            <Card className="border-border shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search nodes…"
                    className="h-8 pl-8"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-caption text-muted-foreground">Mapping</span>
                  <Select
                    value={mappingFilter}
                    onValueChange={(v) => setMappingFilter(v as TreeMappingFilter)}
                  >
                    <SelectTrigger className="h-9 text-caption">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All nodes</SelectItem>
                      <SelectItem value="mapped">Mapped fields</SelectItem>
                      <SelectItem value="unmapped">Not mapped</SelectItem>
                      <SelectItem value="low_confidence">Low confidence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <EditableSchemaTreeView
                  nodes={nodes}
                  selectedId={selectedId}
                  expandedIds={expanded}
                  search={search}
                  mappingFilter={mappingFilter}
                  onSelect={handleSelect}
                  onToggleExpand={handleToggle}
                  onAddChild={handleAdd}
                  onRenameNode={handleRename}
                  onDeleteNode={handleDelete}
                />
              </CardContent>
            </Card>
            <div>
              {selectedNode ? (
                <NodeProfileEditor
                  node={selectedNode}
                  validPaths={validPaths}
                  onSave={handleNodeSave}
                  onRenameContainer={(id, name) => handleRename(id, name)}
                />
              ) : (
                <Card className="border-border shadow-sm">
                  <CardContent className="p-8 text-center text-body text-muted-foreground">
                    Select a node from the tree above to view or edit its profile.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="review" className="m-0 flex-1 min-h-0">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-h4 font-semibold text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Review activity
                  </h3>
                  <p className="mt-0.5 text-caption text-muted-foreground">
                    Submit a reviewer decision and view the approval history for this datasource.
                  </p>
                </div>
                {onSubmitReview && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setReviewDialog({ action: "REQUEST_CHANGES" })}>
                      Request changes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setReviewDialog({ action: "REJECT" })}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => setReviewDialog({ action: "APPROVE" })}>
                      Approve
                    </Button>
                  </div>
                )}
              </div>
              {submittedEvents.length === 0 ? (
                <p className="text-body text-muted-foreground">No review events yet.</p>
              ) : (
                <ApprovalHistoryTimeline events={submittedEvents} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReasonInputDialog
        open={reviewDialog != null}
        onOpenChange={(open) => !open && setReviewDialog(null)}
        title={
          reviewDialog?.action === "APPROVE"
            ? "Approve datasource"
            : reviewDialog?.action === "REJECT"
              ? "Reject datasource"
              : "Request changes"
        }
        confirmLabel={
          reviewDialog?.action === "APPROVE"
            ? "Approve"
            : reviewDialog?.action === "REJECT"
              ? "Reject"
              : "Request changes"
        }
        onConfirm={handleReviewDialogConfirm}
      />
    </div>
  );
}
