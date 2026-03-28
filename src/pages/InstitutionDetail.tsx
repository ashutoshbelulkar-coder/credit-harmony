import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses, detailPageTabTriggerBaseClasses } from "@/lib/typography";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useInstitution, useInstitutionOverviewCharts } from "@/hooks/api/useInstitutions";
import { useApiKeys, useRegenerateApiKey, useRevokeApiKey } from "@/hooks/api/useApiKeys";
import { useApiRequests, useEnquiries } from "@/hooks/api/useMonitoring";
import { useBatchJobs } from "@/hooks/api/useBatchJobs";
import { useProducts } from "@/hooks/api/useProducts";
import type { InstitutionResponse } from "@/services/institutions.service";
import type { ApiKeyResponse } from "@/services/apiKeys.service";
import type { ApiRequestRecord, EnquiryRecord } from "@/services/monitoring.service";
import type { BatchJobResponse } from "@/services/batchJobs.service";
import UsersTab from "./institution-tabs/UsersTab";
import ConsentConfigTab from "./institution-tabs/ConsentConfigTab";
import BillingTab from "./institution-tabs/BillingTab";
import MonitoringTab from "./institution-tabs/MonitoringTab";
import ReportsTab from "./institution-tabs/ReportsTab";
import AuditTrailTab from "./institution-tabs/AuditTrailTab";
import ConsortiumMembershipsTab from "./institution-tabs/ConsortiumMembershipsTab";
import ProductSubscriptionsTab from "./institution-tabs/ProductSubscriptionsTab";

const statusStyles: Record<string, string> = {
  active: "bg-success/15 text-success",
  suspended: "bg-destructive/15 text-destructive",
  inactive: "bg-muted text-muted-foreground",
  "pending-approval": "bg-warning/15 text-warning",
  "Pending Approval": "bg-warning/15 text-warning",
  Active: "bg-success/15 text-success",
  Suspended: "bg-destructive/15 text-destructive",
  Inactive: "bg-muted text-muted-foreground",
};

const InstitutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");

  const { data: institution, isLoading } = useInstitution(id);

  const allTabs = useMemo(() => {
    if (!institution) return [];
    const tabs: string[] = ["Overview"];
    tabs.push("API Access");
    tabs.push("Consortium", "Products");
    if (institution.isSubscriber) tabs.push("Consent", "Billing");
    tabs.push("Monitoring", "Reports", "Audit Trail", "Users");
    return tabs;
  }, [institution]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading institution…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!institution) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-muted-foreground">Institution not found.</p>
          <button onClick={() => navigate("/institutions")} className="text-primary hover:underline text-sm">
            Back to members
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <PageBreadcrumb
          segments={[
            { label: "Dashboard", href: "/" },
            { label: "Members", href: "/institutions" },
            { label: institution.name },
          ]}
        />

        {/* Back + Title */}
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0">
              <h1 className="text-h2 font-semibold text-foreground break-words">{institution.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-caption text-muted-foreground">{institution.institutionType}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span className={cn("px-2 py-0.5 rounded-full capitalize", badgeTextClasses, statusStyles[institution.institutionLifecycleStatus] ?? "bg-muted text-muted-foreground")}>
                  {institution.institutionLifecycleStatus}
                </span>
                {institution.isDataSubmitter && (
                  <span className={cn("px-2 py-0.5 rounded-full", badgeTextClasses, "bg-primary/15 text-primary")}>
                    Data Submitter
                  </span>
                )}
                {institution.isSubscriber && (
                  <span className={cn("px-2 py-0.5 rounded-full", badgeTextClasses, "bg-secondary/15 text-secondary")}>
                    Subscriber
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-xl border border-border bg-card px-1.5 py-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto overflow-y-hidden -mx-0.5 md:overflow-visible md:mx-0">
            <div className="flex items-center gap-0.5 min-w-0 w-max md:w-full md:flex-wrap md:min-w-0">
              {allTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    detailPageTabTriggerBaseClasses,
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "Overview" && <OverviewTab institution={institution} />}
        {activeTab === "API Access" && (
          <ApiAccessTab
            institutionId={institution.id}
            isDataSubmitter={institution.isDataSubmitter}
            isSubscriber={institution.isSubscriber}
          />
        )}
        {activeTab === "Consortium" && (
          <ConsortiumMembershipsTab institutionId={String(institution.id)} />
        )}
        {activeTab === "Products" && (
          <ProductSubscriptionsTab institutionId={String(institution.id)} />
        )}
        {activeTab === "Consent" && <ConsentConfigTab />}
        {activeTab === "Billing" && (
          <BillingTab
            institutionId={String(institution.id)}
            billingModel={institution.billingModel}
            creditBalance={institution.creditBalance}
          />
        )}
        {activeTab === "Monitoring" && (
          <MonitoringTab
            institutionId={institution.id}
            isDataSubmitter={institution.isDataSubmitter}
            isSubscriber={institution.isSubscriber}
          />
        )}
        {activeTab === "Reports" && (
          <ReportsTab
            isDataSubmitter={institution.isDataSubmitter}
            isSubscriber={institution.isSubscriber}
          />
        )}
        {activeTab === "Audit Trail" && (
          <AuditTrailTab
            isDataSubmitter={institution.isDataSubmitter}
            isSubscriber={institution.isSubscriber}
            institutionId={String(institution.id)}
          />
        )}
        {activeTab === "Users" && <UsersTab institutionId={institution.id} />}
      </div>
    </DashboardLayout>
  );
};

/* ─────────────── OVERVIEW TAB ─────────────── */

const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--danger))"];

