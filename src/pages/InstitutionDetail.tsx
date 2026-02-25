import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, AlertTriangle, ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { getInstitutionById, statusStyles } from "@/data/institutions-mock";
import type { Institution } from "@/data/institutions-mock";
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
import UsersTab from "./institution-tabs/UsersTab";
import AlternateDataTab from "./institution-tabs/AlternateDataTab";
import ConsentConfigTab from "./institution-tabs/ConsentConfigTab";
import BillingTab from "./institution-tabs/BillingTab";
import MonitoringTab from "./institution-tabs/MonitoringTab";
import ReportsTab from "./institution-tabs/ReportsTab";
import AuditTrailTab from "./institution-tabs/AuditTrailTab";

const InstitutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");

  const institution = getInstitutionById(id || "");

  const allTabs = useMemo(() => {
    if (!institution) return [];
    const tabs: string[] = ["Overview"];
    if (institution.isSubscriber) tabs.push("Alternate Data");
    tabs.push("API & Access");
    if (institution.isSubscriber) tabs.push("Consent Configuration", "Billing");
    tabs.push("Monitoring", "Reports", "Audit Trail", "Users");
    return tabs;
  }, [institution]);

  if (!institution) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-muted-foreground">Institution not found.</p>
          <button onClick={() => navigate("/institutions")} className="text-primary hover:underline text-sm">
            Back to Institutions
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/institutions/data-submitters")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-h2 font-semibold text-foreground">{institution.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
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

        {/* Tabs - all inline, no More dropdown */}
        <div className="rounded-xl border border-border bg-card px-1.5 py-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center gap-0.5">
            {allTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[11px] font-medium leading-[18px] whitespace-nowrap transition-all",
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

        {/* Tab Content */}
        {activeTab === "Overview" && <OverviewTab institution={institution} />}
        {activeTab === "Alternate Data" && <AlternateDataTab />}
        {activeTab === "API & Access" && <ApiAccessTab isDataSubmitter={institution.isDataSubmitter} isSubscriber={institution.isSubscriber} />}
        {activeTab === "Consent Configuration" && <ConsentConfigTab />}
        {activeTab === "Billing" && <BillingTab billingModel={institution.billingModel} creditBalance={institution.creditBalance} />}
        {activeTab === "Monitoring" && <MonitoringTab isDataSubmitter={institution.isDataSubmitter} isSubscriber={institution.isSubscriber} />}
        {activeTab === "Reports" && <ReportsTab isDataSubmitter={institution.isDataSubmitter} isSubscriber={institution.isSubscriber} />}
        {activeTab === "Audit Trail" && <AuditTrailTab isDataSubmitter={institution.isDataSubmitter} isSubscriber={institution.isSubscriber} />}
        {activeTab === "Users" && <UsersTab />}
      </div>
    </DashboardLayout>
  );
};

/* ─────────────── OVERVIEW TAB ─────────────── */

const submissionVolumeData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  volume: 3000 + Math.floor(Math.random() * 2500),
}));

const successVsRejectedData = [
  { name: "Success", value: 94.2 },
  { name: "Rejected", value: 5.8 },
];

const rejectionReasonsData = [
  { reason: "Missing Fields", count: 342 },
  { reason: "Format Error", count: 218 },
  { reason: "Duplicate", count: 156 },
  { reason: "Schema Mismatch", count: 89 },
  { reason: "Other", count: 45 },
];

const processingTimeData = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  avgMs: 120 + Math.floor(Math.random() * 80),
}));

const enquiryVolumeData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  volume: 800 + Math.floor(Math.random() * 600),
}));

const successVsFailedData = [
  { name: "Success", value: 97.1 },
  { name: "Failed", value: 2.9 },
];

const usageBySourceData = [
  { source: "Credit Report", standard: 450, alternate: 0 },
  { source: "Bank Stmt", standard: 0, alternate: 320 },
  { source: "GST", standard: 0, alternate: 180 },
  { source: "Telecom", standard: 0, alternate: 90 },
  { source: "Utility", standard: 0, alternate: 60 },
];

const responseTimeData = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  latency: 80 + Math.floor(Math.random() * 60),
}));

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
  standard: { label: "Standard", color: "hsl(var(--primary))" },
  alternate: { label: "Alternate", color: "hsl(var(--secondary))" },
};
const latencyConfig: ChartConfig = { latency: { label: "Latency (ms)", color: "hsl(var(--secondary))" } };

const CHART_CARD = "bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-col";

