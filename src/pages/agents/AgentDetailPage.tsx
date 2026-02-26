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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentChatWorkspace } from "@/components/agents/AgentChatWorkspace";

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

  if (activeSubAgent) {
    return (
      <AgentChatWorkspace
        agent={agent}
        subAgentId={activeSubAgent}
        onBack={() => setActiveSubAgent(null)}
      />
    );
  }

  const AgentIcon = iconMap[agent.icon] || Brain;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/agents")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
            <AgentIcon className="w-5 h-5 text-secondary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-h2 font-semibold text-foreground truncate">{agent.name}</h1>
            <p className="text-caption text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="border-success/40 text-success bg-success/10 text-[9px] uppercase font-semibold tracking-wider shrink-0">
          ● Agent Online
        </Badge>
      </div>

      {/* Services Grid */}
      <div>
        <h2 className="text-h4 font-semibold text-foreground mb-4">Services</h2>
        {agent.subAgents && agent.subAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agent.subAgents.map((sub) => {
              const SubIcon = iconMap[sub.icon] || Brain;
              return (
                <Card
                  key={sub.id}
                  className={cn(
                    "group border border-border transition-all duration-200",
                    sub.comingSoon
                      ? "opacity-60 cursor-default"
                      : "cursor-pointer hover:border-secondary/50 hover:shadow-md"
                  )}
                  onClick={() => !sub.comingSoon && setActiveSubAgent(sub.id)}
                >
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <SubIcon className="w-5 h-5 text-primary" />
                      </div>
                      {sub.comingSoon && (
                        <Badge variant="outline" className="text-[9px] uppercase font-semibold text-muted-foreground border-muted">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="text-body font-semibold text-foreground mb-1">{sub.name}</h3>
                      <p className="text-caption text-muted-foreground line-clamp-2">{sub.description}</p>
                    </div>
                    {!sub.comingSoon && (
                      <div className="flex justify-end pt-1">
                        <ArrowRight className="w-4 h-4 text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border border-border">
            <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
              <Brain className="w-10 h-10 text-muted-foreground" />
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
