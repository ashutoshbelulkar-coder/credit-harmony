import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, FolderTree, GitCompare, History, Save, ShieldCheck } from "lucide-react";
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
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { ApprovalHistoryTimeline } from "@/components/data-governance/ApprovalHistoryTimeline";
import { ChangeCommentDialog } from "@/components/data-governance/data-management/ChangeCommentDialog";
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
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { ApprovalEvent } from "@/types/data-governance";
import type { CanonicalAttribute, EntityKind, EntityType, TargetTable } from "./types";
import { KIND_TO_TABLE, NATURE_OPTIONS, SUBJECT_CLASSES } from "./types";
import {
  cloneAttribute,
  emptyAttribute,
  entityCodeRegex,
  firstAppliesToHref,
  formatDateEnIn,
  nowIso,
  STATUS_STYLES,
} from "./msm-helpers";
import { exportAttributesJson } from "./json-export";
import { validateDictionary } from "./validate-dictionary";
import {
  addAttributeGroup,
  loadNavExpanded,
  saveNavExpanded,
  listApprovalEvents,
  listVersionHistory,
} from "./dictionary-store";
import {
  useAttributeLifecycle,
  useCanMutateMsm,
  useCreateEntityType,
  useDeleteAttribute,
  useDictionarySnapshot,
  useEntityTypeDetail,
  useIsSuperAdmin,
  useSaveAttributes,
  useSaveProfile,
  useSubmitEntityType,
  useUpdateEntityType,
} from "./useMasterDictionary";
import { AttributeNavigator, type LifecycleAction, type NavSelection } from "./AttributeNavigator";
import { AttributeProfileEditor } from "./AttributeProfileEditor";
import { AttributeCountsBanner } from "./AttributeCountsBanner";
import { GroupPanel } from "./GroupPanel";
import { DomainsDrawer } from "./DomainsDrawer";
import { AttributePickerDialog } from "./AttributePickerDialog";

export type MasterModelEditorMode = "create" | "view" | "edit";

interface MasterModelEditorPageProps {
  mode: MasterModelEditorMode;
}

