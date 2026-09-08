import { useSyncExternalStore } from "react";
import seed from "@/data/product-management-demo.json";
import { DICTIONARY_VERSION } from "@/data/attribute-dictionary";
import {
  applyDerivedSensitivityToMetadata,
  buildFieldContractFromDictionary,
  contractReferencesDeprecated,
  deprecatedAttributeWarningMessage,
  isDictionaryPacketId,
  migrateProfileFieldsToSubject,
  SUBJECT_PACKET_ID,
} from "@/lib/product-contract";
import {
  ALLOWED_TRANSITIONS,
  buildFieldContractFromPackets,
  computeDefinitionFingerprint,
  DEFAULT_PROFILE_CONFIG,
  DEFAULT_RETRO_CONFIG,
  DEFAULT_TRENDED_CONFIG,
  fingerprintExtrasFromVersion,
  normalizeRetroConfig,
  normalizeTrendedConfig,
  defaultOutputPorts,
  LOCAL_CPO_LABEL,
  normalizeProductName,
  type ApprovalCycle,
  type ApprovalDecision,
  type AuditAction,
  type BrdLifecycleStatus,
  type DemoAuditEvent,
  type DemoNotification,
  type DemoProductVersion,
  type OutputPort,
  type PolicyWarning,
  type ProductManagementDemoState,
  type ProductMetadata,
  type ProfileBlockConfig,
  type RetroConfig,
  type SubjectScope,
  type Subscription,
  type TrendedConfig,
} from "@/data/product-management-types";
import type { EnquiryConfig, PacketConfig } from "@/data/data-products-mock";
import { DEFAULT_ENQUIRY_CONFIG, normalizeEnquiryConfig } from "@/data/data-products-mock";

const STORAGE_KEY = "hcb-product-mgmt-demo-v12";

const DEFAULT_METADATA: ProductMetadata = {
  businessUnit: "Product Management",
  targetSegment: "General",
  sapItemCode: "",
  intendedUse: "",
  regulatoryNotes: "",
  sensitivity: "Medium",
  tags: [],
  categories: ["Uncategorised"],
  effectiveStart: null,
  effectiveEnd: null,
  releaseNote: "",
  dataAcquisitionType: "Member-contributed",
  dataAvailabilityType: "Managed by bureau, available for direct enquiry",
  accessRestrictions: "Active subscription required; purpose-bound use only",
};

function normalizeMetadata(raw: Partial<ProductMetadata> & Record<string, unknown>): ProductMetadata {
  const legacyLegal = raw.legalConditions;
  return {
    businessUnit: String(raw.businessUnit ?? DEFAULT_METADATA.businessUnit),
    targetSegment: String(raw.targetSegment ?? DEFAULT_METADATA.targetSegment),
    sapItemCode: String(raw.sapItemCode ?? DEFAULT_METADATA.sapItemCode).trim(),
    intendedUse: String(raw.intendedUse ?? ""),
    regulatoryNotes: String(raw.regulatoryNotes ?? ""),
    sensitivity:
      raw.sensitivity === "Low" || raw.sensitivity === "High" || raw.sensitivity === "Medium"
        ? raw.sensitivity
        : "Medium",
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    categories: Array.isArray(raw.categories) ? (raw.categories as string[]) : ["Uncategorised"],
    effectiveStart: (raw.effectiveStart as string | null | undefined) ?? null,
    effectiveEnd: (raw.effectiveEnd as string | null | undefined) ?? null,
    releaseNote: String(
      raw.releaseNote ?? legacyLegal ?? DEFAULT_METADATA.releaseNote
    ),
    dataAcquisitionType: String(raw.dataAcquisitionType ?? DEFAULT_METADATA.dataAcquisitionType),
    dataAvailabilityType: String(
      raw.dataAvailabilityType ?? DEFAULT_METADATA.dataAvailabilityType
    ),
    accessRestrictions: String(raw.accessRestrictions ?? DEFAULT_METADATA.accessRestrictions),
  };
}

