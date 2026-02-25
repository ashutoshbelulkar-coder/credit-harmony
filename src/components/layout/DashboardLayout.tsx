import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
        <div className="fixed inset-0 z-40 flex md:hidden transition-opacity duration-200">
          <div className="h-full w-72 max-w-[80%] flex flex-col overflow-hidden">
            <AppSidebar />
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex-1 bg-black/30 transition-opacity duration-200"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
        />
        <main className="flex flex-1 flex-col min-h-0 p-4 sm:p-6 pr-[max(1rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)]">{children}</main>
      </div>
    </div>
  );
}
