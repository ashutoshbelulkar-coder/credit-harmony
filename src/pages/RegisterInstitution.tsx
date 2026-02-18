import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Upload, Building2, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { title: "Corporate Details", icon: Building2 },
  { title: "Compliance Documents", icon: FileText },
  { title: "Review & Submit", icon: Eye },
];

const RegisterInstitution = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

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
          {currentStep === 0 && <Step1 />}
          {currentStep === 1 && <Step2 />}
          {currentStep === 2 && <Step3 />}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
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
            <button className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Save Draft
            </button>
            {currentStep < 2 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/90 transition-colors">
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

function Step1() {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Corporate Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Legal Name", placeholder: "Enter legal entity name" },
          { label: "Trading Name", placeholder: "Enter trading name" },
          { label: "Registration Number", placeholder: "e.g. BK-2024-00142" },
          { label: "Institution Type", placeholder: "Select type", type: "select" },
          { label: "Jurisdiction", placeholder: "Select country" },
          { label: "License Number", placeholder: "Enter license number" },
          { label: "Contact Email", placeholder: "compliance@institution.com" },
          { label: "Contact Phone", placeholder: "+254 700 000 000" },
        ].map((field) => (
          <div key={field.label}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
            <input
              type="text"
              placeholder={field.placeholder}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Step2() {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Compliance Documents</h3>
      <p className="text-xs text-muted-foreground">Upload required regulatory documents for verification.</p>
      <div className="space-y-3">
        {["Certificate of Incorporation", "Banking License", "Data Protection Certificate", "Board Resolution"].map((doc) => (
          <div key={doc} className="flex items-center justify-between p-4 rounded-lg border border-dashed border-border hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{doc}</p>
                <p className="text-xs text-muted-foreground">PDF, JPG or PNG up to 10MB</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Review & Submit</h3>
      <p className="text-xs text-muted-foreground">Please review all information before submitting.</p>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {[
          ["Legal Name", "—"],
          ["Registration No.", "—"],
          ["Institution Type", "—"],
          ["Contact Email", "—"],
          ["Documents Uploaded", "0 / 4"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
        <p className="text-xs text-warning font-medium">
          ⚠ Please fill in all required fields and upload documents before submitting.
        </p>
      </div>
    </div>
  );
}

export default RegisterInstitution;