const volumeConfig: ChartConfig = { volume: { label: "Volume", color: "hsl(var(--primary))" } };
const successRejectedConfig: ChartConfig = {
  Success: { label: "Success", color: "hsl(var(--success))" },
  Rejected: { label: "Rejected", color: "hsl(var(--danger))" },
};
const rejectionConfig: ChartConfig = { count: { label: "Count", color: "hsl(var(--danger))" } };
const processingConfig: ChartConfig = { avgMs: { label: "Avg (ms)", color: "hsl(var(--secondary))" } };
const enquiryConfig: ChartConfig = { volume: { label: "Enquiries", color: "hsl(var(--primary))" } };
const successFailedConfig: ChartConfig = {
  Success: { label: "Success", color: "hsl(var(--success))" },
  Failed: { label: "Failed", color: "hsl(var(--danger))" },
};
const sourceConfig: ChartConfig = {
  standard: { label: "Core data product", color: "hsl(var(--primary))" },
  alternate: { label: "Add-on data products", color: "hsl(var(--secondary))" },
};
const latencyConfig: ChartConfig = { latency: { label: "Latency (ms)", color: "hsl(var(--secondary))" } };

const CHART_CARD = "bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col";

function calcP95(values: number[]): string {
  if (values.length === 0) return "—";
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(0.95 * (sorted.length - 1));
  return `${sorted[i]}ms`;
}

