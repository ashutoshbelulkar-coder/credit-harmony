import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Info,
  Lock,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AttributeSensitivityChip,
  AttributeTypeChip,
  DerivedGlyph,
  ScopeTag,
  SensitivityBadge,
  StatusReasonChip,
  SystemChip,
  AttributeModeBadge,
} from "@/components/data-products/AttributeBadges";
import {
  CROSS_ASSET_PACKET_ID,
  DICTIONARY_VERSION,
  SUBJECT_PACKET_ID,
  getDictionaryPacket,
  packetScopeTag,
  type DictionaryAttribute,
  type SubjectScope,
} from "@/data/attribute-dictionary";
import {
  applySubjectScopeChange,
  attributesDroppedByScopeChange,
  attributesVisibleForPacket,
  contractContinueBlockers,
  countSelectedOfTotal,
  evaluateReconciliationKey,
  includedAttributeIds,
  isOptInAttribute,
  isSelectableAttribute,
  packetsForScope,
  selectAllSelectable,
  summarizeContract,
  toggleAttribute,
  toggleEventStream,
  togglePacket,
  type ContractSelection,
} from "@/lib/product-contract";
import { cn } from "@/lib/utils";

const SCOPE_OPTIONS: { value: SubjectScope; label: string }[] = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "COMPANY", label: "Company" },
  { value: "BOTH", label: "Both" },
];

const GROUP_ORDER = [
  "Name",
  "Biographical",
  "Contact",
  "Address",
  "Identifiers",
  "Provider",
  "Account",
  "Amounts",
  "Counters",
  "Dates",
  "Derived",
  "Line",
  "Document",
  "Registration",
  "Features",
  "Repayment history",
  "Transactions",
  "Filings",
];