export function MasterModelEditorPage({ mode }: MasterModelEditorPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const entityTypeCode = String(id ?? "");
  const isCreate = mode === "create";
  const isReadOnly = mode === "view";
  const canMutate = useCanMutateMsm();
  const isSuperAdmin = useIsSuperAdmin();
  const { user } = useAuth();

  const snapQ = useDictionarySnapshot();
  const snapshot = snapQ.data;
  const detailQ = useEntityTypeDetail(isCreate ? null : entityTypeCode, { enabled: !isCreate });
  const createEt = useCreateEntityType();
  const updateEt = useUpdateEntityType();
  const savePage = useSaveAttributes();
  const saveProfile = useSaveProfile();
  const submitEt = useSubmitEntityType();
  const lifecycle = useAttributeLifecycle();
  const delAttr = useDeleteAttribute();

  const [tab, setTab] = useState(isCreate ? "overview" : "attributes");
  const [localAttrs, setLocalAttrs] = useState<CanonicalAttribute[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<Partial<EntityType>>({
    displayName: "",
    entityType: "",
    kind: "subject",
    targetTable: "entity_master",
    description: "",
    subjectClass: "HUMAN",
    subtypeExamples: [],
    irResolutionKeys: [],
    groupManifest: [],
    nature: "Deterministic",
    attributeCount: 0,
    pendingCount: 0,
    groups: [],
    lastUpdated: nowIso().slice(0, 10),
  });
  const [selected, setSelected] = useState<NavSelection>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [domainOpen, setDomainOpen] = useState(false);
  const [domainName, setDomainName] = useState<string | null>(null);
  const [commentKind, setCommentKind] = useState<Exclude<LifecycleAction, "delete" | "approve"> | null>(null);
  const [commentAttr, setCommentAttr] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deprecateSuccessor, setDeprecateSuccessor] = useState(false);
  const [pickerForSuccessor, setPickerForSuccessor] = useState(false);
  const [successorId, setSuccessorId] = useState<string | undefined>();
  const [createCopy, setCreateCopy] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("");
  const [copied, setCopied] = useState(false);

  const et = detailQ.data?.entityType;
  const preselect = searchParams.get("attribute");

  useEffect(() => {
    if (isCreate) return;
    if (!detailQ.data) return;
    setMeta(detailQ.data.entityType);
    setLocalAttrs(detailQ.data.attributes.map(cloneAttribute));
    const stored = loadNavExpanded(detailQ.data.entityType.entityType);
    const keys = new Set<string>(["__ungrouped", "__system"]);
    for (const a of detailQ.data.attributes) keys.add(a.attributeGroup ?? "__ungrouped");
    setExpanded(new Set(stored ?? [...keys]));
    if (preselect) setSelected({ kind: "attribute", attributeId: preselect });
  }, [detailQ.data, isCreate, preselect]);

  const allSnapshotAttrs = snapshot?.attributes ?? [];
  const mergedSnapshotAttrs = useMemo(() => {
    const byId = new Map(allSnapshotAttrs.map((a) => [a.attributeId, a]));
    for (const a of localAttrs) byId.set(a.attributeId, a);
    return [...byId.values()];
  }, [allSnapshotAttrs, localAttrs]);

  const validation = useMemo(() => {
    if (!snapshot) return [];
    return validateDictionary({
      snapshot: {
        attributes: mergedSnapshotAttrs,
        entityTypes: snapshot.entityTypes,
        domains: snapshot.domains,
      },
      scoped: localAttrs,
    });
  }, [snapshot, mergedSnapshotAttrs, localAttrs]);

  const blockingErrors = validation.filter((i) => i.severity === "Error");
  const canSave = !isReadOnly && canMutate && blockingErrors.length === 0;

  const counts = useMemo(() => {
    const active = localAttrs.filter((a) => a.status === "active").length;
    const pending = localAttrs.filter((a) => a.status === "pending").length;
    const proposed = localAttrs.filter((a) => a.status === "proposed").length;
    const deprecated = localAttrs.filter((a) => a.status === "deprecated").length;
    const revisionOutOfPath = localAttrs.filter((a) => a.status === "pending" && a.version > 1).length;
    return { active, pending, proposed, deprecated, revisionOutOfPath };
  }, [localAttrs]);

  const pendingSubmit = counts.pending + counts.proposed;
  const selectedAttr =
    selected?.kind === "attribute" ? localAttrs.find((a) => a.attributeId === selected.attributeId) ?? null : null;
  const selectedGroup =
    selected?.kind === "group"
      ? snapshot?.attributeGroups.find((g) => g.group === selected.group) ??
        (selected.group === "__ungrouped"
          ? { group: "Ungrouped", scope: "Specific", appliesTo: "", description: "Attributes with no attribute group." }
          : selected.group === "__system"
            ? { group: "System (reserved)", scope: "Shared (reserved)", appliesTo: "All", description: "Reserved system qualifiers." }
            : { group: selected.group, scope: "Specific", appliesTo: "", description: "" })
      : null;

  const jsonText = useMemo(
    () => exportAttributesJson(localAttrs.filter((a) => a.class !== "Reserved" || a.appliesTo.includes(entityTypeCode))),
    [localAttrs, entityTypeCode],
  );

  const history = isCreate ? [] : listVersionHistory(entityTypeCode);
  const filteredHistory = history.filter((h) => !historyFilter || h.attributeId.toLowerCase().includes(historyFilter.toLowerCase()) || h.change.toLowerCase().includes(historyFilter.toLowerCase()));
  const approvalEventsRaw = isCreate ? [] : listApprovalEvents(entityTypeCode);
  const approvalEvents: ApprovalEvent[] = approvalEventsRaw.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    approverName: e.actor,
    approverRole: e.actorRole,
    action: e.action === "approved" || e.action === "reinstated" ? "approve" : e.action === "rejected" ? "reject" : e.action === "revision requested" || e.action === "deprecated" ? "rollback" : "submit",
    comment: `${e.action}${e.attributeId ? ` · ${e.attributeId}` : ""}${e.comment ? ` — ${e.comment}` : ""}`,
  }));

  const rowKey = snapshot?.rowKeys.find((r) => r.table === (meta.targetTable ?? et?.targetTable));

  const toggleExpand = useCallback(
    (group: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(group)) next.delete(group);
        else next.add(group);
        if (!isCreate) saveNavExpanded(entityTypeCode, [...next]);
        return next;
      });
    },
    [entityTypeCode, isCreate],
  );

  function handleAddAttribute(group: string | null) {
    const table = (meta.targetTable ?? et?.targetTable ?? "entity_master") as TargetTable;
    const draft = emptyAttribute({
      targetTable: table,
      appliesTo: [entityTypeCode],
      attributeGroup: group,
      class: "Business",
      status: "pending",
      displayName: "New attribute",
      canonicalQualifier: "",
      attributeId: `draft.${Date.now()}`,
    });
    setLocalAttrs((prev) => [draft, ...prev]);
    setDirty((d) => new Set(d).add(draft.attributeId));
    setSelected({ kind: "attribute", attributeId: draft.attributeId });
    if (group) {
      setExpanded((prev) => new Set(prev).add(group === null ? "__ungrouped" : group));
    }
  }

  function handleSaveProfile(attr: CanonicalAttribute) {
    if (attr.attributeGroup && snapshot && !snapshot.attributeGroups.some((g) => g.group === attr.attributeGroup)) {
      addAttributeGroup(attr.attributeGroup);
    }
    setLocalAttrs((prev) => {
      const idx = prev.findIndex((a) => a.attributeId === attr.attributeId || (selected?.kind === "attribute" && a.attributeId === selected.attributeId));
      if (idx < 0) return [attr, ...prev];
      const next = [...prev];
      next[idx] = attr;
      return next;
    });
    setDirty((d) => new Set(d).add(attr.attributeId));
    setSelected({ kind: "attribute", attributeId: attr.attributeId });
    saveProfile.mutate([attr]);
  }

  async function handlePageSave() {
    if (!canSave || isCreate) return;
    const changed = localAttrs.filter((a) => dirty.has(a.attributeId) && !a.attributeId.startsWith("draft."));
    const drafts = localAttrs.filter((a) => a.attributeId.startsWith("draft."));
    const toSave = [...changed, ...drafts.filter((d) => d.canonicalQualifier)];
    if (!toSave.length) return;
    await savePage.mutateAsync(toSave);
    if (et) {
      await updateEt.mutateAsync({
        code: entityTypeCode,
        patch: {
          displayName: meta.displayName,
          description: meta.description,
          subjectClass: meta.subjectClass,
          subtypeExamples: meta.subtypeExamples,
          irResolutionKeys: meta.irResolutionKeys,
          groupManifest: meta.groupManifest,
          nature: meta.nature,
        },
      });
    }
    setDirty(new Set());
    if (mode === "edit") navigate(`/data-governance/master-schema/${encodeURIComponent(entityTypeCode)}`);
  }

  async function handleCreate() {
    const code = (meta.entityType ?? "").trim();
    if (!entityCodeRegex().test(code)) return;
    if (!meta.kind) return;
    if (!(meta.groupManifest?.length)) return;
    const kind = meta.kind as Exclude<EntityKind, "system">;
    const created = await createEt.mutateAsync({
      entityType: code,
      displayName: meta.displayName?.trim() || code,
      description: meta.description ?? "",
      kind,
      targetTable: KIND_TO_TABLE[kind],
      attributeCount: 0,
      pendingCount: 0,
      groups: meta.groupManifest ?? [],
      lastUpdated: nowIso().slice(0, 10),
      subjectClass: kind === "subject" ? meta.subjectClass : undefined,
      subtypeExamples: kind === "subject" ? meta.subtypeExamples : undefined,
      irResolutionKeys: kind === "subject" ? meta.irResolutionKeys : undefined,
      groupManifest: meta.groupManifest,
      nature: kind === "subject" ? meta.nature : undefined,
    });
    navigate(`/data-governance/master-schema/${encodeURIComponent(created.entityType)}`);
  }

  function startLifecycle(attributeId: string, action: LifecycleAction) {
    if (action === "delete") {
      setDeleteId(attributeId);
      return;
    }
    if (action === "deprecate") {
      setCommentAttr(attributeId);
      setDeprecateSuccessor(true);
      return;
    }
    setCommentAttr(attributeId);
    setCommentKind(action === "approve" ? null : action);
    if (action === "approve") {
      lifecycle.mutate({ attributeId, action: "approve", comment: "Approved" });
    }
  }

  const displayTitle = isCreate ? "Create Master Data Model" : (meta.displayName || et?.displayName || entityTypeCode);
  const showLoading = !isCreate && detailQ.isLoading && !detailQ.data;
  const showError = !isCreate && detailQ.isError;

  const createValid =
    entityCodeRegex().test((meta.entityType ?? "").trim()) &&
    !snapshot?.entityTypes.some((e) => e.entityType === meta.entityType) &&
    !!meta.kind &&
    (meta.groupManifest?.length ?? 0) > 0;

  function splitInput(text: string): string[] {
    return text.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const impactBuckets = [
    { key: "apis" as const, items: [] as { id: string; name: string }[] },
    { key: "products" as const, items: [] as { id: string; name: string }[] },
    { key: "institutions" as const, items: [] as { id: string; name: string }[] },
  ];

  const navigatorPane = (
    <AttributeNavigator
      attributes={localAttrs}
      groups={snapshot?.attributeGroups ?? []}
      entityType={entityTypeCode}
      expanded={expanded}
      selected={selected}
      readOnly={isReadOnly}
      canMutate={canMutate}
      isSuperAdmin={isSuperAdmin}
      onToggle={toggleExpand}
      onSelect={setSelected}
      onAddAttribute={handleAddAttribute}
      onLifecycle={startLifecycle}
    />
  );

  const rightPane = selectedAttr && snapshot ? (
    <AttributeProfileEditor
      attribute={selectedAttr}
      isNew={selectedAttr.attributeId.startsWith("draft.")}
      allAttributes={mergedSnapshotAttrs}
      entityTypes={snapshot.entityTypes}
      groups={snapshot.attributeGroups}
      domains={snapshot.domains}
      enums={snapshot.enums}
      retentionPolicy={snapshot.retentionPolicy}
      entityType={entityTypeCode}
      readOnly={isReadOnly}
      canMutate={canMutate}
      isSuperAdmin={isSuperAdmin}
      snapshotAttributes={mergedSnapshotAttrs}
      onSaveProfile={handleSaveProfile}
      onRequestRevision={() => startLifecycle(selectedAttr.attributeId, "revise")}
      onRequestDeprecate={() => startLifecycle(selectedAttr.attributeId, "deprecate")}
      onOpenDomain={(name) => {
        setDomainName(name);
        setDomainOpen(true);
      }}
      onOpenAttribute={(id) => {
        const found = mergedSnapshotAttrs.find((a) => a.attributeId === id);
        if (!found) return;
        if (
          found.appliesTo.includes(entityTypeCode) ||
          (found.class === "Reserved" && found.appliesTo.includes("all rows"))
        ) {
          setSelected({ kind: "attribute", attributeId: id });
          return;
        }
        navigate(firstAppliesToHref(found, snapshot.entityTypes));
      }}
    />
  ) : selectedGroup ? (
    <GroupPanel
      group={selectedGroup}
      attributeCount={
        selectedGroup.group === "System (reserved)"
          ? localAttrs.filter((a) => a.class === "Reserved").length
          : selectedGroup.group === "Ungrouped"
            ? localAttrs.filter((a) => a.class !== "Reserved" && a.attributeGroup == null).length
            : localAttrs.filter((a) => a.attributeGroup === selectedGroup.group).length
      }
    />
  ) : (
    <Card className="border-border shadow-sm">
      <CardContent className="p-8 text-center text-body text-muted-foreground">
        Select an attribute from the list to view or edit its profile.
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6 animate-fade-in pb-4 sm:pb-6">
        <PageBreadcrumb
          segments={[
            { label: "Data Governance", href: "/data-governance/dashboard" },
            { label: "Master Schema Management", href: "/data-governance/master-schema" },
            {
              label: isCreate ? "Create schema" : mode === "edit" ? `Edit: ${displayTitle}` : displayTitle,
            },
          ]}
        />

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
                  {mode === "edit" ? `Edit: ${displayTitle}` : displayTitle}
                </h1>
                {!isCreate && (
                  <p className="mt-1 text-caption text-muted-foreground truncate">
                    code: {entityTypeCode} · {meta.targetTable ?? et?.targetTable}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isReadOnly && (
              <Button
                className="gap-1.5"
                onClick={() => (isCreate ? void handleCreate() : void handlePageSave())}
                disabled={isCreate ? !createValid || !canMutate : !canSave || savePage.isPending}
              >
                <Save className="h-3.5 w-3.5" />
                {isCreate ? "Create" : "Save"}
              </Button>
            )}
            {!isCreate && (
              <>
                {isReadOnly && (
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    disabled={!canMutate}
                    onClick={() => navigate(`/data-governance/master-schema/${encodeURIComponent(entityTypeCode)}/edit`)}
                  >
                    <FolderTree className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                <Button
                  className="gap-1.5"
                  variant="outline"
                  onClick={() => submitEt.mutate(entityTypeCode)}
                  disabled={!canMutate || submitEt.isPending || pendingSubmit === 0}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Submit {pendingSubmit} pending attributes
                </Button>
              </>
            )}
          </div>
        </div>

        {!canMutate && (
          <p className="text-caption text-muted-foreground">Read-only for your role ({user?.roles.join(", ") || "no role"}).</p>
        )}

        {showLoading && <SkeletonTable rows={6} cols={6} />}
        {showError && <ApiErrorCard error={detailQ.error} onRetry={() => detailQ.refetch()} />}

        {(isCreate || et) && snapshot && (
          <>
            {!isCreate && (
              <AttributeCountsBanner
                active={counts.active}
                pending={counts.pending}
                proposed={counts.proposed}
                deprecated={counts.deprecated}
                revisionOutOfPath={counts.revisionOutOfPath}
              />
            )}

            {blockingErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>{blockingErrors.length} validation issue(s) must be resolved</AlertTitle>
                <AlertDescription>
                  <ul className="mt-1 list-disc pl-4 text-caption">
                    {blockingErrors.slice(0, 6).map((e, idx) => (
                      <li key={idx}>
                        <span className="font-medium">{e.attributeId}</span> — {e.message}
                      </li>
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
                <TabsTrigger value="attributes">Attributes</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="json">JSON View</TabsTrigger>
                <TabsTrigger value="versions">Version History</TabsTrigger>
                <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
                <TabsTrigger value="approvals">Approvals</TabsTrigger>
              </TabsList>

              <TabsContent value="attributes">
                {!isCreate && (
                  <>
                    <div className="hidden lg:block h-[calc(100vh-340px)] min-h-[480px]">
                      <ResizablePanelGroup direction="horizontal" className="rounded-xl border border-border bg-card">
                        <ResizablePanel defaultSize={32} minSize={22} maxSize={50}>
                          <ScrollArea className="h-full">
                            {navigatorPane}
                          </ScrollArea>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={68} minSize={50}>
                          <ScrollArea className="h-full">
                            <div className="p-4">{rightPane}</div>
                          </ScrollArea>
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    </div>
                    <div className="lg:hidden grid grid-cols-1 gap-3">
                      <Card className="border-border shadow-sm">
                        <CardContent className="p-3">{navigatorPane}</CardContent>
                      </Card>
                      <div>{rightPane}</div>
                    </div>
                  </>
                )}
                {isCreate && (
                  <p className="text-body text-muted-foreground p-4">Register the entity type on the Overview tab first.</p>
                )}
              </TabsContent>

              <TabsContent value="overview">
                {isCreate && (
                  <p className="text-caption text-muted-foreground mb-3">
                    Has its own IR key and is resolved → Subject. Owned by a subject, not independently resolved → Asset. A dated occurrence → Event. Platform-computed values → Feature.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                  <Card className="lg:col-span-7 border-border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <h2 className="text-h4 font-semibold text-foreground">Entity type metadata</h2>
                      <div className="space-y-1">
                        <label className="text-caption text-muted-foreground">Display name</label>
                        <Input className="h-9" value={meta.displayName ?? ""} disabled={isReadOnly} onChange={(e) => setMeta((m) => ({ ...m, displayName: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-caption text-muted-foreground">Entity type code</label>
                        <Input
                          className="h-9 font-mono"
                          value={meta.entityType ?? ""}
                          disabled={!isCreate}
                          onChange={(e) => setMeta((m) => ({ ...m, entityType: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-caption text-muted-foreground">Kind</label>
                          <Select
                            value={meta.kind}
                            disabled={!isCreate}
                            onValueChange={(v) => {
                              const kind = v as Exclude<EntityKind, "system">;
                              setMeta((m) => ({ ...m, kind, targetTable: KIND_TO_TABLE[kind] }));
                            }}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="subject">Subject</SelectItem>
                              <SelectItem value="asset">Asset</SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                              <SelectItem value="feature">Feature</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-caption text-muted-foreground">Target table</label>
                          <p className="text-body font-mono text-foreground pt-2">{meta.targetTable}</p>
                        </div>
                      </div>
                      {meta.kind === "subject" && (
                        <>
                          <div className="space-y-1">
                            <label className="text-caption text-muted-foreground">Subject class</label>
                            <Select value={meta.subjectClass} disabled={isReadOnly} onValueChange={(v) => setMeta((m) => ({ ...m, subjectClass: v }))}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {SUBJECT_CLASSES.map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-caption text-muted-foreground">Subtype examples</label>
                            <Input
                              className="h-9"
                              disabled={isReadOnly}
                              value={(meta.subtypeExamples ?? []).join(", ")}
                              onChange={(e) => setMeta((m) => ({ ...m, subtypeExamples: splitInput(e.target.value) }))}
                              placeholder="Comma-separated"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-caption text-muted-foreground">IR resolution keys</label>
                            <Input
                              className="h-9"
                              disabled={isReadOnly}
                              value={(meta.irResolutionKeys ?? []).join(", ")}
                              onChange={(e) => setMeta((m) => ({ ...m, irResolutionKeys: splitInput(e.target.value) }))}
                              placeholder="Comma-separated"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-caption text-muted-foreground">Nature</label>
                            <Select value={meta.nature} disabled={isReadOnly} onValueChange={(v) => setMeta((m) => ({ ...m, nature: v }))}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {NATURE_OPTIONS.map((n) => (
                                  <SelectItem key={n} value={n}>{n}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                      <div className="space-y-1">
                        <label className="text-caption text-muted-foreground">Group manifest</label>
                        <Select
                          disabled={isReadOnly}
                          value=""
                          onValueChange={(v) => {
                            if (!v) return;
                            setMeta((m) => ({ ...m, groupManifest: [...new Set([...(m.groupManifest ?? []), v])] }));
                          }}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="Add group" /></SelectTrigger>
                          <SelectContent>
                            {(snapshot.attributeGroups ?? []).map((g) => (
                              <SelectItem key={g.group} value={g.group}>{g.group}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-1">
                          {(meta.groupManifest ?? []).map((g) => (
                            <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-caption text-muted-foreground">Description</label>
                        <Textarea rows={4} disabled={isReadOnly} value={meta.description ?? ""} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-5 border-border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-h4 font-semibold text-foreground">Governance summary</h2>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(["active", "pending", "proposed", "deprecated", "rejected"] as const).map((s) => (
                          <Badge key={s} className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[s])}>
                            {s}: {localAttrs.filter((a) => a.status === s).length}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">Standard {localAttrs.filter((a) => a.sensitivity === "Standard").length}</Badge>
                        <Badge className="bg-info/15 text-info text-[10px] border-0">PII {localAttrs.filter((a) => a.sensitivity === "PII").length}</Badge>
                        <Badge className="bg-warning/15 text-warning text-[10px] border-0">Sensitive-PII {localAttrs.filter((a) => a.sensitivity === "Sensitive-PII").length}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(localAttrs.map((a) => a.retentionClass))].map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                        ))}
                      </div>
                      <div className="rounded-lg border border-border p-3 space-y-1">
                        <p className="text-caption font-medium text-foreground">Physical placement</p>
                        <p className="font-mono text-caption text-muted-foreground">Column family: d</p>
                        {rowKey && <p className="font-mono text-caption text-muted-foreground">{rowKey.layout}</p>}
                      </div>
                      <p className="text-caption text-muted-foreground">
                        Save records a new version of each changed attribute. Submit for approval routes pending attributes to the Approval Queue.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="json">
                <div className="flex justify-end mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      void navigator.clipboard.writeText(jsonText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="rounded-xl border border-border bg-card p-4 overflow-auto text-[11px] leading-[16px] text-foreground max-h-[60vh]">
                  {jsonText}
                </pre>
              </TabsContent>

              <TabsContent value="versions">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-h4 font-semibold text-foreground">Version history</h2>
                  </div>
                  <Input className="h-9 max-w-sm" placeholder="Filter by attribute id" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} />
                  {filteredHistory.length === 0 ? (
                    <p className="text-body text-muted-foreground">No prior versions.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={tableHeaderClasses}>Attribute id</TableHead>
                          <TableHead className={tableHeaderClasses}>Version</TableHead>
                          <TableHead className={tableHeaderClasses}>Change</TableHead>
                          <TableHead className={tableHeaderClasses}>Changed by</TableHead>
                          <TableHead className={tableHeaderClasses}>Changed at</TableHead>
                          <TableHead className={tableHeaderClasses}>Dictionary version</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="font-mono text-caption">{h.attributeId || "—"}</TableCell>
                            <TableCell className="tabular-nums">{h.version}</TableCell>
                            <TableCell className="text-caption">{h.change}</TableCell>
                            <TableCell className="text-caption">{h.changedBy}</TableCell>
                            <TableCell className="text-caption">{formatDateEnIn(h.changedAt)}</TableCell>
                            <TableCell className="text-caption">{h.dictionaryVersion}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="impact">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {impactBuckets.map((bucket) => (
                    <Card key={bucket.key} className="border-border shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <h3 className="text-h4 font-semibold capitalize text-foreground">{bucket.key}</h3>
                        {bucket.items.length === 0 ? (
                          <p className="text-body text-muted-foreground">No linked {bucket.key}.</p>
                        ) : (
                          <ul className="space-y-1">
                            {bucket.items.map((entry) => (
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

      {snapshot && (
        <DomainsDrawer
          open={domainOpen}
          onOpenChange={setDomainOpen}
          domains={snapshot.domains}
          attributes={mergedSnapshotAttrs}
          initialDomain={domainName}
          canMutate={canMutate}
        />
      )}

      <ChangeCommentDialog
        open={commentKind === "revise"}
        onOpenChange={(o) => !o && setCommentKind(null)}
        title={`Send ${commentAttr} for revision`}
        description="Sending this attribute for revision removes it from the write path. Values bound to it will be quarantined to _payload until it is re-approved."
        variant="destructive"
        onConfirm={(comment) => {
          if (commentAttr) lifecycle.mutate({ attributeId: commentAttr, action: "revise", comment });
          setCommentKind(null);
        }}
      />
      <ChangeCommentDialog
        open={commentKind === "reject"}
        onOpenChange={(o) => !o && setCommentKind(null)}
        title={`Reject ${commentAttr}`}
        variant="destructive"
        onConfirm={(comment) => {
          if (commentAttr) lifecycle.mutate({ attributeId: commentAttr, action: "reject", comment });
          setCommentKind(null);
        }}
      />
      <ChangeCommentDialog
        open={commentKind === "reopen"}
        onOpenChange={(o) => !o && setCommentKind(null)}
        title={`Reopen ${commentAttr}`}
        onConfirm={(comment) => {
          if (commentAttr) lifecycle.mutate({ attributeId: commentAttr, action: "reopen", comment });
          setCommentKind(null);
        }}
      />
      <ChangeCommentDialog
        open={commentKind === "reinstate"}
        onOpenChange={(o) => !o && setCommentKind(null)}
        title={`Reinstate ${commentAttr}`}
        onConfirm={(comment) => {
          if (commentAttr) lifecycle.mutate({ attributeId: commentAttr, action: "reinstate", comment });
          setCommentKind(null);
        }}
      />
      <ChangeCommentDialog
        open={commentKind === "deprecate"}
        onOpenChange={(o) => !o && setCommentKind(null)}
        title={`Deprecate ${commentAttr}`}
        onConfirm={(comment) => {
          if (!commentAttr) return;
          if (createCopy) {
            const src = localAttrs.find((a) => a.attributeId === commentAttr);
            if (src) {
              const copy = emptyAttribute({
                ...cloneAttribute(src),
                attributeId: "",
                canonicalQualifier: src.canonicalQualifier,
                status: "pending",
                version: 1,
                displayName: `${src.displayName} (successor)`,
                supersededBy: null,
              });
              copy.attributeId = `draft.${Date.now()}`;
              setLocalAttrs((prev) => [copy, ...prev.map((a) => (a.attributeId === commentAttr ? { ...a, supersededBy: copy.attributeId } : a))]);
              lifecycle.mutate({ attributeId: commentAttr, action: "deprecate", comment, successorId: copy.attributeId });
              setSelected({ kind: "attribute", attributeId: copy.attributeId });
            }
          } else {
            lifecycle.mutate({ attributeId: commentAttr, action: "deprecate", comment, successorId });
          }
          setCommentKind(null);
          setCreateCopy(false);
        }}
      />

      <AlertDialog open={deprecateSuccessor} onOpenChange={setDeprecateSuccessor}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deprecate & replace</AlertDialogTitle>
            <AlertDialogDescription>
              Pick a successor attribute, or create a successor from a copy of this one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setCreateCopy(true);
                setSuccessorId(undefined);
                setDeprecateSuccessor(false);
                setCommentKind("deprecate");
              }}
            >
              Create successor from a copy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setCreateCopy(false);
                setDeprecateSuccessor(false);
                setPickerForSuccessor(true);
              }}
            >
              Pick successor
            </Button>
            <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AttributePickerDialog
        open={pickerForSuccessor}
        onOpenChange={setPickerForSuccessor}
        title="Pick successor"
        attributes={mergedSnapshotAttrs}
        filter={(a) => a.attributeId !== commentAttr}
        onConfirm={(id) => {
          setSuccessorId(id);
          setCreateCopy(false);
          setCommentKind("deprecate");
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteId}?</AlertDialogTitle>
            <AlertDialogDescription>This attribute has never been active.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteId) return;
                if (deleteId.startsWith("draft.")) {
                  setLocalAttrs((prev) => prev.filter((a) => a.attributeId !== deleteId));
                } else {
                  delAttr.mutate(deleteId);
                  setLocalAttrs((prev) => prev.filter((a) => a.attributeId !== deleteId));
                }
                setSelected(null);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MasterModelEditorPage;
