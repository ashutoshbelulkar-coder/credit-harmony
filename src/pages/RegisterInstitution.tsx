import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Upload, Building2, FileText, Eye, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { institutionTypes } from "@/data/institutions-mock";
import { toast } from "sonner";
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
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

const steps = [
  { title: "Corporate Details", shortTitle: "Details", icon: Building2, description: "Basic institution information" },
  { title: "Compliance Documents", shortTitle: "Documents", icon: FileText, description: "Upload required documents" },
  { title: "Review & Submit", shortTitle: "Review", icon: Eye, description: "Verify and submit" },
];

const corporateDetailsSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required").max(200),
  tradingName: z.string().trim().min(1, "Trading name is required").max(200),
  registrationNumber: z.string().trim().min(1, "Registration number is required").max(50),
  institutionType: z.string().min(1, "Institution type is required"),
  jurisdiction: z.string().trim().min(1, "Jurisdiction is required").max(100),
  licenseNumber: z.string().trim().min(1, "License number is required").max(50),
  contactEmail: z.string().trim().email("Enter a valid email address").max(255),
  contactPhone: z.string().trim().min(1, "Contact phone is required").max(30),
  isDataSubmitter: z.boolean(),
  isSubscriber: z.boolean(),
}).refine((data) => data.isDataSubmitter || data.isSubscriber, {
  message: "At least one participation type must be selected",
  path: ["isDataSubmitter"],
});

type CorporateDetailsFormData = z.infer<typeof corporateDetailsSchema>;

interface UploadedDoc {
  name: string;
  fileName: string;
  size: number;
}

const baseDocs = [
  "Certificate of Incorporation",
  "Banking License",
  "Data Protection Certificate",
  "Board Resolution",
];

function getRequiredDocs(isDataSubmitter: boolean, isSubscriber: boolean) {
  const docs = [...baseDocs];
  if (isDataSubmitter) docs.push("Data Sharing Agreement");
  if (isSubscriber) {
    docs.push("Subscriber Agreement");
    docs.push("Permitted Use Declaration");
  }
  return docs;
}

