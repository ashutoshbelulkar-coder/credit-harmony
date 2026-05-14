import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Search, Unlink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import type { DataSource, DataSourceType, SortDirection } from "@/types/data-management";

type SortKey = "name" | "type" | "lastUpdated";

interface PersistedFilters {
  query: string;
  type: DataSourceType | "ALL";
  sortKey: SortKey;
  sortDirection: SortDirection;
}

interface LinkedSourcesTableProps {
  sources: DataSource[];
  canMutate: boolean;
  onView: (source: DataSource) => void;
  onUnlink: (source: DataSource) => void;
  filters: PersistedFilters;
  onFiltersChange: (next: PersistedFilters) => void;
}

const TYPE_OPTIONS: (DataSourceType | "ALL")[] = [
  "ALL",
  "BankAccount",
  "Government",
  "Telecom",
  "Financial",
  "KYC",
  "CRM",
];

export function LinkedSourcesTable({
  sources,
  canMutate,
  onView,
  onUnlink,
  filters,
  onFiltersChange,
}: LinkedSourcesTableProps) {
  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    let rows = sources.filter((source) => {
      if (filters.type !== "ALL" && source.type !== filters.type) return false;
      if (!q) return true;
      return [source.name, source.provider, source.sourceId, source.type]
        .some((v) => v.toLowerCase().includes(q));
    });
    const dir = filters.sortDirection === "asc" ? 1 : -1;
    rows = rows.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (filters.sortKey === "name") {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      } else if (filters.sortKey === "type") {
        av = a.type;
        bv = b.type;
      } else {
        av = new Date(a.lastUpdated).getTime();
        bv = new Date(b.lastUpdated).getTime();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }, [sources, filters]);

  function toggleSort(key: SortKey) {
    if (filters.sortKey === key) {
      onFiltersChange({
        ...filters,
        sortDirection: filters.sortDirection === "asc" ? "desc" : "asc",
      });
    } else {
      onFiltersChange({ ...filters, sortKey: key, sortDirection: "asc" });
    }
  }

  function renderSort(key: SortKey, label: string) {
    const active = filters.sortKey === key;
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={cn(
          "inline-flex items-center gap-1",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        {active && (filters.sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={filters.query}
            onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
            placeholder="Filter sources by name, provider, ID"
            className="pl-8"
            aria-label="Filter linked sources"
          />
        </div>
        <Select
          value={filters.type}
          onValueChange={(v) => onFiltersChange({ ...filters, type: v as DataSourceType | "ALL" })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by source type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                {type === "ALL" ? "All types" : type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card">
          <EmptyState
            title="No linked sources match your filters"
            description="Adjust the search/type filter or link a new source."
            actionLabel="Reset filters"
            onAction={() =>
              onFiltersChange({
                query: "",
                type: "ALL",
                sortKey: "lastUpdated",
                sortDirection: "desc",
              })
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={tableHeaderClasses}>{renderSort("name", "Source")}</TableHead>
                <TableHead className={tableHeaderClasses}>{renderSort("type", "Type")}</TableHead>
                <TableHead className={tableHeaderClasses}>Provider</TableHead>
                <TableHead className={tableHeaderClasses}>{renderSort("lastUpdated", "Last updated")}</TableHead>
                <TableHead className={tableHeaderClasses}>Status</TableHead>
                <TableHead className={cn(tableHeaderClasses, "text-right")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((source) => (
                <TableRow key={source.sourceId}>
                  <TableCell className="text-body">
                    <div className="font-medium text-foreground">{source.name}</div>
                    <div className="text-caption text-muted-foreground">{source.sourceId}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={badgeTextClasses}>
                      {source.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-body">{source.provider}</TableCell>
                  <TableCell className="text-body whitespace-nowrap">
                    {new Date(source.lastUpdated).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={source.status === "ACTIVE" ? "default" : "secondary"}
                      className={badgeTextClasses}
                    >
                      {source.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onView(source)}
                            aria-label={`View ${source.name} details`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!canMutate}
                            onClick={() => canMutate && onUnlink(source)}
                            aria-label={`Unlink ${source.name}`}
                          >
                            <Unlink className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {canMutate ? "Unlink source" : "You don't have permission to unlink"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
