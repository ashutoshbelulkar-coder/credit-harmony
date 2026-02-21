import { useState, useCallback } from "react";
import { ArrowRight, Pencil, Plus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import type { GeneratedValidationRule, RuleSeverity, RuleType } from "@/types/schema-mapper";

interface ValidationRuleStepProps {
  initialRules: GeneratedValidationRule[];
  onComplete: (rules: GeneratedValidationRule[]) => void;
}

const SEVERITY_STYLES: Record<RuleSeverity, string> = {
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  error: "bg-destructive/15 text-destructive",
  critical: "bg-destructive/25 text-destructive font-semibold",
};

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  regex: "Regex",
  required: "Required",
  range: "Range",
  enum_validation: "Enum",
  date_constraint: "Date",
  custom: "Custom",
};

export function ValidationRuleStep({ initialRules, onComplete }: ValidationRuleStepProps) {
  const [rules, setRules] = useState<GeneratedValidationRule[]>(initialRules);
  const [editingRule, setEditingRule] = useState<GeneratedValidationRule | null>(null);
  const [impactDialog, setImpactDialog] = useState<GeneratedValidationRule | null>(null);

  const toggleEnabled = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r)),
    );
  }, []);

  const changeSeverity = useCallback((id: string, severity: RuleSeverity) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, severity } : r)),
    );
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingRule) return;
    setRules((prev) => prev.map((r) => (r.id === editingRule.id ? editingRule : r)));
    setEditingRule(null);
  }, [editingRule]);

  const enabledCount = rules.filter((r) => r.isEnabled).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-h4 font-semibold text-foreground">Validation Rules Proposed by AI</h3>
            <p className="text-caption text-muted-foreground mt-0.5">
              {rules.length} rules generated &middot; {enabledCount} enabled
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-3 w-3" /> Add Custom Rule
          </Button>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(tableHeaderClasses, "sticky top-0 z-10 bg-card min-w-[120px]")}>Field</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[70px]")}>Type</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[180px]")}>Rule Logic</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[80px]")}>Severity</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[60px] text-center")}>Enabled</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[70px]")}>Editable</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[70px] text-center")}>Impact</TableHead>
                <TableHead className={cn(tableHeaderClasses, "min-w-[100px]")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id} className={cn(!rule.isEnabled && "opacity-50")}>
                  <TableCell className="text-body font-medium">{rule.field}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[9px] leading-[12px] font-normal">
                      {RULE_TYPE_LABELS[rule.ruleType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-[9px] leading-[12px] font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {rule.ruleLogic}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rule.severity}
                      onValueChange={(v) => changeSeverity(rule.id, v as RuleSeverity)}
                    >
                      <SelectTrigger className="h-6 w-20 text-[9px] border-0 p-0">
                        <Badge className={cn("text-[9px] leading-[12px] font-medium border-0", SEVERITY_STYLES[rule.severity])}>
                          {rule.severity}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rule.isEnabled}
                      onCheckedChange={() => toggleEnabled(rule.id)}
                    />
                  </TableCell>
                  <TableCell className="text-caption">
                    {rule.isEditable ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-center">
                    {rule.impactPercent !== null ? (
                      <button
                        type="button"
                        onClick={() => setImpactDialog(rule)}
                        className="text-body tabular-nums text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {rule.impactPercent}%
                      </button>
                    ) : (
                      <span className="text-caption text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingRule({ ...rule })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setImpactDialog(rule)}
                      >
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Proceed */}
      <div className="flex justify-end">
        <Button onClick={() => onComplete(rules)} className="gap-1.5">
          Proceed to Semantic Insights
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Edit Rule Dialog */}
      {editingRule && (
        <Dialog open={true} onOpenChange={(o) => !o && setEditingRule(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-h4">Edit Validation Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-caption">Field</Label>
                <Input value={editingRule.field} disabled className="h-8 bg-muted" />
              </div>
              <div className="space-y-1">
                <Label className="text-caption">Rule Logic</Label>
                <Textarea
                  value={editingRule.ruleLogic}
                  onChange={(e) => setEditingRule({ ...editingRule, ruleLogic: e.target.value })}
                  rows={2}
                  className="resize-none font-mono text-caption"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-caption">Description</Label>
                <Input
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  className="h-8"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Impact Simulation Dialog */}
      {impactDialog && (
        <Dialog open={true} onOpenChange={(o) => !o && setImpactDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-h4">Impact Simulation</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-body text-muted-foreground">Field</span>
                <span className="text-body font-medium">{impactDialog.field}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body text-muted-foreground">Rule</span>
                <code className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded">
                  {impactDialog.ruleLogic}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body text-muted-foreground">Sample data failing</span>
                <span className="text-h4 font-semibold tabular-nums text-warning">
                  {impactDialog.impactPercent ?? 0}%
                </span>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-warning transition-all"
                    style={{ width: `${impactDialog.impactPercent ?? 0}%` }}
                  />
                </div>
                <p className="mt-2 text-caption text-muted-foreground text-center">
                  {impactDialog.impactPercent ?? 0}% of sample records would fail this rule
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setImpactDialog(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
