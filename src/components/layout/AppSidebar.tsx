import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Building2,
  Brain,
  ShieldCheck,
  Activity,
  FileBarChart,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
  Package,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Member Management", path: "/institutions", icon: Building2 },
  { title: "Data Products", path: "/data-products/products", icon: Package },
  { title: "Agents", path: "/agents", icon: Brain },
  { title: "Data Governance", path: "/data-governance", icon: ShieldCheck },
  { title: "Monitoring", path: "/monitoring", icon: Activity },
  { title: "Reporting", path: "/reporting", icon: FileBarChart },
  { title: "Approval Queue", path: "/approval-queue", icon: ClipboardCheck },
  { title: "User Management", path: "/user-management/users", icon: Users },
];

const institutionSubItems = [
  { title: "Member Institutions", path: "/institutions" },
  { title: "Register member", path: "/institutions/register" },
  { title: "Consortiums", path: "/consortiums" },
];

const dataProductsSubItems = [
  { title: "Product Configurator", path: "/data-products/products" },
  { title: "Enquiry simulation", path: "/data-products/enquiry-simulation" },
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

type SidebarSectionId =
  | "institutions"
  | "data-products"
  | "data-governance"
  | "monitoring"
  | "user-management";

/** Sub-routes like `/institutions/register` should not mark the list item "Member Institutions" active. */
function isInstitutionSubNavActive(pathname: string, subPath: string): boolean {
  if (pathname === subPath) return true;
  if (!pathname.startsWith(subPath + "/")) return false;
  if (subPath === "/institutions" && pathname.startsWith("/institutions/register")) return false;
  return true;
}

function sectionIdFromPathname(pathname: string): SidebarSectionId | null {
  if (pathname.startsWith("/data-products")) return "data-products";
  if (
    pathname.startsWith("/consortiums") ||
    pathname.startsWith("/institutions")
  ) {
    return "institutions";
  }
  if (pathname.startsWith("/data-governance")) return "data-governance";
  if (pathname.startsWith("/monitoring")) return "monitoring";
  if (pathname.startsWith("/user-management")) return "user-management";
  return null;
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  /** Accordion: at most one nested section open — follows route, or manual chevron on neutral pages (e.g. dashboard). */
  const [expandedSectionId, setExpandedSectionId] =
    useState<SidebarSectionId | null>(() =>
      sectionIdFromPathname(location.pathname)
    );

  useEffect(() => {
    setExpandedSectionId(sectionIdFromPathname(location.pathname));
  }, [location.pathname]);

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
          const isDataProducts = item.path.startsWith("/data-products");
          const isMonitoring = item.path === "/monitoring";
          const isUserMgmt = item.path.startsWith("/user-management");
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path.split("/").slice(0, 2).join("/") + (item.path.split("/").length > 2 ? "/" + item.path.split("/")[2] : ""));
          const isInstitutionsSectionActive =
            institutionSubItems.some(
              (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
            ) ||
            location.pathname.startsWith("/institutions/") ||
            location.pathname.startsWith("/consortiums");
          const isDataGovSectionActive = dataGovernanceSubItems.some(
            (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
          );
          const isDataProductsSectionActive =
            location.pathname.startsWith("/data-products");
          const isMonitoringSectionActive = monitoringSubItems.some(
            (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
          );
          const isUserMgmtSectionActive = userManagementSubItems.some(
            (sub) => location.pathname === sub.path || location.pathname.startsWith(sub.path + "/")
          );
          const subItems = isDataGov
            ? dataGovernanceSubItems
            : isInstitutions
            ? institutionSubItems
            : isDataProducts
            ? dataProductsSubItems
            : isMonitoring
            ? monitoringSubItems
            : isUserMgmt
            ? userManagementSubItems
            : null;
          const sectionId: SidebarSectionId | null = isInstitutions
            ? "institutions"
            : isDataProducts
            ? "data-products"
            : isDataGov
            ? "data-governance"
            : isMonitoring
            ? "monitoring"
            : isUserMgmt
            ? "user-management"
            : null;
          const showSubNav =
            Boolean(
              subItems &&
                sectionId &&
                expandedSectionId === sectionId &&
                !collapsed
            );
          const isParentActive =
            isActive ||
            (isInstitutions && isInstitutionsSectionActive) ||
            (isDataProducts && isDataProductsSectionActive) ||
            (isDataGov && isDataGovSectionActive) ||
            (isMonitoring && isMonitoringSectionActive) ||
            (isUserMgmt && isUserMgmtSectionActive);

          return (
            <div key={item.path} className="min-w-0">
              {collapsed ? (
                subItems ? (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-haspopup="menu"
                            className={cn(
                              "flex w-full items-center justify-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-[11px] font-medium leading-[18px] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              isParentActive
                                ? "bg-sidebar-accent text-sidebar-primary"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <item.icon
                              className={cn(
                                "w-5 h-5 shrink-0 transition-colors",
                                isParentActive
                                  ? "text-sidebar-primary"
                                  : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                              )}
                            />
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-60 max-h-[min(24rem,70vh)] overflow-y-auto">
                      <div className="px-2 py-1.5 text-caption font-medium text-muted-foreground">
                        {item.title}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <NavLink to={item.path} className="cursor-pointer">
                          Open {item.title}
                        </NavLink>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {subItems.map((sub) => (
                        <DropdownMenuItem key={sub.path} asChild>
                          <NavLink to={sub.path} className="cursor-pointer">
                            {sub.title}
                          </NavLink>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.path}
                        className={cn(
                          "flex items-center justify-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-[11px] font-medium leading-[18px] transition-all duration-200 group",
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
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                )
              ) : subItems && sectionId ? (
                <div
                  className={cn(
                    "flex items-stretch gap-0.5 rounded-lg min-h-[44px] transition-all duration-200",
                    isParentActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <NavLink
                    to={item.path}
                    className={cn(
                      "flex flex-1 items-center gap-3 min-w-0 px-3 py-2.5 rounded-l-lg text-[11px] font-medium leading-[18px] transition-colors duration-200 group",
                      !isParentActive &&
                        "hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5 shrink-0 transition-colors",
                        isParentActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                    {isParentActive && !showSubNav && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
                    )}
                  </NavLink>
                  <button
                    type="button"
                    aria-expanded={expandedSectionId === sectionId}
                    aria-label={
                      expandedSectionId === sectionId
                        ? `Collapse ${item.title} menu`
                        : `Expand ${item.title} menu`
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedSectionId((cur) =>
                        cur === sectionId ? null : sectionId
                      );
                    }}
                    className={cn(
                      "flex items-center justify-center px-2 rounded-r-lg text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isParentActive && "text-sidebar-primary"
                    )}
                  >
                    {expandedSectionId === sectionId ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
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
                      isParentActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                  {isParentActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
                  )}
                </NavLink>
              )}
              {showSubNav && subItems && (
                <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-0.5 min-w-0">
                  {subItems.map((sub) => {
                    const isSubActive = isInstitutions
                      ? isInstitutionSubNavActive(location.pathname, sub.path)
                      : location.pathname === sub.path ||
                        location.pathname.startsWith(sub.path + "/");
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
