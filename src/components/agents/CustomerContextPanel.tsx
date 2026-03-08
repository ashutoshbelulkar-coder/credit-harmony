import type { Customer } from "@/types/agents";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Brain, CreditCard, TrendingUp, Activity, Search, AlertTriangle,
  BadgePercent, Calendar, DollarSign, PiggyBank, Wallet, FileCheck,
  BarChart3, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  customer: Customer | null;
}

export function CustomerContextPanel({ customer }: Props) {
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-16 h-16 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center mb-4">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-body font-medium text-foreground mb-1">No Customer Profile</h3>
        <p className="text-caption text-muted-foreground">
          Run a tool to create a customer profile. Start with a Bureau Enquiry.
        </p>
      </div>
    );
  }

  const riskColor: Record<string, string> = {
    Low: "text-success bg-success/10 dark:bg-success/20 border-success/40",
    Medium: "text-warning bg-warning/10 dark:bg-warning/20 border-warning/40",
    High: "text-destructive bg-destructive/10 dark:bg-destructive/20 border-destructive/40",
    Critical: "text-destructive bg-destructive/15 dark:bg-destructive/25 border-destructive/50",
  };

  const scoreColor = customer.bureauScore >= 750 ? "text-success" : customer.bureauScore >= 650 ? "text-warning" : "text-destructive";
  const scoreLabel = customer.bureauScore >= 750 ? "Excellent" : customer.bureauScore >= 650 ? "Good" : "Poor";

  return (
    <ScrollArea className="flex-1 min-h-0 h-0 basis-0">
      <div className="space-y-4 pl-3 pr-2 pb-4">
        {/* CRIF Header Card - at top */}
        <Card className="border border-primary/20 bg-primary/5 dark:bg-primary/10 text-card-foreground">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[9px] text-muted-foreground">Report Date: {new Date().toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={cn("text-[9px] font-semibold", riskColor[customer.riskTag])}>
                {customer.riskTag} Risk
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className={cn("text-3xl font-bold", scoreColor)}>{customer.bureauScore}</p>
                <p className="text-[9px] text-muted-foreground">{scoreLabel}</p>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center justify-between text-caption">
                  <span className="text-muted-foreground truncate">{customer.fullName}</span>
                </div>
                <div className="flex items-center justify-between text-caption">
                  <span className="text-muted-foreground">PAN: {customer.pan}</span>
                </div>
                <div className="flex items-center justify-between text-caption">
                  <span className="text-muted-foreground">ID: {customer.profileId}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive Summary - below CRIF Analysis */}
        <Card className="border border-border bg-card text-card-foreground">
          <CardHeader className="pb-2 pt-3 px-4">
            <h3 className="text-h4 font-semibold leading-tight text-foreground">Executive Summary</h3>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-caption text-muted-foreground leading-relaxed">{customer.executiveSummary}</p>
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2">
          <MetricCard icon={DollarSign} label="Total Debt" value={`₹${(customer.totalDebt / 100000).toFixed(1)}L`} />
          <MetricCard icon={CreditCard} label="Active Accounts" value={String(customer.activeLoans)} />
          <MetricCard icon={Search} label="Inquiries" value={String(customer.enquiries6m)} />
          <MetricCard icon={BadgePercent} label="Utilization" value={`${customer.utilizationPct}%`} />
          <MetricCard icon={Activity} label="Credit Mix" value={customer.creditMix.split(",")[0]} />
          <MetricCard icon={TrendingUp} label="Worst Status" value={customer.worstStatus} />
        </div>

        {/* Financial Summary */}
        <Card className="border border-border bg-card text-card-foreground">
          <CardHeader className="pb-2 pt-3 px-4">
            <h3 className="text-h4 font-semibold leading-tight text-foreground">Financial Summary</h3>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <FinCard icon={Wallet} label="Balance" value={`₹${(customer.balance / 1000).toFixed(0)}K`} />
              <FinCard icon={DollarSign} label="Income" value={`₹${(customer.income / 1000).toFixed(0)}K`} />
              <FinCard icon={BarChart3} label="Spending" value={`₹${(customer.spending / 1000).toFixed(0)}K`} />
              <FinCard icon={PiggyBank} label="Savings" value={`₹${(customer.savings / 1000).toFixed(0)}K`} />
              <FinCard icon={Calendar} label="Monthly EMI" value={`₹${(customer.monthlyEmi / 1000).toFixed(0)}K`} />
              <FinCard icon={TrendingUp} label="Savings Ratio" value={`${customer.savingsRatio}%`} />
            </div>
          </CardContent>
        </Card>

        {/* Accordion Sections */}
        <Accordion type="multiple" className="space-y-1">
          <AccordionItem value="tradelines" className="border border-border rounded-lg px-3">
            <AccordionTrigger className="text-caption font-semibold py-2.5 hover:no-underline">
              Tradelines ({customer.tradelines.length})
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2">
                {customer.tradelines.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-caption p-2 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/50">
                    <div>
                      <p className="font-medium text-foreground">{t.lender}</p>
                      <p className="text-[9px] text-muted-foreground">{t.type} · ₹{(t.sanctionedAmount / 100000).toFixed(1)}L</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={cn(
                        "text-[9px]",
                        t.status === "Active" ? "text-success bg-success/10 dark:bg-success/20 border-success/40" : t.status === "Closed" ? "text-muted-foreground border-border" : "text-destructive bg-destructive/10 dark:bg-destructive/20 border-destructive/40"
                      )}>
                        {t.status}
                      </Badge>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{t.dpd} DPD</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="enquiries" className="border border-border rounded-lg px-3">
            <AccordionTrigger className="text-caption font-semibold py-2.5 hover:no-underline">
              Enquiry History ({customer.enquiryHistory.length})
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2">
                {customer.enquiryHistory.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-caption p-2 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/50">
                    <div>
                      <p className="font-medium text-foreground">{e.institution}</p>
                      <p className="text-[9px] text-muted-foreground">{e.purpose}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-caption text-foreground">₹{(e.amount / 100000).toFixed(1)}L</p>
                      <p className="text-[9px] text-muted-foreground">{e.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="alerts" className="border border-border rounded-lg px-3">
            <AccordionTrigger className="text-caption font-semibold py-2.5 hover:no-underline">
              Alerts ({customer.alerts.length})
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2">
                {customer.alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-caption p-2 rounded-lg bg-warning/10 dark:bg-warning/20 border border-warning/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                    <span className="text-foreground">{a}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="documents" className="border border-border rounded-lg px-3">
            <AccordionTrigger className="text-caption font-semibold py-2.5 hover:no-underline">
              Documents ({customer.documents.length})
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2">
                {customer.documents.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-caption p-2 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{d.name}</span>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[9px]",
                      d.status === "Verified" ? "text-success bg-success/10 dark:bg-success/20 border-success/40" : "text-warning bg-warning/10 dark:bg-warning/20 border-warning/40"
                    )}>
                      {d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground p-2.5 text-center">
      <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
      <p className="text-body font-semibold text-foreground leading-tight">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FinCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/50 p-2">
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-caption font-medium text-foreground leading-tight">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
