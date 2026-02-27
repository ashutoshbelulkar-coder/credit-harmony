import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const isAgentsSection = location.pathname.startsWith("/agents");
  const isAgentSubscreen = isAgentsSection && location.pathname !== "/agents";
  const showHeader = location.pathname === "/agents" || !isAgentsSection;

  useEffect(() => {
    if (mobileSidebarOpen && window.matchMedia("(max-width: 767px)").matches) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  // Scroll to top when route changes (e.g. opening a new section from sidebar)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden w-full bg-background">
      {/* Desktop / tablet sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden min-h-screen w-full">
          <div className="h-full w-72 max-w-[80%] flex flex-col overflow-hidden shrink-0">
            <AppSidebar />
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex-1 min-w-0 min-h-full bg-black/50 cursor-pointer touch-manipulation"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {showHeader && (
          <AppHeader onToggleSidebar={() => setMobileSidebarOpen((open) => !open)} />
        )}
        <main className={cn("flex flex-1 flex-col min-h-0 p-4 sm:p-6 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))]", isAgentSubscreen ? "overflow-hidden p-0 pb-0 sm:p-4 sm:p-6" : "overflow-y-auto")}>
          {isAgentSubscreen ? (
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">{children}</div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
