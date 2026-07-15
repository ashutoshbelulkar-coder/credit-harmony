import { useSyncExternalStore } from "react";
import seed from "@/data/product-management-demo.json";
import {
  ALLOWED_TRANSITIONS,
  computeDefinitionFingerprint,
  normalizeProductName,
  type ApprovalCycle,
  type ApprovalDecision,
  type AuditAction,
  type BrdLifecycleStatus,
  type DemoAuditEvent,
  type DemoNotification,
  type DemoProductVersion,
  type ProductManagementDemoState,
  type ProductMetadata,
} from "@/data/product-management-types";
import type { EnquiryConfig, PacketConfig } from "@/data/data-products-mock";
import { DEFAULT_ENQUIRY_CONFIG, normalizeEnquiryConfig } from "@/data/data-products-mock";

const STORAGE_KEY = "hcb-product-mgmt-demo-v6";

function cloneSeed(): ProductManagementDemoState {
  const raw = structuredClone(seed) as ProductManagementDemoState;
  raw.versions = raw.versions.map((v) => ({
    ...v,
    enquiryConfig: normalizeEnquiryConfig(v.enquiryConfig),
    definitionFingerprint:
      v.definitionFingerprint?.startsWith("fp_") && v.definitionFingerprint.includes("stub")
        ? computeDefinitionFingerprint(v.packetIds, v.packetConfigs ?? [])
        : v.definitionFingerprint || computeDefinitionFingerprint(v.packetIds, v.packetConfigs ?? []),
    packetConfigs: v.packetConfigs ?? [],
    approvalCycles: v.approvalCycles ?? [],
  }));
  return raw;
}

function loadState(): ProductManagementDemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProductManagementDemoState;
      if (parsed?.versions?.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return cloneSeed();
}

let state: ProductManagementDemoState = loadState();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l());
}

