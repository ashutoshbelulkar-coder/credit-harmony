import type { PropertyReport } from "@/lib/real-estate-bureau/types";
import { Building2, FileCheck, History, Landmark, Scale, Wallet } from "lucide-react";

const KPI_CONFIG = [
  { key: "propertyValue" as const, label: "Property Value", icon: Landmark },
  { key: "totalExposure" as const, label: "Total Exposure", icon: Wallet },
  { key: "activeMortgages" as const, label: "Active Mortgages", icon: Building2 },
  { key: "historicalMortgages" as const, label: "Historical Mortgages", icon: History },
  { key: "ownershipChanges" as const, label: "Ownership Changes", icon: Scale },
  { key: "documentCompleteness" as const, label: "Document Completeness", icon: FileCheck },
];

interface ReportKpiCardsProps {
  report: PropertyReport;
}

export function ReportKpiCards({ report }: ReportKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {KPI_CONFIG.map(({ key, label, icon: Icon }) => {
        const raw = report[key];
        const display =
          key === "documentCompleteness" ? `${raw}%` : typeof raw === "number" ? String(raw) : raw;
        return (
          <div
            key={key}
            className="rounded-xl border border-border bg-card p-4 shadow-sm stat-glow-primary"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{display}</p>
          </div>
        );
      })}
    </div>
  );
}
