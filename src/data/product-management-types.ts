import type { EnquiryConfig, PacketConfig } from "@/data/data-products-mock";
import type { AttributeSensitivity, SubjectScope } from "@/data/attribute-dictionary";
import { DICTIONARY_VERSION } from "@/data/attribute-dictionary";

/** Full BRD product version lifecycle (static UI demo). */
export type BrdLifecycleStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "active"
  | "deprecated"
  | "inactive"
  | "archived";

export type ApprovalPattern = "single" | "quorum" | "sequential";

export type ApprovalSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn";

export type AuditAction =
  | "created"
  | "updated"
  | "submitted"
  | "approved"
  | "rejected"
  | "resubmitted"
  // Delegation removed per BRD v1.2; parked as OQ-07.
  | "activated"
  | "deprecated"
  | "reactivated"
  | "deactivated"
  | "archived"
  | "version_cloned"
  | "notification_sent"
  | "access_requested"
  | "access_approved"
  | "access_rejected";

export interface ProductMetadata {
  businessUnit: string;
  targetSegment: string;
  /** Optional SAP material / item code used for billing reference. */
  sapItemCode: string;
  intendedUse: string;
  regulatoryNotes: string;
  sensitivity: "Low" | "Medium" | "High";
  tags: string[];
  categories: string[];
  effectiveStart?: string | null;
  effectiveEnd?: string | null;
  releaseNote: string;
  dataAcquisitionType: string;
  dataAvailabilityType: string;
  accessRestrictions: string;
}

export interface ApprovalDecision {
  id: string;
  actor: string;
  role: string;
  // Delegation removed per BRD v1.2; parked as OQ-07.
  decision: "approve" | "reject";
  comment: string;
  at: string;
}

export interface ApprovalCycle {
  id: string;
  cycleNumber: number;
  status: ApprovalSubmissionStatus;
  submittedAt: string;
  submittedBy: string;
  justification: string;
  policyId: string;
  fingerprint: string;
  exceptionRequested?: boolean;
  exceptionJustification?: string;
  decisions: ApprovalDecision[];
  /** When set, this cycle is an access-request approval rather than a version approval. */
  subscriptionId?: string;
  kind?: "version" | "access_request";
}

export type AttributeMode = "SNAPSHOT" | "TRENDED";

export interface FieldContractRow {
  name: string;
  type: string;
  description: string;
  pii: boolean;
  mode: AttributeMode;
  packetId: string;
  attributeId?: string;
  label?: string;
  sensitivity?: AttributeSensitivity;
  // `populatedBy` (feed/provider names) removed — provenance is dictionary-maintenance
  // metadata (Excel-only) and must not surface in the product-facing field contract.
  notes?: string;
  deprecatedInDictionary?: string | null;
  eventStreamId?: string;
}

export type { SubjectScope };

/** Ceiling; request selects within it. */
export interface TrendedConfig {
  enabled: boolean;
  maxHistoryMonths: number;
}

/** Point-in-time as-of retrieval ceiling; request supplies enquiryDate within it. */
export interface RetroConfig {
  enabled: boolean;
  maxHistoryMonths: number;
}

export interface OutputPort {
  id: string;
  name: string;
  channel: "ENQUIRY_API" | "BATCH_EXTRACT";
  status: "active" | "planned";
  contractRef: string;
}

export interface PolicyWarning {
  code: string;
  severity: "warning" | "critical";
  message: string;
}

/** System Customer Profile block — never a data packet or product. */
export interface ProfileBlockConfig {
  includedFields: string[];
}

export interface Subscription {
  id: string;
  institutionId: string;
  institutionName: string;
  productCode: string;
  pinnedVersionId: string | null;
  businessDomain: string;
  application: string;
  billingRef: string;
  usagePeriodMonths: number;
  purpose: string;
  status: "pending" | "active" | "expired" | "rejected";
  requestedAt: string;
  approvalCycleId?: string;
  notes?: string;
}

export interface DemoProductVersion {
  /** Route / store id for this version */
  id: string;
  productCode: string;
  name: string;
  description: string;
  version: number;
  parentVersionId?: string | null;
  status: BrdLifecycleStatus;
  lastUpdated: string;
  createdAt: string;
  packetIds: string[];
  packetConfigs: PacketConfig[];
  enquiryConfig: EnquiryConfig;
  metadata: ProductMetadata;
  consumerCount: number;
  /** Cumulative enquiries executed against this version to date (demo metric). */
  enquiryCount: number;
  definitionFingerprint: string;
  deprecationWindowDays?: number | null;
  deprecationNoticeAt?: string | null;
  approvalCycles: ApprovalCycle[];
  trendedConfig: TrendedConfig;
  retroConfig: RetroConfig;
  profileConfig: ProfileBlockConfig;
  subjectScope: SubjectScope;
  dictionaryVersion: string;
  eventStreamToggles: Record<string, string[]>;
  outputPorts: OutputPort[];
  fieldContract: FieldContractRow[];
  policyWarnings: PolicyWarning[];
}

