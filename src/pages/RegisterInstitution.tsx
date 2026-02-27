import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Upload, Building2, FileText, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { institutionTypes } from "@/data/institutions-mock";
import { toast } from "sonner";
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

const steps = [
  { title: "Corporate Details", icon: Building2 },
  { title: "Compliance Documents", icon: FileText },
  { title: "Review & Submit", icon: Eye },
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
    toast.success("Institution submitted for review");
    navigate("/institutions");
  };

  const values = form.watch();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        {/* Back */}
        <button
          onClick={() => navigate("/institutions")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Institutions
        </button>

        <h1 className="text-2xl font-bold text-foreground">Register Institution</h1>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium transition-colors",
                i < currentStep
                  ? "bg-success text-success-foreground"
                  : i === currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-sm font-medium hidden sm:block",
                i <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
              {i < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-px",
                  i < currentStep ? "bg-success" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-xl border border-border p-6">
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
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              currentStep > 0
                ? "bg-muted text-foreground hover:bg-muted/80"
                : "invisible"
            )}
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Save Draft
            </button>
            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/90 transition-colors"
              >
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

function Step1Corporate({ form }: { form: ReturnType<typeof useForm<CorporateDetailsFormData>> }) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Corporate Details</h3>
      <Form {...form}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="legalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Legal Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter legal entity name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tradingName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Trading Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter trading name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="registrationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Registration Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. BK-2024-00142" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="institutionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Institution Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {institutionTypes.map((t) => (
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
            name="jurisdiction"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Jurisdiction</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Kenya" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">License Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter license number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="compliance@institution.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Contact Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+254 700 000 000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-6 pt-5 border-t border-border">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Participation Type</h4>
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="isDataSubmitter"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm text-foreground font-medium cursor-pointer">
                    Data Submission Institution
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isSubscriber"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm text-foreground font-medium cursor-pointer">
                    Subscriber Institution
                  </FormLabel>
                </FormItem>
              )}
            />
            {form.formState.errors.isDataSubmitter && (
              <p className="text-xs text-destructive font-medium">
                {form.formState.errors.isDataSubmitter.message}
              </p>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}

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
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Compliance Documents</h3>
      <p className="text-xs text-muted-foreground">Upload required regulatory documents for verification.</p>
      <div className="space-y-3">
        {requiredDocs.map((doc) => {
          const uploaded = uploadedDocs.find((d) => d.name === doc);
          return (
            <div
              key={doc}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border transition-colors",
                uploaded
                  ? "border-success/40 bg-success/5"
                  : "border-dashed border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-3">
                {uploaded ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{doc}</p>
                  {uploaded ? (
                    <p className="text-xs text-success">{uploaded.fileName} ({(uploaded.size / 1024).toFixed(0)} KB)</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">PDF, JPG or PNG up to 10MB</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onUpload(doc)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  uploaded
                    ? "border-success/30 text-success hover:bg-success/10"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <Upload className="w-3.5 h-3.5" /> {uploaded ? "Replace" : "Upload"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

  const summaryFields: [string, string][] = [
    ["Legal Name", values.legalName || "—"],
    ["Trading Name", values.tradingName || "—"],
    ["Registration No.", values.registrationNumber || "—"],
    ["Institution Type", values.institutionType || "—"],
    ["Jurisdiction", values.jurisdiction || "—"],
    ["License Number", values.licenseNumber || "—"],
    ["Contact Email", values.contactEmail || "—"],
    ["Contact Phone", values.contactPhone || "—"],
    ["Documents Uploaded", `${uploadedDocs.length} / ${requiredDocs.length}`],
  ];

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Review & Submit</h3>
      <p className="text-xs text-muted-foreground">Please review all information before submitting.</p>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {summaryFields.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn(
              "text-xs font-medium",
              value === "—" ? "text-muted-foreground" : "text-foreground"
            )}>{value}</span>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Participation Summary</h4>
        <div className="flex justify-between">
          <span className="text-xs text-muted-foreground">Data Submission</span>
          <span className={cn("text-xs font-medium", values.isDataSubmitter ? "text-success" : "text-muted-foreground")}>
            {values.isDataSubmitter ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-muted-foreground">Subscriber</span>
          <span className={cn("text-xs font-medium", values.isSubscriber ? "text-success" : "text-muted-foreground")}>
            {values.isSubscriber ? "Yes" : "No"}
          </span>
        </div>
      </div>

      {!isReady && (
        <div className="p-4 rounded-lg border border-warning/30 bg-warning/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning font-medium">
            Please fill in all required fields and upload all documents before submitting.
          </p>
        </div>
      )}
      {isReady && (
        <div className="p-4 rounded-lg border border-success/30 bg-success/5 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
          <p className="text-xs text-success font-medium">
            All information is complete. Ready to submit for review.
          </p>
        </div>
      )}
    </div>
  );
}

export default RegisterInstitution;
