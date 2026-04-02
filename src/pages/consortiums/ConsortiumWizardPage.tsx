import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueries } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { badgeTextClasses, tableHeaderClasses } from "@/lib/typography";
import {
  type ConsortiumDataPolicy,
  type ConsortiumMember,
} from "@/data/consortiums-mock";
import {
  useCbsMemberCatalog,
  useConsortium,
  useConsortiumCbsMembers,
  useConsortiumMembers,
  useCreateConsortium,
  useUpdateConsortium,
} from "@/hooks/api/useConsortiums";
import { useInstitutions } from "@/hooks/api/useInstitutions";
import { useProducts } from "@/hooks/api/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { useSaveDataPolicy } from "@/hooks/api/useDataPolicy";
import { inferPartialTemplate } from "@/data/data-policy-mock";
import type { InstitutionResponse } from "@/services/institutions.service";
import { fetchDataPolicy } from "@/services/dataPolicy.service";
import type { DataPolicy, DataPolicyField, DataPolicyUnmaskType } from "@/types/data-policy";
import type { CbsMemberCatalogEntry } from "@/services/consortiums.service";

type CbsMemberRow = {
  rowKey: string;
  catalogId: string;
  memberId: string;
  displayName?: string;
};

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

/** Map API / mock rows into wizard member state (joinedDate + optional registrationNumber). */
function normalizeConsortiumMemberRows(rows: unknown[]): ConsortiumMember[] {
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    const joinedRaw =
      typeof r.joinedDate === "string"
        ? r.joinedDate
        : typeof r.joinedAt === "string"
          ? r.joinedAt.includes("T")
            ? r.joinedAt.split("T")[0]
            : r.joinedAt
          : new Date().toISOString().slice(0, 10);
    const regRaw =
      typeof r.registrationNumber === "string"
        ? r.registrationNumber
        : typeof (r as Record<string, unknown>)["registrationnumber"] === "string"
          ? String((r as Record<string, unknown>)["registrationnumber"])
          : "";
    const reg = regRaw.trim();
    return {
      institutionId: String(r.institutionId ?? ""),
      institutionName: String(r.institutionName ?? ""),
      registrationNumber: reg.length > 0 ? reg : undefined,
      joinedDate: joinedRaw,
      status: r.status === "pending" ? "pending" : "active",
    };
  });
}

