import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Upload, Building2, FileText, Eye, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreateInstitution, useInstitutionFormMetadata } from "@/hooks/api/useInstitutions";
import {
  applicableRequiredComplianceDocuments,
  uploadInstitutionDocument,
  type CreateInstitutionBody,
  type InstitutionRequiredComplianceDocument,
  type RegisterFormFieldResolved,
  type RegisterFormPayload,
  type RegisterFormSectionResolved,
} from "@/services/institutions.service";
import {
  buildRegisterDetailsSchema,
  defaultValuesFromRegisterForm,
  mapRegisterDetailsToCreateBody,
  sectionIsVisible,
  type RegisterDetailsValues,
} from "@/lib/institution-register-form";
import { QK } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

const STEP_DETAILS = {
  title: "Corporate Details",
  shortTitle: "Details",
  icon: Building2,
  description: "Basic institution information",
};
const STEP_DOCUMENTS = {
  title: "Compliance Documents",
  shortTitle: "Documents",
  icon: FileText,
  description: "Upload required documents",
};
const STEP_REVIEW = {
  title: "Review & Submit",
  shortTitle: "Review",
  icon: Eye,
  description: "Verify and submit",
};

interface UploadedDoc {
  name: string;
  fileName: string;
  size: number;
  file?: File;
}

function consortiumLabelMap(registerForm: RegisterFormPayload): Record<string, string> {
  const m: Record<string, string> = {};
  for (const sec of registerForm.sections) {
    for (const f of sec.fields) {
      if (f.name === "consortiumIds") {
        for (const o of f.options) m[o.value] = o.label;
      }
    }
  }
  return m;
}

