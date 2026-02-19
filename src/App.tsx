import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import InstitutionList from "./pages/InstitutionList";
import InstitutionDetail from "./pages/InstitutionDetail";
import RegisterInstitution from "./pages/RegisterInstitution";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { PlaceholderPage } from "./components/PlaceholderPage";
import { DataGovernanceLayout } from "./pages/data-governance/DataGovernanceLayout";
import DataGovernanceDashboard from "./pages/data-governance/DataGovernanceDashboard";
import GovernanceAuditLogs from "./pages/data-governance/GovernanceAuditLogs";
import AutoMappingReview from "./pages/data-governance/AutoMappingReview";
import ValidationRules from "./pages/data-governance/ValidationRules";
import MatchReview from "./pages/data-governance/MatchReview";
import DataQualityMonitoring from "./pages/data-governance/DataQualityMonitoring";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/institutions" element={<ProtectedRoute><InstitutionList /></ProtectedRoute>} />
            <Route path="/institutions/data-submitters" element={<ProtectedRoute><InstitutionList roleFilter="dataSubmitter" /></ProtectedRoute>} />
            <Route path="/institutions/subscribers" element={<ProtectedRoute><InstitutionList roleFilter="subscriber" /></ProtectedRoute>} />
            <Route path="/institutions/register" element={<ProtectedRoute><RegisterInstitution /></ProtectedRoute>} />
            <Route path="/institutions/:id" element={<ProtectedRoute><InstitutionDetail /></ProtectedRoute>} />
            <Route path="/api-access" element={<ProtectedRoute><PlaceholderPage title="API & Access Control" description="Manage API keys, rate limits, and access permissions" /></ProtectedRoute>} />
            <Route path="/data-governance" element={<ProtectedRoute><DataGovernanceLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DataGovernanceDashboard />} />
              <Route path="auto-mapping-review" element={<AutoMappingReview />} />
              <Route path="validation-rules" element={<ValidationRules />} />
              <Route path="match-review" element={<MatchReview />} />
              <Route path="data-quality-monitoring" element={<DataQualityMonitoring />} />
              <Route path="governance-audit-logs" element={<GovernanceAuditLogs />} />
            </Route>
            <Route path="/monitoring" element={<ProtectedRoute><PlaceholderPage title="Monitoring" description="API usage, error rates, SLA health, and data quality metrics" /></ProtectedRoute>} />
            <Route path="/cbs-integration" element={<ProtectedRoute><PlaceholderPage title="CBS Integration" description="Core banking system API configuration and batch exports" /></ProtectedRoute>} />
            <Route path="/reporting" element={<ProtectedRoute><PlaceholderPage title="Reporting" description="Billing reports, MIS dashboards, and data exports" /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute><PlaceholderPage title="Audit Logs" description="Searchable activity logs with change detail tracking" /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><PlaceholderPage title="User Management" description="Manage users, roles, and permissions" /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
