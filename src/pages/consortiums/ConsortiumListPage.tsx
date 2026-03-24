import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import {
  consortiumListLabel,
  consortiumListLabelStyles,
  consortiumTypeBadgeClass,
  type ConsortiumType,
} from "@/data/consortiums-mock";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCatalogMock } from "@/contexts/CatalogMockContext";

export default function ConsortiumListPage() {
  const navigate = useNavigate();
  const { consortiums } = useCatalogMock();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return consortiums.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
      const listLab = consortiumListLabel(c.status);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && listLab === "Active") ||
        (statusFilter === "draft" && listLab === "Draft");
      const matchType = typeFilter === "all" || c.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [consortiums, search, statusFilter, typeFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageBreadcrumb
          segments={[
            { label: "Dashboard", href: "/" },
            { label: "Consortiums" },
          ]}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-h2 font-semibold text-foreground">Consortiums</h1>
            <p className="text-caption text-muted-foreground mt-1">
              Manage closed and open consortia, membership, and shared data scope.
            </p>
          </div>
          <Button
            type="button"
            className="gap-2 self-start"
            onClick={() => navigate("/consortiums/create")}
          >
            <Plus className="w-4 h-4" />
            Create consortium
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex-1 max-w-sm relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search consortiums..."
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(["Closed", "Open", "Hybrid"] as ConsortiumType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No consortiums match your filters.
            </p>
          ) : (
            filtered.map((c) => {
              const lab = consortiumListLabel(c.status);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/consortiums/${c.id}`)}
                  className="w-full text-left rounded-xl border border-border bg-card p-4 space-y-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-body font-medium text-foreground">{c.name}</span>
                    <Badge
                      variant="secondary"
                      className={cn(badgeTextClasses, consortiumListLabelStyles(lab))}
                    >
                      {lab}
                    </Badge>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(badgeTextClasses, consortiumTypeBadgeClass[c.type])}
                  >
                    {c.type}
                  </Badge>
                  <div className="text-caption text-muted-foreground space-y-0.5">
                    <p>Members: {c.membersCount}</p>
                    <p>Data volume: {c.dataVolume}</p>
                  </div>
                  <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/consortiums/${c.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/consortiums/${c.id}/edit`)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <tr className="border-b border-border">
                  {[
                    "Name",
                    "Type",
                    "Members",
                    "Data volume",
                    "Status",
                    "",
                  ].map((label) => (
                    <th
                      key={label || "actions"}
                      className={cn(
                        tableHeaderClasses,
                        "px-4 py-3 text-left font-medium",
                        label === "" && "w-40 text-right"
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-caption text-muted-foreground"
                    >
                      No consortiums match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const lab = consortiumListLabel(c.status);
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-body text-foreground">{c.name}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={cn(badgeTextClasses, consortiumTypeBadgeClass[c.type])}
                          >
                            {c.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-body text-muted-foreground tabular-nums">
                          {c.membersCount}
                        </td>
                        <td className="px-4 py-3 text-body text-muted-foreground">
                          {c.dataVolume}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              badgeTextClasses,
                              consortiumListLabelStyles(lab)
                            )}
                          >
                            {lab}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 h-8"
                            onClick={() => navigate(`/consortiums/${c.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 h-8"
                            onClick={() => navigate(`/consortiums/${c.id}/edit`)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
