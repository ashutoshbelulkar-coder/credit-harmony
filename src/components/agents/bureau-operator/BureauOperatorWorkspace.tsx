import { useState, useRef, useEffect, useCallback } from "react";
import type { Agent, ChatMessage, OperationsAlert, SegmentFilter } from "@/types/agents";
import { mockBureauOperatorResponses, mockChatHistoryList, mockCRIFSLAMetrics, mockCRIFRequestFlow, mockCRIFConsentOps, mockCRIFDataSubmission, mockDailyOpsSummary } from "@/data/bureau-operator-mock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Send, Brain, RefreshCw, Download, History, ChevronRight,
  MessageSquare, Activity, AlertTriangle, BarChart3, Bell,
  ClipboardList, LineChart, ShieldCheck, Timer, FileWarning,
  X, Layers, Mail, ExternalLink, ToggleLeft, ToggleRight, Filter,
  CheckCircle2, TrendingUp, Users, Paperclip, Database, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BureauOperationsPanel } from "./BureauOperationsPanel";

const actionCardIcons: Record<string, React.ElementType> = {
  "enquiry-failures": Activity,
  "data-submission-errors": FileWarning,
  "sla-breaches": Timer,
  "parsing-errors": Database,
  "daily-ops-report": ClipboardList,
  "alternate-data": Zap,
};

const actionCards = [
  { id: "enquiry-failures", label: "Show Enquiry Failures", description: "CRIF enquiry error codes & patterns" },
  { id: "data-submission-errors", label: "Show Data Submission Errors", description: "Rejections & schema errors" },
  { id: "sla-breaches", label: "Analyze SLA Breach", description: "Active CRIF SLA incidents" },
  { id: "parsing-errors", label: "Review Parsing Errors", description: "Data quality & top issues" },
  { id: "daily-ops-report", label: "Generate Daily Ops Report", description: "CRIF operations summary" },
  { id: "alternate-data", label: "Show Alternate Data Performance", description: "Bank statement, GST, OCR" },
];

const slashCommands = ["/sla", "/alerts", "/volume", "/consent", "/failures", "/cost", "/dailyops"];

interface Props {
  agent: Agent;
  onBack: () => void;
}

