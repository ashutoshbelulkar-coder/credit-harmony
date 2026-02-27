import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import type { DataTypeOption, MasterFieldDefinition } from "@/types/schema-mapper";

interface MasterFieldDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFieldCreated: (field: MasterFieldDefinition) => void;
  initialDescription?: string;
  initialEnumValues?: string[];
}

const DATA_TYPES: DataTypeOption[] = [
  "string", "number", "date", "boolean", "enum", "object", "array",
];

const PII_OPTIONS = ["None", "Personal", "Sensitive", "Highly Sensitive"];
const RISK_OPTIONS = ["Low", "Medium", "High", "Critical"];

export function MasterFieldDrawer({
  open,
  onOpenChange,
  onFieldCreated,
  initialDescription = "",
  initialEnumValues = [],
}: MasterFieldDrawerProps) {
  const [fieldName, setFieldName] = useState("");
  const [dataType, setDataType] = useState<DataTypeOption>("string");
  const [description, setDescription] = useState("");
  const [piiClassification, setPiiClassification] = useState("");
  const [riskClassification, setRiskClassification] = useState("");
  const [nullable, setNullable] = useState(true);
  const [required, setRequired] = useState(false);
  const [isDerived, setIsDerived] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [enumMappings, setEnumMappings] = useState<{ sourceValue: string; canonicalValue: string }[]>([]);

  useEffect(() => {
    if (open && initialDescription) setDescription(initialDescription);
    if (open && initialEnumValues.length > 0) {
      setEnumMappings(initialEnumValues.map((v) => ({ sourceValue: v, canonicalValue: "" })));
    }
  }, [open, initialDescription, initialEnumValues]);

  const isEnum = dataType === "enum";
  const enumMappingComplete = !isEnum || (enumMappings.length > 0 && enumMappings.every((m) => m.canonicalValue.trim().length > 0));

  const handleSubmit = () => {
    onFieldCreated({
      fieldName,
      dataType,
      description,
      nullable,
      required,
      isDerived,
      defaultValue,
      parentObjectPath: parentPath,
      piiClassification: piiClassification || undefined,
      riskClassification: riskClassification || undefined,
      enumMappingSuggestions: isEnum && enumMappingComplete ? enumMappings : undefined,
    });
    resetForm();
  };

  const resetForm = () => {
    setFieldName("");
    setDataType("string");
    setDescription("");
    setPiiClassification("");
    setRiskClassification("");
    setNullable(true);
    setRequired(false);
    setIsDerived(false);
    setDefaultValue("");
    setParentPath("");
    setEnumMappings([]);
  };

  const updateEnumMapping = (idx: number, canonicalValue: string) => {
    setEnumMappings((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], canonicalValue };
      return next;
    });
  };

  const isValid = fieldName.trim().length > 0 && enumMappingComplete;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-h4">Create New Master Field</SheetTitle>
          <SheetDescription className="text-caption">
            Extend the master schema with a new field definition. New fields require governance approval.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Field Name *</Label>
            <Input
              placeholder="e.g. telecom_avg_bill"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Data Type *</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as DataTypeOption)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt} className="capitalize">
                    {dt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Description (auto-filled by LLM)</Label>
            <Textarea
              placeholder="Describe the field purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-caption"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">PII Classification</Label>
            <Select value={piiClassification || "none"} onValueChange={setPiiClassification}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {PII_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt.toLowerCase()}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Risk Classification</Label>
            <Select value={riskClassification || "low"} onValueChange={setRiskClassification}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {RISK_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt.toLowerCase()}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Parent Object (if nested)</Label>
            <Input
              placeholder="e.g. accounts (leave empty for root)"
              value={parentPath}
              onChange={(e) => setParentPath(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Default Value (optional)</Label>
            <Input
              placeholder="Optional default"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="h-8"
            />
          </div>

          {isEnum && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label className="text-caption text-muted-foreground">Enum mapping suggestion</Label>
              {enumMappings.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  Add source values above or paste JSON to detect. Example: DELAYED → Delinquent, ON_TIME → Current.
                </p>
              ) : (
                <div className="space-y-2">
                  {enumMappings.map((m, idx) => (
                    <div key={m.sourceValue} className="flex items-center gap-2">
                      <span className="text-body font-mono min-w-[80px]">{m.sourceValue}</span>
                      <span className="text-muted-foreground">→</span>
                      <Input
                        placeholder="Canonical value"
                        value={m.canonicalValue}
                        onChange={(e) => updateEnumMapping(idx, e.target.value)}
                        className="h-7 text-caption flex-1"
                      />
                    </div>
                  ))}
                  {!enumMappingComplete && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-2 py-1.5 text-caption text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Complete all enum mappings before creating the field.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label className="text-body text-foreground">Nullable</Label>
            <Switch checked={nullable} onCheckedChange={setNullable} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label className="text-body text-foreground">Required</Label>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label className="text-body text-foreground">Is Derived Field?</Label>
            <Switch checked={isDerived} onCheckedChange={setIsDerived} />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Create Field
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
