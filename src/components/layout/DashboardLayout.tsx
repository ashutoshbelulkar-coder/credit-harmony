import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop / tablet sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="h-full w-72 max-w-[80%]">
            <AppSidebar />
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex-1 bg-black/30"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
        />
        <main className="flex flex-1 flex-col min-h-0 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
