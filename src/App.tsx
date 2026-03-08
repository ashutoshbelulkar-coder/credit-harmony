import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";
import { Skeleton } from "@/components/ui/skeleton";

// Route import functions (reused for lazy + preload)
const routeImports = {
  Dashboard: () => import("./pages/Dashboard"),
  InstitutionList: () => import("./pages/InstitutionList"),
  InstitutionDetail: () => import("./pages/InstitutionDetail"),
  RegisterInstitution: () => import("./pages/RegisterInstitution"),
  Login: () => import("./pages/Login"),
  NotFound: () => import("./pages/NotFound"),
  PlaceholderPage: () => import("./components/PlaceholderPage").then(m => ({ default: m.PlaceholderPage })),
  UserManagementLayout: () => import("./pages/user-management/UserManagementLayout").then(m => ({ default: m.UserManagementLayout })),
  UsersListPage: () => import("./pages/user-management/UsersListPage").then(m => ({ default: m.UsersListPage })),
  RolesPermissionsPage: () => import("./pages/user-management/RolesPermissionsPage").then(m => ({ default: m.RolesPermissionsPage })),
  ActivityLogPage: () => import("./pages/user-management/ActivityLogPage").then(m => ({ default: m.ActivityLogPage })),
  DataGovernanceLayout: () => import("./pages/data-governance/DataGovernanceLayout").then(m => ({ default: m.DataGovernanceLayout })),
  DataGovernanceDashboard: () => import("./pages/data-governance/DataGovernanceDashboard"),
  GovernanceAuditLogs: () => import("./pages/data-governance/GovernanceAuditLogs"),
  AutoMappingReview: () => import("./pages/data-governance/AutoMappingReview"),
  ValidationRules: () => import("./pages/data-governance/ValidationRules"),
  MatchReview: () => import("./pages/data-governance/MatchReview"),
  DataQualityMonitoring: () => import("./pages/data-governance/DataQualityMonitoring"),
  MonitoringLayout: () => import("./pages/monitoring/MonitoringLayout").then(m => ({ default: m.MonitoringLayout })),
  MonitoringDataSubmissionApiPage: () => import("./pages/monitoring/MonitoringDataSubmissionApiPage").then(m => ({ default: m.MonitoringDataSubmissionApiPage })),
  MonitoringDataSubmissionBatchPage: () => import("./pages/monitoring/MonitoringDataSubmissionBatchPage").then(m => ({ default: m.MonitoringDataSubmissionBatchPage })),
  MonitoringInquiryApiPage: () => import("./pages/monitoring/MonitoringInquiryApiPage").then(m => ({ default: m.MonitoringInquiryApiPage })),
  MonitoringSlaConfigurationPage: () => import("./pages/monitoring/MonitoringSlaConfigurationPage").then(m => ({ default: m.MonitoringSlaConfigurationPage })),
  MonitoringAlertEnginePage: () => import("./pages/monitoring/MonitoringAlertEnginePage").then(m => ({ default: m.MonitoringAlertEnginePage })),
  ReportingLayout: () => import("./pages/reporting/ReportingLayout").then(m => ({ default: m.ReportingLayout })),
  ReportListPage: () => import("./pages/reporting/ReportListPage").then(m => ({ default: m.ReportListPage })),
  NewReportRequestPage: () => import("./pages/reporting/NewReportRequestPage").then(m => ({ default: m.NewReportRequestPage })),
  AgentsLayout: () => import("./pages/agents/AgentsLayout").then(m => ({ default: m.AgentsLayout })),
  AgentsLandingPage: () => import("./pages/agents/AgentsLandingPage"),
  AgentDetailPage: () => import("./pages/agents/AgentDetailPage"),
  AgentConfigurationPage: () => import("./pages/agents/AgentConfigurationPage"),
  ApprovalQueueLayout: () => import("./pages/approval-queue/ApprovalQueueLayout").then(m => ({ default: m.ApprovalQueueLayout })),
  ApprovalQueuePage: () => import("./pages/approval-queue/ApprovalQueuePage").then(m => ({ default: m.ApprovalQueuePage })),
};

// Lazy-loaded route components
const Dashboard = lazy(routeImports.Dashboard);
const InstitutionList = lazy(routeImports.InstitutionList);
const InstitutionDetail = lazy(routeImports.InstitutionDetail);
const RegisterInstitution = lazy(routeImports.RegisterInstitution);
const Login = lazy(routeImports.Login);
const NotFound = lazy(routeImports.NotFound);
const PlaceholderPage = lazy(routeImports.PlaceholderPage);
const UserManagementLayout = lazy(routeImports.UserManagementLayout);
const UsersListPage = lazy(routeImports.UsersListPage);
const RolesPermissionsPage = lazy(routeImports.RolesPermissionsPage);
const ActivityLogPage = lazy(routeImports.ActivityLogPage);
const DataGovernanceLayout = lazy(routeImports.DataGovernanceLayout);
const DataGovernanceDashboard = lazy(routeImports.DataGovernanceDashboard);
const GovernanceAuditLogs = lazy(routeImports.GovernanceAuditLogs);
const AutoMappingReview = lazy(routeImports.AutoMappingReview);
const ValidationRules = lazy(routeImports.ValidationRules);
const MatchReview = lazy(routeImports.MatchReview);
const DataQualityMonitoring = lazy(routeImports.DataQualityMonitoring);
const MonitoringLayout = lazy(routeImports.MonitoringLayout);
const MonitoringDataSubmissionApiPage = lazy(routeImports.MonitoringDataSubmissionApiPage);
const MonitoringDataSubmissionBatchPage = lazy(routeImports.MonitoringDataSubmissionBatchPage);
const MonitoringInquiryApiPage = lazy(routeImports.MonitoringInquiryApiPage);
const MonitoringSlaConfigurationPage = lazy(routeImports.MonitoringSlaConfigurationPage);
const MonitoringAlertEnginePage = lazy(routeImports.MonitoringAlertEnginePage);
const ReportingLayout = lazy(routeImports.ReportingLayout);
const ReportListPage = lazy(routeImports.ReportListPage);
const NewReportRequestPage = lazy(routeImports.NewReportRequestPage);
const AgentsLayout = lazy(routeImports.AgentsLayout);
const AgentsLandingPage = lazy(routeImports.AgentsLandingPage);
const AgentDetailPage = lazy(routeImports.AgentDetailPage);
const AgentConfigurationPage = lazy(routeImports.AgentConfigurationPage);
const ApprovalQueueLayout = lazy(routeImports.ApprovalQueueLayout);
const ApprovalQueuePage = lazy(routeImports.ApprovalQueuePage);

// Preload all route chunks after initial page load
function preloadAllRoutes() {
  Object.values(routeImports).forEach(importFn => {
    importFn().catch(() => {});
  });
}

if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(preloadAllRoutes);
  } else {
    setTimeout(preloadAllRoutes, 1500);
  }
}

const queryClient = new QueryClient();

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
          <ErrorBoundary>
            <CommandPalette />
            <Suspense fallback={<PageLoader />}>
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
          </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
