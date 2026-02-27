import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mockAgents } from "@/data/agents-mock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, Search, FileSearch, FileSignature, BarChart3,
  ShieldAlert, UserCheck, Building2, Brain, Home, MapPin, Building,
  Landmark, Shield, Wifi, Car, Handshake, Settings, ClipboardCheck, User,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentChatWorkspace } from "@/components/agents/AgentChatWorkspace";
import { BureauOperatorWorkspace } from "@/components/agents/bureau-operator/BureauOperatorWorkspace";

const iconMap: Record<string, React.ElementType> = {
  Search, FileSearch, FileSignature, BarChart3, ShieldAlert, UserCheck,
  Building2, Brain, Home, MapPin, Building, Landmark, Shield, Wifi, Car,
  Handshake, Settings, ClipboardCheck, User,
};

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const agent = mockAgents.find((a) => a.id === agentId);
  const [activeSubAgent, setActiveSubAgent] = useState<string | null>(null);

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Agent not found.</p>
      </div>
    );
  }

  // Bureau Operations Intelligence: skip detail step, go straight to CRIF Operations workspace
  if (agent.id === "bureau-operator") {
    return (
      <BureauOperatorWorkspace
        agent={agent}
        onBack={() => navigate("/agents")}
      />
    );
  }

  if (activeSubAgent) {
    return (
      <AgentChatWorkspace
        agent={agent}
        subAgentId={activeSubAgent}
        onBack={() => setActiveSubAgent(null)}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-0 sm:pt-0 sm:pb-0">
      {/* Header - same style as AgentChatWorkspace */}
      <header className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-2 sm:pb-2.5 border-b border-border shrink-0 px-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/agents")} className="shrink-0 h-8 w-8" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
            <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <h1 className="text-body font-semibold text-foreground truncate">{agent.name}</h1>
          <span
            className="w-2 h-2 rounded-full bg-success shrink-0 hidden sm:block"
            title="Online"
            aria-hidden
          />
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="sm" className="gap-1 text-caption h-7 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground">
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat History</span>
          </Button>
        </div>
      </header>

      {/* Services Grid - scrollable on mobile */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-4 sm:pt-6">
        <h2 className="text-h4 font-semibold text-foreground mb-4">Services</h2>
        {agent.subAgents && agent.subAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agent.subAgents.map((sub) => {
              const SubIcon = iconMap[sub.icon] || Brain;
              return (
                <Card
                  key={sub.id}
                  className={cn(
                    "group bg-card border border-border text-card-foreground transition-all duration-200",
                    sub.comingSoon
                      ? "opacity-60 cursor-default"
                      : cn(
                          "cursor-pointer",
                          "hover:border-primary/30 hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.06)]",
                          "dark:hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.12)]"
                        )
                  )}
                  onClick={() => !sub.comingSoon && setActiveSubAgent(sub.id)}
                >
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center">
                        <SubIcon className="w-5 h-5 text-primary" />
                      </div>
                      {sub.comingSoon && (
                        <Badge variant="outline" className="text-[9px] uppercase font-semibold text-muted-foreground border-border bg-muted/50">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-body font-semibold text-foreground mb-1">{sub.name}</h3>
                      <p className="text-caption text-muted-foreground line-clamp-2">{sub.description}</p>
                    </div>
                    {!sub.comingSoon && (
                      <div className="flex justify-end pt-1">
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-card border border-border text-card-foreground">
            <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Brain className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-body text-muted-foreground">
                This agent operates directly without sub-services.
              </p>
              <Button onClick={() => setActiveSubAgent("direct")} className="gap-1.5">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
