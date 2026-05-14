import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockAgents, mockRecentActivity } from "@/data/agents-mock";
import type { Agent } from "@/types/agents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Landmark, Home, Shield, UserCheck, Wifi, Car, Handshake, Settings,
  ClipboardCheck, User, Brain, ArrowRight, Plus, Clock, Lock, Mail, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { showDemoAgentsRequestUi } from "@/lib/feature-flags";

const iconMap: Record<string, React.ElementType> = {
  Landmark, Home, Shield, UserCheck, Wifi, Car, Handshake, Settings,
  ClipboardCheck, User,
};

const CAPABILITY_LABELS: Record<string, string> = {
  fileCreation: "File creation & document generation",
  dataAnalysis: "Data analysis & insights",
  riskScoring: "Risk scoring & modeling",
  reportGeneration: "Report generation",
  imageCreation: "Image creation",
  videoCreation: "Video creation",
  financialSpreading: "Financial spreading",
};

function getCapabilityList(agent: Agent): string[] {
  return Object.entries(agent.capabilities)
    .filter(([, v]) => v)
    .map(([k]) => CAPABILITY_LABELS[k] ?? k);
}

function getExampleUseCases(agent: Agent): { title: string; description: string }[] {
  if (agent.suggestedPrompts?.length) {
    return agent.suggestedPrompts.map((p) => ({ title: p.title, description: p.message }));
  }
  return agent.tags.slice(0, 3).map((tag) => ({
    title: tag,
    description: `Use this agent for ${tag.toLowerCase()}-related analysis and workflows.`,
  }));
}

