import { get, post, put, buildQuery, ApiError } from "@/lib/api-client";
import { clientMockFallbackEnabled } from "@/lib/client-mock-fallback";
import { enqueueLocalApprovalItem } from "@/services/approvals.service";
import type { PagedResponse } from "@/services/institutions.service";
import type {
  CanonicalAttribute,
  DictFilters,
  DomainCode,
  DomainEntry,
  EntityType,
} from "@/pages/data-governance/master-schema/types";
import {
  appendApprovalEvent,
  attributesForType,
  createEntityType,
  cutDictionaryVersion,
  deleteAttribute,
  getAttribute,
  getDictionaryVersion,
  getEntityType,
  getSnapshot,
  listAttributes,
  listDomains,
  listEntityTypes,
  saveDomainCodes,
  updateEntityType,
  upsertAttributes,
} from "@/pages/data-governance/master-schema/dictionary-store";
import { activationGateIssues, activationGateWarnings } from "@/pages/data-governance/master-schema/validate-dictionary";
import { nowIso } from "@/pages/data-governance/master-schema/msm-helpers";

const BASE = "/v1/master-dictionary";

function isNetworkOrServerError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.isServerError || err.isUnauthorized || err.isForbidden;
}

async function withFallback<T>(fn: () => Promise<T>, mock: () => T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (clientMockFallbackEnabled && isNetworkOrServerError(err)) return mock();
    throw err;
  }
}

export interface EntityTypeListParams {
  search?: string;
  kind?: string;
  targetTable?: string;
  page?: number;
  size?: number;
}

export async function fetchEntityTypesPage(
  params?: EntityTypeListParams,
): Promise<PagedResponse<EntityType>> {
  return withFallback(
    () => get<PagedResponse<EntityType>>(`${BASE}/entity-types${buildQuery(params ?? {})}`),
    () => {
      let list = listEntityTypes();
      const q = (params?.search ?? "").toLowerCase();
      if (q) {
        list = list.filter(
          (e) => e.displayName.toLowerCase().includes(q) || e.entityType.toLowerCase().includes(q),
        );
      }
      if (params?.kind && params.kind !== "all") list = list.filter((e) => e.kind === params.kind);
      if (params?.targetTable && params.targetTable !== "all") {
        list = list.filter((e) => e.targetTable === params.targetTable);
      }
      const page = params?.page ?? 0;
      const size = params?.size ?? 10;
      return {
        content: list.slice(page * size, (page + 1) * size),
        totalElements: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / size)),
        page,
        size,
      };
    },
  );
}

export async function fetchAllEntityTypes(): Promise<EntityType[]> {
  return withFallback(
    () => get<EntityType[]>(`${BASE}/entity-types?size=500`),
    () => listEntityTypes(),
  );
}

export async function fetchAttributesPage(
  params?: Partial<DictFilters> & { page?: number; size?: number },
): Promise<PagedResponse<CanonicalAttribute>> {
  return withFallback(
    () => get<PagedResponse<CanonicalAttribute>>(`${BASE}/attributes${buildQuery(params ?? {})}`),
    () => {
      const list = listAttributes(params);
      const page = params?.page ?? 0;
      const size = params?.size ?? 10;
      return {
        content: list.slice(page * size, (page + 1) * size),
        totalElements: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / size)),
        page,
        size,
      };
    },
  );
}

export async function fetchAllAttributes(params?: Partial<DictFilters>): Promise<CanonicalAttribute[]> {
  return withFallback(
    () => get<CanonicalAttribute[]>(`${BASE}/attributes${buildQuery({ ...(params ?? {}), size: 5000 })}`),
    () => listAttributes(params),
  );
}

export async function fetchEntityTypeDetail(entityType: string): Promise<{
  entityType: EntityType;
  attributes: CanonicalAttribute[];
}> {
  return withFallback(
    () => get(`${BASE}/entity-types/${encodeURIComponent(entityType)}`),
    () => {
      const et = getEntityType(entityType);
      if (!et) throw new ApiError(404, "NOT_FOUND", `Unknown entity type ${entityType}`);
      return { entityType: et, attributes: attributesForType(entityType) };
    },
  );
}

export async function createEntityTypeRecord(body: EntityType): Promise<EntityType> {
  return withFallback(
    () => post<EntityType>(`${BASE}/entity-types`, body),
    () => createEntityType(body),
  );
}

export async function updateEntityTypeRecord(code: string, patch: Partial<EntityType>): Promise<EntityType> {
  return withFallback(
    () => put<EntityType>(`${BASE}/entity-types/${encodeURIComponent(code)}`, patch),
    () => updateEntityType(code, patch),
  );
}

export async function saveAttributesBatch(attributes: CanonicalAttribute[]): Promise<CanonicalAttribute[]> {
  return withFallback(
    () => put<CanonicalAttribute[]>(`${BASE}/attributes`, attributes),
    () => upsertAttributes(attributes, { bumpVersion: true, changedBy: "You" }),
  );
}

