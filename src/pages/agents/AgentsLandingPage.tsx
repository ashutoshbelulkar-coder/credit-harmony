import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const userName = user?.email?.split("@")[0] ?? "Admin";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">
            Welcome back, {userName}
          </h1>
          <p className="text-body text-muted-foreground mt-1">
            Select an agent to begin your analysis or continue from where you left off.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 text-caption font-medium border-secondary/40 text-secondary">
            ACME Bank
          </Badge>
          <Button size="sm" onClick={() => navigate("/agents/configuration")} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Agent
          </Button>
        </div>
      </div>

      {/* Available Agents */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-secondary" />
          <h2 className="text-h4 font-semibold text-foreground">Available Agents</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockAgents.map((agent) => {
            const Icon = iconMap[agent.icon] || Brain;
            return (
              <Card
                key={agent.id}
                className="group cursor-pointer border border-border hover:border-secondary/50 transition-all duration-200 hover:shadow-md"
                onClick={() => navigate(`/agents/${agent.id}`)}
              >
                <CardContent className="p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-secondary" />
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] uppercase font-semibold tracking-wider",
                        "border-success/40 text-success bg-success/10"
                      )}
                    >
                      Online
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-body font-semibold text-foreground mb-1 leading-tight">
                      {agent.name}
                    </h3>
                    <p className="text-caption text-muted-foreground line-clamp-2">
                      {agent.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    {agent.subscribed ? (
                      <Badge variant="outline" className="text-[9px] uppercase font-semibold border-primary/40 text-primary bg-primary/5">
                        Subscribed
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <Button variant="ghost" size="sm" className="gap-1 text-caption text-secondary hover:text-secondary">
                      Explore <ArrowRight className="w-3.5 h-3.5" />
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
            <Card key={activity.id} className="border border-border hover:border-border/80 transition-colors">
              <CardContent className="p-4 flex flex-col gap-2">
                <span className="text-caption text-muted-foreground">{activity.date}</span>
                <p className="text-body font-medium text-foreground line-clamp-2">{activity.title}</p>
                <div className="flex items-center justify-between pt-1">
                  <Badge variant="secondary" className="text-[9px] font-medium">{activity.agentName}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-caption text-secondary"
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