function setState(next: ProductManagementDemoState) {
  state = next;
  emit();
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pushAudit(
  versions: DemoProductVersion[],
  auditEvents: DemoAuditEvent[],
  partial: Omit<DemoAuditEvent, "id" | "at"> & { at?: string }
): DemoAuditEvent[] {
  const event: DemoAuditEvent = {
    id: uid("aud"),
    at: partial.at ?? new Date().toISOString(),
    actor: partial.actor,
    action: partial.action,
    productId: partial.productId,
    productCode: partial.productCode,
    versionId: partial.versionId,
    version: partial.version,
    summary: partial.summary,
    before: partial.before ?? null,
    after: partial.after ?? null,
    justification: partial.justification ?? null,
  };
  return [event, ...auditEvents];
}

function updateVersion(
  id: string,
  updater: (v: DemoProductVersion) => DemoProductVersion,
  audit?: { actor: string; action: AuditAction; summary: string; justification?: string }
) {
  const idx = state.versions.findIndex((v) => v.id === id);
  if (idx < 0) return null;
  const prev = state.versions[idx];
  const next = updater({ ...prev, lastUpdated: new Date().toISOString() });
  const versions = [...state.versions];
  versions[idx] = next;
  let auditEvents = state.auditEvents;
  if (audit) {
    auditEvents = pushAudit(versions, auditEvents, {
      actor: audit.actor,
      action: audit.action,
      productId: next.id,
      productCode: next.productCode,
      versionId: next.id,
      version: next.version,
      summary: audit.summary,
      justification: audit.justification,
      before: { status: prev.status },
      after: { status: next.status },
    });
  }
  setState({ ...state, versions, auditEvents });
  return next;
}

export const productMgmtStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  reset() {
    setState(cloneSeed());
  },
  listVersions() {
    return state.versions;
  },
  getVersion(id: string) {
    return state.versions.find((v) => v.id === id);
  },
  getVersionsByCode(productCode: string) {
    return state.versions
      .filter((v) => v.productCode === productCode)
      .sort((a, b) => b.version - a.version);
  },
  /** Latest non-archived version per product code (for catalogue / list). */
  listCatalogueHeads() {
    const byCode = new Map<string, DemoProductVersion>();
    for (const v of state.versions) {
      const cur = byCode.get(v.productCode);
      if (!cur || v.version > cur.version) byCode.set(v.productCode, v);
    }
    return [...byCode.values()].sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  },
  findNameConflict(name: string, excludeId?: string, excludeProductCode?: string) {
    const norm = normalizeProductName(name);
    const excluded = excludeId ? productMgmtStore.getVersion(excludeId) : undefined;
    const skipCode = excludeProductCode ?? excluded?.productCode;
    // Same product family may share the name across versions; block other product codes only.
    const codesWithName = new Set(
      state.versions
        .filter((v) => normalizeProductName(v.name) === norm)
        .map((v) => v.productCode)
    );
    if (skipCode) codesWithName.delete(skipCode);
    if (codesWithName.size === 0) return undefined;
    const otherCode = [...codesWithName][0];
    return state.versions.find(
      (v) => v.productCode === otherCode && normalizeProductName(v.name) === norm
    );
  },
  findFingerprintConflict(fingerprint: string, excludeId?: string, excludeCode?: string) {
    const blocking: BrdLifecycleStatus[] = ["approved", "active", "deprecated"];
    return state.versions.find(
      (v) =>
        v.id !== excludeId &&
        v.productCode !== excludeCode &&
        blocking.includes(v.status) &&
        v.definitionFingerprint === fingerprint
    );
  },
  getPendingSubmissions() {
    const items: { version: DemoProductVersion; cycle: ApprovalCycle }[] = [];
    for (const v of state.versions) {
      for (const c of v.approvalCycles) {
        if (c.status === "pending") items.push({ version: v, cycle: c });
      }
    }
    return items.sort(
      (a, b) => new Date(b.cycle.submittedAt).getTime() - new Date(a.cycle.submittedAt).getTime()
    );
  },
  getSubmission(submissionId: string) {
    for (const v of state.versions) {
      const cycle = v.approvalCycles.find((c) => c.id === submissionId);
      if (cycle) return { version: v, cycle };
    }
    return null;
  },
  getPolicies() {
    return state.policies;
  },
  getAuditEvents(filter?: { productId?: string; versionId?: string; productCode?: string }) {
    let events = state.auditEvents;
    if (filter?.versionId) events = events.filter((e) => e.versionId === filter.versionId);
    if (filter?.productId) events = events.filter((e) => e.productId === filter.productId);
    if (filter?.productCode) events = events.filter((e) => e.productCode === filter.productCode);
    return [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  },
  getNotifications(versionId?: string) {
    const list = versionId
      ? state.notifications.filter((n) => n.versionId === versionId || n.productId === versionId)
      : state.notifications;
    return [...list].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },
  getDependenciesForVersion(versionId: string) {
    return state.dependencies.filter((d) => d.fromId === versionId || d.toId === versionId);
  },
  getProductsUsingPacket(packetId: string) {
    return state.versions.filter((v) => v.packetIds.includes(packetId) && v.status !== "archived");
  },
  createDraft(input: {
    name: string;
    description: string;
    packetIds: string[];
    packetConfigs: PacketConfig[];
    enquiryConfig?: EnquiryConfig;
    metadata?: Partial<ProductMetadata>;
    pricingModel?: DemoProductVersion["pricingModel"];
    price?: number;
    actor?: string;
  }) {
    const conflict = productMgmtStore.findNameConflict(input.name);
    if (conflict) {
      return { ok: false as const, conflict };
    }
    const fingerprint = computeDefinitionFingerprint(input.packetIds, input.packetConfigs);
    const id = uid("ver");
    const maxNum = state.versions.reduce((max, v) => {
      const m = /^PRD_(\d+)$/.exec(v.productCode);
      if (!m) return max;
      return Math.max(max, parseInt(m[1], 10));
    }, 0);
    const code = `PRD_${String(maxNum + 1).padStart(4, "0")}`;
    const meta: ProductMetadata = {
      owner: input.metadata?.owner ?? "Demo User",
      ownerRole: input.metadata?.ownerRole ?? "Product Manager",
      businessUnit: input.metadata?.businessUnit ?? "Product Management",
      targetGeography: input.metadata?.targetGeography ?? "India",
      targetSegment: input.metadata?.targetSegment ?? "General",
      intendedUse: input.metadata?.intendedUse ?? "",
      regulatoryNotes: input.metadata?.regulatoryNotes ?? "",
      sensitivity: input.metadata?.sensitivity ?? "Medium",
      tags: input.metadata?.tags ?? [],
      categories: input.metadata?.categories ?? ["Uncategorised"],
      effectiveStart: input.metadata?.effectiveStart ?? null,
      effectiveEnd: input.metadata?.effectiveEnd ?? null,
    };
    const version: DemoProductVersion = {
      id,
      productCode: code,
      name: input.name.trim(),
      description: input.description,
      version: 1,
      parentVersionId: null,
      status: "draft",
      pricingModel: input.pricingModel ?? "per_hit",
      price: input.price ?? 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      packetIds: input.packetIds,
      packetConfigs: input.packetConfigs,
      enquiryConfig: normalizeEnquiryConfig(input.enquiryConfig ?? DEFAULT_ENQUIRY_CONFIG),
      metadata: meta,
      consumerCount: 0,
      definitionFingerprint: fingerprint,
      approvalCycles: [],
    };
    const auditEvents = pushAudit(state.versions, state.auditEvents, {
      actor: input.actor ?? meta.owner,
      action: "created",
      productId: id,
      productCode: code,
      versionId: id,
      version: 1,
      summary: `Created draft ${input.name.trim()} v1`,
    });
    setState({
      ...state,
      versions: [version, ...state.versions],
      auditEvents,
    });
    return { ok: true as const, version };
  },
  updateDraft(
    id: string,
    patch: {
      name?: string;
      description?: string;
      packetIds?: string[];
      packetConfigs?: PacketConfig[];
      enquiryConfig?: EnquiryConfig;
      metadata?: Partial<ProductMetadata>;
      pricingModel?: DemoProductVersion["pricingModel"];
      price?: number;
      actor?: string;
    }
  ) {
    const current = productMgmtStore.getVersion(id);
    if (!current) return { ok: false as const, error: "not_found" };
    if (current.status !== "draft") return { ok: false as const, error: "not_draft" };
    if (patch.name) {
      const conflict = productMgmtStore.findNameConflict(patch.name, id);
      if (conflict) return { ok: false as const, error: "name_conflict", conflict };
    }
    const next = updateVersion(
      id,
      (v) => {
        const packetIds = patch.packetIds ?? v.packetIds;
        const packetConfigs = patch.packetConfigs ?? v.packetConfigs;
        return {
          ...v,
          name: patch.name?.trim() ?? v.name,
          description: patch.description ?? v.description,
          packetIds,
          packetConfigs,
          enquiryConfig: patch.enquiryConfig
            ? normalizeEnquiryConfig(patch.enquiryConfig)
            : v.enquiryConfig,
          metadata: { ...v.metadata, ...patch.metadata },
          pricingModel: patch.pricingModel ?? v.pricingModel,
          price: patch.price ?? v.price,
          definitionFingerprint: computeDefinitionFingerprint(packetIds, packetConfigs),
        };
      },
      {
        actor: patch.actor ?? current.metadata.owner,
        action: "updated",
        summary: `Updated draft ${current.name} v${current.version}`,
      }
    );
    return { ok: true as const, version: next! };
  },
  submitForApproval(
    id: string,
    input: {
      justification: string;
      policyId?: string;
      exceptionRequested?: boolean;
      exceptionJustification?: string;
      actor?: string;
    }
  ) {
    const current = productMgmtStore.getVersion(id);
    if (!current) return { ok: false as const, error: "not_found" };
    if (current.status !== "draft") return { ok: false as const, error: "not_draft" };
    const nameConflict = productMgmtStore.findNameConflict(current.name, id);
    if (nameConflict) return { ok: false as const, error: "name_conflict", conflict: nameConflict };

    const fingerprint = computeDefinitionFingerprint(current.packetIds, current.packetConfigs);
    const fpConflict = productMgmtStore.findFingerprintConflict(
      fingerprint,
      id,
      current.productCode
    );
    if (fpConflict && !input.exceptionRequested) {
      return { ok: false as const, error: "fingerprint_conflict", conflict: fpConflict };
    }

    const cycle: ApprovalCycle = {
      id: uid("sub"),
      cycleNumber: current.approvalCycles.length + 1,
      status: "pending",
      submittedAt: new Date().toISOString(),
      submittedBy: input.actor ?? current.metadata.owner,
      justification: input.justification,
      policyId: input.policyId ?? "POL_SINGLE",
      fingerprint,
      exceptionRequested: input.exceptionRequested,
      exceptionJustification: input.exceptionJustification,
      decisions: [],
    };

    const next = updateVersion(
      id,
      (v) => ({
        ...v,
        status: "pending_approval",
        definitionFingerprint: fingerprint,
        approvalCycles: [...v.approvalCycles, cycle],
      }),
      {
        actor: input.actor ?? current.metadata.owner,
        action: "submitted",
        summary: `Submitted ${current.name} v${current.version} for approval`,
        justification: input.justification,
      }
    );
    return { ok: true as const, version: next!, cycle };
  },
  decideSubmission(
    submissionId: string,
    input: {
      decision: "approve" | "reject" | "delegate";
      comment: string;
      actor?: string;
      role?: string;
      delegatedTo?: string;
    }
  ) {
    const found = productMgmtStore.getSubmission(submissionId);
    if (!found) return { ok: false as const, error: "not_found" };
    const { version, cycle } = found;
    if (cycle.status !== "pending") return { ok: false as const, error: "not_pending" };
    if (!input.comment.trim() && input.decision !== "approve") {
      return { ok: false as const, error: "comment_required" };
    }

    const decision: ApprovalDecision = {
      id: uid("dec"),
      actor: input.actor ?? "Demo Approver",
      role: input.role ?? "Product Head",
      decision: input.decision,
      comment: input.comment.trim() || (input.decision === "approve" ? "Approved" : ""),
      at: new Date().toISOString(),
      delegatedTo: input.delegatedTo,
    };

    let newStatus: BrdLifecycleStatus = version.status;
    let cycleStatus = cycle.status;
    if (input.decision === "approve") {
      newStatus = "approved";
      cycleStatus = "approved";
    } else if (input.decision === "reject") {
      newStatus = "draft";
      cycleStatus = "rejected";
    }

    const versions = state.versions.map((v) => {
      if (v.id !== version.id) return v;
      return {
        ...v,
        status: input.decision === "delegate" ? v.status : newStatus,
        lastUpdated: new Date().toISOString(),
        approvalCycles: v.approvalCycles.map((c) =>
          c.id === submissionId
            ? { ...c, status: input.decision === "delegate" ? c.status : cycleStatus, decisions: [...c.decisions, decision] }
            : c
        ),
      };
    });

    const action: AuditAction =
      input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "delegated";
    const auditEvents = pushAudit(versions, state.auditEvents, {
      actor: decision.actor,
      action,
      productId: version.id,
      productCode: version.productCode,
      versionId: version.id,
      version: version.version,
      summary: `${input.decision} — ${version.name} v${version.version}`,
      justification: input.comment,
    });

    setState({ ...state, versions, auditEvents });
    return { ok: true as const, version: versions.find((v) => v.id === version.id)! };
  },
  transitionLifecycle(
    id: string,
    to: BrdLifecycleStatus,
    input: {
      justification: string;
      actor?: string;
      deprecationWindowDays?: number;
      emergency?: boolean;
    }
  ) {
    const current = productMgmtStore.getVersion(id);
    if (!current) return { ok: false as const, error: "not_found" };
    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(to)) {
      return { ok: false as const, error: "invalid_transition", allowed };
    }
    if (!input.justification.trim()) return { ok: false as const, error: "justification_required" };

    if (to === "active") {
      const activeCount = state.versions.filter(
        (v) => v.productCode === current.productCode && v.status === "active" && v.id !== id
      ).length;
      if (activeCount >= 3) {
        return { ok: false as const, error: "concurrent_ceiling" };
      }
    }

    if (to === "inactive" && current.status === "active" && input.emergency) {
      // emergency path allowed with dual-confirm handled in UI
    }

    const actionMap: Partial<Record<BrdLifecycleStatus, AuditAction>> = {
      active: current.status === "deprecated" ? "reactivated" : "activated",
      deprecated: "deprecated",
      inactive: "deactivated",
      archived: "archived",
    };

    let notification: DemoNotification | null = null;
    const next = updateVersion(
      id,
      (v) => ({
        ...v,
        status: to,
        deprecationWindowDays:
          to === "deprecated" ? input.deprecationWindowDays ?? 90 : v.deprecationWindowDays,
        deprecationNoticeAt: to === "deprecated" ? new Date().toISOString() : v.deprecationNoticeAt,
        consumerCount: to === "inactive" || to === "archived" ? 0 : v.consumerCount,
      }),
      {
        actor: input.actor ?? current.metadata.owner,
        action: actionMap[to] ?? "updated",
        summary: `${current.name} v${current.version} → ${to}`,
        justification: input.justification,
      }
    );

    if (to === "deprecated" || to === "active" || to === "inactive") {
      notification = {
        id: uid("ntf"),
        productId: id,
        productCode: current.productCode,
        versionId: id,
        event: to,
        message: `${current.name} v${current.version} is now ${to}.${
          to === "deprecated" ? ` Wind-down: ${input.deprecationWindowDays ?? 90} days.` : ""
        }`,
        sentAt: new Date().toISOString(),
        recipients: ["Subscribed institutions", "Internal capabilities"],
      };
      const auditEvents = pushAudit(state.versions, state.auditEvents, {
        actor: "System",
        action: "notification_sent",
        productId: id,
        productCode: current.productCode,
        versionId: id,
        version: current.version,
        summary: `Consumer notification for ${to}`,
      });
      setState({
        ...state,
        notifications: [notification, ...state.notifications],
        auditEvents,
      });
    }

    return { ok: true as const, version: next!, notification };
  },
  createNewVersion(sourceId: string, actor?: string) {
    const source = productMgmtStore.getVersion(sourceId);
    if (!source) return { ok: false as const, error: "not_found" };
    const siblings = productMgmtStore.getVersionsByCode(source.productCode);
    if (siblings.some((v) => v.status === "draft")) {
      return { ok: false as const, error: "draft_exists", draft: siblings.find((v) => v.status === "draft")! };
    }
    const nextNum = Math.max(...siblings.map((v) => v.version)) + 1;
    const id = uid("ver");
    const draft: DemoProductVersion = {
      ...structuredClone(source),
      id,
      version: nextNum,
      parentVersionId: source.id,
      status: "draft",
      consumerCount: 0,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      approvalCycles: [],
      deprecationWindowDays: null,
      deprecationNoticeAt: null,
      definitionFingerprint: computeDefinitionFingerprint(source.packetIds, source.packetConfigs),
    };
    const auditEvents = pushAudit(state.versions, state.auditEvents, {
      actor: actor ?? source.metadata.owner,
      action: "version_cloned",
      productId: id,
      productCode: source.productCode,
      versionId: id,
      version: nextNum,
      summary: `Cloned ${source.name} v${source.version} → draft v${nextNum}`,
    });
    setState({
      ...state,
      versions: [draft, ...state.versions],
      auditEvents,
    });
    return { ok: true as const, version: draft };
  },
  transferOwnership(id: string, newOwner: string, reason: string, actor?: string) {
    const current = productMgmtStore.getVersion(id);
    if (!current) return { ok: false as const, error: "not_found" };
    const next = updateVersion(
      id,
      (v) => ({
        ...v,
        metadata: { ...v.metadata, owner: newOwner },
      }),
      {
        actor: actor ?? current.metadata.owner,
        action: "ownership_transferred",
        summary: `Ownership transferred to ${newOwner}`,
        justification: reason,
      }
    );
    return { ok: true as const, version: next! };
  },
};

export function useProductMgmtStore(): ProductManagementDemoState {
  return useSyncExternalStore(
    productMgmtStore.subscribe,
    productMgmtStore.getState,
    productMgmtStore.getState
  );
}

export function useProductMgmtVersion(id: string | undefined) {
  const snap = useProductMgmtStore();
  if (!id) return undefined;
  return snap.versions.find((v) => v.id === id);
}
