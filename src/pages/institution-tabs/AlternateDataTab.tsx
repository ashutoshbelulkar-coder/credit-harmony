import { useState } from "react";
import { cn } from "@/lib/utils";
import { badgeTextClasses } from "@/lib/typography";
import { Switch } from "@/components/ui/switch";
import { Database, FileText, Phone, Zap, Brain } from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  ratePerCall: number;
  consentRequired: boolean;
  usageCount: number;
}

const initialSources: DataSource[] = [
  { id: "bank-statement", name: "Bank Statement", icon: Database, enabled: true, ratePerCall: 15, consentRequired: true, usageCount: 12480 },
  { id: "gst", name: "GST", icon: FileText, enabled: true, ratePerCall: 10, consentRequired: false, usageCount: 8920 },
  { id: "telecom", name: "Telecom", icon: Phone, enabled: false, ratePerCall: 8, consentRequired: true, usageCount: 0 },
  { id: "utility", name: "Utility", icon: Zap, enabled: true, ratePerCall: 5, consentRequired: true, usageCount: 3240 },
  { id: "behavioral", name: "Behavioral", icon: Brain, enabled: false, ratePerCall: 20, consentRequired: true, usageCount: 0 },
];

export default function AlternateDataTab() {
  const [sources, setSources] = useState(initialSources);

  const handleToggle = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h4 font-semibold text-foreground">Alternate Data Sources</h3>
        <p className="text-caption text-muted-foreground mt-1">Configure alternate data sources for credit enrichment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <div
              key={source.id}
              className="bg-card rounded-xl border border-border p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-body font-semibold text-foreground">{source.name}</h4>
                  </div>
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={() => handleToggle(source.id)}
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-caption text-muted-foreground">Rate Per Call</span>
                    <span className="text-caption text-foreground font-medium">KES {source.ratePerCall}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-caption text-muted-foreground">Consent Required</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full",
                      badgeTextClasses,
                      source.consentRequired ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                    )}>
                      {source.consentRequired ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-caption text-muted-foreground">Usage (30d)</span>
                    <span className="text-caption text-foreground font-medium">
                      {source.enabled ? source.usageCount.toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <button className="px-3 py-1.5 rounded-lg border border-border text-caption font-medium text-primary hover:bg-primary/10 transition-colors w-full">
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
