import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import { Skeleton } from "@/components/ui/skeleton";
import { AppProviders } from "@/components/AppProviders";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const InstitutionList = lazy(() => import("./pages/InstitutionList"));
const InstitutionDetail = lazy(() => import("./pages/InstitutionDetail"));
const RegisterInstitution = lazy(() => import("./pages/RegisterInstitution"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PlaceholderPage = lazy(() =>
  import("./components/PlaceholderPage").then((m) => ({ default: m.PlaceholderPage }))
);

const UserManagementLayout = lazy(() =>
  import("./pages/user-management/UserManagementLayout").then((m) => ({ default: m.UserManagementLayout }))
);
const UsersListPage = lazy(() =>
  import("./pages/user-management/UsersListPage").then((m) => ({ default: m.UsersListPage }))
);
const RolesPermissionsPage = lazy(() =>
  import("./pages/user-management/RolesPermissionsPage").then((m) => ({ default: m.RolesPermissionsPage }))
);
const ActivityLogPage = lazy(() =>
  import("./pages/user-management/ActivityLogPage").then((m) => ({ default: m.ActivityLogPage }))
);

const DataGovernanceLayout = lazy(() =>
  import("./pages/data-governance/DataGovernanceLayout").then((m) => ({ default: m.DataGovernanceLayout }))
);
const DataGovernanceDashboard = lazy(() => import("./pages/data-governance/DataGovernanceDashboard"));
const GovernanceAuditLogs = lazy(() => import("./pages/data-governance/GovernanceAuditLogs"));
const AutoMappingReview = lazy(() => import("./pages/data-governance/AutoMappingReview"));
const ValidationRules = lazy(() => import("./pages/data-governance/ValidationRules"));
const MatchReview = lazy(() => import("./pages/data-governance/MatchReview"));
const DataQualityMonitoring = lazy(() => import("./pages/data-governance/DataQualityMonitoring"));

const MonitoringLayout = lazy(() =>
  import("./pages/monitoring/MonitoringLayout").then((m) => ({ default: m.MonitoringLayout }))
);
const MonitoringDataSubmissionApiPage = lazy(() =>
  import("./pages/monitoring/MonitoringDataSubmissionApiPage").then((m) => ({ default: m.MonitoringDataSubmissionApiPage }))
);
const MonitoringDataSubmissionBatchPage = lazy(() =>
  import("./pages/monitoring/MonitoringDataSubmissionBatchPage").then((m) => ({ default: m.MonitoringDataSubmissionBatchPage }))
);
const MonitoringInquiryApiPage = lazy(() =>
  import("./pages/monitoring/MonitoringInquiryApiPage").then((m) => ({ default: m.MonitoringInquiryApiPage }))
);
const MonitoringSlaConfigurationPage = lazy(() =>
  import("./pages/monitoring/MonitoringSlaConfigurationPage").then((m) => ({ default: m.MonitoringSlaConfigurationPage }))
);
const MonitoringAlertEnginePage = lazy(() =>
  import("./pages/monitoring/MonitoringAlertEnginePage").then((m) => ({ default: m.MonitoringAlertEnginePage }))
);

const ReportingLayout = lazy(() =>
  import("./pages/reporting/ReportingLayout").then((m) => ({ default: m.ReportingLayout }))
);
const ReportListPage = lazy(() =>
  import("./pages/reporting/ReportListPage").then((m) => ({ default: m.ReportListPage }))
);
const NewReportRequestPage = lazy(() =>
  import("./pages/reporting/NewReportRequestPage").then((m) => ({ default: m.NewReportRequestPage }))
);

const AgentsLayout = lazy(() =>
  import("./pages/agents/AgentsLayout").then((m) => ({ default: m.AgentsLayout }))
);
const AgentsLandingPage = lazy(() => import("./pages/agents/AgentsLandingPage"));
const AgentDetailPage = lazy(() => import("./pages/agents/AgentDetailPage"));
const AgentConfigurationPage = lazy(() => import("./pages/agents/AgentConfigurationPage"));

const ApprovalQueueLayout = lazy(() =>
  import("./pages/approval-queue/ApprovalQueueLayout").then((m) => ({ default: m.ApprovalQueueLayout }))
);
const ApprovalQueuePage = lazy(() =>
  import("./pages/approval-queue/ApprovalQueuePage").then((m) => ({ default: m.ApprovalQueuePage }))
);

const ConsortiumListPage = lazy(() => import("./pages/consortiums/ConsortiumListPage"));
const ConsortiumDetailPage = lazy(() => import("./pages/consortiums/ConsortiumDetailPage"));
const ConsortiumWizardPage = lazy(() => import("./pages/consortiums/ConsortiumWizardPage"));

const DataProductsLayout = lazy(() =>
  import("./pages/data-products/DataProductsLayout").then((m) => ({ default: m.DataProductsLayout }))
);
const ProductListPage = lazy(() => import("./pages/data-products/ProductListPage"));
const ProductDetailPage = lazy(() => import("./pages/data-products/ProductDetailPage"));
const ProductFormPage = lazy(() => import("./pages/data-products/ProductFormPage"));
const EnquirySimulationPage = lazy(() => import("./pages/agents/EnquirySimulationPage"));

function PageLoader() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl mt-4" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  // Wait for silent session restore before deciding to redirect
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <CommandPalette />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/institutions" element={<ProtectedRoute><InstitutionList /></ProtectedRoute>} />
          <Route path="/institutions/data-submitters" element={<ProtectedRoute><Navigate to="/institutions" replace /></ProtectedRoute>} />
          <Route path="/institutions/subscribers" element={<ProtectedRoute><Navigate to="/institutions" replace /></ProtectedRoute>} />
          <Route path="/institutions/register" element={<ProtectedRoute><RegisterInstitution /></ProtectedRoute>} />
          <Route path="/institutions/:id" element={<ProtectedRoute><InstitutionDetail /></ProtectedRoute>} />
          <Route path="/consortiums/create" element={<ProtectedRoute><ConsortiumWizardPage /></ProtectedRoute>} />
          <Route path="/consortiums/:id/edit" element={<ProtectedRoute><ConsortiumWizardPage /></ProtectedRoute>} />
          <Route path="/consortiums/:id" element={<ProtectedRoute><ConsortiumDetailPage /></ProtectedRoute>} />
          <Route path="/consortiums" element={<ProtectedRoute><ConsortiumListPage /></ProtectedRoute>} />
          <Route path="/data-products" element={<ProtectedRoute><DataProductsLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="products" replace />} />
            <Route path="data-packets" element={<Navigate to="/data-products/products" replace />} />
            <Route path="products/create" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="enquiry-simulation" element={<EnquirySimulationPage />} />
          </Route>
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
            <Route path="configuration" element={<AgentConfigurationPage />} />
            <Route path=":agentId" element={<AgentDetailPage />} />
          </Route>
          <Route path="/reporting" element={<ProtectedRoute><ReportingLayout /></ProtectedRoute>}>
            <Route index element={<ReportListPage />} />
            <Route path="new" element={<NewReportRequestPage />} />
          </Route>
          <Route path="/audit-logs" element={<ProtectedRoute><PlaceholderPage title="Audit Logs" description="Searchable activity logs with change detail tracking" /></ProtectedRoute>} />
          <Route path="/approval-queue" element={<ProtectedRoute><ApprovalQueueLayout /></ProtectedRoute>}>
            <Route index element={<ApprovalQueuePage />} />
          </Route>
          <Route path="/user-management" element={<ProtectedRoute><UserManagementLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<UsersListPage />} />
            <Route path="roles" element={<RolesPermissionsPage />} />
            <Route path="activity" element={<ActivityLogPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <AppProviders>
    <AppRoutes />
  </AppProviders>
);

export default App;
