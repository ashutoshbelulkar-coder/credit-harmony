/**
 * Canonical navigation sections for RBAC / Create Role matrix.
 * Keep labels aligned with [AppSidebar.tsx](../components/layout/AppSidebar.tsx).
 */
export type NavSubItem = { label: string; path: string };

export type PermissionSection = {
  id: string;
  title: string;
  items: NavSubItem[];
};

export const permissionSections: PermissionSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    items: [{ label: "Executive overview", path: "/" }],
  },
  {
    id: "members",
    title: "Member Management",
    items: [
      { label: "Member Institutions", path: "/institutions" },
      { label: "Register member", path: "/institutions/register" },
      { label: "Consortiums", path: "/consortiums" },
    ],
  },
  {
    id: "data-products",
    title: "Data Products",
    items: [
      { label: "Product Configurator", path: "/data-products/products" },
      { label: "Enquiry simulation", path: "/data-products/enquiry-simulation" },
    ],
  },
  {
    id: "agents",
    title: "Agents",
    items: [{ label: "Agents", path: "/agents" }],
  },
  {
    id: "data-governance",
    title: "Data Governance",
    items: [
      { label: "Dashboard", path: "/data-governance/dashboard" },
      { label: "Schema Mapper Agent", path: "/data-governance/auto-mapping-review" },
      { label: "Validation Rules", path: "/data-governance/validation-rules" },
      { label: "Identity Resolution Agent", path: "/data-governance/match-review" },
      { label: "Data Quality Monitoring", path: "/data-governance/data-quality-monitoring" },
      { label: "Governance Audit Logs", path: "/data-governance/governance-audit-logs" },
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring",
    items: [
      { label: "Data Submission API", path: "/monitoring/data-submission-api" },
      { label: "Data Submission Batch", path: "/monitoring/data-submission-batch" },
      { label: "Inquiry API", path: "/monitoring/inquiry-api" },
      { label: "SLA Configuration", path: "/monitoring/sla-configuration" },
      { label: "Alert Engine", path: "/monitoring/alert-engine" },
    ],
  },
  {
    id: "reporting",
    title: "Reporting",
    items: [{ label: "Reporting", path: "/reporting" }],
  },
  {
    id: "approval-queue",
    title: "Approval Queue",
    items: [{ label: "Approval Queue", path: "/approval-queue" }],
  },
  {
    id: "user-management",
    title: "User Management",
    items: [
      { label: "Users", path: "/user-management/users" },
      { label: "Roles & Permissions", path: "/user-management/roles" },
      { label: "Activity Log", path: "/user-management/activity" },
    ],
  },
];

export const permissionActions = ["View", "Create", "Edit", "Delete", "Export"] as const;
export type PermissionAction = (typeof permissionActions)[number];
