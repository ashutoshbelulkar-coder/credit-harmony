import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { CanonicalAttribute, DomainCode, DomainEntry } from "./types";
import { useSaveDomainCodes } from "./useMasterDictionary";

interface DomainsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: DomainEntry[];
  attributes: CanonicalAttribute[];
  initialDomain?: string | null;
  canMutate: boolean;
  onOpenAttribute?: (attributeId: string) => void;
}

export function DomainsDrawer({
  open,
  onOpenChange,
  domains,
  attributes,
  initialDomain,
  canMutate,
  onOpenAttribute,
}: DomainsDrawerProps) {
  const [selected, setSelected] = useState<string>(initialDomain ?? domains[0]?.domainName ?? "");
  const [codes, setCodes] = useState<DomainCode[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const save = useSaveDomainCodes();

  useEffect(() => {
    if (open) setSelected(initialDomain ?? domains[0]?.domainName ?? "");
  }, [open, initialDomain, domains]);

  const domain = useMemo(() => domains.find((d) => d.domainName === selected), [domains, selected]);

  useEffect(() => {
    setCodes(domain ? domain.codes.map((c) => ({ ...c })) : []);
  }, [domain]);

  const using = useMemo(() => {
    if (!domain) return [];
    return attributes.filter(
      (a) =>
        (a.allowedValues?.kind === "domain" && a.allowedValues.domain === domain.domainName) ||
        domain.usedBy.includes(a.canonicalQualifier) ||
        domain.usedBy.includes(a.attributeId),
    );
  }, [attributes, domain]);

  function importCsv(text: string) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const next: DomainCode[] = [...codes];
    for (const line of lines) {
      if (/^code\s*,/i.test(line)) continue;
      const [code, label, description] = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (!code) continue;
      if (next.some((c) => c.code === code)) continue;
      next.push({ code, label: label ?? "", description: description ?? "" });
    }
    setCodes(next);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{domain?.domainName ?? "Domains"}</SheetTitle>
          <SheetDescription>
            {codes.length} codes
            {domains.length > 1 && (
              <select
                className="ml-2 h-8 rounded-md border border-input bg-background px-2 text-caption"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {domains.map((d) => (
                  <option key={d.domainName} value={d.domainName}>
                    {d.domainName}
                  </option>
                ))}
              </select>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-caption text-muted-foreground mb-1">Used by</p>
            <div className="flex flex-wrap gap-1">
              {using.length === 0 && (domain?.usedBy ?? []).map((u) => (
                <span key={u} className="font-mono text-[10px] text-muted-foreground">{u}</span>
              ))}
              {using.map((a) => (
                <button
                  key={a.attributeId}
                  type="button"
                  className="font-mono text-[10px] text-primary underline-offset-2 hover:underline"
                  onClick={() => onOpenAttribute?.(a.attributeId)}
                >
                  {a.attributeId}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={!canMutate}
              onClick={() => setCodes((c) => [...c, { code: "", label: "", description: "" }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add row
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!canMutate}
              onClick={() => fileRef.current?.click()}
            >
              Import CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void file.text().then(importCsv);
                e.target.value = "";
              }}
            />
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(tableHeaderClasses)}>Code</TableHead>
                  <TableHead className={cn(tableHeaderClasses)}>Label</TableHead>
                  <TableHead className={cn(tableHeaderClasses)}>Description</TableHead>
                  <TableHead className={cn(tableHeaderClasses, "w-10")} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-body text-muted-foreground h-20">
                      No codes loaded.
                    </TableCell>
                  </TableRow>
                ) : (
                  codes.map((row, idx) => (
                    <TableRow key={`${row.code}-${idx}`}>
                      <TableCell>
                        <Input
                          className="h-8 font-mono"
                          value={row.code}
                          disabled={!canMutate}
                          onChange={(e) =>
                            setCodes((c) => c.map((x, i) => (i === idx ? { ...x, code: e.target.value } : x)))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={row.label}
                          disabled={!canMutate}
                          onChange={(e) =>
                            setCodes((c) => c.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={row.description}
                          disabled={!canMutate}
                          onChange={(e) =>
                            setCodes((c) => c.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {canMutate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCodes((c) => c.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <SheetFooter className="mt-4">
          <Button
            type="button"
            disabled={!canMutate || !domain || save.isPending}
            onClick={() => {
              if (!domain) return;
              save.mutate({ name: domain.domainName, codes: codes.filter((c) => c.code.trim()) });
            }}
          >
            Save codes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