export default function AgentsLandingPage() {
  const navigate = useNavigate();
  const [requestAccessAgent, setRequestAccessAgent] = useState<Agent | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">
            Available agents
          </h1>
          <p className="text-body text-muted-foreground mt-1">
            Select an agent to begin your analysis or continue from where you left off.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => navigate("/agents/configuration")} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Agent
          </Button>
        </div>
      </div>

      {/* Available Agents */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
          {mockAgents.map((agent) => {
            const Icon = iconMap[agent.icon] || Brain;
            const isSubscribed = agent.subscribed !== false;
            return (
              <Card
                key={agent.id}
                className={cn(
                  "group relative cursor-pointer bg-card border border-border text-card-foreground",
                  "transition-all duration-200",
                  "hover:border-primary/30 hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.06)]",
                  "dark:hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.12)]"
                )}
                onClick={() =>
                  isSubscribed ? navigate(`/agents/${agent.id}`) : setRequestAccessAgent(agent)
                }
              >
                {!isSubscribed && (
                  <div
                    className="absolute top-3 right-3 z-10 flex items-center justify-center w-6 h-6 rounded-md bg-muted/80 border border-border text-muted-foreground"
                    aria-hidden
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
                <CardContent className="p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 shrink-0 rounded-lg border flex items-center justify-center",
                        isSubscribed
                          ? "bg-primary/10 dark:bg-primary/20 border-primary/20"
                          : "bg-primary/[0.08] dark:bg-primary/[0.16] border-primary/10 dark:border-primary/15"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isSubscribed ? "text-primary" : "text-primary/90")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-body font-semibold text-foreground leading-tight">
                          {agent.name}
                        </h3>
                        <span
                          className="w-2.5 h-2.5 shrink-0 rounded-full bg-success mt-0.5"
                          title="Online"
                          aria-label="Online"
                        />
                      </div>
                      {isSubscribed ? (
                        <Badge
                          variant="outline"
                          className="mt-1.5 text-[9px] uppercase font-semibold border-success text-success bg-success/10 dark:bg-success/20"
                        >
                          Subscribed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="mt-1.5 text-[9px] uppercase font-semibold border-muted-foreground/40 text-muted-foreground bg-muted/50 dark:bg-muted/30"
                        >
                          Not Subscribed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-caption text-muted-foreground line-clamp-2">
                    {agent.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 font-medium border border-border/50 bg-muted/50 text-foreground/90"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-stretch gap-2 pt-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-0 gap-1.5 text-caption border-border bg-transparent text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agents/configuration?agentId=${agent.id}`);
                      }}
                    >
                      <Settings className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Configure</span>
                    </Button>
                    {isSubscribed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-0 gap-1.5 text-caption border-border bg-transparent text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/agents/${agent.id}`);
                        }}
                      >
                        <span className="truncate">Explore</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-0 gap-1.5 text-caption border-border bg-transparent text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequestAccessAgent(agent);
                        }}
                      >
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Request Access</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-h4 font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
          {mockRecentActivity.map((activity) => (
            <Card
              key={activity.id}
              className="bg-card border border-border text-card-foreground transition-all duration-200 hover:border-primary/20 h-full flex flex-col"
            >
              <CardContent className="p-4 flex flex-col gap-2 flex-1 min-h-0">
                <Badge
                  variant="secondary"
                  className="text-[9px] font-medium w-fit max-w-full break-words whitespace-normal text-left border border-border/50 bg-muted/50 text-foreground/90 rounded-full px-2.5 py-0.5"
                >
                  {activity.agentName}
                </Badge>
                <p className="text-body font-medium text-foreground line-clamp-2">{activity.title}</p>
                <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
                  <span className="text-caption text-muted-foreground">{activity.date}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-caption text-muted-foreground hover:text-primary shrink-0"
                    onClick={() => navigate(`/agents/${activity.agentId}`)}
                  >
                    Resume <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Request Access drawer (unsubscribed agents) */}
      <Sheet open={!!requestAccessAgent} onOpenChange={(open) => !open && setRequestAccessAgent(null)}>
        <SheetContent side="right" className="flex flex-col w-full sm:max-w-md">
          {requestAccessAgent && (
            <>
              <SheetHeader className="text-left border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/[0.08] dark:bg-primary/[0.16] border border-primary/10 flex items-center justify-center">
                    {(() => {
                      const DrawerIcon = iconMap[requestAccessAgent.icon] || Brain;
                      return <DrawerIcon className="w-5 h-5 text-primary/90" />;
                    })()}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-h4 font-semibold text-foreground">
                      {requestAccessAgent.name}
                    </SheetTitle>
                    <Badge
                      variant="outline"
                      className="mt-1.5 text-[9px] uppercase font-semibold border-muted-foreground/40 text-muted-foreground bg-muted/50 w-fit"
                    >
                      Not Subscribed
                    </Badge>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-6 space-y-6">
                <div>
                  <h4 className="text-caption font-semibold text-foreground uppercase tracking-wide text-muted-foreground mb-2">
                    Description
                  </h4>
                  <p className="text-body text-foreground leading-relaxed">
                    {requestAccessAgent.description}
                  </p>
                </div>
                <div>
                  <h4 className="text-caption font-semibold text-foreground uppercase tracking-wide text-muted-foreground mb-2">
                    Key capabilities
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-body text-foreground">
                    {getCapabilityList(requestAccessAgent).map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-caption font-semibold text-foreground uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Example use cases
                  </h4>
                  <ul className="space-y-2">
                    {getExampleUseCases(requestAccessAgent).map((useCase, i) => (
                      <li key={i} className="text-body text-foreground">
                        <span className="font-medium">{useCase.title}</span>
                        <span className="text-muted-foreground"> — {useCase.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="shrink-0 pt-4 border-t border-border flex flex-col gap-2">
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    toast.info(
                      showDemoAgentsRequestUi()
                        ? "Access request recorded in this demo only — no ticket was created."
                        : "Contact your administrator to enable agent access or upgrade your plan."
                    );
                    setRequestAccessAgent(null);
                  }}
                >
                  <Mail className="w-4 h-4" />
                  Contact Admin / Upgrade Plan
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setRequestAccessAgent(null)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
