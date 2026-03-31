import { useState, useCallback } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import { similarSchemasForTelecom } from "@/data/schema-mapper-mock";
import type { SimilarSchemaEntry } from "@/types/schema-mapper";

interface MultiSchemaMatchingStepProps {
  similarSchemas: SimilarSchemaEntry[];
  selectedSchemaId: string | null;
  onComplete: (selectedSchemaId: string | null, createNewDerived: boolean) => void | Promise<void>;
}

export function MultiSchemaMatchingStep({
  similarSchemas,
  selectedSchemaId,
  onComplete,
}: MultiSchemaMatchingStepProps) {
  const [selected, setSelected] = useState<string | null>(selectedSchemaId ?? similarSchemas.find((s) => s.recommended)?.schemaId ?? null);
  const [createNewDerived, setCreateNewDerived] = useState(false);

  const handleProceed = useCallback(async () => {
    if (createNewDerived) {
      await Promise.resolve(onComplete(null, true));
    } else {
      await Promise.resolve(onComplete(selected, false));
    }
  }, [selected, createNewDerived, onComplete]);

  const canProceed = createNewDerived || selected !== null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h3 className="text-h4 font-semibold text-foreground mb-4">Global Schema Similarity Analysis</h3>
        <p className="text-caption text-muted-foreground mb-3">
          Incoming schema is ranked against registered Source Types in Schema Mapper (similarity to each type&apos;s reference mapping).
        </p>

        <div className="min-w-0 overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(tableHeaderClasses, "w-10")} />
                <TableHead className={cn(tableHeaderClasses, "sticky top-0 z-10 bg-card min-w-[160px]")}>
                  Source Type
                </TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[90px]")}>Data Category</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[100px]")}>Similarity %</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[100px]")}>Shared Fields</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[100px]")}>Recommended?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {similarSchemas.map((row) => (
                <TableRow
                  key={row.schemaId}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selected === row.schemaId && !createNewDerived && "bg-primary/10",
                  )}
                  onClick={() => { setSelected(row.schemaId); setCreateNewDerived(false); }}
                >
                  <TableCell className="w-10">
                    <input
                      type="radio"
                      name="schema"
                      checked={!createNewDerived && selected === row.schemaId}
                      onChange={() => { setSelected(row.schemaId); setCreateNewDerived(false); }}
                      className="h-3.5 w-3.5"
                    />
                  </TableCell>
                  <TableCell className="text-body font-medium">{row.label}</TableCell>
                  <TableCell className="text-caption capitalize">{row.category}</TableCell>
                  <TableCell className="tabular-nums">{row.similarityPercent}%</TableCell>
                  <TableCell className="tabular-nums">{row.sharedFieldsCount}</TableCell>
                  <TableCell>
                    {row.recommended ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow
                className={cn(
                  "cursor-pointer transition-colors",
                  createNewDerived && "bg-primary/10",
                )}
                onClick={() => { setCreateNewDerived(true); setSelected(null); }}
              >
                <TableCell className="w-10">
                  <input
                    type="radio"
                    name="schema"
                    checked={createNewDerived}
                    onChange={() => { setCreateNewDerived(true); setSelected(null); }}
                    className="h-3.5 w-3.5"
                  />
                </TableCell>
                <TableCell className="text-body font-medium text-primary">Create new derived schema</TableCell>
                <TableCell className="text-caption text-muted-foreground">—</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">—</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">—</TableCell>
                <TableCell>
                  <span className="text-muted-foreground">—</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleProceed()} disabled={!canProceed} className="gap-1.5">
          Proceed to Field Intelligence
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
