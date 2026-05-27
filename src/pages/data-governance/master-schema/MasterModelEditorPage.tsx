/**
 * Master Data Model editor — single page that powers
 *   /data-governance/master-schema/new
 *   /data-governance/master-schema/:id
 *   /data-governance/master-schema/:id/edit
 *
 * Two-pane Resizable layout (tree + node config) tabbed alongside
 * Overview / JSON / Versions / Impact / Approvals. Existing breadcrumb +
 * header chrome is reused verbatim from the previous MasterSchemaDetailPage.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, ShieldCheck, GitCompare, History, FolderTree } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { WorkflowStatusBanner } from "@/components/data-governance/WorkflowStatusBanner";
import { ApprovalHistoryTimeline } from "@/components/data-governance/ApprovalHistoryTimeline";
import { EditableSchemaTreeView } from "@/components/schema-mapper/shared/EditableSchemaTreeView";
import { NodeProfileEditor } from "@/components/schema-mapper/shared/NodeProfileEditor";
import {
  useCreateMasterSchema,
  useMasterSchemaDetail,
  useMasterSchemaSourceTypes,
  useSubmitMasterSchemaApproval,
  useUpdateMasterSchema,
} from "@/hooks/api/useMasterSchemas";
import { useMasterPathCatalog } from "@/hooks/api/useMasterPathCatalog";
import { QK } from "@/lib/query-keys";
import { validateTree, rewriteProfilePaths } from "@/lib/datasource-onboarding-validation";
import type { MasterSchemaStatus } from "@/types/master-schema";
import type {
  NodeType,
  SchemaDataType,
  SchemaNode,
  TreePathNode,
} from "@/types/datasource-onboarding";
import type { SourceType } from "@/types/schema-mapper";
import type { ApprovalEvent } from "@/types/data-governance";

const STATUS_LABELS: Record<MasterSchemaStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  active: "Active",
  deprecated: "Deprecated",
  rejected: "Rejected",
  changes_requested: "Changes Requested",
};

const STATUS_STYLES: Record<MasterSchemaStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning",
  active: "bg-success/15 text-success",
  deprecated: "bg-muted text-muted-foreground opacity-80",
  rejected: "bg-destructive/15 text-destructive",
  changes_requested: "bg-info/15 text-info",
};

const SOURCE_LABELS: Record<SourceType, string> = {
  telecom: "Telecom",
  utility: "Utility",
  bank: "Bank",
  gst: "GST",
  custom: "Custom",
};

const STATUS_TO_WORKFLOW = (s: MasterSchemaStatus): "draft" | "under_review" | "approved" | "rolled_back" => {
  if (s === "active") return "approved";
  if (s === "pending" || s === "changes_requested") return "under_review";
  if (s === "rejected") return "rolled_back";
  return "draft";
};

export type MasterModelEditorMode = "create" | "view" | "edit";

interface MasterModelEditorPageProps {
  mode: MasterModelEditorMode;
}

function legacyFieldDataType(t: string): SchemaDataType {
  switch (String(t).toLowerCase()) {
    case "number":
    case "integer":
    case "decimal":
      return "NUMBER";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "DATE";
    case "object":
      return "OBJECT";
    case "array":
      return "ARRAY";
    default:
      return "STRING";
  }
}

function treePathToSchemaNode(t: TreePathNode): SchemaNode {
  const id = `node-${t.fullPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
  return {
    id,
    name: t.key,
    code: t.fullPath.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
    nodeType: t.nodeType,
    dataType: t.dataType,
    sourceMapping: t.fullPath,
    destinationMapping: t.fullPath,
    validations: [],
    businessRules: [],
    transformations: [],
    children: (t.children ?? []).map(treePathToSchemaNode),
    fieldProfile: t.profile
      ? {
          PK: t.profile.pk,
          SK: t.profile.sk,
          FieldPath: t.profile.fieldPath,
          Section: t.profile.fieldPath.split(".")[0] ?? "",
          FieldName: t.profile.fieldName,
          DisplayName: t.profile.displayName,
          DataType: t.profile.dataType,
          IsPII: t.profile.isPii,
          SimilarFields: t.profile.similarFields,
          Description: t.profile.description,
          Validation: { Type: t.profile.dataType, Rules: t.profile.validationRules ?? [] },
          BusinessValidations: t.profile.businessValidations ?? [],
          CrossFieldValidations: t.profile.crossFieldValidations ?? [],
          SourceMapping: {
            SourceType: "JSON",
            SourcePath: t.profile.sourcePath,
            TargetPath: t.profile.targetPath,
          },
          ValueMode: t.profile.valueMode,
          DefaultValue: t.profile.defaultValue,
          PossibleValues: t.profile.possibleValues ?? [],
          Transformations: t.profile.transformations ?? [],
        }
      : undefined,
  };
}

function schemaNodeToTreePath(n: SchemaNode): TreePathNode {
  const profile = n.fieldProfile;
  return {
    key: n.name,
    fullPath: n.destinationMapping,
    isArray: n.nodeType === "ARRAY",
    isLeaf: n.nodeType === "FIELD",
    nodeType: n.nodeType,
    dataType: n.dataType,
    children: (n.children ?? []).map(schemaNodeToTreePath),
    profile: profile
      ? {
          pk: profile.PK,
          sk: profile.SK,
          fieldPath: profile.FieldPath,
          fieldName: profile.FieldName,
          displayName: profile.DisplayName,
          dataType: profile.DataType,
          sourcePath: profile.SourceMapping.SourcePath,
          targetPath: profile.SourceMapping.TargetPath,
          validationRules: profile.Validation.Rules,
          businessValidations: profile.BusinessValidations,
          crossFieldValidations: profile.CrossFieldValidations,
          valueMode: profile.ValueMode,
          defaultValue: profile.DefaultValue,
          possibleValues: profile.PossibleValues,
          transformations: profile.Transformations,
          isPii: profile.IsPII,
          similarFields: profile.SimilarFields,
          description: profile.Description,
        }
      : undefined,
  };
}

function findNodeById(nodes: SchemaNode[], id: string): SchemaNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const c = findNodeById(n.children ?? [], id);
    if (c) return c;
  }
  return null;
}

function mapTree(nodes: SchemaNode[], fn: (n: SchemaNode) => SchemaNode): SchemaNode[] {
  return nodes.map((n) => {
    const next = fn(n);
    return { ...next, children: mapTree(next.children ?? [], fn) };
  });
}

function removeFromTree(nodes: SchemaNode[], id: string): SchemaNode[] {
  const out: SchemaNode[] = [];
  for (const n of nodes) {
    if (n.id === id) continue;
    out.push({ ...n, children: removeFromTree(n.children ?? [], id) });
  }
  return out;
}

function insertChild(nodes: SchemaNode[], parentId: string | null, child: SchemaNode): SchemaNode[] {
  if (parentId == null) return [...nodes, child];
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children ?? []), child] };
    return { ...n, children: insertChild(n.children ?? [], parentId, child) };
  });
}

function makeNewNode(parent: SchemaNode | null, nodeType: NodeType, indexAtLevel: number): SchemaNode {
  const baseName =
    nodeType === "FIELD"
      ? `NewField${indexAtLevel}`
      : nodeType === "OBJECT"
        ? `NewObject${indexAtLevel}`
        : `NewArray${indexAtLevel}`;
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const dataType: SchemaDataType = nodeType === "FIELD" ? "STRING" : nodeType === "OBJECT" ? "OBJECT" : "ARRAY";
  const parentPath = parent?.destinationMapping ?? "";
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
  if (nodeType === "ARRAY") {
    const itemPath = `${fullPath}[*]`;
    child.children = [
      {
        id: `${id}-item`,
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

export function MasterModelEditorPage({ mode }: MasterModelEditorPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const schemaId = String(id ?? "");
  const isCreate = mode === "create";
  const isReadOnly = mode === "view";

  const { data: schema, isLoading, isError, error, refetch } = useMasterSchemaDetail(
    isCreate ? null : schemaId,
    { allowMockFallback: true, enabled: !isCreate },
  );
  const { data: sourceTypesData } = useMasterSchemaSourceTypes({ allowMockFallback: true });
  const sourceTypes = sourceTypesData?.sourceTypes ?? [];

  const createMutation = useCreateMasterSchema();
  const updateMutation = useUpdateMasterSchema();
  const submitApproval = useSubmitMasterSchemaApproval();
  const catalog = useMasterPathCatalog();

  // ── Local editor state ────────────────────────────────────────────────
  const [name, setName] = useState<string>("");
  const [sourceType, setSourceType] = useState<SourceType>("telecom");
  const [description, setDescription] = useState<string>("");
  const [nodes, setNodes] = useState<SchemaNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<string>("tree");

  // Initialize state when schema arrives or create-mode mounts.
  useEffect(() => {
    if (isCreate) {
      setName("New Master Schema");
      setSourceType((sourceTypes[0] as SourceType) ?? "telecom");
      setDescription("");
      setNodes([]);
      setSelectedId(null);
      setExpanded(new Set());
      return;
    }
    if (!schema) return;
    setName(schema.name);
    setSourceType(schema.sourceType);
    setDescription(schema.description ?? "");
    const schemaWithTree = schema as typeof schema & { tree?: TreePathNode[] };
    const tree =
      schemaWithTree.tree?.length
        ? schemaWithTree.tree.map(treePathToSchemaNode)
        : (schema.fields ?? []).map((f, idx) => ({
            id: `legacy-${schemaId}-${idx}`,
            name: f.name,
            code: f.name.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
            nodeType: "FIELD" as NodeType,
            dataType: legacyFieldDataType(f.dataType),
            sourceMapping: f.name,
            destinationMapping: f.name,
            validations: [],
            businessRules: [],
            transformations: [],
            children: [] as SchemaNode[],
          }));
    setNodes(tree);
    setSelectedId(tree[0]?.id ?? null);
    const exp = new Set<string>();
    const visit = (n: SchemaNode) => {
      exp.add(n.id);
      for (const c of n.children ?? []) visit(c);
    };
    for (const n of tree) visit(n);
    setExpanded(exp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema?.id, isCreate]);

  const selectedNode = selectedId ? findNodeById(nodes, selectedId) : null;
  const validPaths = catalog.byPath.size > 0 ? new Set(catalog.byPath.keys()) : undefined;
  const validation = useMemo(() => validateTree(nodes, { validPaths }), [nodes, validPaths]);
  const blockingErrors = validation.errors.filter((e) => e.severity === "Error");
  const canSave = !blockingErrors.length && !isReadOnly;

  // ── Tree mutations ────────────────────────────────────────────────────
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleAddChild = useCallback((parentId: string | null, nodeType: NodeType) => {
    const parent = parentId ? findNodeById(nodes, parentId) : null;
    if (parent?.nodeType === "ARRAY") return;
    const indexAtLevel = (parent?.children ?? nodes).filter((c) => c.nodeType === nodeType).length + 1;
    const child = makeNewNode(parent, nodeType, indexAtLevel);
    const next = insertChild(nodes, parentId, child);
    setNodes(next);
    setSelectedId(child.id);
    setExpanded((prev) => {
      const s = new Set(prev);
      if (parentId) s.add(parentId);
      s.add(child.id);
      return s;
    });
  }, [nodes]);

  const handleRename = useCallback((nodeId: string, newName: string) => {
    const target = findNodeById(nodes, nodeId);
    if (!target || target.name === "[*]") return;
    const oldFullPath = target.destinationMapping;
    const segments = oldFullPath.split(".");
    segments[segments.length - 1] = newName;
    const newFullPath = segments.join(".");
    const next = mapTree(nodes, (n) => {
      if (n.id !== nodeId) {
        if (n.destinationMapping.startsWith(`${oldFullPath}.`)) {
          return {
            ...n,
            destinationMapping: n.destinationMapping.replace(oldFullPath, newFullPath),
            fieldProfile: n.fieldProfile ? rewriteProfilePaths(n.fieldProfile, oldFullPath, newFullPath) : n.fieldProfile,
          };
        }
        return n;
      }
      return {
        ...n,
        name: newName,
        destinationMapping: newFullPath,
        fieldProfile: n.fieldProfile ? rewriteProfilePaths(n.fieldProfile, oldFullPath, newFullPath) : n.fieldProfile,
      };
    });
    setNodes(next);
  }, [nodes]);

  const handleDelete = useCallback((nodeId: string) => {
    const next = removeFromTree(nodes, nodeId);
    if (selectedId === nodeId) setSelectedId(next[0]?.id ?? null);
    setNodes(next);
  }, [nodes, selectedId]);

  const handleNodeSave = useCallback((updated: SchemaNode) => {
    const next = mapTree(nodes, (n) => (n.id === updated.id ? updated : n));
    setNodes(next);
  }, [nodes]);

  // ── Persistence ───────────────────────────────────────────────────────
  const persistAsync = useCallback(async () => {
    const tree = nodes.map(schemaNodeToTreePath);
    if (isCreate) {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        sourceType,
        description,
        fields: [],
        tree,
      });
      await queryClient.invalidateQueries({ queryKey: QK.auditLogs.all() });
      navigate(`/data-governance/master-schema/${encodeURIComponent(created.id)}`);
      return;
    }
    if (!schema) return;
    const updated = await updateMutation.mutateAsync({
      id: schema.id,
      body: { name: name.trim(), description, tree },
    });
    await queryClient.invalidateQueries({ queryKey: QK.auditLogs.all() });
    if (mode === "edit") navigate(`/data-governance/master-schema/${encodeURIComponent(updated.id)}`);
  }, [createMutation, description, isCreate, mode, name, navigate, nodes, queryClient, schema, sourceType, updateMutation]);

  const handleSave = useCallback(() => {
    if (!canSave) return;
    void persistAsync();
  }, [canSave, persistAsync]);

  const handleSubmitForApproval = useCallback(() => {
    if (!schema) return;
    submitApproval.mutate(schema.id);
  }, [schema, submitApproval]);

  const approvalEvents: ApprovalEvent[] = useMemo(() => {
    // Best-effort: derive from version history (`changesSummary` becomes a synthetic event).
    return (schema?.versions ?? []).map((v) => ({
      id: v.id,
      timestamp: v.createdAt,
      approverName: v.createdBy,
      approverRole: "Schema Steward",
      action: v.status === "active" ? "approve" : v.status === "rejected" ? "reject" : "submit",
      comment: v.changesSummary,
    }));
  }, [schema?.versions]);

  return (
    <>
      <PageBreadcrumb
        segments={[
          { label: "Data Governance", href: "/data-governance/dashboard" },
          { label: "Master Schema Management", href: "/data-governance/master-schema" },
          {
            label: isCreate
              ? "Create schema"
              : mode === "edit"
                ? `Edit: ${schema?.name ?? schemaId}`
                : (schema?.name ?? schemaId),
          },
        ]}
      />

      <div className="space-y-5 animate-fade-in pb-4 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link to="/data-governance/master-schema" aria-label="Back to registry">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-h2 font-semibold text-foreground truncate">
                  {isCreate ? "Create Master Data Model" : (schema?.name ?? "Master Data Model")}
                </h1>
                {!isCreate && (
                  <p className="mt-0.5 text-caption text-muted-foreground truncate">ID: {schemaId}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isReadOnly && (
              <Button className="gap-1.5" onClick={handleSave} disabled={!canSave || createMutation.isPending || updateMutation.isPending}>
                <Save className="h-3.5 w-3.5" />
                {isCreate ? "Create" : "Save"}
              </Button>
            )}
            {!isCreate && schema && (
              <>
                {isReadOnly && (
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => navigate(`/data-governance/master-schema/${encodeURIComponent(schema.id)}/edit`)}
                  >
                    <FolderTree className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                <Button
                  className="gap-1.5"
                  variant="outline"
                  onClick={handleSubmitForApproval}
                  disabled={submitApproval.isPending || schema.status === "pending"}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Submit for approval
                </Button>
              </>
            )}
          </div>
        </div>

        {!isCreate && isLoading && <SkeletonTable rows={6} cols={6} />}
        {!isCreate && isError && <ApiErrorCard error={error} onRetry={() => refetch()} />}

        {(isCreate || schema) && (
          <>
            {!isCreate && schema && (
              <WorkflowStatusBanner status={STATUS_TO_WORKFLOW(schema.status)} />
            )}

            {blockingErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>{blockingErrors.length} validation issue(s) must be resolved</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-disc pl-4 text-caption">
                    {blockingErrors.slice(0, 6).map((e, idx) => (
                      <li key={idx}><span className="font-medium">{e.path || "(root)"}</span> — {e.message}</li>
                    ))}
                    {blockingErrors.length > 6 && (
                      <li className="text-muted-foreground">…and {blockingErrors.length - 6} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="tree">Tree</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="json">JSON View</TabsTrigger>
                <TabsTrigger value="versions">Version History</TabsTrigger>
                <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
                <TabsTrigger value="approvals">Approvals</TabsTrigger>
              </TabsList>

              <TabsContent value="tree">
                {/* Two-pane lg+ */}
                <div className="hidden lg:block h-[calc(100vh-340px)] min-h-[480px]">
                  <ResizablePanelGroup direction="horizontal" className="rounded-xl border border-border bg-card">
                    <ResizablePanel defaultSize={32} minSize={22} maxSize={50}>
                      <ScrollArea className="h-full">
                        <div className="p-2">
                          <EditableSchemaTreeView
                            nodes={nodes}
                            selectedId={selectedId}
                            expandedIds={expanded}
                            onSelect={setSelectedId}
                            onToggleExpand={handleToggleExpand}
                            onAddChild={handleAddChild}
                            onRenameNode={handleRename}
                            onDeleteNode={handleDelete}
                          />
                        </div>
                      </ScrollArea>
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
                              onRenameContainer={(nodeId, newName) => handleRename(nodeId, newName)}
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

                {/* Single-column below lg */}
                <div className="lg:hidden grid grid-cols-1 gap-3">
                  <Card className="border-border shadow-sm">
                    <CardContent className="p-3">
                      <EditableSchemaTreeView
                        nodes={nodes}
                        selectedId={selectedId}
                        expandedIds={expanded}
                        onSelect={setSelectedId}
                        onToggleExpand={handleToggleExpand}
                        onAddChild={handleAddChild}
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
                        onRenameContainer={(nodeId, newName) => handleRename(nodeId, newName)}
                      />
                    ) : (
                      <Card className="border-border shadow-sm">
                        <CardContent className="p-8 text-center text-body text-muted-foreground">
                          Select a node from the tree above.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                  <Card className="lg:col-span-7 border-border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-h4 font-semibold text-foreground">Schema metadata</h2>
                        {!isCreate && schema && (
                          <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[schema.status])}>
                            {STATUS_LABELS[schema.status]}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-caption text-muted-foreground">Schema name</label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" disabled={isReadOnly} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-caption text-muted-foreground">Source type</label>
                            <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)} disabled={isReadOnly || !isCreate}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                                  <SelectItem key={v} value={v}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {!isCreate && schema && (
                            <div className="space-y-1">
                              <label className="text-caption text-muted-foreground">Version</label>
                              <p className="text-body font-medium text-foreground tabular-nums">{schema.version}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-caption text-muted-foreground">Description</label>
                          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} disabled={isReadOnly} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-5 border-border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-h4 font-semibold text-foreground">Governance summary</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-caption text-muted-foreground">Nodes</p>
                          <p className="text-h3 font-bold tabular-nums text-foreground">
                            {countLeaves(nodes)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-caption text-muted-foreground">Versions</p>
                          <p className="text-h3 font-bold tabular-nums text-foreground">{schema?.versions.length ?? 0}</p>
                        </div>
                      </div>
                      <p className="text-caption text-muted-foreground">
                        Save creates a new immutable version. Submit for approval routes the change to the existing Approval Queue.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="json">
                <pre className="rounded-xl border border-border bg-card p-4 overflow-auto text-[11px] leading-[16px] text-foreground max-h-[60vh]">
                  {JSON.stringify({ name, sourceType, description, tree: nodes.map(schemaNodeToTreePath) }, null, 2)}
                </pre>
              </TabsContent>

              <TabsContent value="versions">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-h4 font-semibold text-foreground">Version history</h2>
                  </div>
                  {(schema?.versions ?? []).length === 0 ? (
                    <p className="text-body text-muted-foreground">No prior versions.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={cn(tableHeaderClasses, "min-w-[100px]")}>Version</TableHead>
                          <TableHead className={cn(tableHeaderClasses, "min-w-[120px]")}>Status</TableHead>
                          <TableHead className={cn(tableHeaderClasses, "min-w-[180px]")}>Created at</TableHead>
                          <TableHead className={cn(tableHeaderClasses, "min-w-[140px]")}>Created by</TableHead>
                          <TableHead className={cn(tableHeaderClasses)}>Change summary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(schema?.versions ?? []).map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-mono text-body text-foreground">{v.version}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[v.status])}>
                                {STATUS_LABELS[v.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-body text-foreground tabular-nums">
                              {new Date(v.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </TableCell>
                            <TableCell className="text-body text-foreground">{v.createdBy}</TableCell>
                            <TableCell className="text-body text-muted-foreground">{v.changesSummary}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="impact">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {(["apis", "products", "institutions"] as const).map((bucket) => (
                    <Card key={bucket} className="border-border shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <h3 className="text-h4 font-semibold capitalize text-foreground">{bucket}</h3>
                        {(schema?.impact?.[bucket] ?? []).length === 0 ? (
                          <p className="text-body text-muted-foreground">No linked {bucket}.</p>
                        ) : (
                          <ul className="space-y-1">
                            {(schema?.impact?.[bucket] ?? []).map((entry) => (
                              <li key={entry.id} className="text-body text-foreground">{entry.name}</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="approvals">
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-h4 font-semibold text-foreground">Approval history</h2>
                    </div>
                    {approvalEvents.length === 0 ? (
                      <p className="text-body text-muted-foreground">No approval events recorded.</p>
                    ) : (
                      <ApprovalHistoryTimeline events={approvalEvents} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}

function countLeaves(nodes: SchemaNode[]): number {
  let n = 0;
  const visit = (node: SchemaNode) => {
    if (node.nodeType === "FIELD") {
      n += 1;
      return;
    }
    for (const c of node.children ?? []) visit(c);
  };
  for (const root of nodes) visit(root);
  return n;
}

export default MasterModelEditorPage;