export interface DemoNotification {
  id: string;
  productId: string;
  productCode: string;
  versionId: string;
  event: string;
  message: string;
  sentAt: string;
  recipients: string[];
}

export interface DemoAuditEvent {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  productId: string;
  productCode: string;
  versionId: string;
  version: number;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  justification?: string | null;
}

export interface DemoDependencyEdge {
  id: string;
  fromType: "product" | "packet" | "capability";
  fromId: string;
  fromLabel: string;
  toType: "product" | "packet" | "capability";
  toId: string;
  toLabel: string;
}

export interface ApprovalPolicyDemo {
  id: string;
  name: string;
  pattern: ApprovalPattern;
  trigger: string;
  roles: string[];
  separationOfDuties: boolean;
  description: string;
}

export interface ProductManagementDemoState {
  versions: DemoProductVersion[];
  notifications: DemoNotification[];
  auditEvents: DemoAuditEvent[];
  dependencies: DemoDependencyEdge[];
  policies: ApprovalPolicyDemo[];
  subscriptions: Subscription[];
}

export const LOCAL_CPO_LABEL = "Local CPO";

export const DEFAULT_PROFILE_FIELDS = [
  "fullName",
  "dateOfBirth",
  "gender",
  "currentAddress",
  "primaryIdentifier",
  "contactNumber",
];

export const BRD_STATUS_LABEL: Record<BrdLifecycleStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  active: "Active",
  deprecated: "Deprecated",
  inactive: "Inactive",
  archived: "Archived",
};

export const BRD_STATUS_STYLES: Record<BrdLifecycleStatus, string> = {
  draft: "bg-warning/15 text-warning",
  pending_approval: "bg-primary/15 text-primary",
  approved: "bg-success/20 text-success ring-1 ring-success/30",
  active: "bg-success/15 text-success",
  deprecated: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  inactive: "bg-muted text-muted-foreground",
  archived: "bg-muted/60 text-muted-foreground border border-border",
};

/** Allowed transitions for demo UI (BRD matrix subset). */
export const ALLOWED_TRANSITIONS: Record<BrdLifecycleStatus, BrdLifecycleStatus[]> = {
  draft: ["pending_approval"],
  pending_approval: ["approved", "draft"],
  approved: ["active"],
  active: ["deprecated", "inactive"],
  deprecated: ["active", "inactive"],
  inactive: ["active", "archived"],
  archived: [],
};

export function normalizeProductName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_\-]+/g, " ");
}

/** An approval cycle is an access-request review when it is linked to a subscription. */
export function isAccessRequestCycle(cycle: ApprovalCycle, subscription?: Subscription): boolean {
  return !!subscription || cycle.kind === "access_request" || !!cycle.subscriptionId;
}

const TRENDED_FIELD_HINTS = [
  "avg_monthly",
  "monthly_",
  "turnover",
  "balance",
  "bill",
  "recharge",
  "emi_outflow",
  "income_stability",
];

const PII_FIELD_HINTS = [
  "name",
  "pan",
  "phone",
  "mobile",
  "email",
  "address",
  "dob",
  "date_of_birth",
  "national",
  "identifier",
  "aadhaar",
  "contact",
];

export function inferAttributeMode(fieldName: string): AttributeMode {
  const lower = fieldName.toLowerCase();
  return TRENDED_FIELD_HINTS.some((h) => lower.includes(h)) ? "TRENDED" : "SNAPSHOT";
}

export function inferFieldPii(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return PII_FIELD_HINTS.some((h) => lower.includes(h));
}

export function inferFieldType(fieldName: string): string {
  const lower = fieldName.toLowerCase();
  if (lower.includes("score") || lower.includes("count") || lower.includes("amount") || lower.includes("balance") || lower.includes("turnover") || lower.includes("months")) {
    return "number";
  }
  if (lower.includes("date") || lower.includes("as_of") || lower.includes("dob")) return "date";
  if (lower.includes("flag") || lower.includes("detected") || lower.includes("regular")) return "boolean";
  return "string";
}

/**
 * Canonical definition fingerprint.
 * Incorporates packet contract fields (selected − disabled), enquiry scope + impact +
 * footprint policy, trendedConfig, and retroConfig. Disabled fields are excluded from
 * the fields set rather than hashed separately.
 */
export interface ContractFingerprintExtras {
  subjectScope?: SubjectScope;
  dictionaryVersion?: string;
  eventStreamToggles?: Record<string, string[]>;
}