function normalizeSubjectScope(raw: unknown): SubjectScope {
  if (raw === "COMPANY" || raw === "BOTH" || raw === "INDIVIDUAL") return raw;
  return "INDIVIDUAL";
}

function contractSelectionOf(v: {
  packetIds: string[];
  packetConfigs: PacketConfig[];
  subjectScope: SubjectScope;
  dictionaryVersion: string;
  eventStreamToggles: Record<string, string[]>;
}) {
  return {
    subjectScope: v.subjectScope,
    dictionaryVersion: v.dictionaryVersion,
    packetIds: v.packetIds,
    packetConfigs: v.packetConfigs,
    eventStreamToggles: v.eventStreamToggles,
  };
}

function fieldContractFor(v: {
  packetIds: string[];
  packetConfigs: PacketConfig[];
  subjectScope: SubjectScope;
  dictionaryVersion: string;
  eventStreamToggles: Record<string, string[]>;
}): DemoProductVersion["fieldContract"] {
  if (v.packetIds.some(isDictionaryPacketId)) {
    return buildFieldContractFromDictionary(contractSelectionOf(v));
  }
  return buildFieldContractFromPackets(v.packetIds, v.packetConfigs, v.eventStreamToggles);
}

function withDeprecatedPolicyWarning(
  warnings: PolicyWarning[],
  selection: {
    packetIds: string[];
    packetConfigs: PacketConfig[];
    subjectScope: SubjectScope;
    dictionaryVersion: string;
    eventStreamToggles: Record<string, string[]>;
  }
): PolicyWarning[] {
  const has = warnings.some((w) => w.code === "deprecated_attribute");
  if (contractReferencesDeprecated(contractSelectionOf(selection)) && !has) {
    return [
      ...warnings,
      {
        code: "deprecated_attribute",
        severity: "warning",
        message: deprecatedAttributeWarningMessage(),
      },
    ];
  }
  return warnings;
}

function normalizeVersion(v: DemoProductVersion & Record<string, unknown>): DemoProductVersion {
  const packetIds = v.packetIds ?? [];
  let packetConfigs = v.packetConfigs ?? [];
  const enquiryConfig = normalizeEnquiryConfig(v.enquiryConfig);
  const trendedConfig = normalizeTrendedConfig(v.trendedConfig);
  const retroConfig = normalizeRetroConfig(
    (v as DemoProductVersion & { retroConfig?: RetroConfig }).retroConfig
  );
  const profileConfig: ProfileBlockConfig = v.profileConfig?.includedFields?.length
    ? { includedFields: [...v.profileConfig.includedFields] }
    : { ...DEFAULT_PROFILE_CONFIG, includedFields: [...DEFAULT_PROFILE_CONFIG.includedFields] };
  const subjectScope = normalizeSubjectScope(v.subjectScope);
  const dictionaryVersion =
    typeof v.dictionaryVersion === "string" && v.dictionaryVersion
      ? v.dictionaryVersion
      : DICTIONARY_VERSION;
  const eventStreamToggles =
    v.eventStreamToggles && typeof v.eventStreamToggles === "object"
      ? (v.eventStreamToggles as Record<string, string[]>)
      : {};

  if (
    packetIds.includes(SUBJECT_PACKET_ID) &&
    !packetConfigs.some((c) => c.packetId === SUBJECT_PACKET_ID)
  ) {
    packetConfigs = [
      migrateProfileFieldsToSubject(profileConfig.includedFields),
      ...packetConfigs,
    ];
  }

  const outputPorts: OutputPort[] =
    Array.isArray(v.outputPorts) && v.outputPorts.length > 0
      ? v.outputPorts
      : defaultOutputPorts(v.productCode, v.version);
  const extras = fingerprintExtrasFromVersion({
    subjectScope,
    dictionaryVersion,
    eventStreamToggles,
  });
  const fieldContract =
    Array.isArray(v.fieldContract) && v.fieldContract.length > 0 && !packetIds.some(isDictionaryPacketId)
      ? v.fieldContract
      : fieldContractFor({
          packetIds,
          packetConfigs,
          subjectScope,
          dictionaryVersion,
          eventStreamToggles,
        });
  const policyWarnings = withDeprecatedPolicyWarning(
    Array.isArray(v.policyWarnings) ? v.policyWarnings : [],
    { packetIds, packetConfigs, subjectScope, dictionaryVersion, eventStreamToggles }
  );
  const fingerprint = computeDefinitionFingerprint(
    packetIds,
    packetConfigs,
    enquiryConfig,
    trendedConfig,
    retroConfig,
    extras
  );
  const metadata = normalizeMetadata((v.metadata ?? {}) as ProductMetadata & Record<string, unknown>);
  const derivedMeta = packetIds.some(isDictionaryPacketId)
    ? applyDerivedSensitivityToMetadata(metadata, {
        subjectScope,
        dictionaryVersion,
        packetIds,
        packetConfigs,
        eventStreamToggles,
      })
    : metadata;
  return {
    ...v,
    packetIds,
    packetConfigs,
    enquiryConfig,
    metadata: derivedMeta,
    approvalCycles: (v.approvalCycles ?? []).map((c) => ({
      ...c,
      decisions: (c.decisions ?? []).map((d) => ({
        ...d,
        decision: d.decision === "reject" ? "reject" : "approve",
      })),
    })),
    trendedConfig,
    retroConfig,
    profileConfig,
    subjectScope,
    dictionaryVersion,
    eventStreamToggles,
    outputPorts,
    fieldContract,
    policyWarnings,
    definitionFingerprint: fingerprint,
    consumerCount: v.consumerCount ?? 0,
    enquiryCount: Math.max(0, Math.floor(Number(v.enquiryCount) || 0)),
  };
}

