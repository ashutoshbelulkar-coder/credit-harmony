import seedJson from "@/data/master-dictionary.seed.json";
import type {
  CanonicalAttribute,
  DictionarySnapshot,
  DictFilters,
  DomainCode,
  DomainEntry,
  EntityType,
  MasterDictionarySeed,
  MsmApprovalEvent,
  VersionHistoryRow,
} from "./types";
import { bumpDictVersion, nowIso } from "./msm-helpers";
import { summarizeFieldDiff } from "./validate-dictionary";

const DICT_KEY = "hcb_msm_v2_dictionary";
export const FILTERS_KEY = "hcb_msm_v2_dict_filters";
export const NAV_EXPAND_PREFIX = "hcb_msm_v2_nav_expanded_";

const seed = seedJson as unknown as MasterDictionarySeed;

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

function emptySnapshot(): DictionarySnapshot {
  const seedSynonyms: Record<string, string[]> = {};
  for (const a of seed.attributes ?? []) {
    seedSynonyms[a.attributeId] = [...(a.synonyms ?? [])];
  }
  return {
    dictionaryVersion: seed.dictionaryVersion ?? "v13",
    entityTypes: deepClone(seed.entityTypes ?? []),
    attributes: deepClone(seed.attributes ?? []),
    attributeGroups: deepClone(seed.attributeGroups ?? []),
    domains: deepClone(seed.domains ?? []),
    retentionPolicy: deepClone(seed.retentionPolicy ?? []),
    rowKeys: deepClone(seed.rowKeys ?? []),
    enums: deepClone(seed.enums),
    versionHistory: [],
    approvalEvents: [],
    seedSynonyms,
  };
}

let state: DictionarySnapshot | null = null;

function persist() {
  if (!state) return;
  try {
    localStorage.setItem(DICT_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — keep in-memory only
  }
}

function hydrate(): DictionarySnapshot {
  if (state) return state;
  try {
    const raw = localStorage.getItem(DICT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DictionarySnapshot;
      if (parsed?.attributes?.length && parsed?.entityTypes?.length) {
        state = parsed;
        if (!state.seedSynonyms) state.seedSynonyms = emptySnapshot().seedSynonyms;
        return state;
      }
    }
  } catch {
    // ignore corrupt storage
  }
  state = emptySnapshot();
  persist();
  return state;
}

export function getSnapshot(): DictionarySnapshot {
  return deepClone(hydrate());
}

export function getEnums() {
  return hydrate().enums;
}

export function getDictionaryVersion(): string {
  return hydrate().dictionaryVersion;
}

function touchEntityType(entityType: string) {
  const s = hydrate();
  const idx = s.entityTypes.findIndex((e) => e.entityType === entityType);
  if (idx < 0) return;
  const et = s.entityTypes[idx];
  const attrs = s.attributes.filter(
    (a) => a.appliesTo.includes(entityType) || (a.class === "Reserved" && a.appliesTo.includes("all rows")),
  );
  const pending = attrs.filter((a) => a.status === "pending" || a.status === "proposed").length;
  const sources = [...new Set(attrs.flatMap((a) => a.sources))].sort();
  const groups = [...new Set(attrs.map((a) => a.attributeGroup).filter(Boolean))] as string[];
  s.entityTypes[idx] = {
    ...et,
    attributeCount: attrs.filter((a) => a.class !== "Reserved").length,
    pendingCount: pending,
    sources,
    groups,
    lastUpdated: nowIso().slice(0, 10),
  };
}

export function listEntityTypes(): EntityType[] {
  return deepClone(hydrate().entityTypes);
}

export function getEntityType(code: string): EntityType | undefined {
  const found = hydrate().entityTypes.find((e) => e.entityType === code);
  return found ? deepClone(found) : undefined;
}

export function listAttributes(filters?: Partial<DictFilters>): CanonicalAttribute[] {
  let list = hydrate().attributes;
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (a) =>
        a.attributeId.toLowerCase().includes(q) ||
        a.canonicalQualifier.toLowerCase().includes(q) ||
        a.definition.toLowerCase().includes(q) ||
        a.synonyms.some((s) => s.toLowerCase().includes(q)) ||
        a.displayName.toLowerCase().includes(q),
    );
  }
  if (filters?.status && filters.status !== "all") list = list.filter((a) => a.status === filters.status);
  if (filters?.table && filters.table !== "all") list = list.filter((a) => a.targetTable === filters.table);
  if (filters?.className && filters.className !== "all") list = list.filter((a) => a.class === filters.className);
  if (filters?.sensitivity && filters.sensitivity !== "all") list = list.filter((a) => a.sensitivity === filters.sensitivity);
  if (filters?.source && filters.source !== "all") list = list.filter((a) => a.sources.includes(filters.source as string));
  if (filters?.group && filters.group !== "all") {
    if (filters.group === "__ungrouped") list = list.filter((a) => a.attributeGroup == null);
    else list = list.filter((a) => a.attributeGroup === filters.group);
  }
  return deepClone(list);
}

