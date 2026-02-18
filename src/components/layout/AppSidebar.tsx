import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  KeyRound,
  ShieldCheck,
  Activity,
  Server,
  FileBarChart,
  ScrollText,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Institution Management", path: "/institutions", icon: Building2 },
  { title: "API & Access Control", path: "/api-access", icon: KeyRound },
  { title: "Data Governance", path: "/data-governance", icon: ShieldCheck },
  { title: "Monitoring", path: "/monitoring", icon: Activity },
  { title: "CBS Integration", path: "/cbs-integration", icon: Server },
  { title: "Reporting", path: "/reporting", icon: FileBarChart },
  { title: "Audit Logs", path: "/audit-logs", icon: ScrollText },
  { title: "User Management", path: "/user-management", icon: Users },
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
          <span className="text-secondary-foreground font-bold text-sm">H</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-primary-foreground font-semibold text-sm tracking-tight">
              Hybrid Credit
            </span>
            <span className="text-sidebar-foreground text-[10px] tracking-wider uppercase">
              Bureau
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground group-hover:text-sidebar-accent-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.title}</span>}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
