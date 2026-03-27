import { Search, Bell, ChevronDown, User, Menu, Sun, Moon, Monitor, LogOut, Settings, AlertTriangle, CheckCircle2, Info, Shield } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommandPalette } from "@/components/CommandPalette";
import notificationsData from "@/data/app-notifications.json";

const ICON_MAP = { AlertTriangle, CheckCircle2, Info, Shield } as const;
type NotifIconKey = keyof typeof ICON_MAP;

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { setTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { open: openCommandPalette } = useCommandPalette();

  const notifications = notificationsData.notifications.map((n) => ({
    ...n,
    icon: ICON_MAP[n.iconKey as NotifIconKey],
  }));

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

      {/* Global Search — opens command palette */}
      <div className="ml-auto flex-1 max-w-md">
        <button
          type="button"
          onClick={openCommandPalette}
          className={cn(
            "flex h-9 w-full items-center gap-2 px-3 rounded-lg border transition-all duration-200 cursor-pointer",
            "border-border bg-background hover:border-primary hover:bg-card"
          )}
        >
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-left text-body text-muted-foreground">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted text-caption text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted transition-colors duration-200"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="w-4 h-4 mr-2" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="w-4 h-4 mr-2" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="w-4 h-4 mr-2" /> System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative flex h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 items-center justify-center rounded-lg hover:bg-muted transition-colors duration-200" aria-label="Notifications">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-card">
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
                  onClick={() => {
                    if (!readIds.includes(n.id)) setReadIds((prev) => [...prev, n.id]);
                    // Navigate based on notification type
                    if (n.title.includes("SLA")) navigate("/monitoring/sla-configuration");
                    else if (n.title.includes("Schema") || n.title.includes("Mapping")) navigate("/data-governance/auto-mapping-review");
                    else if (n.title.includes("Login") || n.title.includes("User")) navigate("/user-management/users");
                    else if (n.title.includes("Batch")) navigate("/monitoring/data-submission-batch");
                    else if (n.title.includes("Quality")) navigate("/data-governance/data-quality-monitoring");
                  }}
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
              <span className="text-body font-medium leading-tight truncate">
                {user?.email ?? "User"}
              </span>
              <span className="text-caption text-muted-foreground leading-tight truncate">
                {user?.role ?? "—"}
              </span>
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