export default function ConsortiumWizardPage() {
  const { id: paramId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isEdit = Boolean(paramId && location.pathname.endsWith("/edit"));
  const editId = isEdit ? paramId! : undefined;

  const { data: existing } = useConsortium(editId);
  const { data: existingMembers } = useConsortiumMembers(editId);
  const { data: existingCbsMembers } = useConsortiumCbsMembers(editId);
  const { data: cbsCatalog = [], isPending: cbsCatalogLoading } = useCbsMemberCatalog();
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

  // ── Data Policy module state (product-level) ──────────────────────────────
  const { data: productsPage, isLoading: productsLoading } = useProducts({ status: "active", page: 0, size: 200 });
  const activeProducts = useMemo(() => {
    const rows = productsPage?.content ?? [];
    return rows.filter((p) => String(p.status ?? "").toLowerCase() === "active");
  }, [productsPage]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const selectedProductIdSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);
  const [activeDrawerProductId, setActiveDrawerProductId] = useState<string | null>(null);

  const institutionId = String(user?.institutionId ?? "HCB");
  const { mutate: savePolicy, isPending: savingPolicy } = useSaveDataPolicy();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftByProductId, setDraftByProductId] = useState<Record<string, DataPolicy>>({});
  const [dirtyDraftProductIds, setDirtyDraftProductIds] = useState<Set<string>>(new Set());
  const [focusFieldName, setFocusFieldName] = useState<string | null>(null);
  const [consortiumUnmaskPolicy, setConsortiumUnmaskPolicy] = useState<DataPolicyUnmaskType>("FULL");

  const [currentStep, setCurrentStep] = useState(0);
  const [members, setMembers] = useState<ConsortiumMember[]>([]);
  const [cbsMembers, setCbsMembers] = useState<CbsMemberRow[]>([]);
  const [cbsCatalogOpen, setCbsCatalogOpen] = useState(false);
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
        dataVisibility: (existing.dataVisibility as "full" | "masked_pii" | "derived") ?? "full",
      });
    } else if (!isEdit) {
      form.reset({
        name: "",
        description: "",
        dataVisibility: "full",
        memberCount: 0,
      });
      setMembers([]);
      setCbsMembers([]);
      setCurrentStep(0);
    }
  }, [existing, editId, isEdit, form]);

  useEffect(() => {
    if (!editId || existingCbsMembers === undefined) return;
    setCbsMembers(
      existingCbsMembers.map((r) => ({
        rowKey: String(r.id),
        catalogId: String(r.catalogId),
        memberId: r.memberId,
        displayName: r.displayName,
      }))
    );
  }, [editId, existingCbsMembers]);

  const policyQueries = useQueries({
    queries: selectedProductIds.map((productId) => ({
      queryKey: ["data-policy", institutionId, productId] as const,
      queryFn: () => fetchDataPolicy({ institutionId, productId }),
      staleTime: 30_000,
      enabled: Boolean(institutionId) && Boolean(productId),
    })),
  });

  const policyByProductId = useMemo(() => {
    const map: Record<string, DataPolicy | undefined> = {};
    for (let i = 0; i < selectedProductIds.length; i += 1) {
      const pid = selectedProductIds[i];
      map[pid] = policyQueries[i]?.data;
    }
    return map;
  }, [policyQueries, selectedProductIds]);

  // Seed drafts from fetched policies (only when not dirty).
  useEffect(() => {
    setDraftByProductId((prev) => {
      let next = prev;
      for (const pid of selectedProductIds) {
        const fetched = policyByProductId[pid];
        if (!fetched) continue;
        if (dirtyDraftProductIds.has(pid)) continue;
        const existing = prev[pid];
        if (existing) continue;
        if (next === prev) next = { ...prev };
        next[pid] = JSON.parse(JSON.stringify(fetched)) as DataPolicy;
      }
      return next;
    });
  }, [policyByProductId, selectedProductIds, dirtyDraftProductIds]);

  useEffect(() => {
    if (!drawerOpen || !focusFieldName) return;
    const id = `dp-field-${encodeURIComponent(focusFieldName)}`;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [drawerOpen, focusFieldName]);

  // Seed members from API when editing
  useEffect(() => {
    if (!existingMembers) return;
    const rows = Array.isArray(existingMembers)
      ? existingMembers
      : (existingMembers as { content?: unknown[] }).content ?? [];
    if (rows.length > 0) setMembers(normalizeConsortiumMemberRows(rows));
  }, [existingMembers]);

  const addInstitution = useCallback((inst: InstitutionResponse) => {
    setMembers((prev) => {
      const instId = String(inst.id);
      if (prev.some((m) => m.institutionId === instId)) return prev;
      const joined = new Date().toISOString().slice(0, 10);
      const reg = inst.registrationNumber?.trim() ?? "";
      return [
        ...prev,
        {
          institutionId: instId,
          institutionName: inst.name,
          registrationNumber: reg.length > 0 ? reg : undefined,
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

  const addCbsFromCatalog = useCallback((entry: CbsMemberCatalogEntry) => {
    const cid = String(entry.id);
    if (cbsMembers.some((p) => p.catalogId === cid)) {
      toast.error("This CBS member is already in the list");
      return;
    }
    setCbsMembers((prev) => [
      ...prev,
      {
        rowKey: `cat-${cid}-${crypto.randomUUID()}`,
        catalogId: cid,
        memberId: entry.memberId,
        displayName: entry.displayName,
      },
    ]);
    setCbsCatalogOpen(false);
  }, [cbsMembers]);

  const cbsCatalogPickList = useMemo(() => {
    const selected = new Set(cbsMembers.map((r) => r.catalogId));
    return cbsCatalog.filter((c) => !selected.has(String(c.id)));
  }, [cbsCatalog, cbsMembers]);

  const removeCbsMember = (rowKey: string) => {
    setCbsMembers((prev) => prev.filter((r) => r.rowKey !== rowKey));
  };

  const activeDrawerProduct = useMemo(() => {
    if (!activeDrawerProductId) return undefined;
    return activeProducts.find((p) => String(p.id) === String(activeDrawerProductId));
  }, [activeDrawerProductId, activeProducts]);

  const activePolicyDraft: DataPolicy | null = useMemo(() => {
    if (!activeDrawerProductId) return null;
    return draftByProductId[activeDrawerProductId] ?? null;
  }, [activeDrawerProductId, draftByProductId]);

  const activePolicyEffective: DataPolicy | null = useMemo(() => {
    if (!activeDrawerProductId) return null;
    return activePolicyDraft ?? policyByProductId[activeDrawerProductId] ?? null;
  }, [activeDrawerProductId, activePolicyDraft, policyByProductId]);

  const maskedFieldsForActiveDrawer: DataPolicyField[] = useMemo(() => {
    const list = activePolicyEffective?.fields ?? [];
    return list.filter((f) => Boolean(f.isMasked));
  }, [activePolicyEffective?.fields]);

  // Ensure a draft exists when opening Configure (so edits are always possible).
  useEffect(() => {
    if (!drawerOpen || !activeDrawerProductId) return;
    setDraftByProductId((prev) => {
      if (prev[activeDrawerProductId]) return prev;
      const fetched = policyByProductId[activeDrawerProductId];
      if (!fetched) return prev;
      return { ...prev, [activeDrawerProductId]: JSON.parse(JSON.stringify(fetched)) as DataPolicy };
    });
  }, [drawerOpen, activeDrawerProductId, policyByProductId]);

  const updateField = useCallback(
    (productId: string, fieldName: string, patch: Partial<DataPolicyField>) => {
      setDraftByProductId((prev) => {
        const dp = prev[productId];
        if (!dp) return prev;
        const nextFields = dp.fields.map((f) =>
          f.fieldName === fieldName ? ({ ...f, ...patch } as DataPolicyField) : f
        );
        return { ...prev, [productId]: { ...dp, fields: nextFields } };
      });
      setDirtyDraftProductIds((prev) => {
        const next = new Set(prev);
        next.add(productId);
        return next;
      });
    },
    []
  );

  const canSelectPartial = useCallback((fieldName: string) => {
    return inferPartialTemplate(fieldName) != null;
  }, []);

  // Apply consortium-level unmask policy to existing checked fields.
  useEffect(() => {
    setDraftByProductId((prev) => {
      let next = prev;
      for (const pid of selectedProductIds) {
        const dp = prev[pid];
        if (!dp) continue;
        const updatedFields = dp.fields.map((f) => {
          if (!f.isMasked || !f.isUnmasked) return f;
          const partialTpl = inferPartialTemplate(f.fieldName);
          const canPartial = partialTpl != null;

          const desired: DataPolicyUnmaskType = consortiumUnmaskPolicy;

          if (desired === "PARTIAL" && !canPartial) {
            // Can't honor PARTIAL for this field; leave as-is rather than silently breaking.
            return f;
          }

          const nextUnmaskType = desired;
          const nextPartialConfig = nextUnmaskType === "PARTIAL" ? partialTpl ?? f.partialConfig : undefined;
          if (f.unmaskType === nextUnmaskType && (nextUnmaskType !== "PARTIAL" || f.partialConfig === nextPartialConfig)) {
            return f;
          }
          return { ...f, unmaskType: nextUnmaskType, partialConfig: nextPartialConfig };
        });

        // Only write if something changed.
        const changed = updatedFields.some((f, idx) => f !== dp.fields[idx]);
        if (!changed) continue;
        if (next === prev) next = { ...prev };
        next[pid] = { ...dp, fields: updatedFields };
      }
      return next;
    });
    // Mark selected product drafts as dirty if we changed their checked fields.
    setDirtyDraftProductIds((prev) => {
      const next = new Set(prev);
      for (const pid of selectedProductIds) next.add(pid);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consortiumUnmaskPolicy]);

  const validatePolicyBeforeSave = useCallback((policy: DataPolicy) => {
    const fields = (policy.fields ?? []).filter((f) => Boolean(f.isMasked));
    const maskedRemain = fields.some((f) => f.isUnmasked !== true);
    if (!maskedRemain) return "At least 1 field must remain masked";

    for (const f of fields) {
      if (!f.isUnmasked) continue;
      if (f.unmaskType === "PARTIAL") {
        const tpl = inferPartialTemplate(f.fieldName);
        if (!tpl) return `Partial masking template not available for ${f.fieldName}`;
      }
    }
    return null;
  }, []);

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
    const cbsPayload = cbsMembers.map((r) => ({ catalogId: r.catalogId }));
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
            cbsMembers: cbsPayload,
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
          cbsMembers: cbsPayload,
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
            <div className="flex items-center gap-2 shrink-0">
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
                                onSelect={() => addInstitution(inst)}
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
            <Popover open={cbsCatalogOpen} onOpenChange={setCbsCatalogOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="shrink-0">
                  Add CBS member
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[min(100vw-2rem,360px)]" align="end">
                <Command>
                  <CommandInput placeholder="Search CBS members…" />
                  <CommandList>
                    {cbsCatalogLoading ? (
                      <div className="py-6 px-3 text-center text-caption text-muted-foreground">Loading…</div>
                    ) : (
                      <>
                        <CommandEmpty>No CBS members available or all are already added.</CommandEmpty>
                        <CommandGroup>
                          {cbsCatalogPickList.map((row) => (
                            <CommandItem
                              key={row.id}
                              value={`${row.memberId} ${row.displayName ?? ""}`}
                              onSelect={() => addCbsFromCatalog(row)}
                            >
                              <span className="font-mono text-[11px] truncate">{row.memberId}</span>
                              {row.displayName ? (
                                <span className="text-caption text-muted-foreground ml-2 shrink-0 truncate max-w-[45%]">
                                  {row.displayName}
                                </span>
                              ) : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            </div>
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
                        Member ID
                      </th>
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>
                        Member name
                      </th>
                      <th className={cn(tableHeaderClasses, "px-4 py-3 text-right")} />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.institutionId} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-body font-mono text-[11px] tabular-nums">
                          {m.registrationNumber ?? "—"}
                        </td>
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

            <div className="mt-8 space-y-3">
              <p className="text-caption font-medium text-foreground">CBS members (external)</p>
              {cbsMembers.length === 0 ? (
                <p className="text-caption text-muted-foreground">No CBS members added.</p>
              ) : (
                <div className="min-w-0 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-max">
                    <thead className="bg-muted/80">
                      <tr className="border-b border-border">
                        <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>Member ID</th>
                        <th className={cn(tableHeaderClasses, "px-4 py-3 text-left")}>Member Name</th>
                        <th className={cn(tableHeaderClasses, "px-4 py-3 text-right")} />
                      </tr>
                    </thead>
                    <tbody>
                      {cbsMembers.map((row) => (
                        <tr key={row.rowKey} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-body font-mono text-[11px]">{row.memberId}</td>
                          <td className="px-4 py-3 text-body text-muted-foreground">
                            {row.displayName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeCbsMember(row.rowKey)}
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
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-h4 font-medium">Data policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pb-3">
                <CardTitle className="text-h4 font-medium">Unmask policy</CardTitle>
                <p className="text-caption text-muted-foreground mt-0.5">
                  Applies to all selected products.
                </p>
              </CardHeader>
              <CardContent className="px-0">
                <div className="rounded-xl border border-border bg-card p-4">
                  <RadioGroup
                    value={consortiumUnmaskPolicy}
                    onValueChange={(v) => {
                      if (v === "FULL" || v === "PARTIAL") setConsortiumUnmaskPolicy(v);
                    }}
                    className="gap-3"
                  >
                    <label className="flex items-start gap-2 text-body">
                      <RadioGroupItem value="FULL" className="mt-0.5" />
                      <span className="space-y-0.5">
                        <span className="block font-medium text-foreground">Full Unmasking</span>
                        <span className="block text-caption text-muted-foreground">
                          When a masked field is allowed, it is revealed in full.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-body">
                      <RadioGroupItem value="PARTIAL" className="mt-0.5" />
                      <span className="space-y-0.5">
                        <span className="block font-medium text-foreground">Partial Unmasking</span>
                        <span className="block text-caption text-muted-foreground">
                          When a masked field is allowed, it uses predefined templates only (PAN/Phone/Email/Name).
                        </span>
                      </span>
                    </label>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pb-3">
                <CardTitle className="text-h4 font-medium">Products</CardTitle>
                <p className="text-caption text-muted-foreground mt-0.5">
                  Select one or more <span className="font-medium text-foreground">active</span> products, then click{" "}
                  <span className="font-medium text-foreground">Configure</span> to manage masked fields.
                </p>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                {productsLoading ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                    Loading products…
                  </div>
                ) : activeProducts.length === 0 ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                    No active products found.
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {activeProducts.map((p) => {
                      const pid = String(p.id);
                      const selected = selectedProductIdSet.has(pid);
                      const pol = draftByProductId[pid] ?? policyByProductId[pid];
                      const maskedCount = (pol?.fields ?? []).filter((f) => Boolean(f.isMasked)).length;
                      const queryIdx = selectedProductIds.indexOf(pid);
                      const isPolicyLoading = selected && queryIdx >= 0 ? Boolean(policyQueries[queryIdx]?.isLoading) : false;
                      const isPolicyError =
                        selected &&
                        queryIdx >= 0 &&
                        Boolean(policyQueries[queryIdx]?.isError) &&
                        pol == null;
                      const chkId = `dp-prod-${pid}`;
                      return (
                        <li
                          key={pid}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                            selected
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/80 bg-transparent hover:bg-muted/30"
                          )}
                        >
                          <Checkbox
                            id={chkId}
                            checked={selected}
                            onCheckedChange={() => {
                              setSelectedProductIds((prev) =>
                                prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
                              );
                            }}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={chkId}
                              className="text-[11px] text-muted-foreground cursor-pointer leading-tight block"
                            >
                              {p.name}
                            </label>
                            {selected ? (
                              <p className="text-caption text-muted-foreground mt-0.5">
                                Masked fields:{" "}
                                <span className="font-mono text-[10px]">
                                  {isPolicyLoading ? "…" : isPolicyError ? "—" : maskedCount}
                                </span>
                              </p>
                            ) : null}
                          </div>

                          {selected ? (
                            <div className="flex shrink-0 items-center min-w-[7rem]">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 px-2 justify-start text-caption leading-snug overflow-visible"
                                onClick={() => {
                                  setActiveDrawerProductId(pid);
                                  setDrawerOpen(true);
                                  setFocusFieldName(null);
                                }}
                              >
                                <span className="min-w-0">Configure</span>
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Sheet
              open={drawerOpen}
              onOpenChange={(open) => {
                setDrawerOpen(open);
                if (!open) {
                  setActiveDrawerProductId(null);
                  setFocusFieldName(null);
                }
              }}
            >
              <SheetContent side="right" className="w-full sm:max-w-2xl">
                <SheetHeader>
                  <SheetTitle>
                    Configure Data Policy – {activeDrawerProduct?.name ?? "Product"}
                  </SheetTitle>
                  <SheetDescription>
                    Choose which masked fields can be unmasked. Unmask policy is configured at the consortium level.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  {!activeDrawerProductId || !activePolicyEffective ? (
                    <div className="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                      Select a product and click Configure.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="grid grid-cols-[1fr_90px] gap-4 px-4 py-3 border-b border-border bg-muted/60">
                          <span className={cn(tableHeaderClasses)}>Field</span>
                          <span className={cn(tableHeaderClasses)}>Type</span>
                        </div>

                        <ScrollArea className="h-[55vh]">
                          <div className="divide-y divide-border">
                            {maskedFieldsForActiveDrawer.length === 0 ? (
                              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                                No masked fields found for this product.
                              </div>
                            ) : maskedFieldsForActiveDrawer.map((f) => {
                              const partialTpl = inferPartialTemplate(f.fieldName);
                              const canPartial = partialTpl != null;
                              const rowId = `dp-field-${encodeURIComponent(f.fieldName)}`;
                              return (
                                <div
                                  key={f.fieldName}
                                  id={rowId}
                                  className={cn("px-4 py-3", focusFieldName === f.fieldName && "bg-primary/5")}
                                >
                                  <div className="grid grid-cols-[1fr_90px] gap-4 items-start">
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={Boolean(f.isUnmasked)}
                                        onCheckedChange={(v) => {
                                          const checked = Boolean(v);
                                          if (!checked) {
                                            updateField(activeDrawerProductId, f.fieldName, { isUnmasked: false, unmaskType: null, partialConfig: undefined });
                                            return;
                                          }
                                          const desired: DataPolicyUnmaskType = consortiumUnmaskPolicy;
                                          if (desired === "PARTIAL" && !canPartial) {
                                            toast.error("Partial masking template not available for this field");
                                            return;
                                          }
                                          updateField(activeDrawerProductId, f.fieldName, {
                                            isUnmasked: true,
                                            unmaskType: desired,
                                            partialConfig: desired === "PARTIAL" ? partialTpl : undefined,
                                          });
                                        }}
                                      />
                                      <div className="min-w-0">
                                        <p className="text-body font-medium text-foreground truncate">{f.fieldName}</p>
                                        <p className="text-caption text-muted-foreground">
                                          Masked · {f.dataType ?? "—"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-body text-foreground pt-0.5">{f.dataType ?? "—"}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          className="flex-1"
                          disabled={savingPolicy}
                          onClick={() => {
                            const draft = activePolicyDraft ?? activePolicyEffective;
                            if (!draft) return;
                            const err = validatePolicyBeforeSave(draft);
                            if (err) {
                              toast.error(err);
                              return;
                            }
                            const payload: DataPolicy = {
                              ...draft,
                              institutionId,
                              productId: activeDrawerProductId,
                              // Strip any legacy sensitivity metadata that might still exist in stored JSON.
                              fields: (draft.fields ?? []).map((f) => {
                                const { sensitivityTag: _s, ...rest } = f as DataPolicyField & { sensitivityTag?: unknown };
                                return {
                                  ...rest,
                                  isUnmasked: rest.isUnmasked === true,
                                };
                              }),
                              updatedBy: user?.email ?? "system",
                              updatedAt: new Date().toISOString(),
                            };
                            savePolicy(payload, {
                              onSuccess: () => {
                                setDrawerOpen(false);
                                setDirtyDraftProductIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(activeDrawerProductId);
                                  return next;
                                });
                              },
                            });
                          }}
                        >
                          {savingPolicy ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
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
                      <span className="text-[10px] font-mono leading-[14px] text-foreground block truncate">
                        {m.registrationNumber ?? "—"}
                      </span>
                      <span className="text-[10px] font-medium leading-[14px] text-foreground block truncate mt-0.5">
                        {m.institutionName}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-caption text-muted-foreground uppercase tracking-wider">CBS members</p>
                {cbsMembers.length === 0 ? (
                  <p className="text-caption text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-2 list-none m-0 p-0">
                    {cbsMembers.map((row) => (
                      <li
                        key={row.rowKey}
                        className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                      >
                        <span className="text-[10px] font-medium leading-[14px] text-foreground block font-mono">
                          {row.memberId}
                        </span>
                        {row.displayName ? (
                          <span className="text-caption text-muted-foreground block mt-0.5">{row.displayName}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
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
