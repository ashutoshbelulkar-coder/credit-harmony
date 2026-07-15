import type { EnquiryConfig, PacketConfig, ProductPricingModel } from "@/data/data-products-mock";

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
  | "delegated"
  | "activated"
  | "deprecated"
  | "reactivated"
  | "deactivated"
  | "archived"
  | "ownership_transferred"
  | "version_cloned"
  | "notification_sent";

export interface ProductMetadata {
  owner: string;
  ownerRole: string;
  businessUnit: string;
  targetGeography: string;
  targetSegment: string;
  intendedUse: string;
  regulatoryNotes: string;
  sensitivity: "Low" | "Medium" | "High";
  tags: string[];
  categories: string[];
  effectiveStart?: string | null;
  effectiveEnd?: string | null;
}

export interface ApprovalDecision {
  id: string;
  actor: string;
  role: string;
  decision: "approve" | "reject" | "delegate";
  comment: string;
  at: string;
  delegatedTo?: string;
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
  pricingModel: ProductPricingModel;
  price: number;
  lastUpdated: string;
  createdAt: string;
  packetIds: string[];
  packetConfigs: PacketConfig[];
  enquiryConfig: EnquiryConfig;
  metadata: ProductMetadata;
  consumerCount: number;
  definitionFingerprint: string;
  deprecationWindowDays?: number | null;
  deprecationNoticeAt?: string | null;
  approvalCycles: ApprovalCycle[];
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
}

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

export function computeDefinitionFingerprint(
  packetIds: string[],
  packetConfigs: PacketConfig[]
): string {
  const sortedIds = [...packetIds].sort();
  const cfgMap = new Map(packetConfigs.map((c) => [c.packetId, c]));
  const parts = sortedIds.map((pid) => {
    const c = cfgMap.get(pid);
    const fields = [...(c?.selectedFields ?? [])].sort().join(",");
    const derived = [...(c?.selectedDerivedFields ?? [])].sort().join(",");
    const disabled = [...(c?.disabledFields ?? [])].sort().join(",");
    return `${pid}:{${fields}}/{${derived}}/{${disabled}}`;
  });
  const raw = parts.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}
