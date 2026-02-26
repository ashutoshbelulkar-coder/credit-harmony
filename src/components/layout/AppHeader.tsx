import { Search, Bell, ChevronDown, User, Menu, Sun, Moon, Monitor } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const institutions = [
  "All Institutions",
  "First National Bank",
  "Metro Credit Union",
  "Pacific Finance Corp",
  "Southern Trust Bank",
];

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const [selectedInstitution, setSelectedInstitution] = useState(institutions[0]);
  const [showInstitutions, setShowInstitutions] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { theme, setTheme } = useTheme();

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

      {/* Institution Selector */}
      <div className="relative hidden md:block">
        <button
          onClick={() => setShowInstitutions(!showInstitutions)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-body font-medium"
        >
          <Building2Icon />
          <span className="max-w-[160px] truncate">{selectedInstitution}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>

        {showInstitutions && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowInstitutions(false)} />
            <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 animate-fade-in">
              {institutions.map((inst) => (
                <button
                  key={inst}
                  onClick={() => {
                    setSelectedInstitution(inst);
                    setShowInstitutions(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-body hover:bg-muted transition-colors",
                    selectedInstitution === inst && "bg-muted font-medium text-foreground"
                  )}
                >
                  {inst}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

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
    </header>
  );
}

function Building2Icon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
  );
}