export function getAttribute(attributeId: string): CanonicalAttribute | undefined {
  const found = hydrate().attributes.find((a) => a.attributeId === attributeId);
  return found ? deepClone(found) : undefined;
}

export function attributesForType(entityType: string): CanonicalAttribute[] {
  const s = hydrate();
  return deepClone(
    s.attributes.filter(
      (a) => a.appliesTo.includes(entityType) || (a.class === "Reserved" && a.appliesTo.includes("all rows")),
    ),
  );
}

export function upsertAttributes(
  next: CanonicalAttribute[],
  opts?: { bumpVersion?: boolean; changedBy?: string; historyChange?: string },
): CanonicalAttribute[] {
  const s = hydrate();
  const byId = new Map(s.attributes.map((a) => [a.attributeId, a]));
  const changedBy = opts?.changedBy ?? "You";
  const touchedTypes = new Set<string>();
  const saved: CanonicalAttribute[] = [];

  for (const incoming of next) {
    const prev = byId.get(incoming.attributeId);
    let attr = deepClone(incoming);
    if (opts?.bumpVersion) {
      attr.version = (prev?.version ?? attr.version ?? 0) + 1;
      attr.updatedAt = nowIso();
      if (prev) {
        s.versionHistory.unshift({
          id: `vh-${Date.now()}-${attr.attributeId}`,
          attributeId: attr.attributeId,
          version: attr.version,
          change: opts.historyChange ?? summarizeFieldDiff(prev, attr),
          changedBy,
          changedAt: attr.updatedAt,
          dictionaryVersion: s.dictionaryVersion,
        });
      }
    }
    byId.set(attr.attributeId, attr);
    saved.push(attr);
    for (const t of attr.appliesTo) touchedTypes.add(t);
    if (prev) for (const t of prev.appliesTo) touchedTypes.add(t);
  }

  s.attributes = [...byId.values()];
  for (const t of touchedTypes) {
    if (t !== "all rows") touchEntityType(t);
  }
  persist();
  return deepClone(saved);
}

export function deleteAttribute(attributeId: string): void {
  const s = hydrate();
  const prev = s.attributes.find((a) => a.attributeId === attributeId);
  s.attributes = s.attributes.filter((a) => a.attributeId !== attributeId);
  if (prev) for (const t of prev.appliesTo) if (t !== "all rows") touchEntityType(t);
  persist();
}

export function createEntityType(et: EntityType): EntityType {
  const s = hydrate();
  if (s.entityTypes.some((e) => e.entityType === et.entityType)) {
    throw new Error(`Entity type ${et.entityType} already exists`);
  }
  const created: EntityType = {
    ...et,
    attributeCount: 0,
    pendingCount: 0,
    sources: et.sources ?? [],
    groups: et.groupManifest ?? et.groups ?? [],
    lastUpdated: nowIso().slice(0, 10),
  };
  s.entityTypes.push(created);
  persist();
  return deepClone(created);
}

