import {
  CROSS_ASSET_PACKET_ID,
  DICTIONARY_ATTRIBUTES,
  DICTIONARY_PACKETS,
  DICTIONARY_VERSION,
  SUBJECT_PACKET_ID,
  attributesForPacket,
  getDictionaryAttribute,
  getDictionaryPacket,
  packetAppliesToScope,
  type DictionaryAttribute,
  type DictionaryPacket,
  type SubjectScope,
} from "@/data/attribute-dictionary";
import type { PacketConfig } from "@/data/data-products-mock";
import type { FieldContractRow, ProductMetadata, AttributeMode } from "@/data/product-management-types";

export const DEFAULT_SUBJECT_SCOPE: SubjectScope = "INDIVIDUAL";

export interface ContractSelection {
  subjectScope: SubjectScope;
  dictionaryVersion: string;
  packetIds: string[];
  packetConfigs: PacketConfig[];
  eventStreamToggles: Record<string, string[]>;
}

export type ProductSensitivity = "Low" | "Medium" | "High";

export interface ReconciliationKeyState {
  met: boolean;
  via: "identifier" | "name_dob" | null;
  identifiers: string[];
  summary: string;
}

export interface ContractSummary {
  packetCount: number;
  attributeCount: number;
  sensitivePiiCount: number;
  sensitivity: ProductSensitivity;
  sensitivityReason: string;
  reconciliation: ReconciliationKeyState;
}

const PROFILE_FIELD_TO_ATTR: Record<string, string> = {
  fullName: "subject.full_name",
  dateOfBirth: "subject.dob",
  gender: "subject.gender",
  currentAddress: "subject.address_line",
  primaryIdentifier: "subject.full_name",
  contactNumber: "subject.mobile",
};

export function emptyContractSelection(
  scope: SubjectScope = DEFAULT_SUBJECT_SCOPE
): ContractSelection {
  const subjectDefaults = defaultPacketConfig(SUBJECT_PACKET_ID);
  return {
    subjectScope: scope,
    dictionaryVersion: DICTIONARY_VERSION,
    packetIds: [SUBJECT_PACKET_ID],
    packetConfigs: [subjectDefaults],
    eventStreamToggles: {},
  };
}

export function isSelectableAttribute(attr: DictionaryAttribute): boolean {
  return attr.status === "active" && !attr.system;
}

export function isOptInAttribute(attr: DictionaryAttribute): boolean {
  return attr.sensitivity === "Sensitive-PII" || attr.specialCategory;
}

export function isTrendedCapable(attr: DictionaryAttribute): boolean {
  return attr.mode === "TRENDED";
}

export function defaultSelectedIdsForPacket(packetId: string): string[] {
  return attributesForPacket(packetId)
    .filter((a) => a.status === "active")
    .filter((a) => !a.eventStreamId)
    .filter((a) => a.system || (!isOptInAttribute(a) && (a.sensitivity === "Standard" || a.sensitivity === "PII")))
    .map((a) => a.id);
}

export function defaultPacketConfig(packetId: string): PacketConfig {
  const selected = defaultSelectedIdsForPacket(packetId);
  const derived = attributesForPacket(packetId)
    .filter((a) => a.derived && selected.includes(a.id))
    .map((a) => a.id);
  return {
    packetId,
    selectedFields: selected.filter((id) => {
      const a = getDictionaryAttribute(id);
      return !a?.derived;
    }),
    disabledFields: [],
    selectedDerivedFields: derived,
  };
}

