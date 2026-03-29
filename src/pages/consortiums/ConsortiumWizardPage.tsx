import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronRight, FileStack, Shield, Users, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableHeaderClasses } from "@/lib/typography";
import {
  consortiumGovernanceModels,
  consortiumPurposes,
  type ConsortiumDataPolicy,
  type ConsortiumMember,
  type ConsortiumType,
} from "@/data/consortiums-mock";
import { toast } from "sonner";
import { useConsortium, useConsortiumMembers, useCreateConsortium, useUpdateConsortium } from "@/hooks/api/useConsortiums";
import { useInstitutions } from "@/hooks/api/useInstitutions";

const steps = [
  { title: "Basic info", shortTitle: "Info", icon: FileStack },
  { title: "Members", shortTitle: "Members", icon: Users },
  { title: "Data policy", shortTitle: "Policy", icon: Shield },
  { title: "Review", shortTitle: "Review", icon: Eye },
] as const;

function buildSummaryFromPolicy(policy: ConsortiumDataPolicy): {
  totalRecordsShared: string;
  lastUpdated: string;
  dataTypes: string[];
} {
  const dataTypes: string[] = [];
  if (policy.shareLoanData) dataTypes.push("Loan performance");
  if (policy.shareRepaymentHistory) dataTypes.push("Repayment history");
  if (policy.allowAggregation) dataTypes.push("Aggregated insights");
  const visibilityLabel =
    policy.dataVisibility === "masked_pii"
      ? "Masked PII"
      : policy.dataVisibility === "derived"
      ? "Derived"
      : "Full details";
  dataTypes.push(`Visibility: ${visibilityLabel}`);
  return {
    totalRecordsShared: "—",
    lastUpdated: new Date().toISOString().replace("T", " ").slice(0, 22) + " UTC",
    dataTypes,
  };
}

