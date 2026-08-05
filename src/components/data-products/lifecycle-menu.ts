import {
  ALLOWED_TRANSITIONS,
  type BrdLifecycleStatus,
  type DemoProductVersion,
} from "@/data/product-management-types";

export type LifecycleActionKind =
  | "activate"
  | "deprecate"
  | "deactivate"
  | "emergency_deactivate"
  | "archive";

export type DraftActionKind = "edit_draft" | "submit_for_approval";

export interface LifecycleMenuAction {
  kind: LifecycleActionKind;
  /** Verb-first label including version and … when it opens a dialog */
  label: string;
  /** Short verb for disabled inline text prefix */
  shortLabel: string;
  enabled: boolean;
  disabledReason: string | null;
  destructive: boolean;
  target: BrdLifecycleStatus;
  emergency: boolean;
}

export interface DraftMenuAction {
  kind: DraftActionKind;
  label: string;
}

export interface LifecycleMenuModel {
  draftActions: DraftMenuAction[];
  /** Non-destructive lifecycle items (Activate, Deprecate, Deactivate) */
  primaryLifecycle: LifecycleMenuAction[];
  /** Destructive items below separator (Emergency deactivate, Archive) */
  destructiveLifecycle: LifecycleMenuAction[];
}

function latestByStatus(
  siblings: DemoProductVersion[],
  status: BrdLifecycleStatus
): DemoProductVersion | undefined {
  return siblings.filter((v) => v.status === status).sort((a, b) => b.version - a.version)[0];
}

/**
 * Default version to open for a product: latest Active → Deprecated →
 * Pending Approval → Draft (by version number within status).
 */
export function resolvePreferredVersion(
  siblings: DemoProductVersion[]
): DemoProductVersion | undefined {
  if (siblings.length === 0) return undefined;
  const sorted = [...siblings].sort((a, b) => b.version - a.version);
  return (
    latestByStatus(sorted, "active") ??
    latestByStatus(sorted, "deprecated") ??
    latestByStatus(sorted, "pending_approval") ??
    latestByStatus(sorted, "draft") ??
    sorted[0]
  );
}

/** Latest Active sibling, if any (for successor links). */
export function latestActiveVersion(
  siblings: DemoProductVersion[]
): DemoProductVersion | undefined {
  return latestByStatus(siblings, "active");
}

function activateDisableReason(status: BrdLifecycleStatus): string {
  if (status === "active") return "already active";
  if (status === "archived") return "archived is terminal";
  if (status === "draft" || status === "pending_approval")
    return "only from approved, deprecated, or inactive";
  return "not allowed from current status";
}

function deprecateDisableReason(status: BrdLifecycleStatus): string {
  if (status === "archived") return "archived is terminal";
  return "only from active";
}

function deactivateDisableReason(status: BrdLifecycleStatus): string {
  if (status === "active") return "use emergency deactivate from active";
  if (status === "archived") return "archived is terminal";
  return "only from deprecated";
}

function emergencyDisableReason(status: BrdLifecycleStatus): string {
  if (status === "archived") return "archived is terminal";
  return "only from active";
}

function archiveDisableReason(status: BrdLifecycleStatus): string {
  if (status === "archived") return "already archived";
  return "only from inactive";
}

/**
 * Single source of truth for Manage menu and Versions-tab row overflow.
 * Always includes all lifecycle targets; invalid ones are disabled with reasons.
 */
export function buildLifecycleMenu(product: DemoProductVersion): LifecycleMenuModel {
  const allowed = ALLOWED_TRANSITIONS[product.status] ?? [];
  const v = product.version;

  const draftActions: DraftMenuAction[] =
    product.status === "draft"
      ? [
          { kind: "edit_draft", label: "Edit draft" },
          { kind: "submit_for_approval", label: "Submit for approval" },
        ]
      : [];

  const activateEnabled = allowed.includes("active");
  const activateShort =
    product.status === "deprecated" || product.status === "inactive" ? "Reactivate" : "Activate";

  const deprecateEnabled = allowed.includes("deprecated");
  const deactivateEnabled = product.status === "deprecated" && allowed.includes("inactive");
  const emergencyEnabled = product.status === "active" && allowed.includes("inactive");
  const archiveEnabled = allowed.includes("archived");

  const activate: LifecycleMenuAction = {
    kind: "activate",
    shortLabel: activateShort,
    label: `${activateShort} v${v}…`,
    enabled: activateEnabled,
    disabledReason: activateEnabled ? null : activateDisableReason(product.status),
    destructive: false,
    target: "active",
    emergency: false,
  };

  const deprecate: LifecycleMenuAction = {
    kind: "deprecate",
    shortLabel: "Deprecate",
    label: `Deprecate v${v}…`,
    enabled: deprecateEnabled,
    disabledReason: deprecateEnabled ? null : deprecateDisableReason(product.status),
    destructive: false,
    target: "deprecated",
    emergency: false,
  };

  const deactivate: LifecycleMenuAction = {
    kind: "deactivate",
    shortLabel: "Deactivate",
    label: `Deactivate v${v}…`,
    enabled: deactivateEnabled,
    disabledReason: deactivateEnabled ? null : deactivateDisableReason(product.status),
    destructive: false,
    target: "inactive",
    emergency: false,
  };

  const emergency: LifecycleMenuAction = {
    kind: "emergency_deactivate",
    shortLabel: "Emergency deactivate",
    label: `Emergency deactivate v${v}…`,
    enabled: emergencyEnabled,
    disabledReason: emergencyEnabled ? null : emergencyDisableReason(product.status),
    destructive: true,
    target: "inactive",
    emergency: true,
  };

  const archive: LifecycleMenuAction = {
    kind: "archive",
    shortLabel: "Archive",
    label: `Archive v${v}…`,
    enabled: archiveEnabled,
    disabledReason: archiveEnabled ? null : archiveDisableReason(product.status),
    destructive: true,
    target: "archived",
    emergency: false,
  };

  return {
    draftActions,
    primaryLifecycle: [activate, deprecate, deactivate],
    destructiveLifecycle: [emergency, archive],
  };
}

export function lifecycleActionConfirmLabel(
  product: DemoProductVersion,
  action: LifecycleMenuAction
): string {
  return `${action.shortLabel} v${product.version}`;
}