export function includedAttributeIds(selection: ContractSelection): string[] {
  const enabledStreams = selection.eventStreamToggles;
  const ids: string[] = [];
  for (const pid of selection.packetIds) {
    const cfg = selection.packetConfigs.find((c) => c.packetId === pid);
    const disabled = new Set((cfg?.disabledFields ?? []).map(String));
    const raw = [...(cfg?.selectedFields ?? []), ...(cfg?.selectedDerivedFields ?? [])];
    for (const id of raw) {
      if (disabled.has(id)) continue;
      const attr = getDictionaryAttribute(id);
      if (!attr) {
        ids.push(id);
        continue;
      }
      if (attr.eventStreamId && !(enabledStreams[pid] ?? []).includes(attr.eventStreamId)) {
        continue;
      }
      ids.push(id);
    }
    for (const attr of attributesForPacket(pid)) {
      if (attr.system && attr.status === "active" && !ids.includes(attr.id)) {
        ids.push(attr.id);
      }
    }
  }
  return [...new Set(ids)];
}

export function deriveProductSensitivity(attributeIds: string[]): {
  value: ProductSensitivity;
  reason: string;
} {
  const attrs = attributeIds
    .map((id) => getDictionaryAttribute(id))
    .filter((a): a is DictionaryAttribute => !!a);
  const high = attrs.filter((a) => a.sensitivity === "Sensitive-PII" || a.specialCategory);
  if (high.length > 0) {
    const first = high[0]!;
    return {
      value: "High",
      reason: `High — ${high.length} Sensitive-PII attribute${high.length === 1 ? "" : "s"} (${first.qualifier})`,
    };
  }
  const pii = attrs.filter((a) => a.sensitivity === "PII");
  if (pii.length > 0) {
    return { value: "Medium", reason: "Medium — PII attributes included" };
  }
  return { value: "Low", reason: "Low — no PII attributes included" };
}

export function evaluateReconciliationKey(selection: ContractSelection): ReconciliationKeyState {
  const subjectIds = new Set(
    includedAttributeIds({
      ...selection,
      packetIds: selection.packetIds.includes(SUBJECT_PACKET_ID)
        ? [SUBJECT_PACKET_ID]
        : [],
    }).filter((id) => getDictionaryAttribute(id)?.packetId === SUBJECT_PACKET_ID)
  );
  const identifiers = attributesForPacket(SUBJECT_PACKET_ID)
    .filter((a) => a.class === "Identifier" && subjectIds.has(a.id))
    .map((a) => a.qualifier);
  if (identifiers.length > 0) {
    return {
      met: true,
      via: "identifier",
      identifiers,
      summary: `Met — ${identifiers.join(", ")}`,
    };
  }
  const hasName = subjectIds.has("subject.full_name");
  const hasDob = subjectIds.has("subject.dob");
  if (hasName && hasDob) {
    return {
      met: true,
      via: "name_dob",
      identifiers: [],
      summary: "Met — full_name + dob",
    };
  }
  return {
    met: false,
    via: null,
    identifiers: [],
    summary:
      "Not met. Include at least one identifier (PAN, national ID, passport…) OR full name + date of birth.",
  };
}

export function hasNonEmptyContract(selection: ContractSelection): boolean {
  const extra = selection.packetIds.filter((id) => id !== SUBJECT_PACKET_ID);
  if (extra.length === 0) return false;
  const ids = includedAttributeIds(selection);
  return extra.some((pid) => ids.some((id) => getDictionaryAttribute(id)?.packetId === pid));
}

export function contractHasTrendedCapable(selection: ContractSelection): boolean {
  const ids = includedAttributeIds(selection);
  if (ids.some((id) => {
    const a = getDictionaryAttribute(id);
    return a && isTrendedCapable(a);
  })) {
    return true;
  }
  return Object.values(selection.eventStreamToggles).some((streams) => streams.length > 0);
}

export function contractContinueBlockers(selection: ContractSelection): string[] {
  const blockers: string[] = [];
  if (!selection.subjectScope) blockers.push("Subject scope is required.");
  const key = evaluateReconciliationKey(selection);
  if (!key.met) blockers.push("Reconciliation key is not met on Subject as reported.");
  if (!hasNonEmptyContract(selection)) {
    blockers.push("Select at least one packet with at least one included attribute, beyond the Subject packet.");
  }
  return blockers;
}