const RegisterInstitution = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const queryClient = useQueryClient();
  const { mutateAsync: submitNewInstitution, isPending: submitting } = useCreateInstitution();
  const { data: registerFormMeta, isPending: metaPending, isError: metaError } = useInstitutionFormMetadata();

  const registerForm = registerFormMeta?.registerForm;
  const wizardLocked = metaPending && registerFormMeta === undefined;
  const documentsStepEnabled =
    !wizardLocked &&
    registerFormMeta != null &&
    registerFormMeta.requiredComplianceDocuments != null &&
    registerFormMeta.requiredComplianceDocuments.length > 0;

  const steps = useMemo(() => {
    const s = [STEP_DETAILS];
    if (documentsStepEnabled) s.push(STEP_DOCUMENTS);
    s.push(STEP_REVIEW);
    return s;
  }, [documentsStepEnabled]);

  const reviewStepIndex = steps.length - 1;
  const documentsStepIndex = documentsStepEnabled ? 1 : -1;

  const schema = useMemo(() => buildRegisterDetailsSchema(registerForm), [registerForm]);
  const defaultVals = useMemo(() => defaultValuesFromRegisterForm(registerForm), [registerForm]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const form = useForm<RegisterDetailsValues>({
    resolver,
    defaultValues: defaultVals,
    mode: "onTouched",
  });

  useEffect(() => {
    if (registerForm) {
      form.reset(defaultValuesFromRegisterForm(registerForm));
    }
  }, [registerForm?.geographyId, registerForm, form]);

  const values = form.watch();
  const applicableDocRows = applicableRequiredComplianceDocuments(
    registerFormMeta?.requiredComplianceDocuments ?? null,
    !!values.isDataSubmitter,
    !!values.isSubscriber
  );

  const consortiumNameById = useMemo(
    () => (registerForm ? consortiumLabelMap(registerForm) : {}),
    [registerForm]
  );

  useEffect(() => {
    const allow = new Set(applicableDocRows.map((d) => d.documentName));
    setUploadedDocs((prev) => prev.filter((u) => allow.has(u.name)));
  }, [values.isDataSubmitter, values.isSubscriber, registerFormMeta?.requiredComplianceDocuments]);

  const handleNext = async () => {
    if (currentStep === 0) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, reviewStepIndex));
  };

  const handlePrevious = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleFileUpload = (row: InstitutionRequiredComplianceDocument) => {
    const docName = row.documentName;
    const maxBytes = row.maxSizeBytes ?? 10 * 1024 * 1024;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = row.accept ?? ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > maxBytes) {
        toast.error(`File size must be under ${Math.round(maxBytes / (1024 * 1024))}MB`);
        return;
      }
      setUploadedDocs((prev) => {
        const filtered = prev.filter((d) => d.name !== docName);
        return [...filtered, { name: docName, fileName: file.name, size: file.size, file }];
      });
      toast.success(`${file.name} uploaded`);
    };
    input.click();
  };

  const handleSaveDraft = () => {
    const data = form.getValues();
    localStorage.setItem(
      "hcb_draft_institution",
      JSON.stringify({
        corporateDetails: data,
        uploadedDocs: uploadedDocs.map(({ name, fileName, size }) => ({ name, fileName, size })),
      })
    );
    toast.success("Draft saved");
  };

  const handleSubmit = async () => {
    const data = form.getValues();
    const rf = registerFormMeta?.registerForm;
    if (!rf) {
      toast.error("Form configuration is not loaded.");
      return;
    }
    const valid = await form.trigger();
    if (!valid) return;
    if (!(data.isDataSubmitter || data.isSubscriber)) {
      toast.error("At least one participation type must be selected");
      return;
    }
    if (applicableDocRows.length > 0) {
      if (uploadedDocs.length < applicableDocRows.length) {
        toast.error(`Please upload all ${applicableDocRows.length} required documents`);
        return;
      }
      const missingFiles = uploadedDocs.filter((d) => !d.file);
      if (missingFiles.length > 0) {
        toast.error("Each required document must have a file attached. Re-upload any items loaded from a draft.");
        return;
      }
    }
    try {
      const body = mapRegisterDetailsToCreateBody(data, rf);
      const inst = await submitNewInstitution(body as CreateInstitutionBody);
      let uploadFailed = false;
      if (applicableDocRows.length > 0) {
        for (const d of uploadedDocs) {
          if (!d.file) continue;
          try {
            await uploadInstitutionDocument(inst.id, d.name, d.file);
          } catch {
            uploadFailed = true;
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: QK.institutions.all() });
      await queryClient.invalidateQueries({ queryKey: QK.approvals.all() });
      await queryClient.invalidateQueries({ queryKey: QK.institutions.detail(String(inst.id)) });
      if (uploadFailed) {
        toast.error(
          "Institution was created, but one or more document uploads failed. Retry uploads from the member record when available."
        );
      } else {
        toast.success(
          "Member registered with status Pending — visible in the list below. Complete approval in Approval Queue (Institutions tab)."
        );
      }
      navigate("/institutions");
    } catch {
      // mutation surfaces errors via onError toast
    }
  };

  const completionPct = Math.round((currentStep / Math.max(1, reviewStepIndex)) * 100);

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-4 sm:space-y-6">
        <PageBreadcrumb segments={[
          { label: "Members", href: "/institutions" },
          { label: "Register member" },
        ]} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Register member</h1>
            <p className="text-caption text-muted-foreground mt-0.5">Complete all steps to register a new member institution</p>
            {registerFormMeta?.geographyDescription && (
              <p className="text-[10px] text-muted-foreground mt-1 max-w-xl">{registerFormMeta.geographyDescription}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1.5 self-start">
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex items-stretch flex-nowrap min-w-0">
              {steps.map((step, i) => {
                const isActive = i === currentStep;
                const isCompleted = i < currentStep;
                const isPast = i < currentStep;
                return (
                  <div key={i} className="flex shrink-0 items-stretch min-w-[100px]">
                    {i > 0 && (
                      <div className="flex items-center shrink-0">
                        <div
                          className={cn(
                            "h-px w-3 lg:w-5",
                            isPast || isCompleted ? "bg-secondary" : "bg-border",
                          )}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => isCompleted && setCurrentStep(i)}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 transition-colors shrink-0 text-left w-full min-w-0",
                        isActive && "bg-primary/8",
                        isCompleted && "cursor-pointer hover:bg-muted/50",
                        !isActive && !isCompleted && "cursor-default opacity-60",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold leading-none transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : isCompleted
                              ? "bg-success text-success-foreground"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
                      </div>

                      <div className="min-w-0 max-w-[140px]">
                        <p
                          className={cn(
                            "text-[11px] font-medium leading-[18px] truncate whitespace-nowrap",
                            isActive || isCompleted ? "text-foreground" : "text-muted-foreground",
                          )}
                          title={step.title}
                        >
                          <span className="hidden 2xl:inline">{step.title}</span>
                          <span className="2xl:hidden">{step.shortTitle}</span>
                        </p>
                      </div>

                      {isActive && (
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border flex items-center gap-3 px-2.5 py-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{completionPct}%</span>
          </div>
        </div>

        <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                {(() => { const Icon = steps[currentStep].icon; return <Icon className="w-4.5 h-4.5" />; })()}
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{steps[currentStep].title}</h2>
                <p className="text-caption text-muted-foreground">
                  Step {currentStep + 1} of {steps.length} · {steps[currentStep].description}
                </p>
              </div>
            </div>

            {currentStep === 0 && (
              wizardLocked ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full max-w-md" />
                </div>
              ) : metaError ? (
                <p className="text-sm text-destructive">Could not load register form configuration. Check the API and try again.</p>
              ) : registerForm ? (
                <RegisterStep1 form={form} registerForm={registerForm} metaLoading={metaPending} metaError={metaError} />
              ) : null
            )}
            {documentsStepEnabled && currentStep === documentsStepIndex && (
              <Step2Documents
                rows={applicableDocRows}
                uploadedDocs={uploadedDocs}
                onUpload={handleFileUpload}
              />
            )}
            {currentStep === reviewStepIndex && registerForm && (
              <Step3Review
                values={values}
                registerForm={registerForm}
                uploadedDocs={uploadedDocs}
                applicableDocRows={applicableDocRows}
                consortiumNameById={consortiumNameById}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className={cn("gap-1.5", currentStep === 0 && "invisible")}
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </Button>

          <div className="flex gap-2">
            {currentStep < reviewStepIndex ? (
              <Button onClick={handleNext} className="gap-1.5">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} variant="default" disabled={submitting} className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
                <CheckCircle2 className="w-4 h-4" /> {submitting ? "Submitting…" : "Submit for Review"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

function RegisterStep1({
  form,
  registerForm,
  metaLoading,
  metaError,
}: {
  form: UseFormReturn<RegisterDetailsValues>;
  registerForm: RegisterFormPayload;
  metaLoading: boolean;
  metaError: boolean;
}) {
  const values = form.watch();
  const [consortiumOpen, setConsortiumOpen] = useState(false);

  useEffect(() => {
    if (!values.isSubscriber) {
      form.setValue("consortiumIds", []);
      setConsortiumOpen(false);
    }
  }, [values.isSubscriber, form]);

  return (
    <Form {...form}>
      <div className="space-y-6">
        {registerForm.sections.map((sec) => (
          <RegisterSection
            key={sec.id}
            form={form}
            section={sec}
            values={values}
            metaLoading={metaLoading}
            metaError={metaError}
            consortiumOpen={consortiumOpen}
            setConsortiumOpen={setConsortiumOpen}
          />
        ))}
      </div>
    </Form>
  );
}

function RegisterSection({
  form,
  section,
  values,
  metaLoading,
  metaError,
  consortiumOpen,
  setConsortiumOpen,
}: {
  form: UseFormReturn<RegisterDetailsValues>;
  section: RegisterFormSectionResolved;
  values: RegisterDetailsValues;
  metaLoading: boolean;
  metaError: boolean;
  consortiumOpen: boolean;
  setConsortiumOpen: (v: boolean) => void;
}) {
  if (!sectionIsVisible(section, values)) return null;

  const layout = section.layout ?? "grid2";
  const gridClass =
    layout === "checkboxCards"
      ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
      : layout === "full"
        ? "space-y-4"
        : "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4";

  return (
    <fieldset>
      <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {section.legend}
      </legend>
      <div className={gridClass}>
        {section.fields.map((f) => (
          <RegisterField
            key={f.name}
            form={form}
            field={f}
            section={section}
            metaLoading={metaLoading}
            metaError={metaError}
            consortiumOpen={consortiumOpen}
            setConsortiumOpen={setConsortiumOpen}
          />
        ))}
      </div>
      {section.refineAtLeastOne?.includes("isDataSubmitter") && form.formState.errors.isDataSubmitter?.message && (
        <p className="text-xs text-destructive font-medium mt-2">
          {String(form.formState.errors.isDataSubmitter.message)}
        </p>
      )}
    </fieldset>
  );
}

function RegisterField({
  form,
  field,
  section,
  metaLoading,
  metaError,
  consortiumOpen,
  setConsortiumOpen,
}: {
  form: UseFormReturn<RegisterDetailsValues>;
  field: RegisterFormFieldResolved;
  section: RegisterFormSectionResolved;
  metaLoading: boolean;
  metaError: boolean;
  consortiumOpen: boolean;
  setConsortiumOpen: (v: boolean) => void;
}) {
  const labelSuffix = field.required ? " *" : "";

  if (field.inputType === "checkbox") {
    const id = `reg-${section.id}-${field.name}`;
    return (
      <FormField
        control={form.control}
        name={field.name}
        render={({ field: ff }) => (
          <FormItem>
            <label
              htmlFor={id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-all",
                ff.value ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
              )}
            >
              <FormControl>
                <Checkbox id={id} checked={!!ff.value} onCheckedChange={ff.onChange} />
              </FormControl>
              <div>
                <p className="text-sm font-medium text-foreground">{field.label}</p>
                {field.description && (
                  <p className="text-[10px] text-muted-foreground">{field.description}</p>
                )}
              </div>
            </label>
          </FormItem>
        )}
      />
    );
  }

  if (field.inputType === "multiselect") {
    return (
      <FormField
        control={form.control}
        name={field.name}
        render={({ field: ff }) => {
          const arr = Array.isArray(ff.value) ? (ff.value as string[]) : [];
          const n = arr.length;
          const summary =
            n === 0
              ? field.placeholder ?? "Select…"
              : n === 1
                ? field.options.find((o) => o.value === arr[0])?.label ?? "1 selected"
                : `${n} selected`;
          const opts = field.options;
          return (
            <FormItem className={section.layout === "full" ? "sm:col-span-2" : ""}>
              <FormLabel className="text-xs text-muted-foreground">{field.label}{labelSuffix}</FormLabel>
              <Popover open={consortiumOpen} onOpenChange={setConsortiumOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={consortiumOpen}
                      disabled={metaLoading || (!metaError && opts.length === 0)}
                      className={cn(
                        "h-10 w-full justify-between font-normal px-3",
                        !n && "text-muted-foreground",
                      )}
                    >
                      <span className="truncate text-left">{summary}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  {metaError ? (
                    <p className="text-xs text-destructive p-3">Could not load options.</p>
                  ) : !metaLoading && opts.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No options available.</p>
                  ) : (
                    <ScrollArea className="max-h-60">
                      <div className="p-1 space-y-0.5">
                        {opts.map((c) => {
                          const selected = arr.includes(c.value);
                          return (
                            <button
                              key={c.value}
                              type="button"
                              disabled={metaLoading}
                              onClick={() => {
                                if (selected) ff.onChange(arr.filter((id) => id !== c.value));
                                else ff.onChange([...arr, c.value]);
                              }}
                              className={cn(
                                "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-muted",
                                selected && "bg-muted/80",
                              )}
                            >
                              <Checkbox checked={selected} className="mt-0.5 pointer-events-none" tabIndex={-1} />
                              <span className="min-w-0 text-left">{c.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  if (field.inputType === "select") {
    return (
      <FormField
        control={form.control}
        name={field.name}
        render={({ field: ff }) => (
          <FormItem>
            <FormLabel className="text-xs text-muted-foreground">{field.label}{labelSuffix}</FormLabel>
            <Select
              onValueChange={ff.onChange}
              value={typeof ff.value === "string" ? ff.value : ""}
              disabled={metaLoading || (!metaError && field.options.length === 0)}
            >
              <FormControl>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={metaLoading ? "Loading…" : field.placeholder ?? "Select"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {field.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {metaError && (
              <p className="text-xs text-destructive">Could not load form metadata.</p>
            )}
            {!metaError && !metaLoading && field.options.length === 0 && (
              <p className="text-xs text-muted-foreground">No options configured for this field.</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  const inputType =
    field.inputType === "email" ? "email" : field.inputType === "tel" ? "tel" : "text";

  return (
    <FormField
      control={form.control}
      name={field.name}
      render={({ field: ff }) => (
        <FormItem>
          <FormLabel className="text-xs text-muted-foreground">{field.label}{labelSuffix}</FormLabel>
          <FormControl>
            <Input
              type={inputType}
              placeholder={field.placeholder}
              className="h-10"
              value={typeof ff.value === "string" ? ff.value : ""}
              onChange={ff.onChange}
              onBlur={ff.onBlur}
              name={ff.name}
              ref={ff.ref}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function Step2Documents({
  rows,
  uploadedDocs,
  onUpload,
}: {
  rows: InstitutionRequiredComplianceDocument[];
  uploadedDocs: UploadedDoc[];
  onUpload: (row: InstitutionRequiredComplianceDocument) => void;
}) {
  const uploadedCount = uploadedDocs.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted-foreground">Upload required regulatory documents for verification.</p>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {uploadedCount}/{rows.length} uploaded
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row) => {
          const uploaded = uploadedDocs.find((d) => d.name === row.documentName);
          return (
            <button
              key={row.documentName}
              type="button"
              onClick={() => onUpload(row)}
              className={cn(
                "flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all group",
                uploaded
                  ? "border-success/40 bg-success/5 hover:bg-success/10"
                  : "border-dashed border-border hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                uploaded ? "bg-success/15 text-success" : "bg-muted text-muted-foreground group-hover:text-primary"
              )}>
                {uploaded ? <CheckCircle2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-foreground leading-tight">{row.label}</p>
                {uploaded ? (
                  <p className="text-[10px] text-success mt-0.5 truncate">{uploaded.fileName} · {(uploaded.size / 1024).toFixed(0)} KB</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{row.hint ?? "PDF, JPG or PNG"}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step3Review({
  values,
  registerForm,
  uploadedDocs,
  applicableDocRows,
  consortiumNameById,
}: {
  values: RegisterDetailsValues;
  registerForm: RegisterFormPayload;
  uploadedDocs: UploadedDoc[];
  applicableDocRows: InstitutionRequiredComplianceDocument[];
  consortiumNameById: Record<string, string>;
}) {
  const stringOk = registerForm.sections.every((sec) => {
    if (!sectionIsVisible(sec, values)) return true;
    return sec.fields.every((f) => {
      if (f.inputType === "checkbox" || f.inputType === "multiselect") return true;
      const v = values[f.name];
      if (!f.required) return true;
      return typeof v === "string" && v.trim().length > 0;
    });
  });
  const participationSelected = !!values.isDataSubmitter || !!values.isSubscriber;
  const allDocsUploaded = applicableDocRows.length === 0 || uploadedDocs.length >= applicableDocRows.length;
  const isReady = stringOk && allDocsUploaded && participationSelected;

  const participationSectionLegend =
    registerForm.sections.find((s) => s.id === "participation")?.legend ?? "Participation";
  const consortiumIdsFieldLabel =
    registerForm.sections
      .find((s) => s.id === "consortium")
      ?.fields.find((f) => f.name === "consortiumIds")?.label ?? "Consortiums";

  const reviewBlocks = registerForm.sections
    .filter((sec) => sectionIsVisible(sec, values) && sec.id !== "participation" && sec.id !== "consortium")
    .map((sec) => ({
      title: sec.legend,
      fields: sec.fields
        .filter((f) => f.inputType !== "checkbox" && f.inputType !== "multiselect")
        .map((f) => {
          const v = values[f.name];
          const display = typeof v === "string" ? v : "";
          return [f.label, display || "—"] as [string, string];
        }),
    }));

  return (
    <div className="space-y-5">
      {isReady ? (
        <div className="p-3 rounded-lg border border-success/30 bg-success/5 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <p className="text-caption text-success font-medium">All information is complete. Ready to submit.</p>
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-warning shrink-0" />
          <p className="text-caption text-warning font-medium">Please complete all required fields and upload all documents.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviewBlocks.map((section) => (
          <div key={section.title} className="rounded-lg border border-border p-3.5 space-y-2.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</h4>
            {section.fields.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className={cn("text-body font-medium", value && value !== "—" ? "text-foreground" : "text-muted-foreground")}>{value}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-3.5 space-y-2.5">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {participationSectionLegend}
          </h4>
          <div className="flex flex-wrap gap-2">
            {values.isDataSubmitter && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Data Submission</Badge>}
            {values.isSubscriber && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Subscriber</Badge>}
            {!values.isDataSubmitter && !values.isSubscriber && <span className="text-caption text-muted-foreground">None selected</span>}
          </div>
          {values.isSubscriber && (
            <div className="pt-2 border-t border-border mt-2 space-y-1">
              <p className="text-[10px] text-muted-foreground">{consortiumIdsFieldLabel}</p>
              <p className="text-body font-medium text-foreground">
                {(() => {
                  const ids = Array.isArray(values.consortiumIds) ? values.consortiumIds : [];
                  if (ids.length === 0) return "None selected";
                  return ids.map((id) => consortiumNameById[id] ?? id).join(", ");
                })()}
              </p>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border p-3.5 space-y-2.5">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Documents ({uploadedDocs.length}/{applicableDocRows.length || 0})
          </h4>
          <div className="space-y-1">
            {applicableDocRows.length === 0 ? (
              <p className="text-caption text-muted-foreground">No documents required for this configuration.</p>
            ) : (
              applicableDocRows.map((row) => {
                const uploaded = uploadedDocs.find((d) => d.name === row.documentName);
                return (
                  <div key={row.documentName} className="flex items-center gap-2 text-caption">
                    {uploaded ? (
                      <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-warning shrink-0" />
                    )}
                    <span className={uploaded ? "text-foreground" : "text-muted-foreground"}>{row.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterInstitution;