export function computeDefinitionFingerprint(
  packetIds: string[],
  packetConfigs: PacketConfig[],
  enquiryConfig: Pick<EnquiryConfig, "scope" | "soft" | "hard">,
  trendedConfig: TrendedConfig,
  retroConfig: RetroConfig = { enabled: false, maxHistoryMonths: 0 },
  extras: ContractFingerprintExtras = {}
): string {
  const sortedIds = [...packetIds].sort();
  const cfgMap = new Map(packetConfigs.map((c) => [c.packetId, c]));
  const streams = extras.eventStreamToggles ?? {};
  const parts = sortedIds.map((pid) => {
    const c = cfgMap.get(pid);
    const disabled = new Set((c?.disabledFields ?? []).map(String));
    const fields = [...(c?.selectedFields ?? [])].filter((f) => !disabled.has(f)).sort().join(",");
    const derived = [...(c?.selectedDerivedFields ?? [])].sort().join(",");
    const toggled = [...(streams[pid] ?? [])].sort().join(",");
    return `${pid}:{${fields}}/{${derived}}/[${toggled}]`;
  });
  const packImpact = (opt: { enabled: boolean; storeFootprint: boolean; footprintVisibility: string | null }) =>
    `${opt.enabled ? 1 : 0}:${opt.storeFootprint ? 1 : 0}:${opt.footprintVisibility ?? "none"}`;
  parts.push(`scope:${extras.subjectScope ?? "INDIVIDUAL"}`);
  parts.push(`dict:${extras.dictionaryVersion ?? DICTIONARY_VERSION}`);
  parts.push(
    `enq:${enquiryConfig.scope}:soft=${packImpact(enquiryConfig.soft)}:hard=${packImpact(enquiryConfig.hard)}`
  );
  parts.push(
    `trended:${trendedConfig.enabled ? 1 : 0}:${trendedConfig.enabled ? trendedConfig.maxHistoryMonths : 0}`
  );
  parts.push(
    `retro:${retroConfig.enabled ? 1 : 0}:${retroConfig.enabled ? retroConfig.maxHistoryMonths : 0}`
  );
  const raw = parts.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export function fingerprintExtrasFromVersion(v: {
  subjectScope?: SubjectScope;
  dictionaryVersion?: string;
  eventStreamToggles?: Record<string, string[]>;
}): ContractFingerprintExtras {
  return {
    subjectScope: v.subjectScope ?? "INDIVIDUAL",
    dictionaryVersion: v.dictionaryVersion ?? DICTIONARY_VERSION,
    eventStreamToggles: v.eventStreamToggles ?? {},
  };
}

export function buildFieldContractFromPackets(
  packetIds: string[],
  packetConfigs: PacketConfig[],
  eventStreamToggles: Record<string, string[]> = {}
): FieldContractRow[] {
  const cfgMap = new Map(packetConfigs.map((c) => [c.packetId, c]));
  const rows: FieldContractRow[] = [];
  for (const pid of packetIds) {
    const c = cfgMap.get(pid);
    const disabled = new Set((c?.disabledFields ?? []).map(String));
    const fields = (c?.selectedFields ?? []).filter((f) => !disabled.has(f));
    for (const name of fields) {
      rows.push({
        name,
        type: inferFieldType(name),
        description: `${name.replace(/_/g, " ")} from packet ${pid}`,
        pii: inferFieldPii(name),
        mode: inferAttributeMode(name),
        packetId: pid,
        attributeId: name,
        label: name.replace(/_/g, " "),
        sensitivity: inferFieldPii(name) ? "PII" : "Standard",
        notes: "",
        deprecatedInDictionary: null,
      });
    }
    for (const name of c?.selectedDerivedFields ?? []) {
      rows.push({
        name,
        type: "number",
        description: `Derived: ${name.replace(/_/g, " ")}`,
        pii: false,
        mode: inferAttributeMode(name),
        packetId: pid,
        attributeId: name,
        label: name.replace(/_/g, " "),
        sensitivity: "Standard",
        notes: "ƒ derived from this packet",
        deprecatedInDictionary: null,
      });
    }
  }
  void eventStreamToggles;
  return rows;
}

export const DEFAULT_TRENDED_CONFIG: TrendedConfig = { enabled: false, maxHistoryMonths: 0 };

export const DEFAULT_RETRO_CONFIG: RetroConfig = { enabled: false, maxHistoryMonths: 0 };

export function normalizeRetroConfig(partial?: Partial<RetroConfig> | null): RetroConfig {
  if (!partial?.enabled) return { ...DEFAULT_RETRO_CONFIG };
  const months = Math.max(1, Math.min(60, Math.floor(Number(partial.maxHistoryMonths) || 6)));
  return { enabled: true, maxHistoryMonths: months };
}

export function normalizeTrendedConfig(partial?: Partial<TrendedConfig> | null): TrendedConfig {
  if (!partial?.enabled) return { ...DEFAULT_TRENDED_CONFIG };
  const months = Math.max(1, Math.min(60, Math.floor(Number(partial.maxHistoryMonths) || 6)));
  return { enabled: true, maxHistoryMonths: months };
}

export const DEFAULT_PROFILE_CONFIG: ProfileBlockConfig = {
  includedFields: [...DEFAULT_PROFILE_FIELDS],
};

export function defaultOutputPorts(productCode: string, version: number): OutputPort[] {
  return [
    {
      id: `port_enq_${productCode}_v${version}`,
      name: "Enquiry API (sync)",
      channel: "ENQUIRY_API",
      status: "active",
      contractRef: `${productCode}/v${version}/enquiry`,
    },
    {
      id: `port_batch_${productCode}_v${version}`,
      name: "Batch extract",
      channel: "BATCH_EXTRACT",
      status: "planned",
      contractRef: `${productCode}/v${version}/batch`,
    },
  ];
}
