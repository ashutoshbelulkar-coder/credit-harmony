import { useState } from "react";
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
import type { DataTypeOption, MasterFieldDefinition } from "@/types/schema-mapper";

interface MasterFieldDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFieldCreated: (field: MasterFieldDefinition) => void;
}

const DATA_TYPES: DataTypeOption[] = [
  "string", "number", "date", "boolean", "enum", "object", "array",
];

export function MasterFieldDrawer({ open, onOpenChange, onFieldCreated }: MasterFieldDrawerProps) {
  const [fieldName, setFieldName] = useState("");
  const [dataType, setDataType] = useState<DataTypeOption>("string");
  const [description, setDescription] = useState("");
  const [nullable, setNullable] = useState(true);
  const [required, setRequired] = useState(false);
  const [isDerived, setIsDerived] = useState(false);
  const [defaultValue, setDefaultValue] = useState("");
  const [parentPath, setParentPath] = useState("");

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
    });
    resetForm();
  };

  const resetForm = () => {
    setFieldName("");
    setDataType("string");
    setDescription("");
    setNullable(true);
    setRequired(false);
    setIsDerived(false);
    setDefaultValue("");
    setParentPath("");
  };

  const isValid = fieldName.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-h4">Create New Master Field</SheetTitle>
          <SheetDescription className="text-caption">
            Extend the master schema with a new field definition
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
            <Label className="text-caption text-muted-foreground">Description</Label>
            <Textarea
              placeholder="Describe the field purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-caption"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Parent Object Path</Label>
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
