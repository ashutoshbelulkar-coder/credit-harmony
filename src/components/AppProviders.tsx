import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        defaultTheme="system"
        enableSystem
        storageKey="hcb-theme"
        attribute="class"
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/*
            BrowserRouter must be an ancestor of AuthProvider because
            AuthProvider now calls useNavigate() for session-expired redirects.
          */}
          <BrowserRouter>
            <AuthProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