export async function upsertAttributesNoBump(attributes: CanonicalAttribute[]): Promise<CanonicalAttribute[]> {
  return withFallback(
    () => put<CanonicalAttribute[]>(`${BASE}/attributes?bump=0`, attributes),
    () => upsertAttributes(attributes, { bumpVersion: false }),
  );
}

export async function removeAttribute(attributeId: string): Promise<void> {
  return withFallback(
    () => post(`${BASE}/attributes/${encodeURIComponent(attributeId)}/delete`, {}),
    () => deleteAttribute(attributeId),
  );
}

export interface SubmitResult {
  approvalId: string;
}

export async function submitEntityTypeForApproval(entityType: string): Promise<SubmitResult> {
  return withFallback(
    () => post<SubmitResult>(`${BASE}/entity-types/${encodeURIComponent(entityType)}/submit`, {}),
    () => {
      const et = getEntityType(entityType);
      if (!et) throw new ApiError(404, "NOT_FOUND", `Unknown entity type ${entityType}`);
      const pending = attributesForType(entityType).filter((a) => a.status === "pending" || a.status === "proposed");
      const now = nowIso();
      const next = pending.map((a) => ({
        ...a,
        status: "pending" as const,
        updatedAt: now,
      }));
      upsertAttributes(next, { bumpVersion: false });
      for (const a of next) {
        appendApprovalEvent({
          attributeId: a.attributeId,
          entityType,
          timestamp: now,
          actor: "You",
          actorRole: "Schema Steward",
          action: "submitted",
          comment: "Submitted for approval",
        });
      }
      const approvalId = `appr-msm-${Date.now()}`;
      enqueueLocalApprovalItem({
        id: approvalId,
        type: "schema_master",
        name: et.displayName,
        description: `Submit ${pending.length} pending attributes (${entityType})`,
        submittedBy: "You",
        submittedAt: now,
        status: "pending",
        metadata: {
          schemaId: entityType,
          entityType,
          dictionaryVersion: getDictionaryVersion(),
          attributes: JSON.stringify(
            pending.map((a) => ({ attributeId: a.attributeId, version: a.version, diff: `status: ${a.status} → pending` })),
          ),
        },
      });
      return { approvalId };
    },
  );
}

export interface LifecycleResult {
  ok: boolean;
  attribute?: CanonicalAttribute;
  failed?: { attributeId: string; reasons: string[] }[];
  warnings?: string[];
}

export async function runAttributeLifecycle(
  attributeId: string,
  action: "approve" | "reject" | "revise" | "deprecate" | "reinstate" | "reopen",
  body?: { comment?: string; successorId?: string },
): Promise<LifecycleResult> {
  return withFallback(
    () => post<LifecycleResult>(`${BASE}/attributes/${encodeURIComponent(attributeId)}/${action}`, body ?? {}),
    () => {
      const attr = getAttribute(attributeId);
      if (!attr) throw new ApiError(404, "NOT_FOUND", `Unknown attribute ${attributeId}`);
      const now = nowIso();
      const comment = body?.comment ?? "";
      const snapshot = getSnapshot();

      if (action === "approve" || action === "reinstate") {
        const gates = activationGateIssues({ ...attr, status: "active" }, snapshot);
        if (gates.length) {
          return {
            ok: false,
            failed: [{ attributeId, reasons: gates.map((g) => g.message) }],
          };
        }
        const next: CanonicalAttribute = {
          ...attr,
          status: "active",
          approvedBy: "You",
          updatedAt: now,
        };
        upsertAttributes([next], {
          bumpVersion: true,
          historyChange: `status: ${attr.status} → active`,
        });
        cutDictionaryVersion("Dictionary version cut");
        appendApprovalEvent({
          attributeId,
          timestamp: now,
          actor: "You",
          actorRole: "Schema Steward",
          action: action === "reinstate" ? "reinstated" : "approved",
          comment,
        });
        const warnings = activationGateWarnings({ ...attr, status: "active" }, snapshot).map((w) => w.message);
        return { ok: true, attribute: getAttribute(attributeId), warnings };
      }

      if (action === "reject") {
        const next: CanonicalAttribute = { ...attr, status: "rejected", updatedAt: now };
        upsertAttributes([next], { bumpVersion: true, historyChange: `status: ${attr.status} → rejected` });
        appendApprovalEvent({
          attributeId,
          timestamp: now,
          actor: "You",
          actorRole: "Schema Steward",
          action: "rejected",
          comment,
        });
        return { ok: true, attribute: getAttribute(attributeId) };
      }

      if (action === "revise") {
        const next: CanonicalAttribute = { ...attr, status: "pending", updatedAt: now };
        upsertAttributes([next], { bumpVersion: true, historyChange: `status: ${attr.status} → pending` });
        appendApprovalEvent({
          attributeId,
          timestamp: now,
          actor: "You",
          actorRole: "Schema Steward",
          action: "revision requested",
          comment,
        });
        return { ok: true, attribute: getAttribute(attributeId) };
      }

      if (action === "deprecate") {
        const next: CanonicalAttribute = {
          ...attr,
          status: "deprecated",
          supersededBy: body?.successorId ?? attr.supersededBy,
          updatedAt: now,
        };
        upsertAttributes([next], { bumpVersion: true, historyChange: `status: ${attr.status} → deprecated` });
        if (body?.successorId) {
          const succ = getAttribute(body.successorId);
          if (succ && !succ.supersededBy) {
            // successor points forward; the deprecated row holds supersededBy
          }
        }
        appendApprovalEvent({
          attributeId,
          timestamp: now,
          actor: "You",
          actorRole: "Schema Steward",
          action: "deprecated",
          comment,
        });
        return { ok: true, attribute: getAttribute(attributeId) };
      }

      if (action === "reopen") {
        const next: CanonicalAttribute = { ...attr, status: "proposed", updatedAt: now };
        upsertAttributes([next], { bumpVersion: true, historyChange: `status: ${attr.status} → proposed` });
        appendApprovalEvent({
          attributeId,
          timestamp: now,
          actor: "You",
          actorRole: "Schema Steward",
          action: "submitted",
          comment: comment || "Reopened to proposed",
        });
        return { ok: true, attribute: getAttribute(attributeId) };
      }

      return { ok: false };
    },
  );
}

