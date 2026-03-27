import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, ExternalLink, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses, detailPageTabTriggerBaseClasses } from "@/lib/typography";
import { getInstitutionById, statusStyles } from "@/data/institutions-mock";
import type { Institution } from "@/data/institutions-mock";
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
import institutionDetailData from "@/data/institution-detail.json";
import {
  apiSubmissionRequests,
  apiSubmissionKpis,
  batchJobs,
  dataSubmitterIdByApiKey,
  subscriberIdByApiKey,
  enquiryLogEntries,
} from "@/data/monitoring-mock";
import UsersTab from "./institution-tabs/UsersTab";
import ConsentConfigTab from "./institution-tabs/ConsentConfigTab";
import BillingTab from "./institution-tabs/BillingTab";
import MonitoringTab from "./institution-tabs/MonitoringTab";
import ReportsTab from "./institution-tabs/ReportsTab";
import AuditTrailTab from "./institution-tabs/AuditTrailTab";
import ConsortiumMembershipsTab from "./institution-tabs/ConsortiumMembershipsTab";
import ProductSubscriptionsTab from "./institution-tabs/ProductSubscriptionsTab";
import { useCatalogMock } from "@/contexts/CatalogMockContext";

const InstitutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");

  const institution = getInstitutionById(id || "");

  const allTabs = useMemo(() => {
    if (!institution) return [];
    const tabs: string[] = ["Overview"];
    tabs.push("API Access");
    tabs.push("Consortium", "Products");
    if (institution.isSubscriber) tabs.push("Consent", "Billing");
    tabs.push("Monitoring", "Reports", "Audit Trail", "Users");
    return tabs;
  }, [institution]);

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
                <span className="text-caption text-muted-foreground">{institution.type}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span className={cn("px-2 py-0.5 rounded-full capitalize", badgeTextClasses, statusStyles[institution.status])}>
                  {institution.status}
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

        {/* Tabs - horizontal scroll on mobile, wrap on larger screens */}
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
        {activeTab === "API Access" && <ApiAccessTab isDataSubmitter={institution.isDataSubmitter} isSubscriber={institution.isSubscriber} />}
        {activeTab === "Consortium" && (
          <ConsortiumMembershipsTab institutionId={institution.id} />
        )}
        {activeTab === "Products" && (
          <ProductSubscriptionsTab institutionId={institution.id} />
        )}
        {activeTab === "Consent" && <ConsentConfigTab />}
        {activeTab === "Billing" && <BillingTab institutionId={institution.id} billingModel={institution.billingModel} creditBalance={institution.creditBalance} />}
        {activeTab === "Monitoring" && <MonitoringTab isDataSubmitter={institution.isDataSubmitter} isSubscriber={institution.isSubscriber} />}
        {activeTab === "Reports" && <ReportsTab isDataSubmitter={institution.isDataSubmitter} isSubscriber={institution.isSubscriber} />}
        {activeTab === "Audit Trail" && <AuditTrailTab isDataSubmitter={institution.isDataSubmitter} isSubscriber={institution.isSubscriber} />}
        {activeTab === "Users" && <UsersTab />}
      </div>
    </DashboardLayout>
  );
};

/* ─────────────── OVERVIEW TAB ─────────────── */

const {
  submissionVolumeData,
  successVsRejectedData,
  rejectionReasonsData,
  processingTimeData,
  enquiryVolumeData,
  successVsFailedData,
  responseTimeData,
} = institutionDetailData;

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

function overviewSubmitterKeys(institutionId: string) {
  return new Set(
    Object.entries(dataSubmitterIdByApiKey)
      .filter(([, id]) => id === institutionId)
      .map(([k]) => k)
  );
}

function overviewSubscriberKeys(institutionId: string) {
  return new Set(
    Object.entries(subscriberIdByApiKey)
      .filter(([, id]) => id === institutionId)
      .map(([k]) => k)
  );
}

