import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  "Overview",
  "API & Access",
  "Alternate Data",
  "Consent Configuration",
  "Mapping",
  "Validation Rules",
  "Match Review",
  "Monitoring",
  "CBS Integration",
  "Reports",
  "Audit Trail",
];

const InstitutionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/institutions")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">First National Bank</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">Commercial Bank</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/15 text-success">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "Overview" && <OverviewTab />}
        {activeTab === "API & Access" && <ApiAccessTab />}
        {activeTab !== "Overview" && activeTab !== "API & Access" && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground text-sm">
              {activeTab} configuration will be available here.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

function OverviewTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Details */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Corporate Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Legal Name", "First National Bank Ltd."],
              ["Registration No.", "BK-2024-00142"],
              ["Jurisdiction", "Kenya"],
              ["License Type", "Commercial Banking"],
              ["Contact Email", "compliance@fnb.co.ke"],
              ["Contact Phone", "+254 700 123 456"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Compliance Documents</h3>
          <div className="space-y-3">
            {[
              { name: "Certificate of Incorporation", status: "verified" },
              { name: "CBK License", status: "verified" },
              { name: "Data Protection Certificate", status: "pending" },
            ].map((doc) => (
              <div key={doc.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {doc.status === "verified" ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  )}
                  <span className="text-sm text-foreground">{doc.name}</span>
                </div>
                <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                  View <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        {[
          { label: "APIs Enabled", value: "3/3", color: "text-success" },
          { label: "SLA Health", value: "99.9%", color: "text-success" },
          { label: "Data Quality", value: "98%", color: "text-foreground" },
          { label: "Match Accuracy", value: "96.4%", color: "text-foreground" },
          { label: "Onboarded", value: "Jan 15, 2026", color: "text-muted-foreground" },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={cn("text-lg font-bold mt-1", item.color)}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiAccessTab() {
  const [envTab, setEnvTab] = useState<"sandbox" | "uat" | "prod">("sandbox");

  const keys = [
    { env: "sandbox", key: "sb_live_xxxx...xxxx", created: "2026-01-15", status: "active" },
    { env: "sandbox", key: "sb_test_yyyy...yyyy", created: "2026-02-01", status: "active" },
  ];

  return (
    <div className="space-y-6">
      {/* Env Tabs */}
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
          <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
          <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            Generate New Key
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {keys.map((k, i) => (
              <tr key={i}>
                <td className="px-5 py-4 font-mono text-sm text-foreground">{k.key}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{k.created}</td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success capitalize">{k.status}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button className="text-xs text-primary hover:text-primary/80">Rotate</button>
                    <button className="text-xs text-destructive hover:text-destructive/80">Revoke</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* API Toggle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Submission API", enabled: true, rateLimit: "1000/min", lastModified: "Feb 10, 2026" },
          { name: "Enquiry API", enabled: true, rateLimit: "2000/min", lastModified: "Feb 12, 2026" },
          { name: "Bulk API", enabled: false, rateLimit: "100/min", lastModified: "Jan 20, 2026" },
        ].map((api) => (
          <div key={api.name} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">{api.name}</h4>
              <div className={cn(
                "w-10 h-6 rounded-full flex items-center px-0.5 transition-colors cursor-pointer",
                api.enabled ? "bg-success justify-end" : "bg-muted justify-start"
              )}>
                <div className="w-5 h-5 rounded-full bg-card shadow-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Rate Limit</span>
                <span className="text-xs text-foreground font-medium">{api.rateLimit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Last Modified</span>
                <span className="text-xs text-foreground">{api.lastModified}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InstitutionDetail;
