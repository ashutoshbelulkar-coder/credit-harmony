import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  HelpCircle,
  Plus,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertySmartSearch } from "@/components/real-estate-bureau/inquiry/PropertySmartSearch";
import { SCENARIO_1_FORM, SCENARIO_2_FORM } from "@/lib/real-estate-bureau/mock-data";
import {
  BUREAU_ID_TYPES,
  bureauIdPlaceholder,
  formatBureauIdValue,
} from "@/lib/real-estate-bureau/bureau-id-types";
import {
  getMissingPropertyDetailFields,
  smartInquiryToFormData,
  type SmartInquiryInput,
} from "@/lib/real-estate-bureau/inquiry-intelligence";
import type {
  CoBorrowerEntry,
  InquiryFormData,
  PropertySearchSuggestion,
} from "@/lib/real-estate-bureau/types";
import { toast } from "sonner";

const SEARCH_TYPE = "borrower_property" as const;

const ASSISTANCE = [
  {
    title: "Don't know survey number?",
    body: "Search using project name or address. The bureau enriches records from member and CERSAI sources.",
  },
  {
    title: "Don't know registration number?",
    body: "Search using borrower details and property location. Registration can be resolved post-match.",
  },
];

function newCoBorrowerId() {
  return `co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface SmartGuidedInquiryProps {
  onSubmit: (form: InquiryFormData, scenario: "single_match" | "multiple_match") => void;
}

export function SmartGuidedInquiry({ onSubmit }: SmartGuidedInquiryProps) {
  const [borrowerName, setBorrowerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [idType, setIdType] = useState("PAN");
  const [idNumber, setIdNumber] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [coBorrowers, setCoBorrowers] = useState<CoBorrowerEntry[]>([]);
  const [propertyQuery, setPropertyQuery] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PropertySearchSuggestion | null>(null);
  const [property, setProperty] = useState<SmartInquiryInput["property"]>({});
  const [registration, setRegistration] = useState<SmartInquiryInput["registration"]>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pendingScenario, setPendingScenario] = useState<"single_match" | "multiple_match">(
    "single_match"
  );

  const smartInput: SmartInquiryInput = useMemo(
    () => ({
      searchType: SEARCH_TYPE,
      borrowerName,
      mobile,
      pan: idType === "PAN" ? idNumber : "",
      idType,
      idNumber,
      currentAddress,
      dob,
      email,
      propertyQuery,
      selectedSuggestion,
      property,
      registration,
    }),
    [
      borrowerName,
      mobile,
      idType,
      idNumber,
      currentAddress,
      dob,
      email,
      propertyQuery,
      selectedSuggestion,
      property,
      registration,
    ]
  );

  const loadScenario = (which: 1 | 2) => {
    const form = which === 1 ? SCENARIO_1_FORM : SCENARIO_2_FORM;
    setBorrowerName(form.borrower.borrowerName);
    setMobile(form.borrower.mobileNumber);
    setIdType(form.borrower.idType ?? "PAN");
    setIdNumber(form.borrower.idNumber ?? form.borrower.pan);
    setCurrentAddress(form.borrower.currentAddress ?? "");
    setDob(form.borrower.dateOfBirth);
    setEmail(form.borrower.email);
    setCoBorrowers(
      form.borrower.coBorrowerName
        ? [
            {
              id: newCoBorrowerId(),
              name: form.borrower.coBorrowerName,
              pan: form.borrower.coBorrowerPan ?? "",
              idType: "PAN",
              idNumber: form.borrower.coBorrowerPan ?? "",
              mobile: "",
              relationship: "Co-Borrower",
            },
          ]
        : []
    );
    setPropertyQuery(
      `${form.property.flatNumber ? `Flat ${form.property.flatNumber} ` : ""}${form.property.projectName}, ${form.property.locality}`
    );
    setSelectedSuggestion(null);
    setProperty({
      projectName: form.property.projectName,
      locality: form.property.locality,
      city: form.property.city,
      state: form.property.state,
      pincode: form.property.pincode,
      flatNumber: form.property.flatNumber,
      buildingName: form.property.buildingName,
      towerName: form.property.towerName,
      surveyNumber: form.property.surveyNumber,
      addressLine1: form.property.addressLine1,
    });
    setRegistration({ ...form.registration });
    setPendingScenario(which === 1 ? "single_match" : "multiple_match");
    toast.success(`Scenario ${which} loaded`);
  };

  const validate = (): boolean => {
    const missingProperty = getMissingPropertyDetailFields(property);
    if (missingProperty.length > 0) {
      toast.error(`Complete property details: ${missingProperty.join(", ")}.`);
      return false;
    }
    if (!borrowerName.trim() || !mobile.trim()) {
      toast.error("Borrower name and mobile number are required.");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const form = smartInquiryToFormData(smartInput, coBorrowers);
    onSubmit(form, pendingScenario);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => loadScenario(1)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AUTO FILL SCENARIO 1
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => loadScenario(2)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AUTO FILL SCENARIO 2
        </Button>
      </div>

      <div className="space-y-5 min-w-0">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
              <StepLabel step={1} title="Borrower details" />
              <p className="text-caption text-muted-foreground mt-1 mb-4">
                Tell us what you know — the bureau will enrich the rest.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <RequiredField label="Borrower Name">
                  <Input
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                  />
                </RequiredField>
                <RequiredField label="Mobile Number">
                  <Input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile"
                  />
                </RequiredField>
                <BureauIdFields
                  idType={idType}
                  idNumber={idNumber}
                  onIdTypeChange={setIdType}
                  onIdNumberChange={(v) => setIdNumber(formatBureauIdValue(idType, v))}
                />
                <OptionalField label="Date of Birth">
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </OptionalField>
                <OptionalField label="Current Address" className="sm:col-span-2">
                  <Input
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    placeholder="House no., street, locality, city, pincode"
                  />
                </OptionalField>
                <OptionalField label="Email" className="sm:col-span-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="borrower@email.com"
                  />
                </OptionalField>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                {coBorrowers.map((co, index) => (
                  <div
                    key={co.id}
                    className="rounded-lg border border-border bg-muted/20 p-3 mb-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-semibold text-foreground flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        Co-Borrower {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() =>
                          setCoBorrowers((list) => list.filter((c) => c.id !== co.id))
                        }
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <OptionalField label="Name">
                        <Input
                          value={co.name}
                          onChange={(e) =>
                            setCoBorrowers((list) =>
                              list.map((c) =>
                                c.id === co.id ? { ...c, name: e.target.value } : c
                              )
                            )
                          }
                        />
                      </OptionalField>
                      <BureauIdFields
                        idType={co.idType ?? "PAN"}
                        idNumber={co.idNumber ?? co.pan}
                        onIdTypeChange={(type) =>
                          setCoBorrowers((list) =>
                            list.map((c) =>
                              c.id === co.id
                                ? {
                                    ...c,
                                    idType: type,
                                    pan: type === "PAN" ? c.idNumber ?? c.pan : "",
                                  }
                                : c
                            )
                          )
                        }
                        onIdNumberChange={(v) => {
                          const type = co.idType ?? "PAN";
                          const formatted = formatBureauIdValue(type, v);
                          setCoBorrowers((list) =>
                            list.map((c) =>
                              c.id === co.id
                                ? {
                                    ...c,
                                    idNumber: formatted,
                                    pan: type === "PAN" ? formatted : c.pan,
                                  }
                                : c
                            )
                          );
                        }}
                      />
                      <OptionalField label="Mobile">
                        <Input
                          value={co.mobile}
                          onChange={(e) =>
                            setCoBorrowers((list) =>
                              list.map((c) =>
                                c.id === co.id ? { ...c, mobile: e.target.value } : c
                              )
                            )
                          }
                        />
                      </OptionalField>
                      <OptionalField label="Relationship">
                        <Select
                          value={co.relationship}
                          onValueChange={(v) =>
                            setCoBorrowers((list) =>
                              list.map((c) => (c.id === co.id ? { ...c, relationship: v } : c))
                            )
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Spouse">Spouse</SelectItem>
                            <SelectItem value="Co-Borrower">Co-Borrower</SelectItem>
                            <SelectItem value="Parent">Parent</SelectItem>
                            <SelectItem value="Sibling">Sibling</SelectItem>
                          </SelectContent>
                        </Select>
                      </OptionalField>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    setCoBorrowers((list) => [
                      ...list,
                      {
                        id: newCoBorrowerId(),
                        name: "",
                        pan: "",
                        idType: "PAN",
                        idNumber: "",
                        mobile: "",
                        relationship: "Co-Borrower",
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Co-Borrower
                </Button>
              </div>
            </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
            <StepLabel step={2} title="Property search" />
            <p className="text-caption text-muted-foreground mt-1 mb-3">
              Enter what you know — project, address, survey or flat number.
            </p>

            <PropertySmartSearch
              propertyQuery={propertyQuery}
              onPropertyQueryChange={setPropertyQuery}
              selectedSuggestion={selectedSuggestion}
              onSelectSuggestion={setSelectedSuggestion}
              property={property}
              onPropertyChange={setProperty}
            />

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md py-2 text-body font-medium text-foreground hover:bg-muted/40 px-1"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      advancedOpen && "rotate-180"
                    )}
                  />
                  Advanced Property Search
                  <Badge variant="outline" className="text-[9px] ml-1">
                    Optional
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid sm:grid-cols-2 gap-3 rounded-lg border border-dashed border-border bg-muted/10 p-3">
                  {(
                    [
                      ["surveyNumber", "Survey Number"],
                      ["ctsNumber", "CTS Number"],
                      ["khataNumber", "Khata Number"],
                      ["plotNumber", "Plot Number"],
                      ["flatNumber", "Flat Number"],
                      ["floorNumber", "Floor Number"],
                      ["buildingName", "Building Name"],
                      ["towerName", "Tower Name"],
                    ] as const
                  ).map(([key, label]) => (
                    <AdvancedField
                      key={key}
                      label={label}
                      value={property[key] ?? ""}
                      onChange={(v) => setProperty((p) => ({ ...p, [key]: v }))}
                    />
                  ))}
                  <AdvancedField
                    label="Registration Number"
                    value={registration.registrationNumber ?? ""}
                    onChange={(v) =>
                      setRegistration((r) => ({ ...r, registrationNumber: v }))
                    }
                  />
                  <AdvancedField
                    label="Sale Deed Number"
                    value={registration.saleDeedNumber ?? ""}
                    onChange={(v) => setRegistration((r) => ({ ...r, saleDeedNumber: v }))}
                  />
                  <AdvancedField
                    label="Registrar Office"
                    className="sm:col-span-2"
                    value={registration.registrarOffice ?? ""}
                    onChange={(v) =>
                      setRegistration((r) => ({ ...r, registrarOffice: v }))
                    }
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* Assistance */}
          <div className="grid sm:grid-cols-2 gap-3">
            {ASSISTANCE.map((a) => (
              <div
                key={a.title}
                className="rounded-lg border border-border bg-muted/20 p-3 flex gap-2"
              >
                <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-caption font-semibold text-foreground">{a.title}</p>
                  <p className="text-caption text-muted-foreground mt-0.5">{a.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="gap-2 min-w-[200px]">
              <Building2 className="h-3.5 w-3.5" />
              Generate Property Report
            </Button>
          </div>
      </div>
    </form>
  );
}

function StepLabel({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
        {step}
      </span>
      <h2 className="text-h4 font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function RequiredField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-caption text-foreground font-medium">
        {label} <span className="text-destructive">*</span>
      </Label>
      {children}
    </div>
  );
}

function OptionalField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-caption text-muted-foreground">
        {label}{" "}
        <span className="text-muted-foreground/70 font-normal">(Optional)</span>
      </Label>
      {children}
    </div>
  );
}

function BureauIdFields({
  idType,
  idNumber,
  onIdTypeChange,
  onIdNumberChange,
  className,
}: {
  idType: string;
  idNumber: string;
  onIdTypeChange: (type: string) => void;
  onIdNumberChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("sm:col-span-2 grid sm:grid-cols-2 gap-3", className)}>
      <OptionalField label="ID Type">
        <Select
          value={idType}
          onValueChange={(v) => {
            onIdTypeChange(v);
            onIdNumberChange(formatBureauIdValue(v, idNumber));
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select ID type" />
          </SelectTrigger>
          <SelectContent>
            {BUREAU_ID_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </OptionalField>
      <OptionalField label="ID Number">
        <Input
          value={idNumber}
          onChange={(e) => onIdNumberChange(e.target.value)}
          placeholder={bureauIdPlaceholder(idType)}
        />
      </OptionalField>
    </div>
  );
}

function AdvancedField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-[10px] text-muted-foreground">
        {label}{" "}
        <span className="text-muted-foreground/60">Advanced · Optional</span>
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-caption"
      />
    </div>
  );
}