export function summarizeContract(selection: ContractSelection): ContractSummary {
  const ids = includedAttributeIds(selection);
  const sensitivity = deriveProductSensitivity(ids);
  const sensitivePiiCount = ids.filter((id) => {
    const a = getDictionaryAttribute(id);
    return a?.sensitivity === "Sensitive-PII" || a?.specialCategory;
  }).length;
  return {
    packetCount: selection.packetIds.length,
    attributeCount: ids.length,
    sensitivePiiCount,
    sensitivity: sensitivity.value,
    sensitivityReason: sensitivity.reason,
    reconciliation: evaluateReconciliationKey(selection),
  };
}

export function packetsForScope(scope: SubjectScope): DictionaryPacket[] {
  return DICTIONARY_PACKETS.filter((p) => packetAppliesToScope(p, scope));
}

export function attributesVisibleForPacket(
  packetId: string,
  selection: ContractSelection,
  showUnavailable: boolean
): DictionaryAttribute[] {
  const streams = selection.eventStreamToggles[packetId] ?? [];
  return attributesForPacket(packetId).filter((a) => {
    if (a.eventStreamId && !streams.includes(a.eventStreamId)) return false;
    if (a.status !== "active" && !showUnavailable) return false;
    return true;
  });
}

export function countSelectedOfTotal(
  packetId: string,
  selection: ContractSelection
): { selected: number; total: number } {
  const visible = attributesVisibleForPacket(packetId, selection, false).filter(
    (a) => !a.system
  );
  const included = new Set(includedAttributeIds(selection));
  return {
    selected: visible.filter((a) => included.has(a.id)).length,
    total: visible.length,
  };
}

export function attributesDroppedByScopeChange(
  selection: ContractSelection,
  nextScope: SubjectScope
): number {
  const allowed = new Set(packetsForScope(nextScope).map((p) => p.id));
  const droppedPackets = selection.packetIds.filter((id) => id !== SUBJECT_PACKET_ID && !allowed.has(id));
  const included = includedAttributeIds(selection);
  return included.filter((id) => {
    const a = getDictionaryAttribute(id);
    return a && droppedPackets.includes(a.packetId);
  }).length;
}

export function applySubjectScopeChange(
  selection: ContractSelection,
  nextScope: SubjectScope
): ContractSelection {
  const allowed = new Set(packetsForScope(nextScope).map((p) => p.id));
  const packetIds = selection.packetIds.filter((id) => allowed.has(id) || id === SUBJECT_PACKET_ID);
  const packetConfigs = selection.packetConfigs.filter((c) => packetIds.includes(c.packetId));
  const eventStreamToggles = Object.fromEntries(
    Object.entries(selection.eventStreamToggles).filter(([pid]) => packetIds.includes(pid))
  );
  return { ...selection, subjectScope: nextScope, packetIds, packetConfigs, eventStreamToggles };
}

export function togglePacket(selection: ContractSelection, packetId: string, on: boolean): ContractSelection {
  if (packetId === SUBJECT_PACKET_ID) return selection;
  const has = selection.packetIds.includes(packetId);
  if (on && has) return selection;
  if (!on && !has) return selection;
  if (on) {
    return {
      ...selection,
      packetIds: [...selection.packetIds, packetId],
      packetConfigs: [
        ...selection.packetConfigs.filter((c) => c.packetId !== packetId),
        defaultPacketConfig(packetId),
      ],
    };
  }
  const { [packetId]: _, ...restStreams } = selection.eventStreamToggles;
  return {
    ...selection,
    packetIds: selection.packetIds.filter((id) => id !== packetId),
    packetConfigs: selection.packetConfigs.filter((c) => c.packetId !== packetId),
    eventStreamToggles: restStreams,
  };
}

