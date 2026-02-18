import { useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SourceType, SchemaStatus } from "@/types/schema-mapper";

export interface RegistryFilterValues {
  sourceType: SourceType | "all";
  status: SchemaStatus | "all";
  coverageMin: number;
  createdBy: string;
}

interface RegistryFiltersProps {
  filters: RegistryFilterValues;
  onFiltersChange: (filters: RegistryFilterValues) => void;
  className?: string;
}

const SOURCE_TYPE_OPTIONS: { value: SourceType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "telecom", label: "Telecom" },
  { value: "utility", label: "Utility" },
  { value: "bank", label: "Bank" },
  { value: "gst", label: "GST" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS: { value: SchemaStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const COVERAGE_OPTIONS = [
  { value: 0, label: "Any Coverage" },
  { value: 50, label: "≥ 50%" },
  { value: 70, label: "≥ 70%" },
  { value: 85, label: "≥ 85%" },
  { value: 95, label: "≥ 95%" },
];

export function RegistryFilters({ filters, onFiltersChange, className }: RegistryFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<RegistryFilterValues>) =>
    onFiltersChange({ ...filters, ...patch });

  const activeCount = [
    filters.sourceType !== "all",
    filters.status !== "all",
    filters.coverageMin > 0,
    filters.createdBy.length > 0,
  ].filter(Boolean).length;

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-body font-medium text-foreground">Filters</span>
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-caption text-muted-foreground">Source Type</label>
              <Select
                value={filters.sourceType}
                onValueChange={(v) => update({ sourceType: v as SourceType | "all" })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-muted-foreground">Status</label>
              <Select
                value={filters.status}
                onValueChange={(v) => update({ status: v as SchemaStatus | "all" })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-muted-foreground">Mapping Coverage</label>
              <Select
                value={filters.coverageMin.toString()}
                onValueChange={(v) => update({ coverageMin: parseInt(v, 10) })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVERAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-caption text-muted-foreground">Created By</label>
              <Input
                placeholder="Search by name..."
                value={filters.createdBy}
                onChange={(e) => update({ createdBy: e.target.value })}
                className="h-8"
              />
            </div>
          </div>

          {activeCount > 0 && (
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onFiltersChange({
                    sourceType: "all",
                    status: "all",
                    coverageMin: 0,
                    createdBy: "",
                  })
                }
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