function OverviewTab({ institution }: { institution: InstitutionResponse }) {
  const institutionId = String(institution.id);

  const { data: overviewCharts } = useInstitutionOverviewCharts(institution.id);
  const submissionVolumeData = overviewCharts?.submissionVolumeData ?? [];
  const successVsRejectedData = overviewCharts?.successVsRejectedData ?? [];
  const rejectionReasonsData = overviewCharts?.rejectionReasonsData ?? [];
  const processingTimeData = overviewCharts?.processingTimeData ?? [];
  const enquiryVolumeData = overviewCharts?.enquiryVolumeData ?? [];
  const successVsFailedData = overviewCharts?.successVsFailedData ?? [];
  const responseTimeData = overviewCharts?.responseTimeData ?? [];

  const { data: apiRequestsPage } = useApiRequests({ institutionId, size: 200 });
  const { data: enquiriesPage } = useEnquiries({ institutionId, size: 200 });
  const { data: batchPage } = useBatchJobs({ institutionId });
  const { data: productsPage } = useProducts();

  const memberApiRequests: ApiRequestRecord[] = apiRequestsPage?.content ?? [];
  const memberEnquiries: EnquiryRecord[] = enquiriesPage?.content ?? [];
  const memberBatches: BatchJobResponse[] = batchPage?.content ?? [];
  const catalogProducts = productsPage?.content ?? [];

  const docs = institution.complianceDocs ?? [];

  const apiSuccessRate = useMemo(() => {
    if (memberApiRequests.length === 0) return "—";
    const successCount = memberApiRequests.filter((r) => r.status === "Success").length;
    return ((successCount / memberApiRequests.length) * 100).toFixed(1);
  }, [memberApiRequests]);

  const apiP95 = useMemo(
    () => calcP95(memberApiRequests.map((r) => r.responseTimeMs)),
    [memberApiRequests]
  );

  const enqSuccessRate = useMemo(() => {
    if (memberEnquiries.length === 0) return "—";
    const successCount = memberEnquiries.filter((e) => e.status === "Success").length;
    return ((successCount / memberEnquiries.length) * 100).toFixed(1);
  }, [memberEnquiries]);

  const enqP95 = useMemo(
    () => calcP95(memberEnquiries.map((e) => e.responseTimeMs)),
    [memberEnquiries]
  );

  const batchActive = memberBatches.filter((b) => b.status === "Queued" || b.status === "Processing").length;
  const batchRecords = memberBatches.reduce((s, b) => s + b.totalRecords, 0);
  const batchAvgSuccess = useMemo(() => {
    if (memberBatches.length === 0) return "—";
    return (memberBatches.reduce((s, b) => s + b.successRate, 0) / memberBatches.length).toFixed(1);
  }, [memberBatches]);

  // Usage-by-product chart — only rendered when enquiries carry product info
  const usageByProductChartData = useMemo(() => {
    // EnquiryRecord does not expose product_id; build a placeholder when data arrives via future endpoint
    const counts = new Map<string, { standard: number; alternate: number }>();
    const nameById = new Map(catalogProducts.map((p) => [p.id, p.name]));
    return [...counts.entries()].map(([productId, c]) => ({
      productId,
      productName: nameById.get(productId) ?? productId,
      standard: c.standard,
      alternate: c.alternate,
    }));
  }, [catalogProducts]);

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <p className="text-caption text-muted-foreground">APIs enabled</p>
          <p className={cn("text-h4 font-bold mt-1", institution.apisEnabledCount === 3 ? "text-success" : "text-foreground")}>
            {institution.apisEnabledCount}/3
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <p className="text-caption text-muted-foreground">SLA health</p>
          <p className={cn("text-h4 font-bold mt-1", (institution.slaHealthPercent ?? 0) >= 99 ? "text-success" : "text-foreground")}>
            {institution.slaHealthPercent != null && institution.slaHealthPercent > 0
              ? `${institution.slaHealthPercent}%`
              : "—"}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <p className="text-caption text-muted-foreground">Onboarded</p>
          <p className="text-h4 font-bold mt-1 text-muted-foreground">
            {institution.onboardedAt ? new Date(institution.onboardedAt).toLocaleDateString() : "—"}
          </p>
        </div>
        {institution.isSubscriber && institution.creditBalance != null && (
          <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <p className="text-caption text-muted-foreground">Available credits</p>
            <p className="text-h4 font-bold mt-1 text-foreground">{institution.creditBalance.toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Corporate Details */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-h4 font-semibold text-foreground mb-4">Corporate Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {([
              ["Legal Name", institution.name + (institution.tradingName ? ` (${institution.tradingName})` : "")],
              ["Registration No.", institution.registrationNumber || "—"],
              ["Jurisdiction", institution.jurisdiction || "—"],
              ["License Type", institution.licenseType || "—"],
              ["Contact Email", institution.contactEmail || "—"],
              ["Contact Phone", institution.contactPhone || "—"],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <p className="text-caption text-muted-foreground">{label}</p>
                <p className="text-body font-medium text-foreground mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Documents */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-h4 font-semibold text-foreground mb-4">Compliance Documents</h3>
          {docs.length === 0 ? (
            <p className="text-caption text-muted-foreground">No compliance documents on file.</p>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {doc.status === "verified" ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    )}
                    <span className="text-body text-foreground">{doc.name}</span>
                  </div>
                  <button className="text-caption text-primary hover:text-primary/80 flex items-center gap-1">
                    View <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Submission (API) */}
        {institution.isDataSubmitter && (
          <section className="space-y-4" aria-labelledby="ov-ds-api">
            <div className="border-b border-border pb-2">
              <h2 id="ov-ds-api" className="text-h4 font-semibold text-foreground">
                Data Submission (API)
              </h2>
              <p className="text-caption text-muted-foreground mt-1">
                Scoped to this member's submission API requests. Aligns with Monitoring → Data Submission API.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Total requests</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{memberApiRequests.length}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Success rate</p>
                <p className="text-h4 font-bold mt-1 text-success">{apiSuccessRate}{apiSuccessRate !== "—" ? "%" : ""}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">P95 latency</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{apiP95}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">APIs enabled</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{institution.apisEnabledCount}</p>
              </div>
            </div>
            {/* Trend charts from overview-charts API (template until per-member series exist) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Daily Submission Volume</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Records submitted per day over the last 30 days</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={volumeConfig} className="h-[260px] w-full">
                      <LineChart data={submissionVolumeData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} interval={4} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Success vs Rejected</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Distribution of record processing outcomes</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={successRejectedConfig} className="h-[260px] w-full">
                      <PieChart>
                        <Pie data={successVsRejectedData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                          {successVsRejectedData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Top Rejection Reasons</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Most common reasons for record rejection</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={rejectionConfig} className="h-[260px] w-full">
                      <BarChart data={rejectionReasonsData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Avg Processing Time</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Mean processing latency in milliseconds</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={processingConfig} className="h-[260px] w-full">
                      <LineChart data={processingTimeData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="avgMs" stroke="var(--color-avgMs)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Data Submission (Batch) */}
        {institution.isDataSubmitter && (
          <section className="space-y-4" aria-labelledby="ov-ds-batch">
            <div className="border-b border-border pb-2">
              <h2 id="ov-ds-batch" className="text-h4 font-semibold text-foreground">
                Data Submission (Batch)
              </h2>
              <p className="text-caption text-muted-foreground mt-1">
                Batch jobs for this member only (Monitoring → Data Submission Batch).
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Batches (member)</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{memberBatches.length}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Queued / Processing</p>
                <p className="text-h4 font-bold mt-1 text-warning">{batchActive}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Records in scope</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{batchRecords.toLocaleString()}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Avg success rate</p>
                <p className="text-h4 font-bold mt-1 text-foreground">
                  {batchAvgSuccess !== "—" ? `${batchAvgSuccess}%` : "—"}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Enquiry (API) */}
        {institution.isSubscriber && (
          <section className="space-y-4" aria-labelledby="ov-enq-api">
            <div className="border-b border-border pb-2">
              <h2 id="ov-enq-api" className="text-h4 font-semibold text-foreground">
                Enquiry (API)
              </h2>
              <p className="text-caption text-muted-foreground mt-1">
                Scoped to this subscriber member's enquiries. Aligns with Monitoring → Inquiry API.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Enquiries</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{memberEnquiries.length}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Success rate</p>
                <p className="text-h4 font-bold mt-1 text-success">{enqSuccessRate}{enqSuccessRate !== "—" ? "%" : ""}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">P95 latency</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{enqP95}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Total enquiry types</p>
                <p className="text-h4 font-bold mt-1 text-foreground">
                  {new Set(memberEnquiries.map((e) => e.enquiryType)).size || "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Enquiry Volume Trend</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Enquiries per day over the last 30 days</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={enquiryConfig} className="h-[260px] w-full">
                      <LineChart data={enquiryVolumeData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} interval={4} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Success vs Failed</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Distribution of enquiry outcomes</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={successFailedConfig} className="h-[260px] w-full">
                      <PieChart>
                        <Pie data={successVsFailedData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                          {successVsFailedData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Usage by Data Products</h2>
                    <p className="mt-1 text-caption text-muted-foreground">
                      Product usage breakdown (available when product-scoped enquiry data is returned by API).
                    </p>
                  </div>
                  <div className="flex-1">
                    {usageByProductChartData.length === 0 ? (
                      <p className="text-caption text-muted-foreground flex min-h-[220px] items-center justify-center px-4 text-center">
                        Product-level breakdown requires institution-scoped enquiry endpoint (Phase 7).
                      </p>
                    ) : (
                      <ChartContainer config={sourceConfig} className="h-[260px] w-full">
                        <BarChart data={usageByProductChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="productId" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                labelFormatter={(_, payload) => {
                                  const row = payload?.[0]?.payload as { productId: string; productName: string } | undefined;
                                  return row ? `${row.productName} (${row.productId})` : "";
                                }}
                              />
                            }
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="standard" stackId="a" fill="var(--color-standard)" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="alternate" stackId="a" fill="var(--color-alternate)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Response Time Trend</h2>
                    <p className="mt-1 text-caption text-muted-foreground">P95 API response latency over time</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={latencyConfig} className="h-[260px] w-full">
                      <LineChart data={responseTimeData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="latency" stroke="var(--color-latency)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─────────────── API & ACCESS TAB ─────────────── */

function ApiAccessTab({
  institutionId,
  isDataSubmitter,
  isSubscriber,
}: {
  institutionId: number;
  isDataSubmitter: boolean;
  isSubscriber: boolean;
}) {
  const [envTab, setEnvTab] = useState<"sandbox" | "uat" | "prod">("sandbox");
  const [editingApi, setEditingApi] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  const { data: apiKeys = [], isLoading: keysLoading } = useApiKeys(institutionId);
  const { mutate: regenerate, isPending: regenerating } = useRegenerateApiKey();
  const { mutate: revoke, isPending: revoking } = useRevokeApiKey();

  // Filter keys by environment tab
  const filteredKeys: ApiKeyResponse[] = apiKeys.filter(
    (k) => !k.environment || k.environment.toLowerCase() === envTab
  );

  const displayedKeys = filteredKeys.length > 0 ? filteredKeys : apiKeys;

  // API cards derived from institution role
  const apiCards = [
    ...(isDataSubmitter
      ? [{ name: "Data Submission API", enabled: true, rateLimit: "200/min", ipWhitelist: [] as string[], lastUsed: "—" }]
      : []),
    ...(isSubscriber
      ? [{ name: "Enquiry API", enabled: true, rateLimit: "100/min", ipWhitelist: [] as string[], lastUsed: "—" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["sandbox", "uat", "prod"] as const).map((env) => (
          <button
            key={env}
            onClick={() => setEnvTab(env)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
              envTab === env
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {env === "prod" ? "Production" : env.toUpperCase()}
          </button>
        ))}
      </div>

      {/* API Keys Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-h4 font-semibold text-foreground">API Keys</h3>
          <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-caption font-medium hover:bg-primary/90 transition-colors">
            Generate New Key
          </button>
        </div>
        <div className="min-w-0 overflow-x-auto">
          {keysLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading keys…</div>
          ) : displayedKeys.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No API keys found for this institution.</div>
          ) : (
            <table className="w-full min-w-max">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <tr className="border-b border-border">
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Key Prefix</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Created</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Last Used</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Status</th>
                  <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedKeys.map((k) => (
                  <tr key={k.id}>
                    <td className="px-5 py-4 text-body text-foreground font-mono">{k.keyPrefix}••••••••</td>
                    <td className="px-5 py-4 text-body text-muted-foreground">
                      {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4 text-body text-muted-foreground">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full capitalize",
                        badgeTextClasses,
                        k.status?.toLowerCase() === "active"
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive"
                      )}>
                        {k.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          disabled={regenerating}
                          onClick={() => regenerate(k.id)}
                          className="px-3 py-1 rounded-lg border border-border text-caption font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                        >
                          Rotate
                        </button>
                        <button
                          disabled={revoking}
                          onClick={() => revoke(k.id)}
                          className="px-3 py-1 rounded-lg border border-destructive/30 text-caption font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* API Cards */}
      {apiCards.length > 0 && (
        <div className={cn("grid gap-4", apiCards.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3")}>
          {apiCards.map((api) => (
            <div key={api.name} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-body font-semibold text-foreground">{api.name}</h4>
                <div className={cn(
                  "w-10 h-6 rounded-full flex items-center px-0.5 transition-colors cursor-pointer",
                  api.enabled ? "bg-success justify-end" : "bg-muted justify-start"
                )}>
                  <div className="w-5 h-5 rounded-full bg-card shadow-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-caption text-muted-foreground">Rate Limit</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-caption text-foreground font-medium">{api.rateLimit}</span>
                    <button
                      onClick={() => { setEditingApi(api.name); setEditRate(api.rateLimit.replace("/min", "")); }}
                      className="px-2 py-0.5 rounded border border-primary/30 text-caption font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-caption text-muted-foreground">IP Whitelist</span>
                  <span className="text-caption text-foreground">{api.ipWhitelist.length > 0 ? `${api.ipWhitelist.length} IPs` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-caption text-muted-foreground">Last Used</span>
                  <span className="text-caption text-foreground">{api.lastUsed}</span>
                </div>
                {isSubscriber && api.name === "Enquiry API" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-caption text-muted-foreground">Concurrent Limit</span>
                      <span className="text-caption text-foreground font-medium">50</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-caption text-muted-foreground">Credit Check Config</span>
                      <span className="text-caption text-foreground">Default</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Rate Limit Dialog */}
      <Dialog open={!!editingApi} onOpenChange={(open) => !open && setEditingApi(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Rate Limit — {editingApi}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rate Limit (requests/min)</label>
              <Input type="number" value={editRate} onChange={(e) => setEditRate(e.target.value)} min={1} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditingApi(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={() => setEditingApi(null)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InstitutionDetail;