export function toggleEventStream(
  selection: ContractSelection,
  packetId: string,
  streamId: string,
  on: boolean
): ContractSelection {
  const current = selection.eventStreamToggles[packetId] ?? [];
  const next = on
    ? current.includes(streamId)
      ? current
      : [...current, streamId]
    : current.filter((s) => s !== streamId);
  let packetConfigs = selection.packetConfigs;
  if (on) {
    const streamAttrs = attributesForPacket(packetId).filter(
      (a) => a.eventStreamId === streamId && a.status === "active" && !isOptInAttribute(a)
    );
    packetConfigs = upsertSelected(selection.packetConfigs, packetId, streamAttrs.map((a) => a.id), true);
  }
  return {
    ...selection,
    eventStreamToggles: { ...selection.eventStreamToggles, [packetId]: next },
    packetConfigs,
  };
}

export function toggleAttribute(
  selection: ContractSelection,
  attributeId: string,
  on: boolean
): ContractSelection {
  const attr = getDictionaryAttribute(attributeId);
  if (!attr || attr.system || attr.status !== "active") return selection;
  if (!selection.packetIds.includes(attr.packetId)) return selection;
  return {
    ...selection,
    packetConfigs: upsertSelected(selection.packetConfigs, attr.packetId, [attributeId], on),
  };
}

export function selectAllSelectable(
  selection: ContractSelection,
  packetId: string,
  on: boolean
): ContractSelection {
  const ids = attributesVisibleForPacket(packetId, selection, false)
    .filter((a) => isSelectableAttribute(a))
    .map((a) => a.id);
  return {
    ...selection,
    packetConfigs: upsertSelected(selection.packetConfigs, packetId, ids, on),
  };
}

function upsertSelected(
  configs: PacketConfig[],
  packetId: string,
  attributeIds: string[],
  on: boolean
): PacketConfig[] {
  const existing = configs.find((c) => c.packetId === packetId) ?? {
    packetId,
    selectedFields: [],
    disabledFields: [],
    selectedDerivedFields: [],
  };
  let selected = new Set(existing.selectedFields);
  let derived = new Set(existing.selectedDerivedFields ?? []);
  for (const id of attributeIds) {
    const a = getDictionaryAttribute(id);
    const target = a?.derived ? derived : selected;
    if (on) target.add(id);
    else target.delete(id);
  }
  const next: PacketConfig = {
    packetId,
    selectedFields: [...selected],
    disabledFields: existing.disabledFields ?? [],
    selectedDerivedFields: [...derived],
  };
  return [...configs.filter((c) => c.packetId !== packetId), next];
}

export function contractReferencesDeprecated(selection: ContractSelection): boolean {
  return includedAttributeIds(selection).some((id) => getDictionaryAttribute(id)?.status === "deprecated");
}

export function deprecatedAttributeWarningMessage(): string {
  return "Contract references a deprecated attribute — review before next version.";
}

export function buildFieldContractFromDictionary(selection: ContractSelection): FieldContractRow[] {
  const ids = includedAttributeIds(selection);
  const rows: FieldContractRow[] = [];
  for (const id of ids) {
    const a = getDictionaryAttribute(id);
    if (!a) continue;
    rows.push({
      name: a.qualifier,
      type: a.dataType,
      description: a.definition,
      pii: a.sensitivity === "PII" || a.sensitivity === "Sensitive-PII",
      mode: a.mode as AttributeMode,
      packetId: a.packetId,
      attributeId: a.id,
      label: a.label,
      sensitivity: a.sensitivity,
      populatedBy: a.sources.length ? a.sources : getDictionaryPacket(a.packetId)?.populatedBy ?? [],
      notes: notesForAttribute(a),
      deprecatedInDictionary: a.status === "deprecated" ? a.supersededBy ?? "deprecated" : null,
      eventStreamId: a.eventStreamId,
    });
  }
  return rows;
}

function notesForAttribute(a: DictionaryAttribute): string {
  const parts: string[] = [];
  if (a.derived && a.basedOn?.length) {
    parts.push(`ƒ derived · based on ${a.basedOn.map((id) => getDictionaryPacket(id)?.label ?? id).join(", ")}`);
  } else if (a.derived) {
    parts.push("ƒ derived from this packet");
  }
  if (a.sensitivity === "Sensitive-PII") parts.push("tokenised");
  if (a.specialCategory) parts.push("special category");
  if (a.system) parts.push("system");
  if (a.eventStreamId) parts.push("event stream");
  if (a.status === "deprecated" && a.supersededBy) {
    parts.push(`Deprecated — superseded by ${a.supersededBy}`);
  }
  if (a.status === "pending") parts.push("Pending approval — not yet servable");
  return parts.join(" · ");
}

