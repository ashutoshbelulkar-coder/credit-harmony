import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DSAPI_PATHWAYS,
  DSAPI_PROFILES,
  DSAPI_WINDOWS,
  searchCatalog,
  type DsapiPathway,
  type DsapiProfile,
  type DsapiSubmitter,
  type DsapiWindow,
} from "./dsapiScaleMock";

export interface DsapiChromeState {
  window: DsapiWindow;
  pathway: DsapiPathway;
  profile: DsapiProfile;
  submitterId: string;
}

export function DsapiChrome({ title }: { title: string }) {
  return <h1 className="text-h2 font-semibold text-foreground">{title}</h1>;
}

export function DsapiFilters({
  catalog,
  state,
  onChange,
}: {
  catalog: DsapiSubmitter[];
  state: DsapiChromeState;
  onChange: (partial: Partial<DsapiChromeState>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const hits = useMemo(() => searchCatalog(debounced, catalog, 40), [debounced, catalog]);
  const selected = catalog.find((s) => s.id === state.submitterId);

  return (
    <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-caption text-muted-foreground">Time window</Label>
          <div className="flex flex-wrap gap-1">
            {DSAPI_WINDOWS.map((w) => (
              <Button
                key={w.value}
                type="button"
                size="sm"
                variant={state.window === w.value ? "default" : "outline"}
                onClick={() => onChange({ window: w.value })}
              >
                {w.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-caption text-muted-foreground">Pathway</Label>
          <div className="flex flex-wrap gap-1">
            {DSAPI_PATHWAYS.map((p) => (
              <Button
                key={p.value}
                type="button"
                size="sm"
                variant={state.pathway === p.value ? "default" : "outline"}
                onClick={() => onChange({ pathway: p.value })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-caption text-muted-foreground">Profile</Label>
          <Select value={state.profile} onValueChange={(v) => onChange({ profile: v as DsapiProfile })}>
            <SelectTrigger className="h-8 w-[180px] text-caption">
              <SelectValue placeholder="Profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-caption">
                All profiles
              </SelectItem>
              {DSAPI_PROFILES.map((p) => (
                <SelectItem key={p} value={p} className="text-caption">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 min-w-[200px]">
          <Label className="text-caption text-muted-foreground">Submitter</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-[240px] max-w-full justify-between font-normal"
              >
                <span className="truncate">
                  {selected ? `${selected.name} · ${selected.code}` : "All submitters"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[280px] p-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or member code"
                className="h-8 text-caption"
              />
              <p className="mt-1.5 text-caption text-muted-foreground">
                Server-style search across {catalog.length} submitters · debounced 300 ms
              </p>
              <div className="mt-2 max-h-56 overflow-y-auto">
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-caption hover:bg-muted",
                    state.submitterId === "all" && "bg-primary/5"
                  )}
                  onClick={() => {
                    onChange({ submitterId: "all" });
                    setOpen(false);
                    setQ("");
                  }}
                >
                  All submitters
                </button>
                {hits.length === 0 ? (
                  <p className="px-2 py-3 text-caption text-muted-foreground">
                    No submitters match — search runs on name and member code
                  </p>
                ) : (
                  hits.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted",
                        state.submitterId === s.id && "bg-primary/5"
                      )}
                      onClick={() => {
                        onChange({ submitterId: s.id });
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <span className="truncate text-caption text-foreground">{s.name}</span>
                      <span className="shrink-0 text-caption text-muted-foreground">{s.code}</span>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
    </div>
  );
}
