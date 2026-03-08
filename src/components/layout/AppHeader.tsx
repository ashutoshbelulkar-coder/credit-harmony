import { Search, Bell, ChevronDown, User, Menu, Sun, Moon, Monitor, LogOut, Settings, AlertTriangle, CheckCircle2, Info, Shield } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const notifications = [
    { id: 1, icon: AlertTriangle, iconColor: "text-warning", title: "SLA Breach Alert", desc: "P95 latency exceeded 300ms for Data Submission API", time: "2 min ago", unread: true },
    { id: 2, icon: CheckCircle2, iconColor: "text-success", title: "Schema Mapping Approved", desc: "FNB loan tradeline schema v2.3 approved by governance", time: "15 min ago", unread: true },
    { id: 3, icon: Shield, iconColor: "text-destructive", title: "Failed Login Attempt", desc: "Carlos Rivera login blocked — account suspended", time: "1 hour ago", unread: true },
    { id: 4, icon: Info, iconColor: "text-primary", title: "New User Invited", desc: "Aisha Bello (First Bank Nigeria) invitation sent", time: "3 hours ago", unread: false },
    { id: 5, icon: CheckCircle2, iconColor: "text-success", title: "Batch Processing Complete", desc: "Metro Credit Union batch #4821 — 12,450 records processed", time: "5 hours ago", unread: false },
    { id: 6, icon: AlertTriangle, iconColor: "text-warning", title: "Data Quality Drop", desc: "Pacific Finance Corp field completeness dropped to 91%", time: "Yesterday", unread: false },
  ];

  const [readIds, setReadIds] = useState<number[]>([]);
  const unreadCount = notifications.filter((n) => n.unread && !readIds.includes(n.id)).length;

  const markAllRead = () => setReadIds(notifications.map((n) => n.id));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 min-h-[44px] items-center gap-2 sm:gap-4 border-b border-border bg-card px-4 sm:px-6 pl-[max(1rem,env(safe-area-inset-left))]">
      {/* Mobile menu */}
      <button
        type="button"
        aria-label="Toggle navigation"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted md:hidden"
        onClick={onToggleSidebar}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Global Search */}
      <div className="ml-auto flex-1 max-w-md">
        <div
          className={cn(
            "flex h-9 items-center gap-2 px-3 rounded-lg border transition-all duration-200",
            searchFocused ? "border-primary bg-card shadow-sm" : "border-border bg-background"
          )}
        >
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search institutions, APIs, logs..."
            className="flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted text-caption text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="relative">
        <button
          type="button"
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted transition-colors duration-200"
          onClick={() => setShowThemeMenu(!showThemeMenu)}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
        </button>
        {showThemeMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} aria-hidden />
            <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 animate-fade-in">
              <button
                onClick={() => { setTheme("light"); setShowThemeMenu(false); }}
                className={cn("w-full flex items-center gap-2 px-4 py-2.5 text-body hover:bg-muted transition-colors", theme === "light" && "bg-muted font-medium")}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
              <button
                onClick={() => { setTheme("dark"); setShowThemeMenu(false); }}
                className={cn("w-full flex items-center gap-2 px-4 py-2.5 text-body hover:bg-muted transition-colors", theme === "dark" && "bg-muted font-medium")}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
              <button
                onClick={() => { setTheme("system"); setShowThemeMenu(false); }}
                className={cn("w-full flex items-center gap-2 px-4 py-2.5 text-body hover:bg-muted transition-colors", theme === "system" && "bg-muted font-medium")}
              >
                <Monitor className="w-4 h-4" /> System
              </button>
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative flex h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 items-center justify-center rounded-lg hover:bg-muted transition-colors duration-200" aria-label="Notifications">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto divide-y">
            {notifications.map((n) => {
              const isUnread = n.unread && !readIds.includes(n.id);
              return (
                <div
                  key={n.id}
                  className={cn("flex gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors", isUnread && "bg-primary/5")}
                  onClick={() => !readIds.includes(n.id) && setReadIds((prev) => [...prev, n.id])}
                >
                  <div className={cn("mt-0.5 shrink-0", n.iconColor)}>
                    <n.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{n.title}</span>
                      {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.desc}</p>
                    <span className="text-[10px] text-muted-foreground/70 mt-1 block">{n.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* User Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="hidden md:flex flex-col text-left min-w-0 overflow-hidden">
              <span className="text-body font-medium leading-tight truncate">Admin User</span>
              <span className="text-caption text-muted-foreground leading-tight truncate">Super Admin</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => navigate("/user-management/users")}>
            <Settings className="w-4 h-4 mr-2" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" /> Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
