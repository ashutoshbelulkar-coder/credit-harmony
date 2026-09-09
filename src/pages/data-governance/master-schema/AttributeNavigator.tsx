import { useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AttributeGroup, CanonicalAttribute } from "./types";
import { CLASS_ICONS, SENSITIVITY_DOT, STATUS_STYLES } from "./msm-helpers";

export type NavSelection =
  | { kind: "attribute"; attributeId: string }
  | { kind: "group"; group: string }
  | null;

export type LifecycleAction = "revise" | "deprecate" | "reinstate" | "reject" | "reopen" | "delete" | "approve";

interface AttributeNavigatorProps {
  attributes: CanonicalAttribute[];
  groups: AttributeGroup[];
  entityType: string;
  expanded: Set<string>;
  selected: NavSelection;
  readOnly?: boolean;
  canMutate: boolean;
  isSuperAdmin: boolean;
  onToggle: (group: string) => void;
  onSelect: (sel: NavSelection) => void;
  onAddAttribute: (group: string | null) => void;
  onLifecycle: (attributeId: string, action: LifecycleAction) => void;
}

const UNGROUPED = "__ungrouped";
const SYSTEM = "__system";

export function AttributeNavigator({
  attributes,
  groups,
  entityType,
  expanded,
  selected,
  readOnly,
  canMutate,
  isSuperAdmin,
  onToggle,
  onSelect,
  onAddAttribute,
  onLifecycle,
}: AttributeNavigatorProps) {
  const buckets = useMemo(() => {
    const reserved = attributes.filter((a) => a.class === "Reserved");
    const rest = attributes.filter((a) => a.class !== "Reserved");
    const byGroup = new Map<string, CanonicalAttribute[]>();
    for (const a of rest) {
      const key = a.attributeGroup ?? UNGROUPED;
      byGroup.set(key, [...(byGroup.get(key) ?? []), a]);
    }
    const ordered: { key: string; label: string; attrs: CanonicalAttribute[]; addable: boolean }[] = [];
    for (const g of groups) {
      const attrs = byGroup.get(g.group) ?? [];
      if (attrs.length === 0) continue;
      ordered.push({ key: g.group, label: g.group, attrs, addable: true });
    }
    const named = new Set(groups.map((g) => g.group));
    for (const [key, attrs] of byGroup) {
      if (key === UNGROUPED || named.has(key)) continue;
      ordered.push({ key, label: key, attrs, addable: true });
    }
    const ungrouped = byGroup.get(UNGROUPED) ?? [];
    if (ungrouped.length) ordered.push({ key: UNGROUPED, label: "Ungrouped", attrs: ungrouped, addable: true });
    ordered.push({ key: SYSTEM, label: "System (reserved)", attrs: reserved, addable: false });
    return ordered;
  }, [attributes, groups]);

  if (attributes.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-body text-muted-foreground">No attributes yet</p>
          {canMutate && !readOnly && (
            <Button type="button" variant="outline" className="mt-3 h-8 gap-1.5" onClick={() => onAddAttribute(null)}>
              <Plus className="h-3.5 w-3.5" />
              Add attribute
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-1">
        {buckets.map((bucket) => {
          if (bucket.key === SYSTEM && bucket.attrs.length === 0) return null;
          const isOpen = expanded.has(bucket.key);
          const isGroupSelected = selected?.kind === "group" && selected.group === bucket.key;
          return (
            <div key={bucket.key} className="mb-0.5">
              <div
                className={cn(
                  "group/hdr flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted/50",
                  isGroupSelected && "bg-primary/10",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                  onClick={() => {
                    onToggle(bucket.key);
                    onSelect({ kind: "group", group: bucket.key });
                  }}
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-caption font-medium text-foreground truncate">{bucket.label}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">{bucket.attrs.length}</span>
                </button>
                {bucket.addable && canMutate && !readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover/hdr:opacity-100"
                    aria-label={`Add attribute to ${bucket.label}`}
                    onClick={() => onAddAttribute(bucket.key === UNGROUPED ? null : bucket.key)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {isOpen &&
                bucket.attrs.map((attr) => {
                  const Icon = CLASS_ICONS[attr.class];
                  const isSel = selected?.kind === "attribute" && selected.attributeId === attr.attributeId;
                  const shared = attr.appliesTo.filter((t) => t !== entityType && t !== "all rows");
                  const others = attr.appliesTo.filter((t) => t !== entityType);
                  return (
                    <div
                      key={attr.attributeId}
                      className={cn(
                        "group/row flex items-center gap-1 rounded-md py-1 pr-1 hover:bg-muted/50",
                        isSel && "bg-primary/10 ring-1 ring-primary/30",
                        attr.status === "deprecated" && "opacity-70",
                      )}
                      style={{ paddingLeft: 22 }}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                        onClick={() => onSelect({ kind: "attribute", attributeId: attr.attributeId })}
                      >
                        <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="text-body text-foreground truncate">{attr.displayName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground truncate hidden sm:inline">
                          {attr.canonicalQualifier}
                        </span>
                        <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal px-1.5 py-0 shrink-0">
                          {attr.dataType}
                        </Badge>
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", SENSITIVITY_DOT[attr.sensitivity])} />
                        <Badge className={cn("text-[9px] leading-[12px] font-medium border-0 shrink-0", STATUS_STYLES[attr.status])}>
                          {attr.status}
                        </Badge>
                        {attr.appliesTo.length > 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Share2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Shared with: {others.join(", ") || shared.join(", ")}</TooltipContent>
                          </Tooltip>
                        )}
                      </button>
                      {canMutate && !readOnly && (isSuperAdmin || attr.class !== "Reserved") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover/row:opacity-100"
                              aria-label="Attribute actions"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {attr.status === "active" && (
                              <>
                                <DropdownMenuItem onClick={() => onLifecycle(attr.attributeId, "revise")}>
                                  Send for revision
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onLifecycle(attr.attributeId, "deprecate")}>
                                  Deprecate & replace
                                </DropdownMenuItem>
                              </>
                            )}
                            {attr.status === "deprecated" && (
                              <DropdownMenuItem onClick={() => onLifecycle(attr.attributeId, "reinstate")}>
                                Reinstate
                              </DropdownMenuItem>
                            )}
                            {(attr.status === "proposed" || attr.status === "pending") && (
                              <>
                                <DropdownMenuItem onClick={() => onLifecycle(attr.attributeId, "reject")}>
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => onLifecycle(attr.attributeId, "delete")}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                            {attr.status === "rejected" && (
                              <DropdownMenuItem onClick={() => onLifecycle(attr.attributeId, "reopen")}>
                                Reopen
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