export function applyDerivedSensitivityToMetadata(
  metadata: ProductMetadata,
  selection: ContractSelection
): ProductMetadata {
  const { value } = deriveProductSensitivity(includedAttributeIds(selection));
  return { ...metadata, sensitivity: value };
}

/** Map a legacy Customer Profile field list onto the Subject packet. */
export function migrateProfileFieldsToSubject(includedFields: string[]): PacketConfig {
  const mapped = includedFields
    .map((f) => PROFILE_FIELD_TO_ATTR[f])
    .filter((id): id is string => !!id);
  const cfg = defaultPacketConfig(SUBJECT_PACKET_ID);
  const extra = mapped.filter((id) => !cfg.selectedFields.includes(id));
  return {
    ...cfg,
    selectedFields: [...new Set([...cfg.selectedFields, ...extra])],
  };
}

export function isDictionaryPacketId(packetId: string): boolean {
  return !!getDictionaryPacket(packetId);
}

export function selectionFromVersion(v: {
  packetIds?: string[];
  packetConfigs?: PacketConfig[];
  subjectScope?: SubjectScope;
  dictionaryVersion?: string;
  eventStreamToggles?: Record<string, string[]>;
  profileConfig?: { includedFields?: string[] };
}): ContractSelection {
  const dictIds = (v.packetIds ?? []).filter((id) => isDictionaryPacketId(id));
  if (dictIds.length === 0) {
    const empty = emptyContractSelection(v.subjectScope ?? DEFAULT_SUBJECT_SCOPE);
    if (v.profileConfig?.includedFields?.length) {
      return {
        ...empty,
        packetConfigs: [migrateProfileFieldsToSubject(v.profileConfig.includedFields)],
      };
    }
    return empty;
  }
  return ensureSubjectPacket({
    subjectScope: v.subjectScope,
    dictionaryVersion: v.dictionaryVersion,
    packetIds: dictIds,
    packetConfigs: (v.packetConfigs ?? []).filter((c) => isDictionaryPacketId(c.packetId)),
    eventStreamToggles: v.eventStreamToggles,
  });
}

export function ensureSubjectPacket(selection: Partial<ContractSelection> & {
  packetIds?: string[];
  packetConfigs?: PacketConfig[];
}): ContractSelection {
  const base = emptyContractSelection(
    selection.subjectScope === "COMPANY" || selection.subjectScope === "BOTH"
      ? selection.subjectScope
      : DEFAULT_SUBJECT_SCOPE
  );
  const packetIds = selection.packetIds?.length
    ? selection.packetIds.includes(SUBJECT_PACKET_ID)
      ? selection.packetIds
      : [SUBJECT_PACKET_ID, ...selection.packetIds]
    : base.packetIds;
  let packetConfigs = selection.packetConfigs?.length
    ? [...selection.packetConfigs]
    : [...base.packetConfigs];
  if (!packetConfigs.some((c) => c.packetId === SUBJECT_PACKET_ID)) {
    packetConfigs = [defaultPacketConfig(SUBJECT_PACKET_ID), ...packetConfigs];
  }
  return {
    subjectScope: selection.subjectScope ?? DEFAULT_SUBJECT_SCOPE,
    dictionaryVersion: selection.dictionaryVersion ?? DICTIONARY_VERSION,
    packetIds,
    packetConfigs,
    eventStreamToggles: selection.eventStreamToggles ?? {},
  };
}

export { SUBJECT_PACKET_ID, CROSS_ASSET_PACKET_ID, DICTIONARY_VERSION, DICTIONARY_ATTRIBUTES };
