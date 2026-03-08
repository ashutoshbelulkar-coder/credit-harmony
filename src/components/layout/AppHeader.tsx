import { Search, Bell, ChevronDown, User, Menu, Sun, Moon, Monitor, LogOut, Settings } from "lucide-react";
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
      <button className="relative flex h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 items-center justify-center rounded-lg hover:bg-muted transition-colors duration-200" aria-label="Notifications">
        <Bell className="w-5 h-5 text-muted-foreground" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
      </button>

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
