import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type {
  AllowedValues,
  AttributeGroup,
  BusinessValidationName,
  CanonicalAttribute,
  ClassName,
  CrossFieldRuleRow,
  DataType,
  DictionaryEnums,
  DomainEntry,
  EntityType,
  RetentionClass,
  RetentionPolicyRow,
  TargetTable,
  ValidationIssue,
  ValidationRuleRow,
} from "./types";
import {
  composeAttributeId,
  deriveAttributePrefix,
  formatDateEnIn,
  isLockedStatus,
  isSeedLevelDefinition,
  qualifierRegex,
  STATUS_STYLES,
  suggestNormalization,
  appliesToVocabulary,
} from "./msm-helpers";
import { findNearDuplicates, validateDictionary } from "./validate-dictionary";
import { AttributePickerDialog } from "./AttributePickerDialog";
import { isSeedSynonym } from "./dictionary-store";

type AllowedMode = "none" | "enum" | "format" | "domain";

function allowedMode(av: AllowedValues | null): AllowedMode {
  if (!av) return "none";
  return av.kind === "enum" ? "enum" : av.kind === "format" ? "format" : "domain";
}

interface ChipListProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  lockedValues?: string[];
}

function ChipList({ values, onChange, placeholder, disabled, lockedValues = [] }: ChipListProps) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v) || disabled) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className="h-9"
          />
          <Button type="button" variant="outline" className="h-9 gap-1.5 shrink-0 px-3 text-caption" onClick={add}>
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => {
            const locked = lockedValues.includes(v);
            return (
              <Badge
                key={v}
                variant="secondary"
                className={cn("text-[10px] gap-1 pr-1", locked && "opacity-70")}
              >
                {v}
                {!disabled && !locked && (
                  <button type="button" aria-label={`Remove ${v}`} className="rounded hover:bg-muted" onClick={() => onChange(values.filter((x) => x !== v))}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface EnumMultiSelectProps<T extends string> {
  values: T[];
  options: readonly T[];
  onChange: (next: T[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

function EnumMultiSelect<T extends string>({ values, options, onChange, placeholder, disabled }: EnumMultiSelectProps<T>) {
  const remaining = options.filter((o) => !values.includes(o));
  return (
    <div className="space-y-1.5">
      {!disabled && (
        <Select
          value=""
          onValueChange={(v) => {
            if (!v) return;
            onChange([...values, v as T]);
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={placeholder ?? "Select…"} />
          </SelectTrigger>
          <SelectContent>
            {remaining.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="text-[10px] gap-1 pr-1">
              {v}
              {!disabled && (
                <button type="button" aria-label={`Remove ${v}`} className="rounded hover:bg-muted" onClick={() => onChange(values.filter((x) => x !== v))}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export interface AttributeProfileEditorProps {
  attribute: CanonicalAttribute;
  isNew?: boolean;
  allAttributes: CanonicalAttribute[];
  entityTypes: EntityType[];
  groups: AttributeGroup[];
  domains: DomainEntry[];
  enums: DictionaryEnums;
  retentionPolicy: RetentionPolicyRow[];
  entityType?: string;
  readOnly: boolean;
  canMutate: boolean;
  isSuperAdmin: boolean;
  snapshotAttributes: CanonicalAttribute[];
  onSaveProfile: (attr: CanonicalAttribute) => void;
  onRequestRevision: () => void;
  onRequestDeprecate: () => void;
  onOpenDomain: (domainName: string) => void;
  onOpenAttribute?: (attributeId: string) => void;
}

export function AttributeProfileEditor({
  attribute,
  isNew,
  allAttributes,
  entityTypes,
  groups,
  domains,
  enums,
  retentionPolicy,
  entityType,
  readOnly,
  canMutate,
  isSuperAdmin,
  snapshotAttributes,
  onSaveProfile,
  onRequestRevision,
  onRequestDeprecate,
  onOpenDomain,
  onOpenAttribute,
}: AttributeProfileEditorProps) {
  const [draft, setDraft] = useState<CanonicalAttribute>(attribute);
  const [classConfirm, setClassConfirm] = useState<ClassName | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [dups, setDups] = useState<CanonicalAttribute[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [addGroup, setAddGroup] = useState("");

  useEffect(() => {
    setDraft(attribute);
    setIssues([]);
  }, [attribute.attributeId, attribute.updatedAt, isNew]);

  const reservedLocked = draft.class === "Reserved" && !isSuperAdmin;
  const disabled = readOnly || !canMutate || reservedLocked || draft.status === "rejected";
  const locked = isLockedStatus(draft.status);
  const definitionOnly = draft.status === "deprecated";
  const fieldDisabled = (kind: "L" | "A") => {
    if (disabled) return true;
    if (draft.status === "proposed" || draft.status === "pending") return false;
    if (definitionOnly && kind !== "A") return true;
    if (kind === "L") return locked;
    return draft.status === "deprecated";
  };

  const prefix = deriveAttributePrefix(draft.targetTable, draft.class, attribute.attributeId);
  const QUAL_RE = qualifierRegex();
  const qualifierOk = !draft.canonicalQualifier || QUAL_RE.test(draft.canonicalQualifier);
  const otherQual = allAttributes.filter(
    (a) => a.attributeId !== draft.attributeId && a.canonicalQualifier === draft.canonicalQualifier && a.targetTable !== draft.targetTable,
  );

  const appliesVocab = appliesToVocabulary(draft.targetTable, entityTypes);
  const retention = retentionPolicy.find((r) => r.retentionClass === draft.retentionClass);
  const activeDomain =
    draft.allowedValues?.kind === "domain"
      ? domains.find((d) => d.domainName === draft.allowedValues.domain)
      : undefined;

  const seedChips = isNew ? [] : (draft.synonyms.filter((s) => isSeedSynonym(attribute.attributeId, s)));

  function patch(p: Partial<CanonicalAttribute> | ((d: CanonicalAttribute) => CanonicalAttribute)) {
    setDraft((d) => (typeof p === "function" ? p(d) : { ...d, ...p }));
  }

  function applyClass(nextClass: ClassName) {
    patch((d) => {
      let n: CanonicalAttribute = { ...d, class: nextClass };
      if (nextClass === "Edge") n = { ...n, dataType: "edge" };
      if (nextClass === "Feature") n = { ...n, targetTable: "feature_store", retentionClass: "feature_score" };
      if (nextClass === "Observation") n = { ...n, targetTable: "entity_events", appliesTo: ["observation"] };
      if (nextClass === "Reserved") {
        const q = n.canonicalQualifier.startsWith("_") ? n.canonicalQualifier : `_${n.canonicalQualifier || "sys"}`;
        n = { ...n, targetTable: "all", retentionClass: "system", canonicalQualifier: q, appliesTo: ["all rows"] };
      }
      if (nextClass === "Identifier" && n.sensitivity === "Sensitive-PII") {
        n = { ...n, governance: { ...n.governance, tokenize: true } };
      }
      if (d.status === "proposed" || d.status === "pending") {
        const pfx = deriveAttributePrefix(n.targetTable, n.class, attribute.attributeId);
        n = { ...n, attributeId: composeAttributeId(pfx, n.canonicalQualifier) };
      }
      return n;
    });
  }

  function applySensitivity(s: CanonicalAttribute["sensitivity"]) {
    patch((d) => {
      const g = { ...d.governance };
      if (s === "Sensitive-PII") g.legalBasisRequired = true;
      if (d.class === "Identifier" && s === "Sensitive-PII") g.tokenize = true;
      return { ...d, sensitivity: s, governance: g };
    });
  }

  function setAllowed(mode: AllowedMode) {
    patch((d) => {
      let allowedValues: AllowedValues | null = null;
      const bv = new Set(d.rules.businessValidations);
      bv.delete("FORMAT_CHECK");
      bv.delete("DOMAIN_CHECK");
      if (mode === "enum") allowedValues = { kind: "enum", values: [] };
      if (mode === "format") {
        allowedValues = { kind: "format", pattern: "" };
        bv.add("FORMAT_CHECK");
      }
      if (mode === "domain") {
        allowedValues = { kind: "domain", domain: domains[0]?.domainName ?? "" };
        bv.add("DOMAIN_CHECK");
      }
      return { ...d, allowedValues, rules: { ...d.rules, businessValidations: [...bv] as BusinessValidationName[] } };
    });
  }

  function handleSave() {
    const next = { ...draft };
    if ((next.status === "proposed" || next.status === "pending") && next.canonicalQualifier) {
      next.attributeId = composeAttributeId(
        deriveAttributePrefix(next.targetTable, next.class, attribute.attributeId),
        next.canonicalQualifier,
      );
    }
    const scopedIssues = validateDictionary({
      snapshot: { attributes: snapshotAttributes.map((a) => (a.attributeId === next.attributeId ? next : a)).concat(
        snapshotAttributes.some((a) => a.attributeId === next.attributeId) ? [] : [next],
      ), entityTypes, domains },
      scoped: [next],
      includeGates: true,
    });
    const errors = scopedIssues.filter((i) => i.severity === "Error");
    setIssues(scopedIssues);
    if (errors.length) return;
    if (isNew) {
      const near = findNearDuplicates(next, snapshotAttributes);
      if (near.length) {
        setDups(near);
        setDupOpen(true);
        return;
      }
    }
    onSaveProfile(next);
  }

  const lockNote = locked && !disabled && (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-caption text-muted-foreground">
      This field is locked on an {draft.status} attribute.
      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7" onClick={onRequestRevision}>
          Send for revision
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7" onClick={onRequestDeprecate}>
          Deprecate & replace
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <Input
              value={draft.displayName}
              disabled={fieldDisabled("A")}
              onChange={(e) => patch({ displayName: e.target.value })}
              className="h-9 text-h4 font-semibold"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="font-mono text-[10px]">{draft.attributeId || "—"}</Badge>
              <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", STATUS_STYLES[draft.status])}>
                {draft.status}
              </Badge>
              <span className="text-caption text-muted-foreground tabular-nums">v{draft.version}</span>
              {draft.status === "proposed" && (
                <Badge className="bg-info/15 text-info text-[9px] leading-[12px] font-medium border-0">Auto-mapper</Badge>
              )}
            </div>
          </div>
        </div>

        {issues.filter((i) => i.severity !== "Error").length > 0 && (
          <ul className="text-caption text-muted-foreground list-disc pl-4">
            {issues.filter((i) => i.severity !== "Error").slice(0, 6).map((i, idx) => (
              <li key={idx}>{i.attributeId} — {i.message}</li>
            ))}
          </ul>
        )}
        {issues.some((i) => i.severity === "Error") && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc pl-4 text-caption">
                {issues.filter((i) => i.severity === "Error").map((i, idx) => (
                  <li key={idx}>{i.attributeId} — {i.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <section className="space-y-3">
          <h3 className="text-h4 font-semibold text-foreground">Identity</h3>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Display name</Label>
            <Input className="h-9" value={draft.displayName} disabled={fieldDisabled("A")} onChange={(e) => patch({ displayName: e.target.value })} />
            <p className="text-[10px] text-muted-foreground">UI-only; not exported</p>
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Canonical qualifier</Label>
            <Input
              className="h-9 font-mono"
              value={draft.canonicalQualifier}
              disabled={fieldDisabled("L")}
              onChange={(e) => {
                const q = e.target.value;
                patch((d) => {
                  const id =
                    d.status === "proposed" || d.status === "pending"
                      ? composeAttributeId(deriveAttributePrefix(d.targetTable, d.class, attribute.attributeId), q)
                      : d.attributeId;
                  return { ...d, canonicalQualifier: q, attributeId: id };
                });
              }}
            />
            {!qualifierOk && <p className="text-caption text-destructive">Must match ^_?[a-z][a-z0-9_]*$</p>}
            {otherQual.length > 0 && (
              <p className="text-caption text-warning">
                Also used by {otherQual[0].attributeId}
              </p>
            )}
            {locked && lockNote}
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Attribute id</Label>
            <Input
              className="h-9 font-mono"
              value={draft.attributeId}
              disabled={fieldDisabled("L") || locked}
              onChange={(e) => patch({ attributeId: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">Derived as {prefix}.qualifier while pending</p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-h4 font-semibold text-foreground">Placement</h3>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Class</Label>
            <Select
              value={draft.class}
              disabled={fieldDisabled("L")}
              onValueChange={(v) => {
                const next = v as ClassName;
                if (draft.canonicalQualifier || draft.definition) setClassConfirm(next);
                else applyClass(next);
              }}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {enums.class.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {draft.class === "Identifier" && (
              <p className="text-caption text-muted-foreground">Also indexed in identifier_index</p>
            )}
            {draft.class === "Payload" && (
              <p className="text-caption text-muted-foreground">Stored in _payload, unpromoted</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Target table</Label>
            <Select
              value={draft.targetTable}
              disabled={fieldDisabled("L") || (!!entityType && draft.class !== "Feature" && draft.class !== "Reserved")}
              onValueChange={(v) => patch({ targetTable: v as TargetTable })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {enums.targetTable.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {draft.class === "Edge" && (
              <p className="text-caption text-muted-foreground">Lands in entity_relationships (edge)</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Applies to</Label>
            <EnumMultiSelect
              values={draft.appliesTo}
              options={appliesVocab}
              disabled={fieldDisabled("L") && !(locked && !fieldDisabled("A"))}
              onChange={(next) => {
                if (locked) {
                  const prev = draft.appliesTo;
                  const removed = prev.some((x) => !next.includes(x));
                  if (removed) return;
                }
                patch({ appliesTo: next });
              }}
              placeholder="Add entity type"
            />
            {draft.appliesTo.length > 1 && (
              <p className="text-caption text-muted-foreground">
                Shared with: {draft.appliesTo.filter((t) => t !== entityType).join(", ")}
              </p>
            )}
            {entityType && draft.appliesTo.length > 1 && (
              <p className="text-caption text-muted-foreground">This attribute is shared — changes apply to every listed type.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Attribute group</Label>
            <Select
              value={draft.attributeGroup ?? "__ungrouped"}
              disabled={fieldDisabled("A")}
              onValueChange={(v) => {
                if (v === "__add") return;
                patch({ attributeGroup: v === "__ungrouped" ? null : v });
              }}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ungrouped">Ungrouped</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.group} value={g.group}>{g.group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!fieldDisabled("A") && (
              <div className="flex gap-2">
                <Input className="h-9" placeholder="Add group…" value={addGroup} onChange={(e) => setAddGroup(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={() => {
                    const name = addGroup.trim();
                    if (!name) return;
                    patch({ attributeGroup: name });
                    setAddGroup("");
                  }}
                >
                  Add group
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-h4 font-semibold text-foreground">Type & format</h3>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Data type</Label>
            <Select
              value={draft.dataType}
              disabled={fieldDisabled("L") || draft.class === "Edge"}
              onValueChange={(v) => {
                const dt = v as DataType;
                patch({ dataType: dt, normalizationRule: draft.normalizationRule || suggestNormalization(dt) });
              }}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {enums.dataType.filter((t) => (draft.class === "Edge" ? t === "edge" : t !== "edge")).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {draft.dataType === "json" && (
              <p className="text-caption text-muted-foreground">
                Use json for multi-valued scalars (aliases, former names). Repeating records are rows, not arrays.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Normalization rule</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="h-9 w-full justify-start font-normal" disabled={fieldDisabled("A")}>
                  {draft.normalizationRule || "Select or type…"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search or type a rule…"
                    value={draft.normalizationRule ?? ""}
                    onValueChange={(v) => patch({ normalizationRule: v })}
                  />
                  <CommandList>
                    <CommandEmpty>Use the typed rule.</CommandEmpty>
                    <CommandGroup>
                      {enums.normalizationRules.map((r) => (
                        <CommandItem key={r} value={r} onSelect={() => patch({ normalizationRule: r })}>
                          {r}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2" data-placeholder="R-2">
            <Label className="text-caption text-muted-foreground">Allowed values</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="justify-start flex-wrap"
              value={allowedMode(draft.allowedValues)}
              onValueChange={(v) => v && setAllowed(v as AllowedMode)}
              disabled={fieldDisabled("A")}
            >
              <ToggleGroupItem value="none">Unconstrained</ToggleGroupItem>
              <ToggleGroupItem value="enum">Enum list</ToggleGroupItem>
              <ToggleGroupItem value="format">Format (regex)</ToggleGroupItem>
              <ToggleGroupItem value="domain">Domain reference</ToggleGroupItem>
            </ToggleGroup>
            {draft.allowedValues?.kind === "enum" && (
              <ChipList
                values={draft.allowedValues.values}
                disabled={fieldDisabled("A")}
                onChange={(values) => patch({ allowedValues: { kind: "enum", values } })}
                placeholder="Add enum value"
              />
            )}
            {draft.allowedValues?.kind === "format" && (
              <Input
                className="h-9 font-mono"
                disabled={fieldDisabled("A")}
                value={draft.allowedValues.pattern}
                onChange={(e) => patch({ allowedValues: { kind: "format", pattern: e.target.value } })}
                placeholder="Regex pattern"
              />
            )}
            {draft.allowedValues?.kind === "domain" && (
              <div className="space-y-1">
                <Select
                  value={draft.allowedValues.domain}
                  disabled={fieldDisabled("A")}
                  onValueChange={(v) => patch({ allowedValues: { kind: "domain", domain: v } })}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => (
                      <SelectItem key={d.domainName} value={d.domainName}>{d.domainName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p
                  className={cn(
                    "text-caption",
                    (activeDomain?.codes.length ?? 0) === 0 ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  {draft.allowedValues.domain}
                  {" · "}
                  {(activeDomain?.codes.length ?? 0) > 0
                    ? `${activeDomain?.codes.length} codes loaded`
                    : "Codes not loaded"}{" "}
                  {draft.allowedValues.domain && (
                    <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => onOpenDomain(draft.allowedValues!.kind === "domain" ? draft.allowedValues.domain : "")}>
                      Open domain
                    </button>
                  )}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-h4 font-semibold text-foreground">Semantics</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-caption text-muted-foreground">Definition</Label>
              <span className="text-[10px] text-muted-foreground tabular-nums">{draft.definition.length} chars</span>
            </div>
            <Textarea
              rows={4}
              disabled={fieldDisabled("A") && draft.status !== "deprecated"}
              value={draft.definition}
              onChange={(e) => patch({ definition: e.target.value })}
            />
            <p className="text-caption text-muted-foreground">Required before activation. The mapper embeds this text for semantic matching.</p>
            {isSeedLevelDefinition(draft.definition) && (
              <Badge variant="secondary" className="text-[10px]">Seed-level</Badge>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Synonyms</Label>
            <ChipList
              values={draft.synonyms}
              lockedValues={seedChips}
              disabled={fieldDisabled("A")}
              onChange={(synonyms) => patch({ synonyms })}
              placeholder="Add synonym"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-h4 font-semibold text-foreground">Sensitivity & governance</h3>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            className="justify-start"
            value={draft.sensitivity}
            onValueChange={(v) => {
              if (!v) return;
              const next = v as CanonicalAttribute["sensitivity"];
              if (locked) {
                const order = ["Standard", "PII", "Sensitive-PII"];
                if (order.indexOf(next) < order.indexOf(draft.sensitivity)) return;
              }
              applySensitivity(next);
            }}
            disabled={fieldDisabled("L") && !(locked && !fieldDisabled("A"))}
          >
            <ToggleGroupItem value="Standard">Standard</ToggleGroupItem>
            <ToggleGroupItem value="PII">PII</ToggleGroupItem>
            <ToggleGroupItem value="Sensitive-PII">Sensitive-PII</ToggleGroupItem>
          </ToggleGroup>
          {locked && lockNote}
          <label className="flex items-center gap-2 text-body">
            <Checkbox
              checked={draft.governance.legalBasisRequired}
              disabled={
                fieldDisabled("A") ||
                draft.sensitivity === "Sensitive-PII" ||
                draft.governance.specialCategory
              }
              onCheckedChange={(c) => patch({ governance: { ...draft.governance, legalBasisRequired: !!c } })}
            />
            Legal basis required
          </label>
          <label className="flex items-center gap-2 text-body">
            <Checkbox
              checked={draft.governance.specialCategory}
              disabled={fieldDisabled("A")}
              onCheckedChange={(c) => {
                const on = !!c;
                patch((d) => ({
                  ...d,
                  governance: { ...d.governance, specialCategory: on, legalBasisRequired: on ? true : d.governance.legalBasisRequired },
                  retentionClass: on ? "special_category" : d.retentionClass,
                }));
              }}
            />
            Special category
          </label>
          <label className="flex items-center gap-2 text-body">
            <Checkbox
              checked={draft.governance.tokenize}
              disabled={fieldDisabled("A")}
              onCheckedChange={(c) => patch({ governance: { ...draft.governance, tokenize: !!c } })}
            />
            Tokenize
          </label>
          <div className="space-y-1">
            <Label className="text-caption text-muted-foreground">Retention class</Label>
            <Select
              value={draft.retentionClass}
              disabled={fieldDisabled("L")}
              onValueChange={(v) => patch({ retentionClass: v as RetentionClass })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {enums.retentionClass.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {retention && (
              <p className="text-caption text-muted-foreground">
                Hot window: {String(retention.hotWindow ?? "—")} · Expiry: {String(retention.expiryAction ?? "—")} · Legal-hold: {String(retention.legalHoldSensitive ?? "—")}
              </p>
            )}
            {draft.governance.specialCategory && draft.retentionClass !== "special_category" && (
              <p className="text-caption text-warning">Special category usually uses retention class special_category.</p>
            )}
          </div>
        </section>

        <section className="space-y-4" data-placeholder="R-2">
          <h3 className="text-h4 font-semibold text-foreground">Rules</h3>
          <div className="rounded-lg border border-border p-3 space-y-2" data-placeholder="R-2">
            <div className="flex items-center justify-between">
              <p className="text-caption font-medium">Validation rules</p>
              {!fieldDisabled("A") && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 text-caption"
                  onClick={() =>
                    patch({
                      rules: {
                        ...draft.rules,
                        validation: [...draft.rules.validation, { rule: "NOT_EMPTY", severity: "Error", message: "" }],
                      },
                    })
                  }
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={tableHeaderClasses}>Rule</TableHead>
                  <TableHead className={tableHeaderClasses}>Severity</TableHead>
                  <TableHead className={tableHeaderClasses}>Value</TableHead>
                  <TableHead className={tableHeaderClasses}>Pattern</TableHead>
                  <TableHead className={tableHeaderClasses}>Message</TableHead>
                  <TableHead className={tableHeaderClasses} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.rules.validation.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select
                        value={row.rule}
                        disabled={fieldDisabled("A")}
                        onValueChange={(v) => {
                          const validation = draft.rules.validation.map((r, i) => (i === idx ? { ...r, rule: v as ValidationRuleRow["rule"] } : r));
                          patch({ rules: { ...draft.rules, validation } });
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {enums.placeholderValidationRules.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.severity}
                        disabled={fieldDisabled("A")}
                        onValueChange={(v) => {
                          const validation = draft.rules.validation.map((r, i) => (i === idx ? { ...r, severity: v as ValidationRuleRow["severity"] } : r));
                          patch({ rules: { ...draft.rules, validation } });
                        }}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {enums.severity.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-9"
                        disabled={fieldDisabled("A") || (row.rule !== "MAX_LENGTH" && row.rule !== "MIN_LENGTH")}
                        value={row.value ?? ""}
                        onChange={(e) => {
                          const validation = draft.rules.validation.map((r, i) => (i === idx ? { ...r, value: e.target.value ? Number(e.target.value) : undefined } : r));
                          patch({ rules: { ...draft.rules, validation } });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-9 font-mono"
                        disabled={fieldDisabled("A") || row.rule !== "REGEX"}
                        value={row.pattern ?? ""}
                        onChange={(e) => {
                          const validation = draft.rules.validation.map((r, i) => (i === idx ? { ...r, pattern: e.target.value } : r));
                          patch({ rules: { ...draft.rules, validation } });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-9"
                        disabled={fieldDisabled("A")}
                        value={row.message}
                        onChange={(e) => {
                          const validation = draft.rules.validation.map((r, i) => (i === idx ? { ...r, message: e.target.value } : r));
                          patch({ rules: { ...draft.rules, validation } });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {!fieldDisabled("A") && (
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => patch({ rules: { ...draft.rules, validation: draft.rules.validation.filter((_, i) => i !== idx) } })}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div data-placeholder="R-2">
            <p className="text-caption font-medium mb-1.5">Business validations</p>
            <EnumMultiSelect
              values={draft.rules.businessValidations}
              options={enums.placeholderBusinessValidations}
              disabled={fieldDisabled("A")}
              onChange={(businessValidations) => patch({ rules: { ...draft.rules, businessValidations } })}
            />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2" data-placeholder="R-2">
            <div className="flex items-center justify-between">
              <p className="text-caption font-medium">Cross-field validations</p>
              {!fieldDisabled("A") && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 text-caption"
                  onClick={() =>
                    patch({
                      rules: {
                        ...draft.rules,
                        crossField: [...draft.rules.crossField, { attributeId: "", rule: "EQUALS", severity: "Error" }],
                      },
                    })
                  }
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            {draft.rules.crossField.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 font-mono text-caption justify-start"
                  disabled={fieldDisabled("A")}
                  onClick={() => {
                    setPickerIdx(idx);
                    setPickerOpen(true);
                  }}
                >
                  {row.attributeId || "Pick attribute"}
                </Button>
                <Select
                  value={row.rule}
                  disabled={fieldDisabled("A")}
                  onValueChange={(v) => {
                    const crossField = draft.rules.crossField.map((r, i) => (i === idx ? { ...r, rule: v as CrossFieldRuleRow["rule"] } : r));
                    patch({ rules: { ...draft.rules, crossField } });
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {enums.crossFieldRules.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Select
                    value={row.severity}
                    disabled={fieldDisabled("A")}
                    onValueChange={(v) => {
                      const crossField = draft.rules.crossField.map((r, i) => (i === idx ? { ...r, severity: v as CrossFieldRuleRow["severity"] } : r));
                      patch({ rules: { ...draft.rules, crossField } });
                    }}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {enums.severity.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!fieldDisabled("A") && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => patch({ rules: { ...draft.rules, crossField: draft.rules.crossField.filter((_, i) => i !== idx) } })}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div data-placeholder="R-2">
            <p className="text-caption font-medium mb-1.5">Transformation rules</p>
            <EnumMultiSelect
              values={draft.rules.transformations}
              options={enums.placeholderTransformations}
              disabled={fieldDisabled("A")}
              onChange={(transformations) => patch({ rules: { ...draft.rules, transformations } })}
            />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2" data-placeholder="R-2">
            <div className="flex items-center justify-between">
              <p className="text-caption font-medium">Enrichment rules</p>
              {!fieldDisabled("A") && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 gap-1.5 text-caption"
                  onClick={() =>
                    patch({
                      rules: { ...draft.rules, enrichment: [...draft.rules.enrichment, { function: "", message: "" }] },
                    })
                  }
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            {enums.placeholderEnrichment.length === 0 && (
              <p className="text-caption text-muted-foreground">Standard enrichment functions to be defined (R-2).</p>
            )}
            {draft.rules.enrichment.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select
                  value={row.function}
                  disabled={fieldDisabled("A") || enums.placeholderEnrichment.length === 0}
                  onValueChange={(v) => {
                    const enrichment = draft.rules.enrichment.map((r, i) => (i === idx ? { ...r, function: v } : r));
                    patch({ rules: { ...draft.rules, enrichment } });
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Function" /></SelectTrigger>
                  <SelectContent>
                    {enums.placeholderEnrichment.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-9"
                  placeholder="Parameters"
                  disabled={fieldDisabled("A")}
                  value={row.params ? JSON.stringify(row.params) : ""}
                  onChange={(e) => {
                    let params: Record<string, string> | undefined;
                    try {
                      params = e.target.value ? (JSON.parse(e.target.value) as Record<string, string>) : undefined;
                    } catch {
                      params = { raw: e.target.value };
                    }
                    const enrichment = draft.rules.enrichment.map((r, i) => (i === idx ? { ...r, params } : r));
                    patch({ rules: { ...draft.rules, enrichment } });
                  }}
                />
                <div className="flex gap-1">
                  <Input
                    className="h-9"
                    placeholder="Message"
                    disabled={fieldDisabled("A")}
                    value={row.message ?? ""}
                    onChange={(e) => {
                      const enrichment = draft.rules.enrichment.map((r, i) => (i === idx ? { ...r, message: e.target.value } : r));
                      patch({ rules: { ...draft.rules, enrichment } });
                    }}
                  />
                  {!fieldDisabled("A") && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => patch({ rules: { ...draft.rules, enrichment: draft.rules.enrichment.filter((_, i) => i !== idx) } })}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div data-placeholder="R-2">
            <Label className="text-caption text-muted-foreground">Default value</Label>
            <Input
              className="h-9 mt-1"
              disabled={fieldDisabled("A")}
              value={draft.rules.defaultValue ?? ""}
              onChange={(e) => patch({ rules: { ...draft.rules, defaultValue: e.target.value || null } })}
            />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-h4 font-semibold text-foreground">Lifecycle</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-caption text-muted-foreground">
            <p>Status: {draft.status}</p>
            <p>Version: v{draft.version}</p>
            <p>Created: {formatDateEnIn(draft.createdAt)}</p>
            <p>Updated: {formatDateEnIn(draft.updatedAt)}</p>
            <p>Approved by: {draft.approvedBy ?? "—"}</p>
            <p>
              Superseded by:{" "}
              {draft.supersededBy ? (
                onOpenAttribute ? (
                  <button
                    type="button"
                    className="font-mono text-primary hover:underline"
                    onClick={() => onOpenAttribute(draft.supersededBy!)}
                  >
                    {draft.supersededBy}
                  </button>
                ) : (
                  <span className="font-mono text-foreground">{draft.supersededBy}</span>
                )
              ) : (
                "—"
              )}
            </p>
            {allAttributes.filter((a) => a.supersededBy === draft.attributeId).length > 0 && (
              <p className="sm:col-span-2">
                Supersedes:{" "}
                {allAttributes
                  .filter((a) => a.supersededBy === draft.attributeId)
                  .map((a, idx, arr) => (
                    <span key={a.attributeId}>
                      {onOpenAttribute ? (
                        <button
                          type="button"
                          className="font-mono text-primary hover:underline"
                          onClick={() => onOpenAttribute(a.attributeId)}
                        >
                          {a.attributeId}
                        </button>
                      ) : (
                        <span className="font-mono text-foreground">{a.attributeId}</span>
                      )}
                      {idx < arr.length - 1 ? ", " : ""}
                    </span>
                  ))}
              </p>
            )}
          </div>
        </section>

        {!readOnly && canMutate && draft.status !== "rejected" && !reservedLocked && (
          <Button type="button" className="gap-1.5" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" />
            Save profile
          </Button>
        )}
      </CardContent>

      <AlertDialog open={!!classConfirm} onOpenChange={(o) => !o && setClassConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change class?</AlertDialogTitle>
            <AlertDialogDescription>Changing class resets dependent placement fields.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (classConfirm) applyClass(classConfirm);
                setClassConfirm(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Near-duplicate attributes</AlertDialogTitle>
            <AlertDialogDescription>
              {dups.map((d) => d.attributeId).join(", ")} already look similar. Save this attribute anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDupOpen(false);
                onSaveProfile(draft);
              }}
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AttributePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        attributes={allAttributes}
        filter={(a) => a.targetTable === draft.targetTable && a.appliesTo.some((t) => draft.appliesTo.includes(t))}
        onConfirm={(id) => {
          if (pickerIdx == null) return;
          const crossField = draft.rules.crossField.map((r, i) => (i === pickerIdx ? { ...r, attributeId: id } : r));
          patch({ rules: { ...draft.rules, crossField } });
          setPickerIdx(null);
        }}
      />
    </Card>
  );
}