function OverviewTab({ institution }: { institution: Institution }) {
  const docs = institution.complianceDocs || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards - horizontal strip at top, does not disturb charts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {institution.isDataSubmitter && (
            <>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Records Submitted Today</p>
                <p className="text-h4 font-bold mt-1 text-foreground">4,892</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">File Success Rate</p>
                <p className="text-h4 font-bold mt-1 text-success">94.2%</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Rejection Rate</p>
                <p className="text-h4 font-bold mt-1 text-danger">5.8%</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Active Submission APIs</p>
                <p className="text-h4 font-bold mt-1 text-foreground">{institution.apisEnabled}/3</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Last File Upload</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <p className="text-body font-medium text-foreground truncate">Today, 09:14 AM</p>
                </div>
              </div>
            </>
          )}
          {institution.isSubscriber && (
            <>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Total Enquiries Today</p>
                <p className="text-h4 font-bold mt-1 text-foreground">1,247</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">P95 Latency</p>
                <p className="text-h4 font-bold mt-1 text-foreground">142ms</p>
              </div>
              {institution.creditBalance !== undefined && (
                <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                  <p className="text-caption text-muted-foreground">Available Credits</p>
                  <p className="text-h4 font-bold mt-1 text-foreground">KES {institution.creditBalance.toLocaleString()}</p>
                </div>
              )}
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Active APIs</p>
                <p className="text-h4 font-bold mt-1 text-foreground">1</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Alternate Data Usage Today</p>
                <p className="text-h4 font-bold mt-1 text-foreground">438</p>
              </div>
            </>
          )}
          {!institution.isDataSubmitter && !institution.isSubscriber && (
            <>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">APIs Enabled</p>
                <p className={cn("text-h4 font-bold mt-1", institution.apisEnabled === 3 ? "text-success" : "text-foreground")}>{institution.apisEnabled}/3</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">SLA Health</p>
                <p className={cn("text-h4 font-bold mt-1", institution.slaHealth >= 99 ? "text-success" : "text-foreground")}>{institution.slaHealth > 0 ? `${institution.slaHealth}%` : "—"}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <p className="text-caption text-muted-foreground">Onboarded</p>
                <p className="text-h4 font-bold mt-1 text-muted-foreground">{institution.onboardedDate || "—"}</p>
              </div>
            </>
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

        {/* Charts Section - Data Submission */}
        {institution.isDataSubmitter && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Daily Submission Volume</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Records submitted per day over the last 30 days</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={volumeConfig} className="h-[260px] w-full">
                      <LineChart data={submissionVolumeData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
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
                      <BarChart data={rejectionReasonsData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
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
                      <LineChart data={processingTimeData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
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
          </>
        )}

        {/* Charts Section - Subscriber */}
        {institution.isSubscriber && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className={CHART_CARD}>
                  <div className="mb-4">
                    <h2 className="text-h4 font-semibold text-foreground">Enquiry Volume Trend</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Enquiries per day over the last 30 days</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={enquiryConfig} className="h-[260px] w-full">
                      <LineChart data={enquiryVolumeData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
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
                    <h2 className="text-h4 font-semibold text-foreground">Usage by Data Source</h2>
                    <p className="mt-1 text-caption text-muted-foreground">Standard vs alternate data source usage</p>
                  </div>
                  <div className="flex-1">
                    <ChartContainer config={sourceConfig} className="h-[260px] w-full">
                      <BarChart data={usageBySourceData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="source" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="standard" stackId="a" fill="var(--color-standard)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="alternate" stackId="a" fill="var(--color-alternate)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
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
                      <LineChart data={responseTimeData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
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
          </>
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

  const submitterApis: ApiCardData[] = [
    { name: "Submission API", enabled: true, rateLimit: "1000/min", ipWhitelist: ["10.0.1.0/24", "192.168.1.100"], lastUsed: "2026-02-19 09:14" },
    { name: "Bulk API", enabled: false, rateLimit: "100/min", ipWhitelist: [], lastUsed: "2026-02-17 14:30" },
    { name: "SFTP Access", enabled: true, rateLimit: "N/A", ipWhitelist: ["10.0.1.50"], lastUsed: "2026-02-19 06:00" },
  ];

  const subscriberApis: ApiCardData[] = [
    { name: "Enquiry API", enabled: true, rateLimit: "2000/min", ipWhitelist: ["10.0.2.0/24"], lastUsed: "2026-02-19 09:42" },
  ];

  const keys = [
    { key: "sb_live_xxxx...xxxx", created: "2026-01-15", status: "active" },
    { key: "sb_test_yyyy...yyyy", created: "2026-02-01", status: "active" },
  ];

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
