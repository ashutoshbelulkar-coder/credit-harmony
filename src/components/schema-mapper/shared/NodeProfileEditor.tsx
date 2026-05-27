import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, FolderTree, ListOrdered, Pencil, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tableHeaderClasses } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { TreePathPickerDialog } from "./TreePathPickerDialog";
import type {
  BusinessValidationType,
  CrossFieldRule,
  FieldProfile,
  NodeType,
  SchemaDataType,
  SchemaNode,
  TransformationType,
  ValidationRuleType,
  ValidationSeverity,
  FieldValueMode,
} from "@/types/datasource-onboarding";
import {
  BUSINESS_VALIDATION_TYPES,
  CROSS_FIELD_RULES,
  SCHEMA_DATA_TYPES,
  SOURCE_MAPPING_TYPES,
  TRANSFORMATION_TYPES,
  VALIDATION_RULE_TYPES,
  VALIDATION_SEVERITIES,
  buildFieldProfileSchema,
} from "@/lib/datasource-onboarding-validation";

export interface NodeProfileEditorProps {
  node: SchemaNode;
  /** Optional valid-path catalog for picker enforcement and submit-time validation. */
  validPaths?: Set<string>;
  onSave: (next: SchemaNode) => void;
  onCancel?: () => void;
  /** For OBJECT / ARRAY: callback to rename the container itself. */
  onRenameContainer?: (id: string, name: string, dataType: SchemaDataType, nodeType: NodeType) => void;
}

function emptyProfile(node: SchemaNode): FieldProfile {
  const section = node.code?.split("_")[0] ?? "";
  return {
    PK: "",
    SK: `FIELD#${node.name}`,
    FieldPath: node.destinationMapping || node.name,
    Section: section || node.name,
    FieldName: node.name,
    DisplayName: node.name,
    DataType: node.dataType,
    IsPII: false,
    SimilarFields: [],
    Description: "",
    Validation: { Type: node.dataType, Rules: [] },
    BusinessValidations: [],
    CrossFieldValidations: [],
    SourceMapping: {
      SourceType: "JSON",
      SourcePath: node.sourceMapping || node.name,
      TargetPath: node.destinationMapping || node.name,
    },
    ValueMode: "DEFAULT",
    DefaultValue: null,
    PossibleValues: [],
    Transformations: [],
  };
}

interface ChipInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

function ChipInput({ values, onChange, placeholder, className }: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className={cn("space-y-1.5", className)}>
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
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="text-[10px] gap-1 pr-1">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="rounded hover:bg-muted"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
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
}

