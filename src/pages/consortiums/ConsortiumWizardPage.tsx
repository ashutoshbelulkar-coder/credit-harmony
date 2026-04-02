import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  type ConsortiumDataPolicy,
  type ConsortiumMember,
} from "@/data/consortiums-mock";
import { useConsortium, useConsortiumMembers, useCreateConsortium, useUpdateConsortium } from "@/hooks/api/useConsortiums";
import { useInstitutions } from "@/hooks/api/useInstitutions";
import type { InstitutionResponse } from "@/services/institutions.service";

const steps = [
  { title: "Basic info", shortTitle: "Info", icon: FileStack },
  { title: "Members", shortTitle: "Members", icon: Users },
  { title: "Data policy", shortTitle: "Policy", icon: Shield },
  { title: "Review", shortTitle: "Review", icon: Eye },
] as const;

const consortiumWizardSchema = z.object({
  name: z.string().min(1, "Consortium name is required"),
  description: z.string().optional(),
  dataVisibility: z.enum(["full", "masked_pii", "derived"]),
  memberCount: z.coerce.number().min(1, "Add at least one member"),
});

type ConsortiumWizardFormValues = z.infer<typeof consortiumWizardSchema>;

function subscriberParticipationCaption(inst: InstitutionResponse) {
  if (inst.isSubscriber && inst.isDataSubmitter) return "Subscriber · Data submission";
  return "Subscriber";
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
  const {
    data: institutionsPage,
    isPending: institutionsLoading,
    isError: institutionsError,
  } = useInstitutions(
    { page: 0, size: 200, role: "subscriber" },
    { allowMockFallback: false }
  );
  /** Server filter (`role=subscriber`) plus client guard for proxies that ignore the query param. */
  const subscriberPickList = useMemo(
    () => (institutionsPage?.content ?? []).filter((i) => i.isSubscriber),
    [institutionsPage]
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [members, setMembers] = useState<ConsortiumMember[]>([]);
  const [institutionOpen, setInstitutionOpen] = useState(false);

  const form = useForm<ConsortiumWizardFormValues>({
    resolver: zodResolver(consortiumWizardSchema),
    defaultValues: {
      name: "",
      description: "",
      dataVisibility: "full",
      memberCount: 0,
    },
    mode: "onTouched",
  });

  useEffect(() => {
    form.setValue("memberCount", members.length);
  }, [members.length, form]);

  useEffect(() => {
    if (existing && editId) {
      form.reset({
        name: existing.name,
        description: existing.description ?? "",
        dataVisibility: "full",
      });
    } else if (!isEdit) {
      form.reset({
        name: "",
        description: "",
        dataVisibility: "full",
        memberCount: 0,
      });
      setMembers([]);
      setCurrentStep(0);
    }
  }, [existing, editId, isEdit, form]);

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

  const handleNext = async () => {
    if (currentStep === 0) {
      const ok = await form.trigger("name");
      if (!ok) return;
    }
    if (currentStep === 1) {
      form.setValue("memberCount", members.length);
      const ok = await form.trigger("memberCount");
      if (!ok) return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = (values: ConsortiumWizardFormValues) => {
    if (members.length === 0) {
      form.setError("memberCount", { type: "manual", message: "Add at least one member" });
      return;
    }
    const memberPayload = members.map((m) => ({ institutionId: m.institutionId }));
    const policyPayload: ConsortiumDataPolicy = { dataVisibility: values.dataVisibility };
    const nameTrim = values.name.trim();
    const descriptionTrim = values.description?.trim() || undefined;

    if (isEdit && editId) {
      updateConsortium(
        {
          id: editId,
          data: {
            name: nameTrim,
            description: descriptionTrim,
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
          name: nameTrim,
          description: descriptionTrim,
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

  const watchedName = form.watch("name");
  const watchedDescription = form.watch("description");

  return (
    <DashboardLayout>
      <Form {...form}>
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="min-w-0 md:col-span-2">
                  <FormLabel className="text-caption">Name</FormLabel>
                  <FormControl>
                    <Input id="cw-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="min-w-0 md:col-span-2">
                  <FormLabel className="text-caption">Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      id="cw-desc"
                      rows={3}
                      className="resize-y min-h-[72px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  Add member
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[min(100vw-2rem,360px)]" align="end">
                <p className="px-3 pt-2.5 pb-2 text-caption text-muted-foreground border-b border-border leading-snug">
                  Subscriber institutions only (includes dual-role subscriber + data submission). Loaded from the API.
                </p>
                <Command>
                  <CommandInput placeholder="Search members…" />
                  <CommandList>
                    {institutionsError ? (
                      <div className="py-6 px-3 text-center text-caption text-destructive">
                        Could not load institutions. Use a running API and{" "}
                        <code className="text-[10px]">VITE_USE_MOCK_FALLBACK=false</code>.
                      </div>
                    ) : institutionsLoading ? (
                      <div className="py-6 px-3 text-center text-caption text-muted-foreground">
                        Loading…
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No subscriber institutions found.</CommandEmpty>
                        <CommandGroup>
                          {subscriberPickList.map((inst) => {
                            const cap = subscriberParticipationCaption(inst);
                            return (
                              <CommandItem
                                key={inst.id}
                                value={`${inst.name} ${inst.institutionType} ${cap}`}
                                onSelect={() => addInstitution(String(inst.id), inst.name)}
                              >
                                <span className="truncate">{inst.name}</span>
                                <span className="text-caption text-muted-foreground ml-2 shrink-0 truncate max-w-[40%]">
                                  {cap} · {inst.institutionType}
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="memberCount"
              render={({ field }) => (
                <FormItem className="mb-3">
                  <FormControl>
                    <input type="hidden" name={field.name} ref={field.ref} value={members.length} readOnly />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-right")} />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.institutionId} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-body">{m.institutionName}</td>
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
            <FormField
              control={form.control}
              name="dataVisibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-caption">Data visibility</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="full">Full details</SelectItem>
                      <SelectItem value="masked_pii">Masked PII</SelectItem>
                      <SelectItem value="derived">Derived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-h4 font-medium">Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-body text-muted-foreground">
            <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/20">
              <p>
                <span className="text-foreground font-medium text-body">{watchedName}</span>
              </p>
              {watchedDescription ? (
                <p className="text-caption text-muted-foreground">{watchedDescription}</p>
              ) : null}
              <div className="space-y-2">
                <p className="text-caption text-muted-foreground uppercase tracking-wider">Members</p>
                <ul className="space-y-2 list-none m-0 p-0">
                  {members.map((m) => (
                    <li
                      key={m.institutionId}
                      className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                    >
                      <span className="text-[10px] font-medium leading-[14px] text-foreground block truncate">
                        {m.institutionName}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void form.handleSubmit(onSubmit)()}
              disabled={creating || updating}
              className="gap-2"
            >
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
          <Button type="button" onClick={() => void handleNext()}>
            Next
          </Button>
        ) : (
          <span />
        )}
      </div>
      </div>
      </Form>
    </DashboardLayout>
  );
}