export function BureauOperatorWorkspace({ agent, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showOpsPanel, setShowOpsPanel] = useState(false);
  const [executiveMode, setExecutiveMode] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [timeRange, setTimeRange] = useState("Today");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resolveResponse = useCallback((text: string): string | null => {
    const trimmed = text.trim().toLowerCase();
    if (trimmed === "/sla") return mockBureauOperatorResponses["/sla"];
    if (trimmed === "/alerts") return mockBureauOperatorResponses["/alerts"];
    if (trimmed === "/volume") return mockBureauOperatorResponses["/volume"];
    if (trimmed === "/consent") return mockBureauOperatorResponses["/consent"];
    if (trimmed === "/failures") return mockBureauOperatorResponses["/failures"];
    if (trimmed === "/cost") return mockBureauOperatorResponses["/cost"];
    if (trimmed === "/dailyops") return mockBureauOperatorResponses["/dailyops"];
    for (const key of Object.keys(mockBureauOperatorResponses)) {
      if (trimmed.includes(key.replace(/-/g, " ")) || key === trimmed) {
        return mockBureauOperatorResponses[key];
      }
    }
    return null;
  }, []);

  const getActionButtons = useCallback((actionId: string): { label: string; action: string }[] => {
    const escalateBtn = { label: "Escalate to CRIF NOC", action: "escalate" };
    const emailBtn = { label: "Draft Incident Email", action: "email" };
    const exportBtn = { label: "Export Report", action: "export" };

    if (actionId === "sla-breaches") return [escalateBtn, emailBtn, exportBtn];
    if (actionId === "enquiry-failures" || actionId === "api-failures") return [escalateBtn, emailBtn, exportBtn];
    if (actionId === "data-submission-errors") return [escalateBtn, emailBtn];
    if (actionId === "consent-drop") return [escalateBtn, emailBtn];
    if (actionId === "daily-ops-report" || actionId === "incident-report") return [emailBtn, exportBtn];
    if (actionId === "volume-spike" || actionId === "retry-spike" || actionId === "alternate-data") return [escalateBtn, emailBtn];
    if (actionId === "parsing-errors" || actionId === "root-cause") return [escalateBtn, exportBtn];
    return [exportBtn];
  }, []);

  const sendMessage = useCallback((text: string, actionId?: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setShowSlashMenu(false);

    setTimeout(() => {
      const resolved = resolveResponse(text);
      const content = resolved ?? generateGenericResponse(text);
      const effectiveActionId = actionId ?? inferActionId(text);
      const actions = getActionButtons(effectiveActionId);

      const agentMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "agent",
        content,
        timestamp: new Date().toISOString(),
        actions: actions.map((a) => ({ label: a.label, toolId: a.action })),
        isStructured: true,
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 700);
  }, [resolveResponse, getActionButtons]);

  const handleSend = useCallback(() => {
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  const handleActionCard = useCallback((cardId: string, label: string) => {
    const response = mockBureauOperatorResponses[cardId];
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: label,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "agent",
        content: response ?? generateGenericResponse(label),
        timestamp: new Date().toISOString(),
        actions: getActionButtons(cardId).map((a) => ({ label: a.label, toolId: a.action })),
        isStructured: true,
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 700);
  }, [getActionButtons]);

  const handleAlertClick = useCallback((alert: OperationsAlert) => {
    setShowOpsPanel(false);
    sendMessage(`Analyze alert: ${alert.type} — ${alert.message}`, "root-cause");
  }, [sendMessage]);

  const handleInlineAction = useCallback((toolId: string) => {
    const actionMap: Record<string, string> = {
      escalate: "Drafting escalation to CRIF NOC...",
      email: "Drafting incident email for stakeholders...",
      export: "Preparing PDF export of this report...",
    };
    const systemMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "system",
      content: actionMap[toolId] ?? `Executing: ${toolId}`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, systemMsg]);

    setTimeout(() => {
      const responses: Record<string, string> = {
        escalate: `## Escalation Initiated\n\nEscalation drafted and queued for **CRIF NOC**.\n\n**Escalation ID:** ESC-2026-0227-${Math.floor(Math.random() * 9000) + 1000}\n**Priority:** High\n**Assigned To:** CRIF NOC\n**SLA Response:** 30 minutes\n\n✅ Escalation logged in audit trail per compliance requirements. No traffic switch — CRIF is the only bureau.`,
        email: `## Incident Email Draft\n\n**To:** ops-team@crif.internal, noc@crif.internal\n**Subject:** [INCIDENT] CRIF SLA Breach — Feb 27, 2026\n\nDear Team,\n\nThis is to inform you of an active CRIF SLA breach detected at 10:42 AM IST today.\n\n**Summary:** ${mockCRIFSLAMetrics.activeBreaches} active CRIF incident(s). Total estimated impact: ~420 enquiries affected.\n\n**Immediate Actions Required:**\n- Escalate to CRIF NOC for enquiry API latency\n- Review data submission schema rejections (14 files)\n- Contact ACME Bank re: OTP delivery for consent\n\nFull incident report attached. No multi-bureau routing — CRIF only.\n\nRegards,\nCRIF Operations Intelligence`,
        export: `## Report Export Ready\n\n✅ **Export generated successfully**\n\n**File:** crif-ops-report-2026-02-27-1045.pdf\n**Size:** 2.4 MB\n**Pages:** 8\n**Includes:** CRIF SLA data, enquiry failures, data submission, alert timeline, recommendations\n\n*In production, this would trigger a download or email the report to configured recipients.*`,
      };
      const agentMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "agent",
        content: responses[toolId] ?? `Action **${toolId}** completed successfully.`,
        timestamp: new Date().toISOString(),
        isStructured: true,
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 900);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setShowSlashMenu(value === "/" || (value.startsWith("/") && value.length < 10));
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden h-full max-h-[100dvh] sm:max-h-none">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-2 sm:pb-2.5 border-b border-border shrink-0 px-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-body font-semibold text-foreground truncate leading-tight">CRIF Operations Intelligence</h2>
            <p className="text-[9px] text-muted-foreground hidden sm:block">CRIF Command Center · Live</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-success shrink-0 hidden sm:block animate-pulse" title="Live" aria-hidden />
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden gap-1 text-caption h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowOpsPanel(true)}
            aria-label="Operations panel"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ops Panel</span>
          </Button>
          <Button
            variant={executiveMode ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-1 text-caption h-7 px-2 sm:px-2.5",
              executiveMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setExecutiveMode((v) => !v)}
            title="Toggle Executive Summary Mode"
          >
            {executiveMode ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Exec Mode</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-caption h-7 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-caption h-7 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-caption h-7 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowChatHistory(true)}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </header>

      {/* Main split */}
      <div className="flex flex-1 min-h-0 gap-0 mt-3 sm:mt-4 overflow-hidden">
        {/* Left — Operations Control Board (hidden below lg) */}
        <aside className="hidden lg:flex lg:w-[42%] lg:max-w-[440px] xl:w-[40%] xl:max-w-[460px] border-r border-border pr-3 xl:pr-4 flex-col min-h-0 overflow-hidden shrink-0">
          <BureauOperationsPanel onAlertClick={handleAlertClick} timeRange={timeRange} segment={segmentFilter} />
        </aside>

        {/* Right — AI Operations Assistant */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pl-0 lg:pl-4 min-w-0">
          {/* Filters bar */}
          <div className="shrink-0 flex flex-wrap items-center gap-2 pb-2.5 border-b border-border">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <FilterSelect value={timeRange} onValueChange={setTimeRange} options={["Today", "Last 7 Days", "Last 30 Days"]} />
            <FilterSelect value={segmentFilter} onValueChange={(v) => setSegmentFilter(v as SegmentFilter)} options={["All", "Enquiry", "Data Submission", "Alternate Data", "Consent", "Parsing"]} />
            <FilterSelect value={severityFilter} onValueChange={setSeverityFilter} options={["All", "Critical", "Medium", "Low"]} />
            <Badge variant="outline" className="ml-auto text-[9px] font-medium hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
              {mockCRIFSLAMetrics.activeBreaches} CRIF Active Breaches
            </Badge>
          </div>

          {/* Executive Mode View */}
          {executiveMode ? (
            <ExecutiveDashboard onExit={() => setExecutiveMode(false)} />
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden min-w-0">
              {/* Daily Ops Summary card (proactive on load) */}
              {showBanner && (
                <div className="shrink-0 mt-3 rounded-lg border border-primary/20 bg-muted/30 dark:bg-muted/20 px-3 py-2.5 flex items-start gap-2.5">
                  <Activity className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-semibold text-foreground">CRIF Operations Summary — Today</p>
                    <p className="text-[9px] text-muted-foreground mt-1 whitespace-pre-line">{mockDailyOpsSummary}</p>
                    {mockCRIFSLAMetrics.activeBreaches > 0 && (
                      <p className="text-[9px] text-warning mt-1">{mockCRIFSLAMetrics.activeBreaches} CRIF SLA breach(es) in last 30 mins. Would you like a summary?</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-[9px] font-semibold"
                      onClick={() => { setShowBanner(false); sendMessage("/dailyops", "daily-ops-report"); }}
                    >
                      Show Report
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowBanner(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Messages area - scrollable so input stays visible on mobile */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col mt-3 min-w-0">
                {isEmpty ? (
                  <div className="flex-1 min-h-0 overflow-auto flex flex-col min-w-0">
                    <ActionCardsGrid onCardClick={handleActionCard} />
                  </div>
                ) : (
                  <ScrollArea className="flex-1 min-h-0 h-0 basis-0 min-w-0">
                    <div className="space-y-4 px-1 sm:px-2 pr-2 pb-4">
                      {messages.map((msg) => (
                        <ChatBubble key={msg.id} message={msg} onActionClick={handleInlineAction} />
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Slash command menu */}
              {showSlashMenu && (
                <div className="shrink-0 border border-border rounded-lg bg-card shadow-md mx-1 mb-1 overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-border bg-muted/40">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Quick Commands</span>
                  </div>
                  <div className="flex flex-wrap gap-1 p-2">
                    {slashCommands.map((cmd) => (
                      <button
                        key={cmd}
                        className="px-2.5 py-1 rounded-md border border-border bg-background text-caption font-mono font-semibold text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors"
                        onClick={() => { setInputValue(cmd); setShowSlashMenu(false); inputRef.current?.focus(); }}
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input bar - always visible on mobile, safe area padding */}
              <div className="shrink-0 flex flex-wrap gap-2 items-center pt-1 pb-1 bg-background pb-[max(0.25rem,env(safe-area-inset-bottom))]">
                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Attach file">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) handleSend();
                      if (e.key === "Escape") setShowSlashMenu(false);
                    }}
                    placeholder="Type / for commands or ask an operational question..."
                    className="text-sm sm:text-base rounded-lg border-border bg-background"
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="shrink-0 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ops Panel sheet (mobile/tablet) */}
      <Sheet open={showOpsPanel} onOpenChange={setShowOpsPanel}>
        <SheetContent side="left" className="w-full max-w-[min(100vw,460px)] flex flex-col p-0">
          <SheetHeader className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <SheetTitle className="text-h4 font-semibold text-foreground">CRIF Operations Monitor</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 py-3">
            <BureauOperationsPanel onAlertClick={(a) => { setShowOpsPanel(false); handleAlertClick(a); }} timeRange={timeRange} segment={segmentFilter} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat History sheet */}
      <Sheet open={showChatHistory} onOpenChange={setShowChatHistory}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
            <SheetTitle className="text-h4 font-semibold text-foreground">Session History</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-1">
              {mockChatHistoryList.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left",
                    "hover:bg-muted/80 hover:border-primary/20 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                  onClick={() => setShowChatHistory(false)}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-foreground line-clamp-2">{chat.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{chat.date}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Action Cards Grid ──────────────────────────────────────── */
function ActionCardsGrid({ onCardClick }: { onCardClick: (id: string, label: string) => void }) {
  return (
    <div className="flex flex-col gap-3 px-1 pb-6">
      <div>
        <p className="text-caption font-semibold text-muted-foreground mb-1">AI Operations Assistant</p>
        <p className="text-[9px] text-muted-foreground">
          Type <code className="font-mono bg-muted px-1 rounded text-primary">/</code> for quick commands, or select an action below.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {actionCards.map((card) => {
          const CardIcon = actionCardIcons[card.id] || Brain;
          return (
            <button
              key={card.id}
              onClick={() => onCardClick(card.id, card.label)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-left",
                "hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              )}
            >
              <div className="w-7 h-7 rounded-md bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
                <CardIcon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground leading-tight">{card.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Executive Dashboard ─────────────────────────────────────── */
function ExecutiveDashboard({ onExit }: { onExit: () => void }) {
  const sla = mockCRIFSLAMetrics;
  const flow = mockCRIFRequestFlow;
  const consent = mockCRIFConsentOps;

  return (
    <div className="flex-1 min-h-0 overflow-auto mt-3">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-body font-semibold text-foreground">Executive Summary</h3>
            <p className="text-[9px] text-muted-foreground">Feb 27, 2026 · CRIF operational KPIs</p>
          </div>
          <Button variant="outline" size="sm" onClick={onExit} className="h-7 px-2.5 text-[9px]">
            Exit Exec Mode
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ExecKPI label="CRIF SLA Compliance" value={`${sla.overall}%`} sub="Target: 99.5%" status={sla.overall >= 99.5 ? "ok" : "warn"} icon={CheckCircle2} />
          <ExecKPI label="Active Breaches" value={sla.activeBreaches.toString()} sub={`${sla.critical} Critical`} status={sla.activeBreaches > 0 ? "error" : "ok"} icon={AlertTriangle} />
          <ExecKPI label="Consent Rate" value={`${consent.successRate}%`} sub="DPDP Compliance" status={consent.successRate >= 95 ? "ok" : "warn"} icon={ShieldCheck} />
          <ExecKPI label="Enquiries Today" value={flow.totalEnquiries.toLocaleString()} sub={`${flow.failedPct}% failed`} status={flow.failedPct > 2 ? "warn" : "ok"} icon={Activity} />
        </div>

        {/* CRIF Operational Metrics */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/40">
            <span className="text-caption font-semibold text-foreground">CRIF Operational Metrics</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
            <div className="rounded border border-border/50 p-2">
              <span className="text-[9px] text-muted-foreground block">Avg Response</span>
              <span className="text-body font-bold text-foreground">{sla.avgResponseTime}s</span>
            </div>
            <div className="rounded border border-border/50 p-2">
              <span className="text-[9px] text-muted-foreground block">P95 Latency</span>
              <span className="text-body font-bold text-foreground">{sla.p95Latency}s</span>
            </div>
            <div className="rounded border border-border/50 p-2">
              <span className="text-[9px] text-muted-foreground block">Data Submissions</span>
              <span className="text-body font-bold text-foreground">{flow.dataSubmissions}</span>
            </div>
            <div className="rounded border border-border/50 p-2">
              <span className="text-[9px] text-muted-foreground block">Consent Latency</span>
              <span className="text-body font-bold text-foreground">{consent.consentLatencyAvgMs}ms</span>
            </div>
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <ExecKPI label="Avg Response Time" value={`${sla.avgResponseTime}s`} sub="Target: <2.0s" status={sla.avgResponseTime <= 2 ? "ok" : "warn"} icon={Timer} />
          <ExecKPI label="Consent Latency" value={`${consent.consentLatencyAvgMs}ms`} sub="Target: <1,000ms" status={consent.consentLatencyAvgMs <= 1000 ? "ok" : "warn"} icon={Users} />
          <ExecKPI label="Timeout %" value={`${sla.timeoutPct}%`} sub="Target: <1%" status={sla.timeoutPct <= 1 ? "ok" : "warn"} icon={TrendingUp} />
        </div>
      </div>
    </div>
  );
}

function ExecKPI({ label, value, sub, status, icon: Icon }: {
  label: string; value: string; sub: string;
  status: "ok" | "warn" | "error";
  icon: React.ElementType;
}) {
  const statusColor = status === "ok" ? "text-success" : status === "warn" ? "text-warning" : "text-destructive";
  const borderColor = status === "ok" ? "border-success/20 bg-success/5" : status === "warn" ? "border-warning/20 bg-warning/5" : "border-destructive/20 bg-destructive/5";

  return (
    <div className={cn("rounded-lg border p-3 flex flex-col gap-1.5", borderColor)}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-3.5 h-3.5 shrink-0", statusColor)} />
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide truncate">{label}</span>
      </div>
      <span className={cn("text-h4 font-bold", statusColor)}>{value}</span>
      <span className="text-[9px] text-muted-foreground">{sub}</span>
    </div>
  );
}

/* ─── Filter Select ──────────────────────────────────────────── */
function FilterSelect({ value, onValueChange, options }: { value: string; onValueChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 text-[9px] border-border bg-card rounded-md px-2 w-auto min-w-[90px] max-w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-caption">
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ─── Chat Bubble ─────────────────────────────────────────────── */
function ChatBubble({ message, onActionClick }: { message: ChatMessage; onActionClick: (toolId: string) => void }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isSystem) {
    return (
      <div className="flex justify-center px-2">
        <div className="px-3 py-1.5 rounded-full bg-muted border border-border/50 text-[9px] text-muted-foreground max-w-[95%] sm:max-w-[85%] truncate flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          {message.content} · {time}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 px-1 sm:px-0", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
          <Activity className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={cn("space-y-2 min-w-0 max-w-[95%] sm:max-w-[90%] lg:max-w-[88%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-body leading-relaxed break-words",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground"
          )}
        >
          <OpsMarkdown text={message.content} />
        </div>
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((action) => {
              const ActionIcon = getActionIcon(action.toolId);
              return (
                <Button
                  key={action.toolId}
                  variant="outline"
                  size="sm"
                  className="text-[9px] sm:text-caption font-medium gap-1.5 h-7 px-2.5 border-border hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                  onClick={() => onActionClick(action.toolId)}
                >
                  <ActionIcon className="w-3 h-3" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
        <span className="text-[9px] text-muted-foreground">{time}</span>
      </div>
    </div>
  );
}

function getActionIcon(toolId: string): React.ElementType {
  const map: Record<string, React.ElementType> = {
    escalate: ExternalLink,
    email: Mail,
    export: Download,
  };
  return map[toolId] || Brain;
}

/* ─── Ops Markdown Renderer ──────────────────────────────────── */
function OpsMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const renderInline = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={i} className="font-mono bg-muted px-1 rounded text-[9px] text-primary">{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-2 rounded-lg border border-border">
          <table className="w-full text-[9px] border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {tableRows[0]?.map((h, i) => (
                  <th key={i} className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground">{h.trim()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(2).map((row, ri) => (
                <tr key={ri} className="border-b border-border/40 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2.5 py-1.5 text-foreground">{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, idx) => {
    if (line.startsWith("|")) {
      inTable = true;
      tableRows.push(line.split("|").filter(Boolean));
      return;
    }
    if (inTable) { flushTable(); inTable = false; }
    if (line.startsWith("### ")) {
      elements.push(<h4 key={idx} className="font-semibold text-body mt-3 mb-1 text-foreground">{renderInline(line.slice(4))}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={idx} className="font-semibold text-body mt-3 mb-1 text-foreground">{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={idx} className="border-border my-2" />);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<div key={idx} className="flex gap-1.5 ml-1 text-body"><span className="text-muted-foreground">•</span><span>{renderInline(line.slice(2))}</span></div>);
    } else if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ") || line.startsWith("5. ")) {
      elements.push(<div key={idx} className="flex gap-1.5 ml-1 text-body"><span className="text-muted-foreground font-mono">{line[0]}.</span><span>{renderInline(line.slice(3))}</span></div>);
    } else if (line.startsWith("🔴") || line.startsWith("🟡") || line.startsWith("🟢") || line.startsWith("✅") || line.startsWith("⚠️")) {
      elements.push(<p key={idx} className="text-body">{renderInline(line)}</p>);
    } else if (line.trim() === "") {
      elements.push(<div key={idx} className="h-1" />);
    } else {
      elements.push(<p key={idx} className="text-body">{renderInline(line)}</p>);
    }
  });
  if (inTable) flushTable();

  return <div className="space-y-0.5 leading-relaxed text-body">{elements}</div>;
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function inferActionId(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("sla") || t.includes("breach")) return "sla-breaches";
  if (t.includes("enquiry") && (t.includes("fail") || t.includes("error"))) return "enquiry-failures";
  if (t.includes("data submission") || t.includes("submission") && t.includes("reject")) return "data-submission-errors";
  if (t.includes("consent") || t.includes("otp")) return "consent-drop";
  if (t.includes("parsing") || t.includes("data quality")) return "parsing-errors";
  if (t.includes("daily") || t.includes("ops report")) return "daily-ops-report";
  if (t.includes("retry")) return "retry-spike";
  if (t.includes("alternate data") || t.includes("bank statement") || t.includes("gst") || t.includes("ocr")) return "alternate-data";
  if (t.includes("volume") || t.includes("spike") || t.includes("traffic")) return "volume-spike";
  if (t.includes("incident") || t.includes("report")) return "incident-report";
  if (t.includes("root") || t.includes("cause") || t.includes("alert")) return "root-cause";
  if (t.includes("fail") || t.includes("error")) return "enquiry-failures";
  return "daily-ops-report";
}

function generateGenericResponse(query: string): string {
  return `## CRIF Operations Analysis — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}

I've processed your query: **"${query}"**

Based on current CRIF operational data:
- CRIF SLA compliance is at **${mockCRIFSLAMetrics.overall}%** with **${mockCRIFSLAMetrics.activeBreaches}** active breach(es)
- Enquiry failure rate **${mockCRIFRequestFlow.failedPct}%** (${mockCRIFRequestFlow.totalEnquiries.toLocaleString()} enquiries today)
- Consent success rate **${mockCRIFConsentOps.successRate}%**
- Data submission rejections: **${mockCRIFDataSubmission.recordsRejected}** (schema/validation)

For specific insights, use the action cards or commands:
- \`/sla\` — CRIF SLA and breach details
- \`/alerts\` — CRIF operational alerts
- \`/failures\` — Enquiry failure analysis
- \`/dailyops\` — Daily ops summary

Would you like me to dive deeper into any of these areas?`;
}
