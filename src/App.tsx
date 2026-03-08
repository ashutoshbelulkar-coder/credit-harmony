import { ThemeProvider } from "next-themes";
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
import { UserManagementLayout } from "./pages/user-management/UserManagementLayout";
import { UsersListPage } from "./pages/user-management/UsersListPage";
import { RolesPermissionsPage } from "./pages/user-management/RolesPermissionsPage";
import { ActivityLogPage } from "./pages/user-management/ActivityLogPage";
import { DataGovernanceLayout } from "./pages/data-governance/DataGovernanceLayout";
import DataGovernanceDashboard from "./pages/data-governance/DataGovernanceDashboard";
import GovernanceAuditLogs from "./pages/data-governance/GovernanceAuditLogs";
import AutoMappingReview from "./pages/data-governance/AutoMappingReview";
import ValidationRules from "./pages/data-governance/ValidationRules";
import MatchReview from "./pages/data-governance/MatchReview";
import DataQualityMonitoring from "./pages/data-governance/DataQualityMonitoring";
import { MonitoringLayout } from "./pages/monitoring/MonitoringLayout";
import { MonitoringDataSubmissionApiPage } from "./pages/monitoring/MonitoringDataSubmissionApiPage";
import { MonitoringDataSubmissionBatchPage } from "./pages/monitoring/MonitoringDataSubmissionBatchPage";
import { MonitoringInquiryApiPage } from "./pages/monitoring/MonitoringInquiryApiPage";
import { MonitoringSlaConfigurationPage } from "./pages/monitoring/MonitoringSlaConfigurationPage";
import { MonitoringAlertEnginePage } from "./pages/monitoring/MonitoringAlertEnginePage";
import { ReportingLayout } from "./pages/reporting/ReportingLayout";
import { ReportListPage } from "./pages/reporting/ReportListPage";
import { NewReportRequestPage } from "./pages/reporting/NewReportRequestPage";
import { AgentsLayout } from "./pages/agents/AgentsLayout";
import AgentsLandingPage from "./pages/agents/AgentsLandingPage";
import AgentDetailPage from "./pages/agents/AgentDetailPage";
import AgentConfigurationPage from "./pages/agents/AgentConfigurationPage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider
        defaultTheme="system"
        enableSystem
        storageKey="credit-harmony-theme"
        attribute="class"
      >
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
            <Route path="/monitoring" element={<ProtectedRoute><MonitoringLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="data-submission-api" replace />} />
              <Route path="data-submission-api" element={<MonitoringDataSubmissionApiPage />} />
              <Route path="data-submission-batch" element={<MonitoringDataSubmissionBatchPage />} />
              <Route path="inquiry-api" element={<MonitoringInquiryApiPage />} />
              <Route path="sla-configuration" element={<MonitoringSlaConfigurationPage />} />
              <Route path="alert-engine" element={<MonitoringAlertEnginePage />} />
            </Route>
            <Route path="/cbs-integration" element={<ProtectedRoute><PlaceholderPage title="CBS Integration" description="Core banking system API configuration and batch exports" /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><AgentsLayout /></ProtectedRoute>}>
              <Route index element={<AgentsLandingPage />} />
              <Route path=":agentId" element={<AgentDetailPage />} />
              <Route path="configuration" element={<AgentConfigurationPage />} />
            </Route>
            <Route path="/reporting" element={<ProtectedRoute><ReportingLayout /></ProtectedRoute>}>
              <Route index element={<ReportListPage />} />
              <Route path="new" element={<NewReportRequestPage />} />
            </Route>
            <Route path="/audit-logs" element={<ProtectedRoute><PlaceholderPage title="Audit Logs" description="Searchable activity logs with change detail tracking" /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><UserManagementLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<UsersListPage />} />
              <Route path="roles" element={<RolesPermissionsPage />} />
              <Route path="activity" element={<ActivityLogPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
