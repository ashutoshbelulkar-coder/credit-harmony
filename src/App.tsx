import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import InstitutionList from "./pages/InstitutionList";
import InstitutionDetail from "./pages/InstitutionDetail";
import RegisterInstitution from "./pages/RegisterInstitution";
import NotFound from "./pages/NotFound";
import { PlaceholderPage } from "./components/PlaceholderPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/institutions" element={<InstitutionList />} />
          <Route path="/institutions/register" element={<RegisterInstitution />} />
          <Route path="/institutions/:id" element={<InstitutionDetail />} />
          <Route path="/api-access" element={<PlaceholderPage title="API & Access Control" description="Manage API keys, rate limits, and access permissions" />} />
          <Route path="/data-governance" element={<PlaceholderPage title="Data Governance" description="Auto-mapping review, validation rules, and match review" />} />
          <Route path="/monitoring" element={<PlaceholderPage title="Monitoring" description="API usage, error rates, SLA health, and data quality metrics" />} />
          <Route path="/cbs-integration" element={<PlaceholderPage title="CBS Integration" description="Core banking system API configuration and batch exports" />} />
          <Route path="/reporting" element={<PlaceholderPage title="Reporting" description="Billing reports, MIS dashboards, and data exports" />} />
          <Route path="/audit-logs" element={<PlaceholderPage title="Audit Logs" description="Searchable activity logs with change detail tracking" />} />
          <Route path="/user-management" element={<PlaceholderPage title="User Management" description="Manage users, roles, and permissions" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
