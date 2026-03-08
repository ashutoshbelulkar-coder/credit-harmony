import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Brain,
  ShieldCheck,
  Activity,
  FileBarChart,
  ScrollText,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Institution Management", path: "/institutions/data-submitters", icon: Building2 },
  { title: "Agents", path: "/agents", icon: Brain },
  { title: "Data Governance", path: "/data-governance", icon: ShieldCheck },
  { title: "Monitoring", path: "/monitoring", icon: Activity },
  { title: "Reporting", path: "/reporting", icon: FileBarChart },
  { title: "Audit Logs", path: "/audit-logs", icon: ScrollText },
  { title: "User Management", path: "/user-management/users", icon: Users },
];

const institutionSubItems = [
  { title: "Data Submission Institutions", path: "/institutions/data-submitters" },
  { title: "Subscriber Institutions", path: "/institutions/subscribers" },
];

const dataGovernanceSubItems = [
  { title: "Dashboard", path: "/data-governance/dashboard" },
  { title: "Schema Mapper Agent", path: "/data-governance/auto-mapping-review" },
  { title: "Validation Rules", path: "/data-governance/validation-rules" },
  { title: "Identity Resolution Agent", path: "/data-governance/match-review" },
  { title: "Data Quality Monitoring", path: "/data-governance/data-quality-monitoring" },
  { title: "Governance Audit Logs", path: "/data-governance/governance-audit-logs" },
];

const monitoringSubItems = [
  { title: "Data Submission API", path: "/monitoring/data-submission-api" },
  { title: "Data Submission Batch", path: "/monitoring/data-submission-batch" },
  { title: "Inquiry API", path: "/monitoring/inquiry-api" },
  { title: "SLA Configuration", path: "/monitoring/sla-configuration" },
  { title: "Alert Engine", path: "/monitoring/alert-engine" },
];

const userManagementSubItems = [
  { title: "Users", path: "/user-management/users" },
  { title: "Roles & Permissions", path: "/user-management/roles" },
  { title: "Activity Log", path: "/user-management/activity" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "sidebar-gradient flex flex-col border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0 z-30",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <span className="text-secondary-foreground font-bold text-body">H</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-primary-foreground font-semibold text-body tracking-tight">
              Hybrid Credit
            </span>
            <span className="text-sidebar-foreground text-caption tracking-wider uppercase">
              Bureau
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isDataGov = item.path === "/data-governance";
          const isInstitutions = item.path.startsWith("/institutions");
          const isMonitoring = item.path === "/monitoring";
          const isUserMgmt = item.path.startsWith("/user-management");
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path.split("/").slice(0, 2).join("/") + (item.path.split("/").length > 2 ? "/" + item.path.split("/")[2] : ""));
          const isInstitutionsSectionActive =
            institutionSubItems.some(
              (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
            ) || (location.pathname.startsWith("/institutions/") && location.pathname !== "/institutions/register");
          const isDataGovSectionActive = dataGovernanceSubItems.some(
            (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
          );
          const isMonitoringSectionActive = monitoringSubItems.some(
            (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
          );
          const isUserMgmtSectionActive = userManagementSubItems.some(
            (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
          );
          const showDataGovSub = isDataGov && (isActive || isDataGovSectionActive) && !collapsed;
          const showInstitutionsSub = isInstitutions && (isActive || isInstitutionsSectionActive) && !collapsed;
          const showMonitoringSub = isMonitoring && (isActive || isMonitoringSectionActive) && !collapsed;
          const showUserMgmtSub = isUserMgmt && (isActive || isUserMgmtSectionActive) && !collapsed;
          const subItems = isDataGov
            ? dataGovernanceSubItems
            : isInstitutions
            ? institutionSubItems
            : isMonitoring
            ? monitoringSubItems
            : isUserMgmt
            ? userManagementSubItems
            : null;
          const showSubNav = (showDataGovSub || showInstitutionsSub || showMonitoringSub || showUserMgmtSub) && subItems;
          const isParentActive = isActive || (isInstitutions && isInstitutionsSectionActive) || (isDataGov && isDataGovSectionActive) || (isMonitoring && isMonitoringSectionActive) || (isUserMgmt && isUserMgmtSectionActive);

          return (
            <div key={item.path}>
              <NavLink
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-[11px] font-medium leading-[18px] transition-all duration-200 group",
                  isParentActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    isParentActive ? "text-sidebar-primary" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                  )}
                />
                {!collapsed && <span className="truncate">{item.title}</span>}
                {isParentActive && !showSubNav && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
                )}
              </NavLink>
              {showSubNav && subItems && (
                <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-0.5">
                  {subItems.map((sub) => {
                    const isSubActive = location.pathname === sub.path;
                    return (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 min-h-[44px] text-[11px] font-medium leading-[18px] transition-colors duration-200",
                          isSubActive
                            ? "text-sidebar-primary bg-sidebar-accent/80"
                            : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        {isSubActive && (
                          <span className="w-1 h-1 rounded-full bg-sidebar-primary shrink-0" />
                        )}
                        <span className={cn("truncate", !isSubActive && "ml-3")}>
                          {sub.title}
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center min-h-[44px] h-12 border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors duration-200"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