export async function bulkApprove(attributeIds: string[]): Promise<{
  passed: string[];
  failed: { attributeId: string; reasons: string[] }[];
  warnings: string[];
}> {
  const snapshot = getSnapshot();
  const passed: string[] = [];
  const failed: { attributeId: string; reasons: string[] }[] = [];
  const warnings: string[] = [];
  const now = nowIso();
  const toSave: CanonicalAttribute[] = [];
  for (const id of attributeIds) {
    const attr = snapshot.attributes.find((a) => a.attributeId === id);
    if (!attr) {
      failed.push({ attributeId: id, reasons: ["Not found"] });
      continue;
    }
    const gates = activationGateIssues({ ...attr, status: "active" }, snapshot);
    if (gates.length) {
      failed.push({ attributeId: id, reasons: gates.map((g) => g.message) });
      continue;
    }
    warnings.push(
      ...activationGateWarnings({ ...attr, status: "active" }, snapshot).map((w) => `${id}: ${w.message}`),
    );
    toSave.push({ ...attr, status: "active", approvedBy: "You", updatedAt: now });
    passed.push(id);
  }
  if (toSave.length) {
    upsertAttributes(toSave, { bumpVersion: true, historyChange: "status: pending → active" });
    cutDictionaryVersion("Dictionary version cut");
    for (const id of passed) {
      appendApprovalEvent({
        attributeId: id,
        timestamp: now,
        actor: "You",
        actorRole: "Schema Steward",
        action: "approved",
        comment: "Bulk approve",
      });
    }
  }
  return { passed, failed, warnings };
}

export async function bulkReject(attributeIds: string[], comment: string): Promise<void> {
  const now = nowIso();
  const toSave: CanonicalAttribute[] = [];
  for (const id of attributeIds) {
    const attr = getAttribute(id);
    if (!attr) continue;
    if (attr.status !== "pending" && attr.status !== "proposed") continue;
    toSave.push({ ...attr, status: "rejected", updatedAt: now });
    appendApprovalEvent({
      attributeId: id,
      timestamp: now,
      actor: "You",
      actorRole: "Schema Steward",
      action: "rejected",
      comment,
    });
  }
  if (toSave.length) upsertAttributes(toSave, { bumpVersion: true, historyChange: "status: pending → rejected" });
}

export async function bulkDeprecate(attributeIds: string[], comment: string, successorId?: string): Promise<void> {
  const now = nowIso();
  const toSave: CanonicalAttribute[] = [];
  for (const id of attributeIds) {
    const attr = getAttribute(id);
    if (!attr || attr.status !== "active") continue;
    toSave.push({ ...attr, status: "deprecated", supersededBy: successorId ?? attr.supersededBy, updatedAt: now });
    appendApprovalEvent({
      attributeId: id,
      timestamp: now,
      actor: "You",
      actorRole: "Schema Steward",
      action: "deprecated",
      comment,
    });
  }
  if (toSave.length) upsertAttributes(toSave, { bumpVersion: true, historyChange: "status: active → deprecated" });
}

export async function fetchDomains(): Promise<DomainEntry[]> {
  return withFallback(
    () => get<DomainEntry[]>(`${BASE}/domains`),
    () => listDomains(),
  );
}

export async function putDomainCodes(domainName: string, codes: DomainCode[]): Promise<DomainEntry> {
  return withFallback(
    () => put<DomainEntry>(`${BASE}/domains/${encodeURIComponent(domainName)}/codes`, { codes }),
    () => saveDomainCodes(domainName, codes),
  );
}

export function snapshotMeta() {
  const s = getSnapshot();
  return {
    dictionaryVersion: s.dictionaryVersion,
    entityTypes: s.entityTypes,
    attributes: s.attributes,
    attributeGroups: s.attributeGroups,
    domains: s.domains,
    retentionPolicy: s.retentionPolicy,
    rowKeys: s.rowKeys,
    enums: s.enums,
    versionHistory: s.versionHistory,
    approvalEvents: s.approvalEvents,
    seedSynonyms: s.seedSynonyms,
  };
}
