import { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchemaRegistryTable } from "./SchemaRegistryTable";
import { RegistryFilters, type RegistryFilterValues } from "./RegistryFilters";
import { schemaRegistryEntries } from "@/data/schema-mapper-mock";

interface SchemaRegistryViewProps {
  onCreateNew: () => void;
  onViewAudit: (entryId: string) => void;
}

export function SchemaRegistryView({ onCreateNew, onViewAudit }: SchemaRegistryViewProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<RegistryFilterValues>({
    sourceType: "all",
    status: "all",
    coverageMin: 0,
    createdBy: "",
  });

  const filtered = useMemo(() => {
    let result = schemaRegistryEntries;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.sourceName.toLowerCase().includes(q) ||
          e.sourceType.toLowerCase().includes(q),
      );
    }
    if (filters.sourceType !== "all") {
      result = result.filter((e) => e.sourceType === filters.sourceType);
    }
    if (filters.status !== "all") {
      result = result.filter((e) => e.status === filters.status);
    }
    if (filters.coverageMin > 0) {
      result = result.filter((e) => e.mappingCoverage >= filters.coverageMin);
    }
    if (filters.createdBy) {
      const q = filters.createdBy.toLowerCase();
      result = result.filter((e) => e.createdBy.toLowerCase().includes(q));
    }

    return result;
  }, [search, filters]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Schema Mapping Registry</h1>
          <p className="mt-0.5 text-caption text-muted-foreground">
            Manage alternate data schema mappings to the HCB master schema
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Create New Mapping
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by source name or field..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8"
        />
      </div>

      {/* Filters */}
      <RegistryFilters filters={filters} onFiltersChange={setFilters} />

      {/* Table */}
      <SchemaRegistryTable
        entries={filtered}
        onView={(id) => onViewAudit(id)}
        onEdit={() => {}}
        onClone={() => {}}
        onNewVersion={() => {}}
        onArchive={() => {}}
        onAuditHistory={(id) => onViewAudit(id)}
      />
    </div>
  );
}
