import { useState } from "react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { Download, Pencil } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { BillingModel } from "@/data/institutions-mock";

const creditTrendData = [
  { month: "Sep", spent: 8200 },
  { month: "Oct", spent: 9400 },
  { month: "Nov", spent: 11200 },
  { month: "Dec", spent: 10100 },
  { month: "Jan", spent: 12800 },
  { month: "Feb", spent: 14500 },
];

const spendBySourceData = [
  { source: "Bank Stmt", amount: 5800 },
  { source: "GST", amount: 3200 },
  { source: "Telecom", amount: 1800 },
  { source: "Utility", amount: 1200 },
  { source: "Behavioral", amount: 2500 },
];

const creditConfig: ChartConfig = {
  spent: { label: "Credits Consumed", color: "hsl(var(--primary))" },
};

const spendConfig: ChartConfig = {
  amount: { label: "Spend (KES)", color: "hsl(var(--secondary))" },
};

interface PricingRow {
  source: string;
  enabled: boolean;
  ratePerCall: number;
}

const pricingData: PricingRow[] = [
  { source: "Bank Statement", enabled: true, ratePerCall: 15 },
  { source: "GST", enabled: true, ratePerCall: 10 },
  { source: "Telecom", enabled: false, ratePerCall: 8 },
  { source: "Utility", enabled: true, ratePerCall: 5 },
  { source: "Behavioral", enabled: false, ratePerCall: 20 },
];

export default function BillingTab({ billingModel: initModel, creditBalance: initBalance }: { billingModel?: BillingModel; creditBalance?: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [model, setModel] = useState<BillingModel>(initModel || "prepaid");
  const [alertThreshold, setAlertThreshold] = useState(5000);
  const [dateFrom, setDateFrom] = useState("2026-02-01");
  const [dateTo, setDateTo] = useState("2026-02-19");

  const [savedState, setSavedState] = useState({
    model: (initModel || "prepaid") as BillingModel,
    alertThreshold: 5000,
  });

  const handleSave = () => {
    setSavedState({ model, alertThreshold });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setModel(savedState.model);
    setAlertThreshold(savedState.alertThreshold);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-foreground">Billing</h3>
        <p className="text-caption text-muted-foreground mt-1">Manage billing model, pricing, and usage.</p>
      </div>

      {/* Export Reports - moved to top */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h4 className="text-body font-semibold text-foreground mb-4">Export Reports</h4>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
            <DatePicker value={dateFrom} onChange={setDateFrom} className="h-8 font-sans" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
            <DatePicker value={dateTo} onChange={setDateTo} className="h-8 font-sans" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-body font-medium text-foreground hover:bg-muted transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-body font-medium hover:bg-primary/90 transition-colors">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Billing Model */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-body font-semibold text-foreground">Billing Model</h4>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-caption font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg border border-border text-caption font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-caption font-medium hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Model</label>
            <Select value={model} onValueChange={(v) => setModel(v as BillingModel)} disabled={!isEditing}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="postpaid">Postpaid</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(model === "prepaid" || model === "hybrid") && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current Credit Balance</label>
                <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted/50 text-sm font-medium text-foreground">
                  KES {(initBalance ?? 25000).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Low Credit Alert Threshold</label>
                <Input
                  type="number"
                  min={0}
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  disabled={!isEditing}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pricing Configuration */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h4 className="text-body font-semibold text-foreground">Pricing Configuration</h4>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-caption font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg border border-border text-caption font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-caption font-medium hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-muted/95 backdrop-blur">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Source</th>
                <th className={cn("text-center px-5 py-3", tableHeaderClasses)}>Enabled</th>
                <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Rate Per Call (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pricingData.map((row) => (
                <tr key={row.source}>
                  <td className="px-5 py-4 text-body text-foreground">{row.source}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full",
                      badgeTextClasses,
                      row.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    )}>
                      {row.enabled ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-body font-medium text-foreground">{row.ratePerCall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="text-body font-semibold text-foreground mb-4">Credit Consumption Trend</h4>
          <ChartContainer config={creditConfig} className="h-[220px] w-full">
            <LineChart data={creditTrendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="spent" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
            </LineChart>
          </ChartContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="text-body font-semibold text-foreground mb-4">Spend by Source</h4>
          <ChartContainer config={spendConfig} className="h-[220px] w-full">
            <BarChart data={spendBySourceData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="source" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