function EnumMultiSelect<T extends string>({ values, options, onChange, placeholder }: EnumMultiSelectProps<T>) {
  const remaining = options.filter((o) => !values.includes(o));
  return (
    <div className="space-y-1.5">
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
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="text-[10px] gap-1 pr-1">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="rounded hover:bg-muted"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface PathPickerInputProps {
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder?: string;
  leavesOnly?: boolean;
}

function PathPickerInput({ value, onChange, label, placeholder, leavesOnly }: PathPickerInputProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <FormLabel className="text-caption text-muted-foreground">{label}</FormLabel>
      <div className="flex gap-2">
        <Input
          value={value}
          readOnly
          onClick={() => setOpen(true)}
          placeholder={placeholder ?? "Click Browse to pick a path"}
          className="h-9 cursor-pointer font-mono"
        />
        <Button type="button" variant="outline" className="h-9 gap-1.5 shrink-0 px-3 text-caption" onClick={() => setOpen(true)}>
          Browse
        </Button>
      </div>
      <TreePathPickerDialog
        open={open}
        onOpenChange={setOpen}
        title={`Pick ${label}`}
        initialValue={value}
        leavesOnly={leavesOnly ?? true}
        onConfirm={(p) => onChange(p)}
      />
    </div>
  );
}

// ─── Field branch ───────────────────────────────────────────────────────────

function FieldProfileForm({ node, validPaths, onSave }: NodeProfileEditorProps) {
  const schema = useMemo(() => buildFieldProfileSchema({ validPaths }), [validPaths]);
  const initial: FieldProfile = node.fieldProfile ?? emptyProfile(node);
  const form = useForm<FieldProfile>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: initial,
  });
  const rulesArray = useFieldArray({ control: form.control, name: "Validation.Rules" });
  const crossFieldArray = useFieldArray({ control: form.control, name: "CrossFieldValidations" });

  useEffect(() => {
    form.reset(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const valueMode = form.watch("ValueMode");
  const dataType = form.watch("DataType");
  const possibleValues = form.watch("PossibleValues") ?? [];
  const businessVals = form.watch("BusinessValidations") ?? [];
  const transformations = form.watch("Transformations") ?? [];
  const similarFields = form.watch("SimilarFields") ?? [];

  // Clear scalar-only fields when DataType transitions to OBJECT/ARRAY.
  useEffect(() => {
    if (dataType === "OBJECT" || dataType === "ARRAY") {
      form.setValue("ValueMode", "DEFAULT");
      form.setValue("PossibleValues", []);
      form.setValue("DefaultValue", null);
      form.setValue("Validation.Rules", []);
      form.setValue("IsPII", false);
    }
  }, [dataType, form]);

  useEffect(() => {
    if (valueMode === "DEFAULT") {
      form.setValue("PossibleValues", []);
    } else {
      form.setValue("DefaultValue", null);
    }
  }, [valueMode, form]);

  const handleSubmit = form.handleSubmit((profile) => {
    onSave({
      ...node,
      name: profile.FieldName,
      dataType: profile.DataType,
      sourceMapping: profile.SourceMapping.SourcePath,
      destinationMapping: profile.SourceMapping.TargetPath,
      fieldProfile: profile,
      validations: profile.Validation.Rules.map((r, i) => ({ id: `${node.id}-v-${i}`, type: r.Rule, value: String(r.Value ?? "") })),
      businessRules: profile.BusinessValidations.map((b, i) => ({ id: `${node.id}-br-${i}`, code: b })),
      transformations: profile.Transformations.map((t, i) => ({ id: `${node.id}-tx-${i}`, type: t })),
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h4 font-semibold text-foreground">Field profile</h3>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  Edit field metadata, validations, transformations.
                </p>
              </div>
              <Badge variant="secondary" className="text-[9px] leading-[12px]">{node.code}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="PK"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">PK</FormLabel>
                    <FormControl><Input {...field} className="h-9 font-mono" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="SK"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">SK</FormLabel>
                    <FormControl><Input {...field} className="h-9 font-mono" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="FieldName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Field name *</FormLabel>
                    <FormControl><Input {...field} className="h-9" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="DisplayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Display name *</FormLabel>
                    <FormControl><Input {...field} className="h-9" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="Section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Section *</FormLabel>
                    <FormControl><Input {...field} className="h-9" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="DataType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Data type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SCHEMA_DATA_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="FieldPath"
              render={({ field }) => (
                <FormItem>
                  <PathPickerInput
                    value={field.value}
                    onChange={field.onChange}
                    label="Field path *"
                    leavesOnly={true}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="SourceMapping.SourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Source format</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SOURCE_MAPPING_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="SourceMapping.SourcePath"
                render={({ field }) => (
                  <FormItem>
                    <PathPickerInput value={field.value} onChange={field.onChange} label="Source path *" />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="SourceMapping.TargetPath"
                render={({ field }) => (
                  <FormItem>
                    <PathPickerInput value={field.value} onChange={field.onChange} label="Target path *" />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="text-h4 font-semibold text-foreground">Field intelligence</h3>
              <p className="mt-0.5 text-caption text-muted-foreground">
                PII flag, description, and similar-field hints used during mapping and review.
              </p>
            </div>

            <FormField
              control={form.control}
              name="IsPII"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(!!c)} />
                  </FormControl>
                  <FormLabel className="text-body text-foreground">IsPII</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="Description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-caption text-muted-foreground">Description</FormLabel>
                  <FormControl><Textarea {...field} rows={3} className="resize-none min-h-[5rem]" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="SimilarFields"
              render={() => (
                <FormItem>
                  <FormLabel className="text-caption text-muted-foreground">Similar fields</FormLabel>
                  <FormControl>
                    <ChipInput
                      values={similarFields}
                      onChange={(v) => form.setValue("SimilarFields", v, { shouldDirty: true, shouldValidate: true })}
                      placeholder="Add a similar field name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Validation rules */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h4 font-semibold text-foreground">Validation rules</h3>
                <p className="mt-0.5 text-caption text-muted-foreground">Field-level validation. Severity controls UI surfacing.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5 px-3 text-caption"
                onClick={() => rulesArray.append({ Rule: "NOT_EMPTY", Severity: "Error", Message: "" })}
              >
                <Plus className="h-3 w-3" />
                Add rule
              </Button>
            </div>
            {rulesArray.fields.length === 0 ? (
              <p className="text-body text-muted-foreground">No validation rules yet.</p>
            ) : (
              <div className="rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn(tableHeaderClasses, "min-w-[140px]")}>Rule</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[110px]")}>Severity</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[140px]")}>Value</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[200px]")}>Pattern</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[240px]")}>Message</TableHead>
                      <TableHead className={cn(tableHeaderClasses, "min-w-[60px] text-center")}>—</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rulesArray.fields.map((field, idx) => {
                      const ruleType = form.watch(`Validation.Rules.${idx}.Rule`);
                      const valueNeeded = ruleType === "MAX_LENGTH" || ruleType === "MIN_LENGTH";
                      const patternNeeded = ruleType === "REGEX";
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`Validation.Rules.${idx}.Rule` as const}
                              render={({ field: f }) => (
                                <Select value={f.value} onValueChange={(v) => f.onChange(v as ValidationRuleType)}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {VALIDATION_RULE_TYPES.map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`Validation.Rules.${idx}.Severity` as const}
                              render={({ field: f }) => (
                                <Select value={f.value} onValueChange={(v) => f.onChange(v as ValidationSeverity)}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {VALIDATION_SEVERITIES.map((s) => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`Validation.Rules.${idx}.Value` as const}
                              render={({ field: f }) => (
                                <Input
                                  value={f.value == null ? "" : String(f.value)}
                                  onChange={(e) => f.onChange(e.target.value)}
                                  disabled={!valueNeeded}
                                  placeholder={valueNeeded ? "e.g. 120" : ""}
                                  className="h-9"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`Validation.Rules.${idx}.Pattern` as const}
                              render={({ field: f }) => (
                                <Input
                                  value={f.value ?? ""}
                                  onChange={(e) => f.onChange(e.target.value)}
                                  disabled={!patternNeeded}
                                  placeholder={patternNeeded ? "^[A-Z]{5}[0-9]{4}[A-Z]$" : ""}
                                  className="h-9 font-mono"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`Validation.Rules.${idx}.Message` as const}
                              render={({ field: f }) => (
                                <Input {...f} placeholder="User-facing message" className="h-9" />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              aria-label="Remove rule"
                              onClick={() => rulesArray.remove(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business validations */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h4 font-semibold text-foreground">Business validations</h3>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  Domain and format checks that apply to this field’s values.
                </p>
              </div>
            </div>
            <FormField
              control={form.control}
              name="BusinessValidations"
              render={() => (
                <FormItem>
                  <FormLabel className="sr-only">Business validations</FormLabel>
                  <FormControl>
                    <EnumMultiSelect<BusinessValidationType>
                      values={businessVals}
                      options={BUSINESS_VALIDATION_TYPES}
                      onChange={(v) => form.setValue("BusinessValidations", v, { shouldValidate: true, shouldDirty: true })}
                      placeholder="Add business validation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Business transformations */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h4 font-semibold text-foreground">Business transformations</h3>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  Normalisation and string operations applied when ingesting or publishing this field.
                </p>
              </div>
            </div>
            <FormField
              control={form.control}
              name="Transformations"
              render={() => (
                <FormItem>
                  <FormLabel className="sr-only">Business transformations</FormLabel>
                  <FormControl>
                    <EnumMultiSelect<TransformationType>
                      values={transformations}
                      options={TRANSFORMATION_TYPES}
                      onChange={(v) => form.setValue("Transformations", v, { shouldValidate: true, shouldDirty: true })}
                      placeholder="Add transformation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Cross-field validations */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h4 font-semibold text-foreground">Cross-field validations</h3>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  Rules that compare this field to another path in the profile.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-1.5 px-3 text-caption"
                onClick={() => crossFieldArray.append({ FieldPath: "", Rule: "EQUALS", Severity: "Warning" })}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            {crossFieldArray.fields.length === 0 ? (
              <p className="text-body text-muted-foreground">No cross-field rules.</p>
            ) : (
              <div className="space-y-2">
                {crossFieldArray.fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_140px_120px_auto]">
                    <FormField
                      control={form.control}
                      name={`CrossFieldValidations.${idx}.FieldPath` as const}
                      render={({ field: f }) => (
                        <PathPickerInput
                          value={f.value}
                          onChange={f.onChange}
                          label="Field path"
                        />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`CrossFieldValidations.${idx}.Rule` as const}
                      render={({ field: f }) => (
                        <div className="space-y-1.5">
                          <FormLabel className="text-caption text-muted-foreground">Rule</FormLabel>
                          <Select value={f.value} onValueChange={(v) => f.onChange(v as CrossFieldRule)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CROSS_FIELD_RULES.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`CrossFieldValidations.${idx}.Severity` as const}
                      render={({ field: f }) => (
                        <div className="space-y-1.5">
                          <FormLabel className="text-caption text-muted-foreground">Severity</FormLabel>
                          <Select value={f.value} onValueChange={(v) => f.onChange(v as ValidationSeverity)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VALIDATION_SEVERITIES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 self-end"
                      aria-label="Remove rule"
                      onClick={() => crossFieldArray.remove(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Value mode */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h4 font-semibold text-foreground">Value mode</h3>
                <p className="mt-0.5 text-caption text-muted-foreground">DEFAULT keeps a fallback value; ENUM enumerates allowed values.</p>
              </div>
              <FormField
                control={form.control}
                name="ValueMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v as FieldValueMode)}>
                    <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEFAULT">DEFAULT</SelectItem>
                      <SelectItem value="ENUM">ENUM</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {valueMode === "DEFAULT" ? (
              <FormField
                control={form.control}
                name="DefaultValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Default value</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                        placeholder="Optional default value"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="PossibleValues"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-caption text-muted-foreground">Possible values *</FormLabel>
                    <FormControl>
                      <ChipInput
                        values={possibleValues}
                        onChange={(v) => form.setValue("PossibleValues", v, { shouldValidate: true, shouldDirty: true })}
                        placeholder="Add allowed value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" className="h-9 gap-1.5 px-4 text-caption" disabled={!form.formState.isValid && !form.formState.isDirty}>
            <Save className="h-3.5 w-3.5" />
            Save profile
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Container branch (OBJECT / ARRAY) ─────────────────────────────────────

function ContainerForm({ node, onSave, onRenameContainer }: NodeProfileEditorProps) {
  const [name, setName] = useState(node.name);
  const [code, setCode] = useState(node.code);
  const [nodeType, setNodeType] = useState<NodeType>(node.nodeType);
  const [dataType, setDataType] = useState<SchemaDataType>(node.dataType);
  const [sourceMapping, setSourceMapping] = useState(node.sourceMapping);
  const [destinationMapping, setDestinationMapping] = useState(node.destinationMapping);

  useEffect(() => {
    setName(node.name);
    setCode(node.code);
    setNodeType(node.nodeType);
    setDataType(node.dataType);
    setSourceMapping(node.sourceMapping);
    setDestinationMapping(node.destinationMapping);
  }, [node.id]);

  const isProtected = node.name === "[*]";
  const containerInvalid = nodeType === "OBJECT" && dataType !== "OBJECT";

  const handleSave = () => {
    if (containerInvalid) return;
    const next: SchemaNode = {
      ...node,
      name: isProtected ? node.name : name.trim() || node.name,
      code: code.trim() || node.code,
      nodeType,
      dataType,
      sourceMapping: sourceMapping.trim(),
      destinationMapping: destinationMapping.trim(),
    };
    onSave(next);
    onRenameContainer?.(node.id, next.name, next.dataType, next.nodeType);
  };

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-h4 font-semibold text-foreground flex items-center gap-2">
              {nodeType === "ARRAY" ? <ListOrdered className="h-4 w-4 text-warning" /> : <FolderTree className="h-4 w-4 text-info" />}
              Container — {nodeType}
            </h3>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {isProtected
                ? "Array item marker (locked). Edit children below."
                : "Configure the container metadata. Children are managed in the tree."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isProtected} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} disabled={isProtected} className="h-9 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Node type</Label>
            <Select value={nodeType} onValueChange={(v) => setNodeType(v as NodeType)} disabled={isProtected}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OBJECT">OBJECT</SelectItem>
                <SelectItem value="ARRAY">ARRAY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Data type</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as SchemaDataType)} disabled={isProtected}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHEMA_DATA_TYPES.filter((t) => t === "OBJECT" || t === "ARRAY").map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {containerInvalid && (
              <p className="text-caption text-destructive">OBJECT nodes must have dataType OBJECT.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Source mapping</Label>
            <Input value={sourceMapping} onChange={(e) => setSourceMapping(e.target.value)} className="h-9 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-caption text-muted-foreground">Destination mapping</Label>
            <Input value={destinationMapping} onChange={(e) => setDestinationMapping(e.target.value)} className="h-9 font-mono" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" className="h-9 gap-1.5 px-4 text-caption" onClick={handleSave} disabled={containerInvalid || isProtected}>
            <Save className="h-3.5 w-3.5" />
            Save container
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function NodeProfileEditor(props: NodeProfileEditorProps) {
  const { node } = props;
  if (node.nodeType === "FIELD") return <FieldProfileForm {...props} />;
  return <ContainerForm {...props} />;
}