export function updateEntityType(code: string, patch: Partial<EntityType>): EntityType {
  const s = hydrate();
  const idx = s.entityTypes.findIndex((e) => e.entityType === code);
  if (idx < 0) throw new Error(`Unknown entity type ${code}`);
  s.entityTypes[idx] = { ...s.entityTypes[idx], ...patch, entityType: s.entityTypes[idx].entityType };
  persist();
  return deepClone(s.entityTypes[idx]);
}

export function addAttributeGroup(name: string, description = ""): void {
  const s = hydrate();
  if (s.attributeGroups.some((g) => g.group === name)) return;
  s.attributeGroups.push({ group: name, scope: "Specific", appliesTo: "", description });
  persist();
}

export function listDomains(): DomainEntry[] {
  return deepClone(hydrate().domains);
}

export function getDomain(name: string): DomainEntry | undefined {
  const d = hydrate().domains.find((x) => x.domainName === name);
  return d ? deepClone(d) : undefined;
}

export function saveDomainCodes(domainName: string, codes: DomainCode[]): DomainEntry {
  const s = hydrate();
  const idx = s.domains.findIndex((d) => d.domainName === domainName);
  if (idx < 0) throw new Error(`Unknown domain ${domainName}`);
  s.domains[idx] = { ...s.domains[idx], codes: deepClone(codes) };
  persist();
  return deepClone(s.domains[idx]);
}

export function cutDictionaryVersion(change = "Dictionary version cut"): string {
  const s = hydrate();
  const from = s.dictionaryVersion;
  const to = bumpDictVersion(from);
  s.dictionaryVersion = to;
  s.versionHistory.unshift({
    id: `vh-cut-${Date.now()}`,
    attributeId: "",
    version: to,
    change: `${change}: ${from} → ${to}`,
    changedBy: "You",
    changedAt: nowIso(),
    dictionaryVersion: to,
  });
  persist();
  return to;
}

export function appendApprovalEvent(event: Omit<MsmApprovalEvent, "id">): MsmApprovalEvent {
  const s = hydrate();
  const row: MsmApprovalEvent = { ...event, id: `ae-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  s.approvalEvents.unshift(row);
  persist();
  return deepClone(row);
}

export function listApprovalEvents(entityType?: string): MsmApprovalEvent[] {
  const s = hydrate();
  const attrs = entityType ? new Set(attributesForType(entityType).map((a) => a.attributeId)) : null;
  return deepClone(
    s.approvalEvents.filter((e) => {
      if (entityType && e.entityType === entityType) return true;
      if (attrs) return attrs.has(e.attributeId);
      return true;
    }),
  );
}

export function listVersionHistory(entityType?: string): VersionHistoryRow[] {
  const s = hydrate();
  if (!entityType) return deepClone(s.versionHistory);
  const ids = new Set(attributesForType(entityType).map((a) => a.attributeId));
  return deepClone(s.versionHistory.filter((r) => !r.attributeId || ids.has(r.attributeId) || r.change.startsWith("Dictionary version cut")));
}

export function loadDictFilters(): DictFilters {
  const defaults: DictFilters = {
    search: "",
    status: "all",
    table: "all",
    className: "all",
    sensitivity: "all",
    source: "all",
    group: "all",
  };
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<DictFilters>) };
  } catch {
    /* ignore */
  }
  return defaults;
}

export function saveDictFilters(filters: DictFilters): void {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

export function loadNavExpanded(entityType: string): string[] | null {
  try {
    const raw = localStorage.getItem(NAV_EXPAND_PREFIX + entityType);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return null;
}

export function saveNavExpanded(entityType: string, groups: string[]): void {
  try {
    localStorage.setItem(NAV_EXPAND_PREFIX + entityType, JSON.stringify(groups));
  } catch {
    /* ignore */
  }
}

export function isSeedSynonym(attributeId: string, chip: string): boolean {
  return (hydrate().seedSynonyms[attributeId] ?? []).includes(chip);
}

export function resetDictionaryForTests(): void {
  state = emptySnapshot();
  persist();
}