function cloneSeed(): ProductManagementDemoState {
  const raw = structuredClone(seed) as ProductManagementDemoState & {
    subscriptions?: Subscription[];
  };
  return {
    policies: raw.policies ?? [],
    versions: (raw.versions ?? []).map((v) =>
      normalizeVersion(v as DemoProductVersion & Record<string, unknown>)
    ),
    notifications: raw.notifications ?? [],
    auditEvents: raw.auditEvents ?? [],
    dependencies: raw.dependencies ?? [],
    subscriptions: raw.subscriptions ?? [],
  };
}

function loadState(): ProductManagementDemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProductManagementDemoState;
      if (parsed?.versions?.length) {
        return {
          ...parsed,
          versions: parsed.versions.map((v) =>
            normalizeVersion(v as DemoProductVersion & Record<string, unknown>)
          ),
          subscriptions: parsed.subscriptions ?? [],
        };
      }
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
  _versions: DemoProductVersion[],
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

function fingerprintFor(
  v: Pick<
    DemoProductVersion,
    | "packetIds"
    | "packetConfigs"
    | "enquiryConfig"
    | "trendedConfig"
    | "retroConfig"
    | "subjectScope"
    | "dictionaryVersion"
    | "eventStreamToggles"
  >
) {
  return computeDefinitionFingerprint(
    v.packetIds,
    v.packetConfigs,
    v.enquiryConfig,
    v.trendedConfig,
    v.retroConfig,
    fingerprintExtrasFromVersion(v)
  );
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
  /**
   * Preferred version for a product code: latest Active → Deprecated →
   * Pending Approval → Draft (Addendum F2 default selection).
   */
  resolvePreferredVersion(productCode: string) {
    const siblings = productMgmtStore.getVersionsByCode(productCode);
    const byStatus = (status: DemoProductVersion["status"]) =>
      siblings.find((v) => v.status === status);
    return (
      byStatus("active") ??
      byStatus("deprecated") ??
      byStatus("pending_approval") ??
      byStatus("draft") ??
      siblings[0]
    );
  },
  /** Preferred head per product code (for catalogue / list). */
  listCatalogueHeads() {
    const codes = new Set(state.versions.map((v) => v.productCode));
    const heads: DemoProductVersion[] = [];
    for (const code of codes) {
      const head = productMgmtStore.resolvePreferredVersion(code);
      if (head) heads.push(head);
    }
    return heads.sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  },
  findNameConflict(name: string, excludeId?: string, excludeProductCode?: string) {
    const norm = normalizeProductName(name);
    const excluded = excludeId ? productMgmtStore.getVersion(excludeId) : undefined;
    const skipCode = excludeProductCode ?? excluded?.productCode;
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
    const items: { version: DemoProductVersion; cycle: ApprovalCycle; subscription?: Subscription }[] =
      [];
    for (const v of state.versions) {
      for (const c of v.approvalCycles) {
        if (c.status === "pending" && !c.subscriptionId) {
          items.push({ version: v, cycle: c });
        }
      }
    }
    for (const sub of state.subscriptions) {
      if (sub.status !== "pending" || !sub.approvalCycleId) continue;
      const found = productMgmtStore.getSubmission(sub.approvalCycleId);
      if (found && found.cycle.status === "pending") {
        items.push({ version: found.version, cycle: found.cycle, subscription: sub });
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
  getNotifications(productCodeOrVersionId?: string) {
    const list = productCodeOrVersionId
      ? state.notifications.filter(
          (n) =>
            n.versionId === productCodeOrVersionId ||
            n.productId === productCodeOrVersionId ||
            n.productCode === productCodeOrVersionId
        )
      : state.notifications;
    return [...list].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  },
  getDependenciesForVersion(versionId: string) {
    return state.dependencies.filter((d) => d.fromId === versionId || d.toId === versionId);
  },
  getProductsUsingPacket(packetId: string) {
    return state.versions.filter((v) => v.packetIds.includes(packetId) && v.status !== "archived");
  },
  getSubscriptions(productCode?: string) {
    const list = productCode
      ? state.subscriptions.filter((s) => s.productCode === productCode)
      : state.subscriptions;
    return [...list].sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  },
  getSubscriptionForCycle(cycleId: string) {
    return state.subscriptions.find(
      (s) => s.approvalCycleId === cycleId || s.id === cycleId
    );
  },
  createDraft(input: {
    name: string;
    description: string;
    packetIds: string[];
    packetConfigs: PacketConfig[];
    enquiryConfig?: EnquiryConfig;
    trendedConfig?: TrendedConfig;
    retroConfig?: RetroConfig;
    profileConfig?: ProfileBlockConfig;
    subjectScope?: SubjectScope;
    dictionaryVersion?: string;
    eventStreamToggles?: Record<string, string[]>;
    metadata?: Partial<ProductMetadata>;
    actor?: string;
  }) {
    const conflict = productMgmtStore.findNameConflict(input.name);
    if (conflict) {
      return { ok: false as const, conflict };
    }
    const enquiryConfig = normalizeEnquiryConfig(input.enquiryConfig ?? DEFAULT_ENQUIRY_CONFIG);
    const trendedConfig = normalizeTrendedConfig(input.trendedConfig ?? DEFAULT_TRENDED_CONFIG);
    const retroConfig = normalizeRetroConfig(input.retroConfig ?? DEFAULT_RETRO_CONFIG);
    const subjectScope = input.subjectScope ?? "INDIVIDUAL";
    const dictionaryVersion = input.dictionaryVersion ?? DICTIONARY_VERSION;
    const eventStreamToggles = input.eventStreamToggles ?? {};
    const extras = fingerprintExtrasFromVersion({
      subjectScope,
      dictionaryVersion,
      eventStreamToggles,
    });
    const fingerprint = computeDefinitionFingerprint(
      input.packetIds,
      input.packetConfigs,
      enquiryConfig,
      trendedConfig,
      retroConfig,
      extras
    );
    const id = uid("ver");
    const maxNum = state.versions.reduce((max, v) => {
      const m = /^PRD_(\d+)$/.exec(v.productCode);
      if (!m) return max;
      return Math.max(max, parseInt(m[1], 10));
    }, 0);
    const code = `PRD_${String(maxNum + 1).padStart(4, "0")}`;
    const meta = normalizeMetadata({ ...DEFAULT_METADATA, ...input.metadata });
    const profileConfig = input.profileConfig ?? {
      includedFields: [...DEFAULT_PROFILE_CONFIG.includedFields],
    };
    const derivedMeta = applyDerivedSensitivityToMetadata(meta, {
      subjectScope,
      dictionaryVersion,
      packetIds: input.packetIds,
      packetConfigs: input.packetConfigs,
      eventStreamToggles,
    });
    const version: DemoProductVersion = {
      id,
      productCode: code,
      name: input.name.trim(),
      description: input.description,
      version: 1,
      parentVersionId: null,
      status: "draft",
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      packetIds: input.packetIds,
      packetConfigs: input.packetConfigs,
      enquiryConfig,
      metadata: derivedMeta,
      consumerCount: 0,
      enquiryCount: 0,
      definitionFingerprint: fingerprint,
      approvalCycles: [],
      trendedConfig,
      retroConfig,
      profileConfig,
      subjectScope,
      dictionaryVersion,
      eventStreamToggles,
      outputPorts: defaultOutputPorts(code, 1),
      fieldContract: fieldContractFor({
        packetIds: input.packetIds,
        packetConfigs: input.packetConfigs,
        subjectScope,
        dictionaryVersion,
        eventStreamToggles,
      }),
      policyWarnings: withDeprecatedPolicyWarning([], {
        packetIds: input.packetIds,
        packetConfigs: input.packetConfigs,
        subjectScope,
        dictionaryVersion,
        eventStreamToggles,
      }),
    };
    const auditEvents = pushAudit(state.versions, state.auditEvents, {
      actor: input.actor ?? LOCAL_CPO_LABEL,
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
      trendedConfig?: TrendedConfig;
      retroConfig?: RetroConfig;
      profileConfig?: ProfileBlockConfig;
      subjectScope?: SubjectScope;
      dictionaryVersion?: string;
      eventStreamToggles?: Record<string, string[]>;
      metadata?: Partial<ProductMetadata>;
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
        const enquiryConfig = patch.enquiryConfig
          ? normalizeEnquiryConfig(patch.enquiryConfig)
          : v.enquiryConfig;
        const trendedConfig = patch.trendedConfig
          ? normalizeTrendedConfig(patch.trendedConfig)
          : v.trendedConfig;
        const retroConfig = patch.retroConfig
          ? normalizeRetroConfig(patch.retroConfig)
          : v.retroConfig;
        const subjectScope = patch.subjectScope ?? v.subjectScope;
        const dictionaryVersion = patch.dictionaryVersion ?? v.dictionaryVersion;
        const eventStreamToggles = patch.eventStreamToggles ?? v.eventStreamToggles;
        const extras = fingerprintExtrasFromVersion({
          subjectScope,
          dictionaryVersion,
          eventStreamToggles,
        });
        const metadata = patch.metadata
          ? normalizeMetadata({ ...v.metadata, ...patch.metadata })
          : v.metadata;
        return {
          ...v,
          name: patch.name?.trim() ?? v.name,
          description: patch.description ?? v.description,
          packetIds,
          packetConfigs,
          enquiryConfig,
          trendedConfig,
          retroConfig,
          profileConfig: patch.profileConfig ?? v.profileConfig,
          subjectScope,
          dictionaryVersion,
          eventStreamToggles,
          metadata: applyDerivedSensitivityToMetadata(metadata, {
            subjectScope,
            dictionaryVersion,
            packetIds,
            packetConfigs,
            eventStreamToggles,
          }),
          fieldContract: fieldContractFor({
            packetIds,
            packetConfigs,
            subjectScope,
            dictionaryVersion,
            eventStreamToggles,
          }),
          definitionFingerprint: computeDefinitionFingerprint(
            packetIds,
            packetConfigs,
            enquiryConfig,
            trendedConfig,
            retroConfig,
            extras
          ),
          policyWarnings: withDeprecatedPolicyWarning(v.policyWarnings, {
            packetIds,
            packetConfigs,
            subjectScope,
            dictionaryVersion,
            eventStreamToggles,
          }),
        };
      },
      {
        actor: patch.actor ?? LOCAL_CPO_LABEL,
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

    const fingerprint = fingerprintFor(current);
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
      submittedBy: input.actor ?? LOCAL_CPO_LABEL,
      justification: input.justification,
      policyId: input.policyId ?? "POL_SINGLE",
      fingerprint,
      exceptionRequested: input.exceptionRequested,
      exceptionJustification: input.exceptionJustification,
      decisions: [],
      kind: "version",
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
        actor: input.actor ?? LOCAL_CPO_LABEL,
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
      decision: "approve" | "reject";
      comment: string;
      actor?: string;
      role?: string;
    }
  ) {
    const found = productMgmtStore.getSubmission(submissionId);
    if (!found) return { ok: false as const, error: "not_found" };
    const { version, cycle } = found;
    if (cycle.status !== "pending") return { ok: false as const, error: "not_pending" };
    if (!input.comment.trim() && input.decision !== "approve") {
      return { ok: false as const, error: "comment_required" };
    }

    const actor = input.actor ?? "Demo Approver";
    if (cycle.submittedBy === actor) {
      return { ok: false as const, error: "sod_violation" };
    }

    const decision: ApprovalDecision = {
      id: uid("dec"),
      actor,
      role: input.role ?? "Product Head",
      decision: input.decision,
      comment: input.comment.trim() || (input.decision === "approve" ? "Approved" : ""),
      at: new Date().toISOString(),
    };

    // Access-request cycle
    if (cycle.subscriptionId || cycle.kind === "access_request") {
      const sub = state.subscriptions.find(
        (s) => s.id === cycle.subscriptionId || s.approvalCycleId === submissionId
      );
      if (!sub) return { ok: false as const, error: "not_found" };

      const cycleStatus = input.decision === "approve" ? "approved" : "rejected";
      const versions = state.versions.map((v) => {
        if (v.id !== version.id) return v;
        const nextConsumer =
          input.decision === "approve" ? v.consumerCount + 1 : v.consumerCount;
        return {
          ...v,
          consumerCount: nextConsumer,
          lastUpdated: new Date().toISOString(),
          approvalCycles: v.approvalCycles.map((c) =>
            c.id === submissionId
              ? { ...c, status: cycleStatus as ApprovalCycle["status"], decisions: [...c.decisions, decision] }
              : c
          ),
        };
      });
      const subscriptions = state.subscriptions.map((s) =>
        s.id === sub.id
          ? {
              ...s,
              status: (input.decision === "approve" ? "active" : "rejected") as Subscription["status"],
            }
          : s
      );
      const action: AuditAction =
        input.decision === "approve" ? "access_approved" : "access_rejected";
      const auditEvents = pushAudit(versions, state.auditEvents, {
        actor: decision.actor,
        action,
        productId: version.id,
        productCode: version.productCode,
        versionId: version.id,
        version: version.version,
        summary: `Access request ${input.decision} — ${sub.institutionName} → ${version.productCode}`,
        justification: input.comment,
      });
      setState({ ...state, versions, subscriptions, auditEvents });
      return { ok: true as const, version: versions.find((v) => v.id === version.id)! };
    }

    let newStatus: BrdLifecycleStatus = version.status;
    let cycleStatus = cycle.status;
    if (input.decision === "approve") {
      newStatus = "approved";
      cycleStatus = "approved";
    } else {
      newStatus = "draft";
      cycleStatus = "rejected";
    }

    const versions = state.versions.map((v) => {
      if (v.id !== version.id) return v;
      return {
        ...v,
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        approvalCycles: v.approvalCycles.map((c) =>
          c.id === submissionId
            ? { ...c, status: cycleStatus, decisions: [...c.decisions, decision] }
            : c
        ),
      };
    });

    const action: AuditAction = input.decision === "approve" ? "approved" : "rejected";
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

    if (to === "inactive" && current.status === "active" && !input.emergency) {
      return { ok: false as const, error: "emergency_required" };
    }

    if (to === "deprecated") {
      const days = input.deprecationWindowDays;
      if (days == null || !Number.isInteger(days) || days < 1) {
        return { ok: false as const, error: "invalid_window" };
      }
    }

    if (to === "active") {
      const activeCount = state.versions.filter(
        (v) => v.productCode === current.productCode && v.status === "active" && v.id !== id
      ).length;
      if (activeCount >= 3) {
        return { ok: false as const, error: "concurrent_ceiling" };
      }
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
          to === "deprecated" ? input.deprecationWindowDays! : v.deprecationWindowDays,
        deprecationNoticeAt: to === "deprecated" ? new Date().toISOString() : v.deprecationNoticeAt,
        consumerCount: to === "inactive" || to === "archived" ? 0 : v.consumerCount,
      }),
      {
        actor: input.actor ?? LOCAL_CPO_LABEL,
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
          to === "deprecated" ? ` Wind-down: ${input.deprecationWindowDays} days.` : ""
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
      enquiryCount: 0,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      approvalCycles: [],
      deprecationWindowDays: null,
      deprecationNoticeAt: null,
      policyWarnings: [],
      outputPorts: defaultOutputPorts(source.productCode, nextNum),
      definitionFingerprint: fingerprintFor(source),
    };
    const auditEvents = pushAudit(state.versions, state.auditEvents, {
      actor: actor ?? LOCAL_CPO_LABEL,
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
  requestAccess(input: {
    institutionId: string;
    institutionName: string;
    productCode: string;
    pinnedVersionId: string | null;
    businessDomain: string;
    application: string;
    billingRef: string;
    usagePeriodMonths: number;
    purpose: string;
    notes?: string;
    actor?: string;
  }) {
    const versions = productMgmtStore.getVersionsByCode(input.productCode);
    const pin =
      (input.pinnedVersionId && versions.find((v) => v.id === input.pinnedVersionId)) ||
      versions.find((v) => v.status === "active") ||
      versions[0];
    if (!pin) return { ok: false as const, error: "not_found" };

    const cycleId = uid("sub");
    const subId = uid("access");
    const cycle: ApprovalCycle = {
      id: cycleId,
      cycleNumber: pin.approvalCycles.length + 1,
      status: "pending",
      submittedAt: new Date().toISOString(),
      submittedBy: input.actor ?? LOCAL_CPO_LABEL,
      justification: input.purpose,
      policyId: "POL_SINGLE",
      fingerprint: pin.definitionFingerprint,
      decisions: [],
      subscriptionId: subId,
      kind: "access_request",
    };
    const subscription: Subscription = {
      id: subId,
      institutionId: input.institutionId,
      institutionName: input.institutionName,
      productCode: input.productCode,
      pinnedVersionId: pin.id,
      businessDomain: input.businessDomain,
      application: input.application,
      billingRef: input.billingRef,
      usagePeriodMonths: input.usagePeriodMonths,
      purpose: input.purpose,
      status: "pending",
      requestedAt: new Date().toISOString(),
      approvalCycleId: cycleId,
      notes: input.notes,
    };

    const nextVersions = state.versions.map((v) =>
      v.id === pin.id
        ? { ...v, approvalCycles: [...v.approvalCycles, cycle], lastUpdated: new Date().toISOString() }
        : v
    );
    const auditEvents = pushAudit(nextVersions, state.auditEvents, {
      actor: input.actor ?? LOCAL_CPO_LABEL,
      action: "access_requested",
      productId: pin.id,
      productCode: input.productCode,
      versionId: pin.id,
      version: pin.version,
      summary: `Access requested by ${input.institutionName} for ${input.productCode}`,
      justification: input.purpose,
    });
    setState({
      ...state,
      versions: nextVersions,
      subscriptions: [subscription, ...state.subscriptions],
      auditEvents,
    });
    return { ok: true as const, subscription, cycle };
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
