import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const isAgentsSection = location.pathname.startsWith("/agents");
  const showHeader = location.pathname === "/agents";

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

  return (
    <div className="flex min-h-screen w-full bg-background">
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
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden p-4 sm:p-6 pr-[max(1rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)]">
          {isAgentsSection ? (
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">{children}</div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
