import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Search, FileText, Receipt, ScanText, ShieldAlert, Database, Wifi,
} from "lucide-react";

const sourceConfig = [
  { key: "creditBureau", label: "Credit Bureau", description: "Access to credit bureau reports and scores", icon: Search },
  { key: "bankStatement", label: "Bank Statement Analysis", description: "Upload and analyze bank statements for cash flow", icon: FileText },
  { key: "gstData", label: "GST Data", description: "Fetch GST filing data for business verification", icon: Receipt },
  { key: "ocrDocument", label: "OCR Document Analysis", description: "Extract data from scanned documents", icon: ScanText },
  { key: "fraudSignals", label: "Fraud Signals", description: "Fraud detection and alert signals", icon: ShieldAlert },
  { key: "internalPortfolio", label: "Internal Portfolio Data", description: "Internal loan performance and portfolio data", icon: Database },
  { key: "telecomUtility", label: "Telecom / Utility Data", description: "Telecom and utility payment behavior data", icon: Wifi },
];

interface Props {
  sources: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export function SourcesConfigTab({ sources, onToggle }: Props) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-body font-semibold">Data Sources</CardTitle>
        <p className="text-caption text-muted-foreground">
          Toggle sources to control which data the agent can access. Changes auto-save.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {sourceConfig.map(({ key, label, description, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <Label className="text-body font-medium text-foreground cursor-pointer">{label}</Label>
                <p className="text-[10px] text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              checked={sources[key] ?? false}
              onCheckedChange={() => onToggle(key)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
