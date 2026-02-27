import { useNavigate } from "react-router-dom";
import { mockAgents, mockRecentActivity } from "@/data/agents-mock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Landmark, Home, Shield, UserCheck, Wifi, Car, Handshake, Settings,
  ClipboardCheck, User, Brain, ArrowRight, Plus, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Landmark, Home, Shield, UserCheck, Wifi, Car, Handshake, Settings,
  ClipboardCheck, User,
};

export default function AgentsLandingPage() {
  const navigate = useNavigate();

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
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => navigate("/agents/configuration")} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Agent
          </Button>
        </div>
      </div>

      {/* Available Agents */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockAgents.map((agent) => {
            const Icon = iconMap[agent.icon] || Brain;
            return (
              <Card
                key={agent.id}
                className={cn(
                  "group cursor-pointer bg-card border border-border text-card-foreground",
                  "transition-all duration-200",
                  "hover:border-primary/30 hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.06)]",
                  "dark:hover:shadow-[0_4px_12px_hsl(var(--foreground)/0.12)]"
                )}
                onClick={() => navigate(`/agents/${agent.id}`)}
              >
                <CardContent className="p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
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
                      {agent.subscribed && (
                        <Badge
                          variant="outline"
                          className="mt-1.5 text-[9px] uppercase font-semibold border-success text-success bg-success/10 dark:bg-success/20"
                        >
                          Subscribed
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
                  <div className="flex items-stretch gap-2 pt-2 mt-auto border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-0 gap-1.5 text-caption border-border bg-transparent text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/agents/configuration");
                      }}
                    >
                      <Settings className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Configure</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-0 gap-1.5 text-caption border-border bg-transparent text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    >
                      <span className="truncate">Explore</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
