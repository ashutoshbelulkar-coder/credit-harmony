import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil } from "lucide-react";
import {
  LineChart,
  Line,
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
import tabsData from "@/data/institution-tabs.json";

const { consentFailureData } = tabsData.consent;

const chartConfig: ChartConfig = {
  failures: { label: "Consent Failures", color: "hsl(var(--danger))" },
};

type ConsentPolicy = "explicit" | "deemed" | "per-enquiry";
type CaptureMode = "api-header" | "upload-artifact" | "account-aggregator";

export default function ConsentConfigTab() {
  const [isEditing, setIsEditing] = useState(false);
  const [policy, setPolicy] = useState<ConsentPolicy>("explicit");
  const [expiryDays, setExpiryDays] = useState(90);
  const [scopeCreditReport, setScopeCreditReport] = useState(true);
  const [scopeAlternateData, setScopeAlternateData] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("api-header");

  const [savedState, setSavedState] = useState({
    policy: "explicit" as ConsentPolicy,
    expiryDays: 90,
    scopeCreditReport: true,
    scopeAlternateData: false,
    captureMode: "api-header" as CaptureMode,
  });

  const handleSave = () => {
    setSavedState({ policy, expiryDays, scopeCreditReport, scopeAlternateData, captureMode });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPolicy(savedState.policy);
    setExpiryDays(savedState.expiryDays);
    setScopeCreditReport(savedState.scopeCreditReport);
    setScopeAlternateData(savedState.scopeAlternateData);
    setCaptureMode(savedState.captureMode);
    setIsEditing(false);
  };

  const policyOptions: { value: ConsentPolicy; label: string }[] = [
    { value: "explicit", label: "Explicit Consent Required" },
    { value: "deemed", label: "Deemed Consent Allowed" },
    { value: "per-enquiry", label: "Per-Enquiry Consent Mandatory" },
  ];

  const captureModes: { value: CaptureMode; label: string }[] = [
    { value: "api-header", label: "API Header" },
    { value: "upload-artifact", label: "Upload Artifact" },
    { value: "account-aggregator", label: "Account Aggregator" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-h4 font-semibold text-foreground">Consent Configuration</h3>
          <p className="text-caption text-muted-foreground mt-1">Manage consent policies and capture settings.</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consent Policy */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="text-body font-semibold text-foreground mb-4">Consent Policy</h4>
          <div className="space-y-3">
            {policyOptions.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isEditing ? "cursor-pointer" : "cursor-default opacity-80",
                  policy === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  policy === opt.value ? "border-primary" : "border-muted-foreground"
                )}>
                  {policy === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <input
                  type="radio"
                  name="consent-policy"
                  value={opt.value}
                  checked={policy === opt.value}
                  onChange={() => isEditing && setPolicy(opt.value)}
                  disabled={!isEditing}
                  className="sr-only"
                />
                <span className="text-sm text-foreground">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Consent Expiry */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="text-body font-semibold text-foreground mb-4">Consent Expiry</h4>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expiry Period (days)</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              disabled={!isEditing}
            />
            <p className="text-caption text-muted-foreground mt-2">Consent will expire after {expiryDays} days from capture date.</p>
          </div>
        </div>

        {/* Consent Scope */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="text-body font-semibold text-foreground mb-4">Consent Scope</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <Checkbox
                checked={scopeCreditReport}
                onCheckedChange={(v) => isEditing && setScopeCreditReport(!!v)}
                disabled={!isEditing}
              />
              <span className="text-sm text-foreground">Credit Report</span>
            </label>
            <label className="flex items-center gap-3">
              <Checkbox
                checked={scopeAlternateData}
                onCheckedChange={(v) => isEditing && setScopeAlternateData(!!v)}
                disabled={!isEditing}
              />
              <span className="text-sm text-foreground">Alternate Data</span>
            </label>
            <label className="flex items-center gap-3">
              <Checkbox
                checked={scopeCreditReport && scopeAlternateData}
                onCheckedChange={(v) => {
                  if (!isEditing) return;
                  setScopeCreditReport(!!v);
                  setScopeAlternateData(!!v);
                }}
                disabled={!isEditing}
              />
              <span className="text-sm text-foreground">Both</span>
            </label>
          </div>
        </div>

        {/* Consent Capture Mode */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="text-body font-semibold text-foreground mb-4">Consent Capture Mode</h4>
          <div className="space-y-3">
            {captureModes.map((mode) => (
              <label
                key={mode.value}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isEditing ? "cursor-pointer" : "cursor-default opacity-80",
                  captureMode === mode.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  captureMode === mode.value ? "border-primary" : "border-muted-foreground"
                )}>
                  {captureMode === mode.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <input
                  type="radio"
                  name="capture-mode"
                  value={mode.value}
                  checked={captureMode === mode.value}
                  onChange={() => isEditing && setCaptureMode(mode.value)}
                  disabled={!isEditing}
                  className="sr-only"
                />
                <span className="text-sm text-foreground">{mode.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Consent Failure Metrics Chart */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h4 className="text-body font-semibold text-foreground mb-4">Consent Failure Metrics</h4>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={consentFailureData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" className="text-caption" tick={{ fontSize: 10 }} />
            <YAxis className="text-caption" tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="failures"
              stroke="hsl(var(--danger))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--danger))", r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
