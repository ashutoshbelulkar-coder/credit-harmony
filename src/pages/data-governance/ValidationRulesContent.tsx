import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { tableHeaderClasses, badgeTextClasses } from "@/lib/typography";
import { ruleSets, validationRules, dataSources } from "@/data/data-governance-mock";
import type { ValidationRule, RuleType, RuleSeverity, ExpressionBlock } from "@/types/data-governance";
import { Plus, Play, BarChart3, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RULE_TYPES: { value: RuleType; label: string }[] = [
  { value: "format", label: "Format" },
  { value: "range", label: "Range" },
  { value: "cross_field", label: "Cross-field" },
];

const SEVERITIES: { value: RuleSeverity; label: string }[] = [
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "critical", label: "Critical" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "in_range", label: "In range" },
  { value: "matches_regex", label: "Matches regex" },
  { value: "not_empty", label: "Not empty" },
];

const INSTITUTIONS = ["First National Bank", "Metro Credit Union", "Pacific Finance Corp", "All"];

export default function ValidationRulesContent() {
  const [ruleSetId, setRuleSetId] = useState(ruleSets[0]?.id ?? "");
  const [version, setVersion] = useState("v3.2");
  const [createOpen, setCreateOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ passed: number; failed: number; total: number } | null>(null);
  const [impactPercent, setImpactPercent] = useState<number | null>(null);

  const rules = validationRules.filter((r) => r.ruleSetId === ruleSetId);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-h2 font-semibold text-foreground">Validation Rules</h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Manage format, range, and cross-field validation rules
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-caption text-muted-foreground">Rule set</Label>
          <Select value={ruleSetId} onValueChange={setRuleSetId}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Select rule set" />
            </SelectTrigger>
            <SelectContent>
              {ruleSets.map((rs) => (
                <SelectItem key={rs.id} value={rs.id}>
                  {rs.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-caption text-muted-foreground">Version</Label>
          <Select value={version} onValueChange={setVersion}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="v3.2">v3.2</SelectItem>
              <SelectItem value="v3.1">v3.1</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Rule
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Create validation rule</SheetTitle>
            </SheetHeader>
            <RuleForm
              onClose={() => setCreateOpen(false)}
              onTest={() => setTestResult({ passed: 9920, failed: 80, total: 10000 })}
              onImpact={() => setImpactPercent(0.8)}
              testResult={testResult}
              impactPercent={impactPercent}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Rule list table */}
      <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={tableHeaderClasses}>Rule Name</TableHead>
              <TableHead className={tableHeaderClasses}>Type</TableHead>
              <TableHead className={tableHeaderClasses}>Severity</TableHead>
              <TableHead className={tableHeaderClasses}>Status</TableHead>
              <TableHead className={tableHeaderClasses}>Version</TableHead>
              <TableHead className={tableHeaderClasses}>Last Modified</TableHead>
              <TableHead className={tableHeaderClasses}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell className="text-body">{rule.type.replace(/_/g, " ")}</TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      badgeTextClasses,
                      rule.severity === "critical" && "bg-destructive/15 text-destructive",
                      rule.severity === "error" && "bg-danger/15 text-danger",
                      rule.severity === "warning" && "bg-warning/15 text-warning"
                    )}
                  >
                    {rule.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={rule.status === "active" ? "default" : "secondary"} className={badgeTextClasses}>
                    {rule.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-body">{rule.version}</TableCell>
                <TableCell className="text-caption text-muted-foreground">{rule.lastModified}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Impact Analysis section */}
      {rules.some((r) => r.impactPercent != null) && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h2 className="text-h4 font-semibold text-foreground">Impact analysis</h2>
          <p className="mt-1 text-caption text-muted-foreground">% of records affected by active rules</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {rules.filter((r) => r.impactPercent != null).map((r) => (
              <div key={r.id} className="rounded-lg border border-border px-4 py-2.5 min-w-0">
                <span className="text-caption text-muted-foreground block truncate">{r.name}</span>
                <p className="text-h3 font-semibold text-foreground mt-0.5">{r.impactPercent}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RuleForm({
  onClose,
  onTest,
  onImpact,
  testResult,
  impactPercent,
}: {
  onClose: () => void;
  onTest: () => void;
  onImpact: () => void;
  testResult: { passed: number; failed: number; total: number } | null;
  impactPercent: number | null;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RuleType>("format");
  const [severity, setSeverity] = useState<RuleSeverity>("error");
  const [institutions, setInstitutions] = useState<string[]>(["All"]);
  const [dataSource, setDataSource] = useState("CBS Core");
  const [errorMessage, setErrorMessage] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [blocks, setBlocks] = useState<ExpressionBlock[]>([
    { id: "1", field: "pan", operator: "matches_regex", value: "^[A-Z]{5}[0-9]{4}[A-Z]$", logicalOp: "and" },
  ]);

  const addBlock = () => {
    setBlocks((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        field: "",
        operator: "equals",
        value: "",
        logicalOp: "and",
      },
    ]);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBlock = (id: string, updates: Partial<ExpressionBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-2">
        <Label>Rule name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PAN Format" className="h-9" />
      </div>
      <div className="space-y-2">
        <Label>Applicable institution(s)</Label>
        <Select
          value={institutions[0]}
          onValueChange={(v) => setInstitutions([v])}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {INSTITUTIONS.map((i) => (
              <SelectItem key={i} value={i}>{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Applicable data source</Label>
        <Select value={dataSource} onValueChange={setDataSource}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dataSources.map((ds) => (
              <SelectItem key={ds.id} value={ds.name}>{ds.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Expression (logic blocks)</Label>
        <p className="text-caption text-muted-foreground">Structured conditions – no code</p>
        <div className="space-y-2 rounded-lg border border-border p-4">
          {blocks.map((block) => (
            <div key={block.id} className="flex flex-wrap items-center gap-2 rounded border border-border bg-muted/20 p-2">
              <Select
                value={block.field}
                onValueChange={(v) => updateBlock(block.id, { field: v })}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pan">pan</SelectItem>
                  <SelectItem value="date_of_birth">date_of_birth</SelectItem>
                  <SelectItem value="borrower_full_name">borrower_full_name</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={block.operator}
                onValueChange={(v) => updateBlock(block.id, { operator: v as ExpressionBlock["operator"] })}
              >
                <SelectTrigger className="h-8 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(block.operator === "equals" || block.operator === "matches_regex") && (
                <Input
                  value={block.value ?? ""}
                  onChange={(e) => updateBlock(block.id, { value: e.target.value })}
                  placeholder="Value"
                  className="h-8 w-40"
                />
              )}
              {block.operator === "in_range" && (
                <>
                  <Input
                    type="number"
                    value={block.valueMin ?? ""}
                    onChange={(e) => updateBlock(block.id, { valueMin: parseFloat(e.target.value) || undefined })}
                    placeholder="Min"
                    className="h-8 w-20"
                  />
                  <Input
                    type="number"
                    value={block.valueMax ?? ""}
                    onChange={(e) => updateBlock(block.id, { valueMax: parseFloat(e.target.value) || undefined })}
                    placeholder="Max"
                    className="h-8 w-20"
                  />
                </>
              )}
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeBlock(block.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addBlock} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Add condition
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Error message</Label>
        <Input
          value={errorMessage}
          onChange={(e) => setErrorMessage(e.target.value)}
          placeholder="e.g. PAN must be in format AAAAA9999A"
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <Label>Severity</Label>
        <Select value={severity} onValueChange={(v) => setSeverity(v as RuleSeverity)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Effective date</Label>
          <DatePicker value={effectiveDate} onChange={setEffectiveDate} className="h-8" />
        </div>
        <div className="space-y-2">
          <Label>Expiry date (optional)</Label>
          <DatePicker value={expiryDate} onChange={setExpiryDate} className="h-8" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onTest}>
          <Play className="h-3.5 w-3.5" />
          Test rule
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onImpact}>
          <BarChart3 className="h-3.5 w-3.5" />
          Impact analysis
        </Button>
      </div>
      {testResult && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-caption font-medium text-muted-foreground">Test result (sample data)</p>
          <p className="mt-1 text-body">Passed: {testResult.passed} · Failed: {testResult.failed} · Total: {testResult.total}</p>
        </div>
      )}
      {impactPercent != null && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-caption font-medium text-muted-foreground">Records affected</p>
          <p className="mt-1 text-h4 font-semibold">{impactPercent}%</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onClose}>Save rule</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
