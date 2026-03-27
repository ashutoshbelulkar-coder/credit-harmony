import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CatalogMockProvider } from "@/contexts/CatalogMockContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          storageKey="hcb-theme"
          attribute="class"
        >
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <CatalogMockProvider>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </CatalogMockProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
