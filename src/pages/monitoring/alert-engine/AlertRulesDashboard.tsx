import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { alertRules, type AlertRule, type AlertRuleDomain, type SeverityLevel } from "@/data/alert-engine-mock";
import { Plus, Pencil, Power, PowerOff, Trash2 } from "lucide-react";


const DOMAINS: AlertRuleDomain[] = ["Submission API", "Batch", "Inquiry API", "Schema Drift", "Rate Limit Abuse"];
const METRICS = ["Success Rate", "Latency", "Error Count", "Failure %", "Queue Size", "Drift Severity", "Rate Limit Violations"];
const OPERATORS = ["<", "≥", "≤", "=", "Spike % Increase"];
const TIME_WINDOWS = ["5 minutes", "15 minutes", "1 hour", "24 hours"];
const CHANNELS = ["Email", "SMS", "Slack/Webhook", "In-App Notification", "AI agent"];
const ESCALATION_OPTIONS = ["Immediate", "After X minutes", "Escalate to Level 2 if unresolved"];
const SEVERITIES: SeverityLevel[] = ["Info", "Warning", "Critical"];

const severityStyles: Record<SeverityLevel, string> = {
  Info: "bg-muted text-muted-foreground",
  Warning: "bg-warning/15 text-warning",
  Critical: "bg-destructive/15 text-destructive",
};

const PAGE_SIZE = 10;

function CreateAlertRuleSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (rule: Partial<AlertRule>) => void;
}) {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState<AlertRuleDomain | "">("");
  const [metric, setMetric] = useState("");
  const [operator, setOperator] = useState("");
  const [value, setValue] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [escalation, setEscalation] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel>("Warning");
  const [name, setName] = useState("");

  const reset = () => {
    setStep(1);
    setDomain("");
    setMetric("");
    setOperator("");
    setValue("");
    setTimeWindow("");
    setChannels([]);
    setEscalation("");
    setSeverity("Warning");
    setName("");
  };

  const handleSubmit = () => {
    const condition = value && timeWindow ? `${metric} ${operator} ${value} for ${timeWindow}` : `${metric} ${operator} ${value}`;
    onCreated?.({
      name: name || `Rule ${Date.now()}`,
      domain: domain || "Submission API",
      condition,
      severity,
      status: "Enabled",
      lastTriggered: null,
    });
    reset();
    onOpenChange(false);
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Alert Rule</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 pt-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Step 1 — Select Domain</Label>
                <Select value={domain} onValueChange={(v) => setDomain(v as AlertRuleDomain)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep(2)} disabled={!domain}>Next</Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Step 2 — Define Condition</Label>
                <div className="grid gap-3">
                  <Select value={metric} onValueChange={setMetric}>
                    <SelectTrigger><SelectValue placeholder="Metric" /></SelectTrigger>
                    <SelectContent>
                      {METRICS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={operator} onValueChange={setOperator}>
                    <SelectTrigger><SelectValue placeholder="Operator" /></SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Value (e.g. 800ms, 95%)" value={value} onChange={(e) => setValue(e.target.value)} />
                  <Select value={timeWindow} onValueChange={setTimeWindow}>
                    <SelectTrigger><SelectValue placeholder="Time window" /></SelectTrigger>
                    <SelectContent>
                      {TIME_WINDOWS.map((w) => (
                        <SelectItem key={w} value={w}>{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={!metric || !operator}>Next</Button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Step 3 — Define Action</Label>
                <div className="space-y-2">
                  <p className="text-caption text-muted-foreground">Notification channels</p>
                  {CHANNELS.map((ch) => (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channels.includes(ch)}
                        onChange={() => toggleChannel(ch)}
                        className="rounded border-input"
                      />
                      <span className="text-body">{ch}</span>
                    </label>
                  ))}
                </div>
                <div className="pt-2">
                  <Label className="text-caption">Escalation</Label>
                  <Select value={escalation} onValueChange={setEscalation}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Escalation policy" /></SelectTrigger>
                    <SelectContent>
                      {ESCALATION_OPTIONS.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => setStep(4)}>Next</Button>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Step 4 — Severity & Name</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as SeverityLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Alert rule name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={handleSubmit}>Create Rule</Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AlertRulesDashboard() {
  const [rules, setRules] = useState<AlertRule[]>(alertRules);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rules.length / PAGE_SIZE));
  const paginated = rules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreated = (rule: Partial<AlertRule>) => {
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}`,
        name: rule.name ?? "New Rule",
        domain: rule.domain ?? "Submission API",
        condition: rule.condition ?? "",
        severity: rule.severity ?? "Warning",
        status: "Enabled",
        lastTriggered: rule.lastTriggered ?? null,
      },
    ]);
    setPage(1);
  };

  const toggleStatus = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === "Enabled" ? "Disabled" : "Enabled" } : r))
    );
  };

  const deleteRule = (id: string) => {
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      const newTotalPages = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
      setPage((p) => Math.min(p, newTotalPages));
      return next;
    });
  };

  return (
    <section className="shrink-0">
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
          <h3 className="text-body font-semibold text-foreground">Alert Rules</h3>
          <Button size="sm" className="gap-1.5 h-8 text-body text-primary-foreground shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Create Rule
          </Button>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
              <tr className="border-b border-border">
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Alert Name</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Domain</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Condition</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Severity</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Status</th>
                <th className={cn("text-left px-5 py-3", tableHeaderClasses)}>Last Triggered</th>
                <th className={cn("text-right px-5 py-3", tableHeaderClasses)}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 text-caption font-medium text-foreground">{r.name}</td>
                  <td className="px-5 py-4 text-caption text-muted-foreground">{r.domain}</td>
                  <td className="px-5 py-4 text-caption text-foreground max-w-[180px] truncate" title={r.condition}>{r.condition}</td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, severityStyles[r.severity])}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full", badgeTextClasses, r.status === "Enabled" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-caption text-muted-foreground whitespace-nowrap">{r.lastTriggered ?? "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title={r.status === "Enabled" ? "Disable" : "Enable"} onClick={() => toggleStatus(r.id)}>
                        {r.status === "Enabled" ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => deleteRule(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <span className="text-caption text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rules.length)} of {rules.length}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-caption font-medium transition-colors",
                  p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <CreateAlertRuleSheet open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
    </section>
  );
}
