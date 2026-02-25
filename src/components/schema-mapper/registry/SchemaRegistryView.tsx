import { useState, useMemo, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchemaRegistryTable } from "./SchemaRegistryTable";
import { SchemaDetailDialog } from "./SchemaDetailDialog";
import { RegistryFilters, type RegistryFilterValues } from "./RegistryFilters";
import { schemaRegistryEntries } from "@/data/schema-mapper-mock";
import { useToast } from "@/hooks/use-toast";
import type { SchemaRegistryEntry } from "@/types/schema-mapper";

interface SchemaRegistryViewProps {
  onCreateNew: () => void;
  onEditEntry: (entryId: string) => void;
  onViewAudit: (entryId: string) => void;
}

export function SchemaRegistryView({ onCreateNew, onEditEntry, onViewAudit }: SchemaRegistryViewProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<SchemaRegistryEntry[]>(schemaRegistryEntries);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<RegistryFilterValues>({
    sourceType: "all",
    status: "all",
    coverageMin: 0,
    createdBy: "",
  });
  const [detailEntry, setDetailEntry] = useState<SchemaRegistryEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = entries;

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
  }, [entries, search, filters]);

  const findEntry = useCallback(
    (id: string) => entries.find((e) => e.id === id),
    [entries],
  );

  const handleView = useCallback(
    (id: string) => {
      const entry = findEntry(id);
      if (entry) {
        setDetailEntry(entry);
        setDetailOpen(true);
      }
    },
    [findEntry],
  );

  const handleEdit = useCallback(
    (id: string) => {
      onEditEntry(id);
    },
    [onEditEntry],
  );

  const handleClone = useCallback(
    (id: string) => {
      const entry = findEntry(id);
      if (!entry) return;

      const cloned: SchemaRegistryEntry = {
        ...entry,
        id: `reg-clone-${Date.now()}`,
        sourceName: `${entry.sourceName} (Copy)`,
        status: "draft",
        version: "v0.1",
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
      };
      setEntries((prev) => [cloned, ...prev]);
      toast({
        title: "Schema mapping cloned",
        description: `"${cloned.sourceName}" created as Draft`,
      });
    },
    [findEntry, toast],
  );

  const handleNewVersion = useCallback(
    (id: string) => {
      const entry = findEntry(id);
      if (!entry) return;

      const vNum = entry.version.replace(/^v/, "");
      const parts = vNum.split(".");
      const minor = parseInt(parts[1] ?? "0", 10) + 1;
      const newVersion = `v${parts[0]}.${minor}`;

      const versioned: SchemaRegistryEntry = {
        ...entry,
        id: `reg-ver-${Date.now()}`,
        version: newVersion,
        status: "draft",
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
      };
      setEntries((prev) => [versioned, ...prev]);
      toast({
        title: "New version created",
        description: `"${entry.sourceName}" ${newVersion} created as Draft`,
      });
    },
    [findEntry, toast],
  );

  const handleArchive = useCallback(
    (id: string) => {
      const entry = findEntry(id);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: "archived" as const, lastModifiedAt: new Date().toISOString() }
            : e,
        ),
      );
      toast({
        title: "Schema mapping archived",
        description: entry ? `"${entry.sourceName}" has been archived` : "Entry archived",
      });
    },
    [findEntry, toast],
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">Schema Mapper Agent</h1>
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
        onView={handleView}
        onEdit={handleEdit}
        onClone={handleClone}
        onNewVersion={handleNewVersion}
        onArchive={handleArchive}
        onAuditHistory={(id) => onViewAudit(id)}
      />

      {/* Detail dialog */}
      <SchemaDetailDialog
        entry={detailEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