function groupAttributes(attrs: DictionaryAttribute[]) {
  const map = new Map<string, DictionaryAttribute[]>();
  for (const a of attrs) {
    const key = a.eventStreamId
      ? a.group
      : a.group;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return keys.map((k) => [k, map.get(k)!] as const);
}

function sectionTitle(group: string, attrs: DictionaryAttribute[]) {
  if (attrs.some((a) => a.eventStreamId === "repayment_history")) {
    return "Repayment history (event stream)";
  }
  if (attrs.some((a) => a.eventStreamId === "transactions")) {
    return "Transactions (event stream)";
  }
  if (attrs.some((a) => a.eventStreamId === "filings")) {
    return "Filings (event stream)";
  }
  return group;
}

interface ContractStepProps {
  selection: ContractSelection;
  onChange: (next: ContractSelection) => void;
}

export function ContractStep({ selection, onChange }: ContractStepProps) {
  const [packetQuery, setPacketQuery] = useState("");
  const [attrQuery, setAttrQuery] = useState("");
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [selectedPacketId, setSelectedPacketId] = useState<string>(SUBJECT_PACKET_ID);
  const [pendingScope, setPendingScope] = useState<SubjectScope | null>(null);
  const [optInOpen, setOptInOpen] = useState<string | null>(null);

  const summary = useMemo(() => summarizeContract(selection), [selection]);
  const packets = useMemo(() => {
    const q = packetQuery.trim().toLowerCase();
    return packetsForScope(selection.subjectScope).filter(
      (p) => !q || p.label.toLowerCase().includes(q)
    );
  }, [selection.subjectScope, packetQuery]);

  const selectedPacket = getDictionaryPacket(selectedPacketId);
  const visibleAttrs = useMemo(() => {
    if (!selectedPacket) return [];
    const q = attrQuery.trim().toLowerCase();
    return attributesVisibleForPacket(selectedPacketId, selection, showUnavailable).filter(
      (a) =>
        !q ||
        a.label.toLowerCase().includes(q) ||
        a.qualifier.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );
  }, [selectedPacket, selectedPacketId, selection, showUnavailable, attrQuery]);

  const included = useMemo(() => new Set(includedAttributeIds(selection)), [selection]);
  const recon = evaluateReconciliationKey(selection);
  const groups = groupAttributes(visibleAttrs);

  const requestScopeChange = (next: SubjectScope) => {
    if (next === selection.subjectScope) return;
    const dropped = attributesDroppedByScopeChange(selection, next);
    if (dropped > 0 && selection.packetIds.length > 1) {
      setPendingScope(next);
      return;
    }
    const applied = applySubjectScopeChange(selection, next);
    onChange(applied);
    if (!applied.packetIds.includes(selectedPacketId)) {
      setSelectedPacketId(SUBJECT_PACKET_ID);
    }
  };

  const confirmScopeChange = () => {
    if (!pendingScope) return;
    const applied = applySubjectScopeChange(selection, pendingScope);
    onChange(applied);
    if (!applied.packetIds.includes(selectedPacketId)) {
      setSelectedPacketId(SUBJECT_PACKET_ID);
    }
    setPendingScope(null);
  };

  const droppedCount = pendingScope
    ? attributesDroppedByScopeChange(selection, pendingScope)
    : 0;

  const lanes: { lane: "Subject" | "Assets" | "Analytics"; label: string }[] = [
    { lane: "Subject", label: "Subject" },
    { lane: "Assets", label: "Assets" },
    { lane: "Analytics", label: "Analytics" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
        <div className="space-y-1.5">
          <p className="text-caption font-medium text-foreground">Subject scope</p>
          <RadioGroup
            value={selection.subjectScope}
            onValueChange={(v) => requestScopeChange(v as SubjectScope)}
            className="flex flex-wrap gap-4"
          >
            {SCOPE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <RadioGroupItem value={opt.value} id={`scope-${opt.value}`} />
                <Label htmlFor={`scope-${opt.value}`} className="text-caption font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                <span className="text-caption text-muted-foreground">Sensitivity</span>
                <SensitivityBadge value={summary.sensitivity} />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-caption">
              Derived from the highest-sensitivity attribute in this contract.
            </TooltipContent>
          </Tooltip>
          <span className="text-caption text-muted-foreground">
            Dictionary {selection.dictionaryVersion || DICTIONARY_VERSION}
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] min-h-[420px]">
        <div className="rounded-lg border border-border/80 flex flex-col min-h-[320px]">
          <div className="p-2.5 border-b border-border/80">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Packets
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={packetQuery}
                onChange={(e) => setPacketQuery(e.target.value)}
                placeholder="Search packets"
                className="h-8 pl-7 text-caption"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3">
              {lanes.map(({ lane, label }) => {
                const lanePackets = packets.filter((p) => p.lane === lane);
                if (lanePackets.length === 0) return null;
                return (
                  <div key={lane}>
                    <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    <ul className="space-y-0.5">
                      {lanePackets.map((packet) => {
                        const checked = selection.packetIds.includes(packet.id);
                        const locked = packet.id === SUBJECT_PACKET_ID;
                        const counts = countSelectedOfTotal(packet.id, selection);
                        const active = selectedPacketId === packet.id;
                        const tag =
                          selection.subjectScope === "BOTH" ? packetScopeTag(packet) : null;
                        const streams = packet.eventStreams.filter(() => checked);
                        return (
                          <li key={packet.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                                    active
                                      ? "bg-primary/10 border border-primary/30"
                                      : "border border-transparent hover:bg-muted/40"
                                  )}
                                  onClick={() => setSelectedPacketId(packet.id)}
                                >
                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      checked={checked}
                                      disabled={locked}
                                      onCheckedChange={(v) => {
                                        setSelectedPacketId(packet.id);
                                        onChange(togglePacket(selection, packet.id, !!v));
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-0.5"
                                      aria-label={packet.label}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-caption font-medium text-foreground truncate">
                                          {packet.label}
                                        </span>
                                        {locked && (
                                          <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                                        )}
                                        {tag && <ScopeTag tag={tag} />}
                                        {locked && (
                                          <span
                                            className={cn(
                                              "ml-auto h-2 w-2 rounded-full shrink-0",
                                              recon.met ? "bg-success" : "bg-destructive"
                                            )}
                                            title={recon.met ? "Reconciliation key met" : "Reconciliation key not met"}
                                          />
                                        )}
                                      </div>
                                      {checked && (
                                        <p className="text-[10px] text-muted-foreground">
                                          {counts.selected} of {counts.total} attributes
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs text-caption">
                                <p>{packet.description}</p>
                                {locked && (
                                  <p className="mt-1">Always included — attributes configurable.</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                            {streams.length > 0 && (
                              <ul className="ml-8 mt-0.5 space-y-0.5">
                                {streams.map((stream) => {
                                  const on = (selection.eventStreamToggles[packet.id] ?? []).includes(
                                    stream.id
                                  );
                                  return (
                                    <li key={stream.id} className="flex items-center gap-2 py-0.5">
                                      <Checkbox
                                        checked={on}
                                        onCheckedChange={(v) =>
                                          onChange(
                                            toggleEventStream(selection, packet.id, stream.id, !!v)
                                          )
                                        }
                                        aria-label={stream.label}
                                      />
                                      <span className="text-caption text-muted-foreground">
                                        ↳ {stream.label}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-lg border border-border/80 flex flex-col min-h-[320px]">
          {!selectedPacket ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <p className="text-caption text-muted-foreground max-w-xs">
                Select a packet on the left to choose its attributes.
              </p>
            </div>
          ) : (
            <>
              <div className="p-2.5 border-b border-border/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Attributes — {selectedPacket.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-caption text-primary hover:underline"
                      onClick={() =>
                        onChange(selectAllSelectable(selection, selectedPacketId, true))
                      }
                    >
                      Select all
                    </button>
                    <span className="text-muted-foreground text-caption">/</span>
                    <button
                      type="button"
                      className="text-caption text-primary hover:underline"
                      onClick={() =>
                        onChange(selectAllSelectable(selection, selectedPacketId, false))
                      }
                    >
                      none
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[140px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={attrQuery}
                      onChange={(e) => setAttrQuery(e.target.value)}
                      placeholder="Search attributes"
                      className="h-8 pl-7 text-caption"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="show-unavailable"
                      checked={showUnavailable}
                      onCheckedChange={setShowUnavailable}
                    />
                    <Label htmlFor="show-unavailable" className="text-caption font-normal">
                      Show unavailable
                    </Label>
                  </div>
                </div>
              </div>

              {selectedPacketId === SUBJECT_PACKET_ID && (
                <div
                  className={cn(
                    "mx-2.5 mt-2.5 rounded-md border px-3 py-2 text-caption",
                    recon.met
                      ? "border-success/40 bg-success/10 text-foreground"
                      : "border-destructive/40 bg-destructive/10 text-foreground"
                  )}
                >
                  <p className="font-medium flex items-center gap-1.5">
                    {recon.met ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-destructive" />
                    )}
                    Reconciliation key
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {recon.met
                      ? recon.summary
                      : "Not met. Include at least one identifier (PAN, national ID, passport…) OR full name + date of birth. Identifiers are Sensitive-PII and must be opted in explicitly."}
                  </p>
                </div>
              )}

              <ScrollArea className="flex-1">
                <div className="p-2.5 space-y-2">
                  {groups.length === 0 && (
                    <p className="text-caption text-muted-foreground py-8 text-center">
                      No attributes match the current filters.
                    </p>
                  )}
                  {groups.map(([group, attrs]) => {
                    const selectable = attrs.filter((a) => isSelectableAttribute(a) && a.status === "active");
                    const selectedCount = selectable.filter((a) => included.has(a.id)).length;
                    return (
                      <details key={group} open className="rounded-md border border-border/70">
                        <summary className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 text-caption font-medium list-none">
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          {sectionTitle(group, attrs)}
                          <span className="text-muted-foreground font-normal">
                            ({selectedCount} of {selectable.length || attrs.length})
                          </span>
                        </summary>
                        <ul className="border-t border-border/60 divide-y divide-border/60">
                          {attrs.map((attr) => {
                            const unavailable = attr.status !== "active";
                            const checked = included.has(attr.id);
                            const optIn = isOptInAttribute(attr);
                            return (
                              <li
                                key={attr.id}
                                className={cn(
                                  "px-2.5 py-2",
                                  unavailable && "opacity-60 bg-muted/30"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  {attr.system || unavailable ? (
                                    <span className="w-4 shrink-0" />
                                  ) : (
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => {
                                        const next = toggleAttribute(selection, attr.id, !!v);
                                        onChange(next);
                                        if (v && optIn) setOptInOpen(attr.id);
                                        if (!v && optInOpen === attr.id) setOptInOpen(null);
                                      }}
                                      className="mt-0.5"
                                      aria-label={attr.label}
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {optIn && !unavailable && (
                                        <Lock className="w-3 h-3 text-warning shrink-0" />
                                      )}
                                      {attr.derived && <DerivedGlyph />}
                                      <span className="text-caption font-medium text-foreground">
                                        {attr.label}
                                      </span>
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        {attr.qualifier}
                                      </span>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            className="text-muted-foreground hover:text-foreground"
                                            aria-label={`Definition of ${attr.label}`}
                                          >
                                            <Info className="w-3 h-3" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="text-caption space-y-1">
                                          <p className="font-medium">{attr.label}</p>
                                          <p className="text-muted-foreground">{attr.definition}</p>
                                          <p className="font-mono text-[10px]">{attr.id}</p>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                      <AttributeTypeChip type={attr.dataType} />
                                      <AttributeSensitivityChip
                                        sensitivity={attr.sensitivity}
                                        specialCategory={attr.specialCategory}
                                        optIn={optIn && !checked}
                                      />
                                      <AttributeModeBadge mode={attr.mode} />
                                      {attr.system && <SystemChip />}
                                      {attr.derived && selectedPacketId !== CROSS_ASSET_PACKET_ID && (
                                        <span className="text-[10px] text-muted-foreground">
                                          computed from this packet
                                        </span>
                                      )}
                                      {attr.basedOn && attr.basedOn.length > 0 && (
                                        <span className="text-[10px] text-muted-foreground">
                                          Based on:{" "}
                                          {attr.basedOn
                                            .map((id) => getDictionaryPacket(id)?.label ?? id)
                                            .join(", ")}
                                        </span>
                                      )}
                                      {unavailable && (
                                        <span className="ml-auto">
                                          <StatusReasonChip
                                            status={attr.status === "pending" ? "pending" : "deprecated"}
                                            supersededBy={attr.supersededBy}
                                          />
                                        </span>
                                      )}
                                    </div>
                                    {checked && optIn && optInOpen === attr.id && (
                                      <p className="mt-1.5 text-caption text-muted-foreground rounded-md bg-destructive/5 border border-destructive/20 px-2 py-1.5">
                                        Sensitive-PII. Served tokenised. The consuming institution must hold
                                        a legal basis for this field. Product sensitivity will become High.
                                        {attr.specialCategory && (
                                          <>
                                            {" "}
                                            Special category — state the documented purpose in your business
                                            justification at submission.
                                          </>
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-caption">
        <p className="text-muted-foreground">
          Contract summary: {summary.packetCount} packets · {summary.attributeCount} attributes ·{" "}
          {summary.sensitivePiiCount} Sensitive-PII · Subject key {recon.met ? "✔" : "✖"}
        </p>
      </div>

      <Dialog open={pendingScope != null} onOpenChange={(v) => !v && setPendingScope(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-h4">Change subject scope?</DialogTitle>
          </DialogHeader>
          <p className="text-caption text-muted-foreground">
            Changing subject scope will remove {droppedCount} attribute
            {droppedCount === 1 ? "" : "s"} that don&apos;t apply to the new scope. Continue?
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingScope(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmScopeChange}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ContractContinueTooltip({ selection }: { selection: ContractSelection }) {
  const blockers = contractContinueBlockers(selection);
  if (blockers.length === 0) return null;
  return (
    <ul className="text-caption space-y-0.5">
      {blockers.map((b) => (
        <li key={b}>{b}</li>
      ))}
    </ul>
  );
}
