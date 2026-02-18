import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Eye,
  Pencil,
  Ban,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";

type InstitutionStatus = "active" | "pending" | "suspended" | "draft";

interface Institution {
  id: string;
  name: string;
  type: string;
  status: InstitutionStatus;
  apisEnabled: number;
  slaHealth: number;
  lastUpdated: string;
}

const institutions: Institution[] = [
  { id: "1", name: "First National Bank", type: "Commercial Bank", status: "active", apisEnabled: 3, slaHealth: 99.9, lastUpdated: "2026-02-18" },
  { id: "2", name: "Metro Credit Union", type: "Credit Union", status: "active", apisEnabled: 2, slaHealth: 99.5, lastUpdated: "2026-02-17" },
  { id: "3", name: "Pacific Finance Corp", type: "NBFI", status: "pending", apisEnabled: 0, slaHealth: 0, lastUpdated: "2026-02-16" },
  { id: "4", name: "Southern Trust Bank", type: "Commercial Bank", status: "active", apisEnabled: 3, slaHealth: 99.7, lastUpdated: "2026-02-15" },
  { id: "5", name: "Digital Lending Co", type: "Fintech", status: "draft", apisEnabled: 0, slaHealth: 0, lastUpdated: "2026-02-14" },
  { id: "6", name: "Heritage Savings Bank", type: "Savings Bank", status: "suspended", apisEnabled: 1, slaHealth: 87.2, lastUpdated: "2026-02-10" },
  { id: "7", name: "Alpine Microfinance", type: "MFI", status: "active", apisEnabled: 2, slaHealth: 98.1, lastUpdated: "2026-02-13" },
  { id: "8", name: "Urban Commercial Bank", type: "Commercial Bank", status: "active", apisEnabled: 3, slaHealth: 99.8, lastUpdated: "2026-02-12" },
];

const statusStyles: Record<InstitutionStatus, string> = {
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  suspended: "bg-danger-subtle text-danger",
  draft: "bg-muted text-muted-foreground",
};

const InstitutionList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = institutions.filter((inst) => {
    const matchSearch = inst.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h2 font-semibold text-foreground">Institutions</h1>
            <p className="text-caption text-muted-foreground mt-1">
              Manage onboarded institutions and their configurations
            </p>
          </div>
          <button
            onClick={() => navigate("/institutions/register")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-body font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Institution
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search institutions..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card text-body font-medium hover:bg-muted transition-colors"
            >
              <Filter className="w-4 h-4 text-muted-foreground" />
              Status
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showFilters && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
                <div className="absolute top-full left-0 mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 animate-fade-in">
                  {["all", "active", "pending", "suspended", "draft"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setShowFilters(false); }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-body capitalize hover:bg-muted transition-colors",
                        statusFilter === s && "bg-muted font-medium"
                      )}
                    >
                      {s === "all" ? "All Statuses" : s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <tr className="border-b border-border">
                  {["Institution Name", "Type", "Status", "APIs Enabled", "SLA Health", "Last Updated", ""].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-5 py-3",
                        tableHeaderClasses,
                        h === "APIs Enabled" || h === "SLA Health" ? "text-right" : "text-left"
                      )}
                    >
                      {h && (
                        <span
                          className={cn(
                            "flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors",
                            (h === "APIs Enabled" || h === "SLA Health") && "justify-end"
                          )}
                        >
                          {h}
                          {h !== "" && <ArrowUpDown className="w-3 h-3" />}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inst) => (
                  <tr
                    key={inst.id}
                    onClick={() => navigate(`/institutions/${inst.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="text-body font-medium text-foreground">{inst.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-body text-muted-foreground">{inst.type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full capitalize", badgeTextClasses, statusStyles[inst.status])}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-body text-foreground">{inst.apisEnabled}/3</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {inst.slaHealth > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                inst.slaHealth >= 99 ? "bg-success" : inst.slaHealth >= 95 ? "bg-warning" : "bg-destructive"
                              )}
                              style={{ width: `${inst.slaHealth}%` }}
                            />
                          </div>
                          <span className="text-caption text-muted-foreground">{inst.slaHealth}%</span>
                        </div>
                      ) : (
                        <span className="text-caption text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-body text-muted-foreground">{inst.lastUpdated}</span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-caption text-muted-foreground">
              Showing {filtered.length} of {institutions.length} institutions
            </span>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 rounded-md text-caption font-medium bg-primary text-primary-foreground">1</button>
              <button className="px-3 py-1.5 rounded-md text-caption font-medium text-muted-foreground hover:bg-muted transition-colors">2</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InstitutionList;