function OverviewTab({ institution }: { institution: Institution }) {
  const { products: catalogProducts } = useCatalogMock();
  const docs = institution.complianceDocs || [];

  const memberApiRequests = useMemo(
    () => apiSubmissionRequests.filter((r) => overviewSubmitterKeys(institution.id).has(r.api_key)),
    [institution.id]
  );
  const memberEnquiries = useMemo(
    () => enquiryLogEntries.filter((e) => overviewSubscriberKeys(institution.id).has(e.api_key)),
    [institution.id]
  );
  const memberBatches = useMemo(
    () => batchJobs.filter((b) => b.institution_id === institution.id),
    [institution.id]
  );

  const apiSuccessRate =
    memberApiRequests.length > 0
      ? (
          (memberApiRequests.filter((r) => r.status === "Success").length / memberApiRequests.length) *
          100
        ).toFixed(1)
      : "—";
  const apiP95 =
    memberApiRequests.length > 0
      ? (() => {
          const sorted = [...memberApiRequests.map((r) => r.response_time_ms)].sort((a, b) => a - b);
          const i = Math.floor(0.95 * (sorted.length - 1));
          return `${sorted[i]}ms`;
        })()
      : "—";

  const enqSuccessRate =
    memberEnquiries.length > 0
      ? (
          (memberEnquiries.filter((e) => e.status === "Success").length / memberEnquiries.length) *
          100
        ).toFixed(1)
      : "—";
  const enqP95 =
    memberEnquiries.length > 0
      ? (() => {
          const sorted = [...memberEnquiries.map((e) => e.response_time_ms)].sort((a, b) => a - b);
          const i = Math.floor(0.95 * (sorted.length - 1));
          return `${sorted[i]}ms`;
        })()
      : "—";

  const usageByProductChartData = useMemo(() => {
    const counts = new Map<string, { standard: number; alternate: number }>();
    for (const e of memberEnquiries) {
      const id = e.product_id;
      const row = counts.get(id) ?? { standard: 0, alternate: 0 };
      if (e.alternate_data_used > 0) row.alternate += 1;
      else row.standard += 1;
      counts.set(id, row);
    }
    const nameById = new Map(catalogProducts.map((p) => [p.id, p.name]));
    return [...counts.entries()]
      .map(([productId, c]) => ({
        productId,
        productName: nameById.get(productId) ?? productId,
        standard: c.standard,
        alternate: c.alternate,
      }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
  }, [memberEnquiries, catalogProducts]);

  const batchActive = memberBatches.filter((b) => b.status === "Queued" || b.status === "Processing").length;
  const batchRecords = memberBatches.reduce((s, b) => s + b.total_records, 0);
  const batchAvgSuccess =
    memberBatches.length > 0
      ? (memberBatches.reduce((s, b) => s + b.success_rate, 0) / memberBatches.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      {/* Summary strip — aligns with Monitoring module; scoped to this member */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <p className="text-caption text-muted-foreground">APIs enabled</p>
          <p className={cn("text-h4 font-bold mt-1", institution.apisEnabled === 3 ? "text-success" : "text-foreground")}>
            {institution.apisEnabled}/3
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <p className="text-caption text-muted-foreground">SLA health</p>
          <p className={cn("text-h4 font-bold mt-1", institution.slaHealth >= 99 ? "text-success" : "text-foreground")}>
            {institution.slaHealth > 0 ? `${institution.slaHealth}%` : "—"}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <p className="text-caption text-muted-foreground">Onboarded</p>
          <p className="text-h4 font-bold mt-1 text-muted-foreground">{institution.onboardedDate || "—"}</p>
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
        </div>

        {/* Data Submission (API) — Monitoring-aligned KPIs for this member */}
        {institution.isDataSubmitter && (
          <section className="space-y-4" aria-labelledby="ov-ds-api">
            <div className="border-b border-border pb-2">
              <h2 id="ov-ds-api" className="text-h4 font-semibold text-foreground">
                Data Submission (API)
              </h2>
              <p className="text-caption text-muted-foreground mt-1">
                Scoped to this member&apos;s submission API keys. Labels align with Monitoring → Data Submission API.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Requests (sample set)</p>
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
                <p className="text-caption text-muted-foreground">Active API keys</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{overviewSubmitterKeys(institution.id).size}</p>
              </div>
            </div>
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
                Scoped to this subscriber member&apos;s keys. Labels align with Monitoring → Inquiry API.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Enquiries (sample set)</p>
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
                <p className="text-caption text-muted-foreground">Alt-data calls</p>
                <p className="text-h4 font-bold mt-1 text-foreground">
                  {memberEnquiries.reduce((s, e) => s + e.alternate_data_used, 0)}
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
                      Catalogue product IDs on the axis; hover for full product name. Stacked: core-only vs add-on hits per enquiry.
                    </p>
                  </div>
                  <div className="flex-1">
                    {usageByProductChartData.length === 0 ? (
                      <p className="text-caption text-muted-foreground flex min-h-[220px] items-center justify-center px-4 text-center">
                        No enquiries in this sample for this member.
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
                                  const row = payload?.[0]?.payload as
                                    | { productId: string; productName: string }
                                    | undefined;
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

interface ApiCardData {
  name: string;
  enabled: boolean;
  rateLimit: string;
  ipWhitelist: string[];
  lastUsed: string;
}

function ApiAccessTab({ isDataSubmitter, isSubscriber }: { isDataSubmitter: boolean; isSubscriber: boolean }) {
  const [envTab, setEnvTab] = useState<"sandbox" | "uat" | "prod">("sandbox");
  const [editingApi, setEditingApi] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  const submitterApis: ApiCardData[] = institutionDetailData.apiAccess.submitterApis;
  const subscriberApis: ApiCardData[] = institutionDetailData.apiAccess.subscriberApis;
  const keys = institutionDetailData.apiAccess.apiKeys;

  const apis = [
    ...(isDataSubmitter ? submitterApis : []),
    ...(isSubscriber ? subscriberApis : []),
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
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Key</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Created</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Status</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((k, i) => (
                <tr key={i}>
                  <td className="px-5 py-4 text-body text-foreground">{k.key}</td>
                  <td className="px-5 py-4 text-body text-muted-foreground">{k.created}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full capitalize bg-success/15 text-success", badgeTextClasses)}>{k.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 rounded-lg border border-border text-caption font-medium text-primary hover:bg-primary/10 transition-colors">
                        Rotate
                      </button>
                      <button className="px-3 py-1 rounded-lg border border-destructive/30 text-caption font-medium text-destructive hover:bg-destructive/10 transition-colors">
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Cards */}
      <div className={cn("grid gap-4", apis.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3")}>
        {apis.map((api) => (
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
                  {api.rateLimit !== "N/A" && (
                    <button
                      onClick={() => { setEditingApi(api.name); setEditRate(api.rateLimit.replace("/min", "")); }}
                      className="px-2 py-0.5 rounded border border-primary/30 text-caption font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      Edit
                    </button>
                  )}
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
