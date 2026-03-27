import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { Download, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import tabsData from "@/data/institution-tabs.json";
import { getProductSubscriptions } from "@/data/institution-extensions-mock";
import { useCatalogMock } from "@/contexts/CatalogMockContext";
import { productPricingLabel } from "@/data/data-products-mock";

const { creditTrendData } = tabsData.billing;

const creditConfig: ChartConfig = {
  spent: { label: "Credits Consumed", color: "hsl(var(--primary))" },
};

const spendConfig: ChartConfig = {
  amount: { label: "Spend", color: "hsl(var(--secondary))" },
};

const subStatusClass: Record<string, string> = {
  active: "bg-success/15 text-success",
  trial: "bg-primary/15 text-primary",
  suspended: "bg-muted text-muted-foreground",
};

export default function BillingTab({
  institutionId,
  billingModel: initModel,
  creditBalance: initBalance,
}: {
  institutionId: string;
  billingModel?: BillingModel;
  creditBalance?: number;
}) {
  const { products: catalogProducts } = useCatalogMock();

  // Join subscriptions with catalog to get rate info
  const subscriptions = useMemo(() => {
    const subs = getProductSubscriptions(institutionId);
    return subs.map((s) => {
      const cat = catalogProducts.find((p) => p.id === s.productId);
      return {
        ...s,
        pricingModel: cat ? productPricingLabel[cat.pricingModel] : "Per hit",
        ratePerCall: cat?.price ?? 0,
      };
    });
  }, [institutionId, catalogProducts]);

  // Bar chart — spend per product (mock: rate * enquiry volume estimate)
  const spendByProductData = useMemo(
    () =>
      subscriptions.map((s) => ({
        productId: s.productId,
        productName: s.productName,
        amount: Math.round(s.ratePerCall * (800 + Math.abs(s.productId.charCodeAt(4) ?? 0) * 120)),
      })),
    [subscriptions]
  );

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
                  {(initBalance ?? 25000).toLocaleString()}
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
          <div>
            <h4 className="text-body font-semibold text-foreground">Subscribed Products</h4>
            <p className="text-caption text-muted-foreground mt-0.5">
              Pricing is derived from the product catalogue for each active subscription.
            </p>
          </div>
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
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Product</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Pricing model</th>
                <th className={cn("text-center px-5 py-3", tableHeaderClasses)}>Status</th>
                <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-caption text-muted-foreground">
                    No product subscriptions found for this institution.
                  </td>
                </tr>
              ) : (
                subscriptions.map((row) => (
                  <tr key={row.productId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 text-body text-foreground font-medium">{row.productName}</td>
                    <td className="px-5 py-3.5 text-body text-muted-foreground">{row.pricingModel}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full capitalize",
                        badgeTextClasses,
                        subStatusClass[row.status] ?? subStatusClass.active
                      )}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-body font-medium text-foreground tabular-nums">
                      {row.ratePerCall.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
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
          <h4 className="text-body font-semibold text-foreground mb-4">Spend by Product</h4>
          {spendByProductData.length === 0 ? (
            <p className="text-caption text-muted-foreground py-8 text-center">No subscriptions to display.</p>
          ) : (
            <ChartContainer config={spendConfig} className="h-[220px] w-full">
              <BarChart data={spendByProductData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="productId" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) =>
                        (payload?.[0]?.payload as { productName?: string } | undefined)?.productName ??
                        ""
                      }
                    />
                  }
                />
                <Bar dataKey="amount" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}