const RegisterInstitution = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);

  const form = useForm<CorporateDetailsFormData>({
    resolver: zodResolver(corporateDetailsSchema),
    defaultValues: {
      legalName: "",
      tradingName: "",
      registrationNumber: "",
      institutionType: "",
      jurisdiction: "",
      licenseNumber: "",
      contactEmail: "",
      contactPhone: "",
      isDataSubmitter: false,
      isSubscriber: false,
    },
    mode: "onTouched",
  });

  const handleNext = async () => {
    if (currentStep === 0) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, 2));
  };

  const handlePrevious = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleFileUpload = (docName: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      setUploadedDocs((prev) => {
        const filtered = prev.filter((d) => d.name !== docName);
        return [...filtered, { name: docName, fileName: file.name, size: file.size }];
      });
      toast.success(`${file.name} uploaded`);
    };
    input.click();
  };

  const handleSaveDraft = () => {
    const data = form.getValues();
    localStorage.setItem("hcb_draft_institution", JSON.stringify({ corporateDetails: data, uploadedDocs }));
    toast.success("Draft saved");
  };

  const handleSubmit = () => {
    const data = form.getValues();
    const requiredDocs = getRequiredDocs(data.isDataSubmitter, data.isSubscriber);
    const stringFields = Object.entries(data).filter(([, v]) => typeof v === "string") as [string, string][];
    const allFieldsFilled = stringFields.every(([, v]) => v.trim().length > 0);
    if (!allFieldsFilled) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!(data.isDataSubmitter || data.isSubscriber)) {
      toast.error("At least one participation type must be selected");
      return;
    }
    if (uploadedDocs.length < requiredDocs.length) {
      toast.error(`Please upload all ${requiredDocs.length} required documents`);
      return;
    }
    toast.success("Institution submitted for Super Admin approval. Track status in the Approval Queue.");
    navigate("/approval-queue");
  };

  const values = form.watch();
  const requiredDocs = getRequiredDocs(values.isDataSubmitter, values.isSubscriber);
  const completionPct = Math.round(((currentStep) / 2) * 100);

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-4 sm:space-y-6">
        <PageBreadcrumb segments={[
          { label: "Institutions", href: "/institutions" },
          { label: "Register Institution" },
        ]} />

        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Register Institution</h1>
            <p className="text-caption text-muted-foreground mt-0.5">Complete all steps to register a new institution</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1.5 self-start">
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
        </div>

        {/* Horizontal stepper at top */}
        <Card className="border-border shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === currentStep;
                const isCompleted = i < currentStep;
                return (
                  <div key={i} className="flex items-center flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => isCompleted && setCurrentStep(i)}
                      className={cn(
                        "flex items-center gap-2 sm:gap-3 w-full rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 transition-all text-left",
                        isActive
                          ? "bg-primary/10 border border-primary/20"
                          : isCompleted
                          ? "hover:bg-muted/50 cursor-pointer border border-transparent"
                          : "opacity-50 border border-transparent cursor-default"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0",
                        isCompleted ? "bg-success/15 text-success"
                          : isActive ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </div>
                      <div className="min-w-0 hidden sm:block">
                        <p className={cn(
                          "text-caption font-medium leading-tight truncate",
                          isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate hidden md:block">{step.description}</p>
                      </div>
                      <span className={cn(
                        "text-[11px] font-medium sm:hidden truncate",
                        isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.shortTitle}
                      </span>
                    </button>
                    {i < steps.length - 1 && (
                      <div className={cn(
                        "w-4 sm:w-8 h-px mx-0.5 sm:mx-1 shrink-0",
                        isCompleted ? "bg-success/40" : "bg-border"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{completionPct}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Main content area */}
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

            {currentStep === 0 && <Step1Corporate form={form} />}
            {currentStep === 1 && (
              <Step2Documents
                uploadedDocs={uploadedDocs}
                onUpload={handleFileUpload}
                isDataSubmitter={values.isDataSubmitter}
                isSubscriber={values.isSubscriber}
              />
            )}
            {currentStep === 2 && (
              <Step3Review values={values} uploadedDocs={uploadedDocs} />
            )}
          </CardContent>
        </Card>

        {/* Actions footer */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className={cn("gap-1.5", currentStep === 0 && "invisible")}
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </Button>

          <div className="flex gap-2">
            {currentStep < 2 ? (
              <Button onClick={handleNext} className="gap-1.5">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} variant="default" className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
                <CheckCircle2 className="w-4 h-4" /> Submit for Review
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

/* ─── Step 1: Corporate Details ─── */
function Step1Corporate({ form }: { form: ReturnType<typeof useForm<CorporateDetailsFormData>> }) {
  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Entity Information */}
        <fieldset>
          <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Entity Information</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <FormField control={form.control} name="legalName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Legal Name *</FormLabel>
                <FormControl><Input placeholder="Enter legal entity name" className="h-10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tradingName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Trading Name *</FormLabel>
                <FormControl><Input placeholder="Enter trading name" className="h-10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="registrationNumber" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Registration Number *</FormLabel>
                <FormControl><Input placeholder="e.g. BK-2024-00142" className="h-10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="institutionType" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Institution Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {institutionTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </fieldset>

        {/* Regulatory */}
        <fieldset>
          <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Regulatory Details</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <FormField control={form.control} name="jurisdiction" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Jurisdiction *</FormLabel>
                <FormControl><Input placeholder="e.g. Kenya" className="h-10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="licenseNumber" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">License Number *</FormLabel>
                <FormControl><Input placeholder="Enter license number" className="h-10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </fieldset>

        {/* Contact */}
        <fieldset>
          <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Information</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <FormField control={form.control} name="contactEmail" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Contact Email *</FormLabel>
                <FormControl><Input type="email" placeholder="compliance@institution.com" className="h-10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="contactPhone" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Contact Phone *</FormLabel>
                <FormControl><Input placeholder="+254 700 000 000" className="h-10" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </fieldset>

        {/* Participation Type */}
        <fieldset>
          <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Participation Type</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField control={form.control} name="isDataSubmitter" render={({ field }) => (
              <FormItem>
                <label
                  htmlFor="participation-ds"
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-all",
                    field.value ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
                  )}
                >
                  <FormControl>
                    <Checkbox id="participation-ds" checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <p className="text-sm font-medium text-foreground">Data Submission</p>
                    <p className="text-[10px] text-muted-foreground">Submit credit data to the bureau</p>
                  </div>
                </label>
              </FormItem>
            )} />
            <FormField control={form.control} name="isSubscriber" render={({ field }) => (
              <FormItem>
                <label
                  htmlFor="participation-sub"
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-all",
                    field.value ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
                  )}
                >
                  <FormControl>
                    <Checkbox id="participation-sub" checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <p className="text-sm font-medium text-foreground">Subscriber</p>
                    <p className="text-[10px] text-muted-foreground">Query credit reports from the bureau</p>
                  </div>
                </label>
              </FormItem>
            )} />
          </div>
          {form.formState.errors.isDataSubmitter && (
            <p className="text-xs text-destructive font-medium mt-2">{form.formState.errors.isDataSubmitter.message}</p>
          )}
        </fieldset>
      </div>
    </Form>
  );
}

/* ─── Step 2: Documents ─── */
function Step2Documents({
  uploadedDocs,
  onUpload,
  isDataSubmitter,
  isSubscriber,
}: {
  uploadedDocs: UploadedDoc[];
  onUpload: (docName: string) => void;
  isDataSubmitter: boolean;
  isSubscriber: boolean;
}) {
  const requiredDocs = getRequiredDocs(isDataSubmitter, isSubscriber);
  const uploadedCount = uploadedDocs.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-caption text-muted-foreground">Upload required regulatory documents for verification.</p>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {uploadedCount}/{requiredDocs.length} uploaded
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {requiredDocs.map((doc) => {
          const uploaded = uploadedDocs.find((d) => d.name === doc);
          return (
            <button
              key={doc}
              type="button"
              onClick={() => onUpload(doc)}
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
                <p className="text-body font-medium text-foreground leading-tight">{doc}</p>
                {uploaded ? (
                  <p className="text-[10px] text-success mt-0.5 truncate">{uploaded.fileName} · {(uploaded.size / 1024).toFixed(0)} KB</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">PDF, JPG or PNG · up to 10MB</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 3: Review ─── */
function Step3Review({
  values,
  uploadedDocs,
}: {
  values: CorporateDetailsFormData;
  uploadedDocs: UploadedDoc[];
}) {
  const requiredDocs = getRequiredDocs(values.isDataSubmitter, values.isSubscriber);
  const stringFields = Object.entries(values).filter(([, v]) => typeof v === "string") as [string, string][];
  const allFieldsFilled = stringFields.every(([, v]) => v.trim().length > 0);
  const participationSelected = values.isDataSubmitter || values.isSubscriber;
  const allDocsUploaded = uploadedDocs.length >= requiredDocs.length;
  const isReady = allFieldsFilled && allDocsUploaded && participationSelected;

  const sections = [
    {
      title: "Entity Information",
      fields: [
        ["Legal Name", values.legalName],
        ["Trading Name", values.tradingName],
        ["Registration No.", values.registrationNumber],
        ["Institution Type", values.institutionType],
      ],
    },
    {
      title: "Regulatory Details",
      fields: [
        ["Jurisdiction", values.jurisdiction],
        ["License Number", values.licenseNumber],
      ],
    },
    {
      title: "Contact",
      fields: [
        ["Email", values.contactEmail],
        ["Phone", values.contactPhone],
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Status banner */}
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

      {/* Info sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-border p-3.5 space-y-2.5">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</h4>
            {section.fields.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className={cn("text-body font-medium", value ? "text-foreground" : "text-muted-foreground")}>{value || "—"}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Participation + Documents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-3.5 space-y-2.5">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Participation</h4>
          <div className="flex flex-wrap gap-2">
            {values.isDataSubmitter && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Data Submission</Badge>}
            {values.isSubscriber && <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Subscriber</Badge>}
            {!values.isDataSubmitter && !values.isSubscriber && <span className="text-caption text-muted-foreground">None selected</span>}
          </div>
        </div>
        <div className="rounded-lg border border-border p-3.5 space-y-2.5">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Documents ({uploadedDocs.length}/{requiredDocs.length})
          </h4>
          <div className="space-y-1">
            {requiredDocs.map((doc) => {
              const uploaded = uploadedDocs.find((d) => d.name === doc);
              return (
                <div key={doc} className="flex items-center gap-2 text-caption">
                  {uploaded ? (
                    <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-warning shrink-0" />
                  )}
                  <span className={uploaded ? "text-foreground" : "text-muted-foreground"}>{doc}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterInstitution;
