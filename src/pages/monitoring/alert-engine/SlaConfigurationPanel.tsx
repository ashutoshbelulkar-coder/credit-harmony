import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  slaConfigs,
  type SlaConfig,
  type SlaMetricRow,
  type SeverityLevel,
  type TimeWindow,
} from "@/data/alert-engine-mock";

const cardClass =
  "bg-card rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

const operators: { value: ">=" | "<=" | "<" | ">"; label: string }[] = [
  { value: ">=", label: "≥" },
  { value: "<=", label: "≤" },
  { value: "<", label: "<" },
  { value: ">", label: ">" },
];
const timeWindows: TimeWindow[] = ["Real-time", "5 min rolling", "1 hour rolling", "Daily"];
const severities: SeverityLevel[] = ["Warning", "Critical"];

const AI_AGENTS = [
  { id: "schema-mapper", label: "Schema Mapper Agent" },
  { id: "validation", label: "Validation Agent" },
  { id: "match-review", label: "Match Review Agent" },
  { id: "data-quality", label: "Data Quality Agent" },
];

const DEFAULT_EMAIL_BODY_HTML = `<p>An SLA breach has been detected.</p>
<p><strong>SLA:</strong> {{slaName}}</p>
<p><strong>Metric:</strong> {{metric}}</p>
<p><strong>Threshold:</strong> {{threshold}}</p>
<p><strong>Current value:</strong> {{currentValue}}</p>
<p><strong>Detected at:</strong> {{timestamp}}</p>
<p>Please review and take appropriate action.</p>`;

function EditSlaDrawer({
  open,
  onOpenChange,
  metricRow,
  slaName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricRow: SlaMetricRow | null;
  slaName: string;
  onSave?: (payload: { threshold: string; operator: string; timeWindow: TimeWindow; severity: SeverityLevel }) => void;
}) {
  const [threshold, setThreshold] = useState("");
  const [operator, setOperator] = useState<string>(">=");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("1 hour rolling");
  const [severity, setSeverity] = useState<SeverityLevel>("Warning");
  const [alertEmail, setAlertEmail] = useState(false);
  const [alertSms, setAlertSms] = useState(false);
  const [alertWebhook, setAlertWebhook] = useState(false);
  const [alertAiAgent, setAlertAiAgent] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("SLA Breach Alert — {{slaName}}");
  const [emailBodyHtml, setEmailBodyHtml] = useState(DEFAULT_EMAIL_BODY_HTML);
  const [smsTo, setSmsTo] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookMethod, setWebhookMethod] = useState<"POST" | "PUT">("POST");

  useEffect(() => {
    if (open && metricRow) {
      setThreshold(metricRow.threshold?.replace(/[^\d.]/g, "") ?? "");
      setOperator(metricRow.operator ?? ">=");
      setTimeWindow(metricRow.timeWindow ?? "1 hour rolling");
      setSeverity(metricRow.severity ?? "Warning");
    }
  }, [open, metricRow]);

  const handleSave = () => {
    const suffix = metricRow?.metric?.includes("%") ? "%" : metricRow?.metric?.includes("ms") ? "ms" : "";
    onSave?.({ threshold: `${operator === ">=" ? "≥" : operator === "<=" ? "≤" : operator} ${threshold}${suffix}`, operator, timeWindow, severity });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit SLA — {slaName}</SheetTitle>
        </SheetHeader>
        {metricRow && (
          <div className="space-y-6 pt-6">
            <p className="text-caption text-muted-foreground">{metricRow.metric}</p>
            <div className="space-y-2">
              <Label>Threshold value</Label>
              <div className="flex gap-2">
                <Select value={operator} onValueChange={setOperator}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="e.g. 99 or 500"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Time window</Label>
              <Select value={timeWindow} onValueChange={(v) => setTimeWindow(v as TimeWindow)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeWindows.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity level</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as SeverityLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severities.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <Label className="text-body font-medium">Alert mechanism</Label>
              <p className="text-caption text-muted-foreground">Choose how to be notified when this SLA is breached.</p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={alertEmail} onCheckedChange={(c) => setAlertEmail(!!c)} />
                  <span className="text-caption">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={alertSms} onCheckedChange={(c) => setAlertSms(!!c)} />
                  <span className="text-caption">SMS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={alertWebhook} onCheckedChange={(c) => setAlertWebhook(!!c)} />
                  <span className="text-caption">Webhook</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={alertAiAgent} onCheckedChange={(c) => setAlertAiAgent(!!c)} />
                  <span className="text-caption">Sent to AI agent</span>
                </label>
              </div>

              {alertAiAgent && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-caption">Choose agent</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_AGENTS.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {alertEmail && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <Label className="text-caption">Email recipients</Label>
                  <Input
                    type="text"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="e.g. ops@example.com, alerts@example.com"
                    className="text-caption"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-caption">Subject</Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="SLA Breach Alert"
                      className="text-caption"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-caption">Email body (HTML)</Label>
                    <Textarea
                      value={emailBodyHtml}
                      onChange={(e) => setEmailBodyHtml(e.target.value)}
                      placeholder="HTML content..."
                      className="min-h-[160px] font-mono text-caption"
                      rows={8}
                    />
                  </div>
                </div>
              )}

              {alertSms && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-caption">Phone numbers</Label>
                  <Input
                    value={smsTo}
                    onChange={(e) => setSmsTo(e.target.value)}
                    placeholder="e.g. +254700000000, +254711111111"
                    className="text-caption"
                  />
                </div>
              )}

              {alertWebhook && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-caption">Webhook URL</Label>
                  <Input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://api.example.com/alerts"
                    className="text-caption"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-caption">Method</Label>
                    <Select value={webhookMethod} onValueChange={(v) => setWebhookMethod(v as "POST" | "PUT")}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave}>Save Changes</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SlaCard({ config }: { config: SlaConfig }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<SlaMetricRow | null>(null);

  const openEdit = (row: SlaMetricRow) => {
    setEditingMetric(row);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className={cardClass}>
        <div className="mb-4">
          <h4 className="text-h4 font-semibold text-foreground">{config.name}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={cn("text-left px-4 py-2.5", tableHeaderClasses)}>Metric</th>
                <th className={cn("text-left px-4 py-2.5", tableHeaderClasses)}>Threshold</th>
                <th className={cn("text-left px-4 py-2.5", tableHeaderClasses)}>Current</th>
                <th className={cn("text-left px-4 py-2.5", tableHeaderClasses)}>Status</th>
                <th className={cn("text-right px-4 py-2.5", tableHeaderClasses)}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {config.metrics.map((row) => (
                <tr key={row.metric} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-body text-foreground">{row.metric}</td>
                  <td className="px-4 py-3 text-caption text-muted-foreground">{row.threshold}</td>
                  <td className="px-4 py-3 text-caption tabular-nums">{row.current}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full",
                        badgeTextClasses,
                        row.status === "Within SLA" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <EditSlaDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        metricRow={editingMetric}
        slaName={config.name}
        onSave={() => setDrawerOpen(false)}
      />
    </>
  );
}

export function SlaConfigurationPanel() {
  return (
    <section>
      <div className="grid grid-cols-1 gap-6">
        {slaConfigs.map((config) => (
          <SlaCard key={config.id} config={config} />
        ))}
      </div>
    </section>
  );
}