export default function ConsortiumWizardPage() {
  const { id: paramId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isEdit = Boolean(paramId && location.pathname.endsWith("/edit"));
  const editId = isEdit ? paramId! : undefined;

  const { data: existing } = useConsortium(editId);
  const { data: existingMembers } = useConsortiumMembers(editId);
  const { mutate: createConsortium, isPending: creating } = useCreateConsortium();
  const { mutate: updateConsortium, isPending: updating } = useUpdateConsortium();
  const { data: institutionsPage } = useInstitutions({ size: 50 });
  const institutionList = institutionsPage?.content ?? [];

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState<ConsortiumType>("Closed");
  const [purpose, setPurpose] = useState<string>(consortiumPurposes[0]);
  const [governanceModel, setGovernanceModel] = useState<string>(
    consortiumGovernanceModels[0]
  );
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<ConsortiumMember[]>([]);
  const [institutionOpen, setInstitutionOpen] = useState(false);
  const [dataPolicy, setDataPolicy] = useState<ConsortiumDataPolicy>({
    shareLoanData: true,
    shareRepaymentHistory: true,
    allowAggregation: true,
    dataVisibility: "full",
  });

  useEffect(() => {
    if (existing && editId) {
      setName(existing.name);
      setType((existing.type as ConsortiumType) ?? "Closed");
      setPurpose(existing.purpose ?? consortiumPurposes[0]);
      setGovernanceModel(existing.governanceModel ?? consortiumGovernanceModels[0]);
      setDescription(existing.description ?? "");
      // dataPolicy is a UI-only construct; keep form defaults when loading existing
    } else if (!isEdit) {
      setName("");
      setType("Closed");
      setPurpose(consortiumPurposes[0]);
      setGovernanceModel(consortiumGovernanceModels[0]);
      setDescription("");
      setMembers([]);
      setDataPolicy({
        shareLoanData: true,
        shareRepaymentHistory: true,
        allowAggregation: true,
        dataVisibility: "full",
      });
      setCurrentStep(0);
    }
  }, [existing, editId, isEdit]);

  // Seed members from API when editing
  useEffect(() => {
    if (!existingMembers) return;
    const rows = Array.isArray(existingMembers)
      ? existingMembers
      : (existingMembers as { content?: ConsortiumMember[] }).content ?? [];
    if (rows.length > 0) setMembers(rows as ConsortiumMember[]);
  }, [existingMembers]);

  const addInstitution = useCallback((instId: string, instName: string) => {
    setMembers((prev) => {
      if (prev.some((m) => m.institutionId === instId)) return prev;
      const joined = new Date().toISOString().slice(0, 10);
      return [
        ...prev,
        {
          institutionId: instId,
          institutionName: instName,
          role: "Contributor" as const,
          joinedDate: joined,
          status: "active" as const,
        },
      ];
    });
    setInstitutionOpen(false);
  }, []);

  const removeMember = (instId: string) => {
    setMembers((prev) => prev.filter((m) => m.institutionId !== instId));
  };

  const setMemberRole = (instId: string, role: "Contributor" | "Consumer") => {
    setMembers((prev) =>
      prev.map((m) => (m.institutionId === instId ? { ...m, role } : m))
    );
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!name.trim()) {
        toast.error("Consortium name is required");
        return;
      }
    }
    if (currentStep === 1) {
      if (members.length === 0) {
        toast.error("Add at least one member");
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = () => {
    if (!name.trim() || members.length === 0) {
      toast.error("Complete required fields");
      return;
    }
    const memberPayload = members.map((m) => ({
      institutionId: m.institutionId,
      role: m.role,
    }));
    const policyPayload = {
      shareLoanData: dataPolicy.shareLoanData,
      shareRepaymentHistory: dataPolicy.shareRepaymentHistory,
      allowAggregation: dataPolicy.allowAggregation,
      dataVisibility: dataPolicy.dataVisibility,
    };

    if (isEdit && editId) {
      updateConsortium(
        {
          id: editId,
          data: {
            name: name.trim(),
            type,
            purpose,
            governanceModel,
            description: description.trim() || undefined,
            status: existing?.status,
            dataPolicy: policyPayload,
            members: memberPayload,
          },
        },
        { onSuccess: () => navigate(`/consortiums/${editId}`) }
      );
    } else {
      createConsortium(
        {
          name: name.trim(),
          type,
          purpose,
          governanceModel,
          description: description.trim() || undefined,
          status: "approval_pending",
          dataPolicy: policyPayload,
          members: memberPayload,
        },
        { onSuccess: (row) => navigate(`/consortiums/${row.id}`) }
      );
    }
  };

  if (isEdit && !existing) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-fade-in">
          <p className="text-muted-foreground">Consortium not found.</p>
          <Button type="button" variant="outline" onClick={() => navigate("/consortiums")}>
            Back to consortiums
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const StepperHeader = () => (
    <>
      <div className="md:hidden rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden p-2 space-y-1">
        {steps.map((step, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <button
              key={step.title}
              type="button"
              onClick={() => isCompleted && setCurrentStep(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                isActive && "bg-primary/8",
                isCompleted && "cursor-pointer hover:bg-muted/50",
                !isActive && !isCompleted && "opacity-60"
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className="text-[11px] font-medium leading-[18px]">{step.title}</span>
            </button>
          );
        })}
      </div>
      <div className="hidden md:block rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex items-stretch flex-nowrap min-w-0">
            {steps.map((step, i) => {
              const isActive = i === currentStep;
              const isCompleted = i < currentStep;
              const isPast = i < currentStep;
              const StepIcon = step.icon;
              return (
                <div key={step.title} className="flex shrink-0 items-stretch min-w-[100px]">
                  {i > 0 && (
                    <div className="flex items-center shrink-0">
                      <div
                        className={cn(
                          "h-px w-3 lg:w-5",
                          isPast || isCompleted ? "bg-secondary" : "bg-border"
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
                      !isActive && !isCompleted && "cursor-default opacity-60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isCompleted
                            ? "bg-success text-success-foreground"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <div className="min-w-0 max-w-[140px]">
                      <p
                        className={cn(
                          "text-[11px] font-medium leading-[18px] truncate",
                          isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <span className="hidden 2xl:inline">{step.title}</span>
                        <span className="2xl:hidden">{step.shortTitle}</span>
                      </p>
                    </div>
                    <StepIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground hidden xl:block" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl w-full">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Consortiums", href: "/consortiums" },
          { label: isEdit ? "Edit consortium" : "Create consortium" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">
            {isEdit ? "Edit consortium" : "Create consortium"}
          </h1>
          <p className="text-caption text-muted-foreground mt-1">
            {steps[currentStep].title}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate("/consortiums")}>
          Cancel
        </Button>
      </div>

      <StepperHeader />

      {currentStep === 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-h4 font-medium">Basic info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6 md:gap-y-4">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="cw-name" className="text-caption">
                Name
              </Label>
              <Input id="cw-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-caption">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ConsortiumType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-caption">Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {consortiumPurposes.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-caption">Governance model</Label>
              <Select value={governanceModel} onValueChange={setGovernanceModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {consortiumGovernanceModels.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-0 md:col-span-2">
              <Label htmlFor="cw-desc" className="text-caption">
                Description (optional)
              </Label>
              <Textarea
                id="cw-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-y min-h-[72px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-h4 font-medium">Members</CardTitle>
            <Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="shrink-0">
                  Add institution
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[min(100vw-2rem,320px)]" align="end">
                <Command>
                  <CommandInput placeholder="Search institutions..." />
                  <CommandList>
                    <CommandEmpty>No institution found.</CommandEmpty>
                    <CommandGroup>
                      {institutionList.map((inst) => (
                        <CommandItem
                          key={inst.id}
                          value={`${inst.name} ${inst.institutionType}`}
                          onSelect={() => addInstitution(String(inst.id), inst.name)}
                        >
                          <span className="truncate">{inst.name}</span>
                          <span className="text-caption text-muted-foreground ml-2 truncate">
                            {inst.institutionType}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-caption text-muted-foreground">No members yet.</p>
            ) : (
              <div className="min-w-0 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-max">
                  <thead className="bg-muted/80">
                    <tr className="border-b border-border">
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                        Name
                      </th>
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                        Role
                      </th>
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-right")} />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.institutionId} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-body">{m.institutionName}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={m.role}
                            onValueChange={(v) =>
                              setMemberRole(m.institutionId, v as "Contributor" | "Consumer")
                            }
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Contributor">Contributor</SelectItem>
                              <SelectItem value="Consumer">Consumer</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeMember(m.institutionId)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-h4 font-medium">Data policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 max-w-md">
            {(
              [
                ["shareLoanData", "Share loan data"],
                ["shareRepaymentHistory", "Share repayment history"],
                ["allowAggregation", "Allow aggregation"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2"
              >
                <p className="text-body text-foreground">{label}</p>
                <Switch
                  checked={dataPolicy[key]}
                  onCheckedChange={(v) =>
                    setDataPolicy((p) => ({ ...p, [key]: v }))
                  }
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-caption">Data visibility</Label>
              <Select
                value={dataPolicy.dataVisibility}
                onValueChange={(v) =>
                  setDataPolicy((p) => ({
                    ...p,
                    dataVisibility: v as ConsortiumDataPolicy["dataVisibility"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full details</SelectItem>
                  <SelectItem value="masked_pii">Masked PII</SelectItem>
                  <SelectItem value="derived">Derived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-h4 font-medium">Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-body text-muted-foreground">
            <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/20">
              <p>
                <span className="text-foreground font-medium">{name}</span> · {type}
              </p>
              <p>
                Purpose: {purpose} · Governance: {governanceModel}
              </p>
              <p>{members.length} member(s)</p>
              <p className="text-caption">
                Loan: {dataPolicy.shareLoanData ? "Yes" : "No"} · Repayment:{" "}
                {dataPolicy.shareRepaymentHistory ? "Yes" : "No"} · Aggregation:{" "}
                {dataPolicy.allowAggregation ? "Yes" : "No"} · Visibility:{" "}
                {dataPolicy.dataVisibility === "masked_pii"
                  ? "Masked PII"
                  : dataPolicy.dataVisibility === "derived"
                  ? "Derived"
                  : "Full details"}
              </p>
            </div>
            <Button type="button" onClick={handleSubmit} disabled={creating || updating} className="gap-2">
              {creating || updating ? "Saving…" : (isEdit ? "Save changes" : "Create consortium")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button type="button" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <span />
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
