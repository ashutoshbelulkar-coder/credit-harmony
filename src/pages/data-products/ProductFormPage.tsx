import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DEFAULT_ENQUIRY_CONFIG,
  formatImpactOption,
  normalizeEnquiryConfig,
  normalizeImpactOption,
  preferredEnquiryType,
  type EnquiryConfig,
  type EnquiryDataScope,
} from "@/data/data-products-mock";
import {
  PREVIEW_SAMPLE_APPLICATION,
  PREVIEW_SAMPLE_META,
  PREVIEW_SAMPLE_SUBJECT,
} from "@/data/product-enquiry-preview-samples";
import { ContractContinueTooltip, ContractStep } from "@/components/data-products/contract/ContractStep";
import { ContractReviewCard } from "@/components/data-products/contract/ContractReviewCard";
import { buildContractResponsePreview } from "@/lib/product-preview-response";
import {
  contractContinueBlockers,
  contractHasTrendedCapable,
  emptyContractSelection,
  selectionFromVersion,
  summarizeContract,
  type ContractSelection,
} from "@/lib/product-contract";
import {
  productMgmtStore,
  useProductMgmtVersion,
} from "@/lib/product-management-demo-store";
import {
  BRD_STATUS_LABEL,
  DEFAULT_RETRO_CONFIG,
  DEFAULT_TRENDED_CONFIG,
  computeDefinitionFingerprint,
  fingerprintExtrasFromVersion,
  type ProductMetadata,
  type RetroConfig,
  type TrendedConfig,
} from "@/data/product-management-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMPTY_META: ProductMetadata = {
  businessUnit: "Product Management",
  targetSegment: "General",
  sapItemCode: "",
  intendedUse: "",
  regulatoryNotes: "",
  sensitivity: "Medium",
  tags: [],
  categories: ["Credit Decisioning"],
  effectiveStart: null,
  effectiveEnd: null,
  releaseNote: "",
  dataAcquisitionType: "Member-contributed",
  dataAvailabilityType: "Managed by bureau, available for direct enquiry",
  accessRestrictions: "Active subscription required; purpose-bound use only",
};

/** Demo catalogue options for business metadata dropdowns. */
const BUSINESS_UNIT_OPTIONS = [
  "Commercial Lending",
  "Retail Lending",
  "Consumer Digital",
  "Consumer Risk",
  "Merchant Onboarding",
  "Inclusive Finance",
  "Product Management",
] as const;

const SEGMENT_OPTIONS = [
  "SME",
  "Thin-file retail",
  "BNPL retail",
  "Retail / Checkout",
  "Merchants / Sellers",
  "Trade / KYB",
  "Salaried / SHG",
  "Gig workers",
  "Corporate",
  "General",
] as const;

const SCOPE_TOOLTIPS: Record<EnquiryConfig["scope"], string> = {
  SELF: "Returns data sourced directly from the subject entity's own records.",
  NETWORK: "Includes linked entities and immediate network connections.",
  CONSORTIUM: "Draws from the shared cross-lender consortium data pool.",
  VERTICAL: "Restricted to a specific industry vertical dataset.",
};

const BLOCKED_NAME_SUFFIXES = new Set(["new", "final", "copy"]);

type WizardStep = 1 | 2 | 3 | 4 | 5;

const WIZARD_STEPS: { id: WizardStep; label: string; shortTitle: string }[] = [
  { id: 1, label: "Basics & metadata", shortTitle: "Basics" },
  { id: 2, label: "Data packets & attributes", shortTitle: "Packets" },
  { id: 3, label: "Retrieval", shortTitle: "Retrieval" },
  { id: 4, label: "Enquiry impact", shortTitle: "Impact" },
  { id: 5, label: "Review", shortTitle: "Review" },
];

/** Demo reference date for retro enquiryDate ceiling checks. */
const REFERENCE_DATE = "2026-06-30";
const DEFAULT_RETRO_ENQUIRY_DATE = "2025-06-15";

type PreviewScope = EnquiryDataScope;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Last whitespace-delimited token, stripped of punctuation, lowercased. */
function lastWordOf(trimmedName: string): string {
  const words = trimmedName.split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] ?? "";
  return last.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

function buildRequestPreview(params: {
  productId: string;
  productVersion: number;
  productName: string;
  enquiryType: "SOFT" | "HARD";
  trendedEnabled: boolean;
  retroEnabled: boolean;
  previewScope: PreviewScope;
  previewWindow: number;
  maxTrendedMonths: number;
  enquiryDate: string;
}): object {
  const effectiveScope: PreviewScope =
    params.previewScope === "TRENDED" && !params.trendedEnabled
      ? "LATEST"
      : params.previewScope === "RETRO" && !params.retroEnabled
        ? "LATEST"
        : params.previewScope;

  const productEntry: Record<string, unknown> = {
    productId: params.productId,
    productVersion: params.productVersion,
  };
  if (effectiveScope !== "LATEST") {
    productEntry.dataScope = effectiveScope;
  }
  if (effectiveScope === "TRENDED") {
    productEntry.window = {
      months: clamp(params.previewWindow, 1, Math.max(params.maxTrendedMonths, 1)),
    };
  }

  const request: Record<string, unknown> = {
    products: [productEntry],
    enquiryType: params.enquiryType,
    ...PREVIEW_SAMPLE_META,
    application: structuredClone(PREVIEW_SAMPLE_APPLICATION),
    subject: structuredClone(PREVIEW_SAMPLE_SUBJECT),
  };
  if (effectiveScope === "RETRO") {
    request.enquiryDate = params.enquiryDate;
  }
  return request;
}

function WizardStepper({
  step,
  onStepClick,
}: {
  step: WizardStep;
  onStepClick: (s: WizardStep) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="flex items-stretch flex-nowrap min-w-0">
          {WIZARD_STEPS.map((s, i) => {
            const state: "completed" | "current" | "upcoming" =
              s.id < step ? "completed" : s.id === step ? "current" : "upcoming";
            return (
              <div key={s.id} className="flex shrink-0 items-stretch min-w-[100px]">
                {i > 0 && (
                  <div className="flex items-center shrink-0">
                    <div
                      className={cn(
                        "h-px w-3 lg:w-5",
                        state === "upcoming" ? "bg-border" : "bg-primary/40"
                      )}
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={state === "upcoming"}
                  onClick={() => state !== "upcoming" && onStepClick(s.id)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-2 transition-colors shrink-0 text-left w-full min-w-0",
                    state === "current" && "bg-primary/8",
                    state === "completed" && "cursor-pointer hover:bg-muted/50",
                    state === "upcoming" && "cursor-not-allowed opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold leading-none transition-colors",
                      state === "current" && "bg-primary text-primary-foreground",
                      state === "completed" && "bg-success text-success-foreground",
                      state === "upcoming" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {state === "completed" ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] leading-[18px] font-medium truncate whitespace-nowrap max-w-[140px]",
                      state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                    )}
                    title={s.label}
                  >
                    <span className="hidden 2xl:inline">{s.label}</span>
                    <span className="2xl:hidden">{s.shortTitle}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const existing = useProductMgmtVersion(isEdit ? id : undefined);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);

  // ── Step 1: Basics & metadata ───────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState<ProductMetadata>(EMPTY_META);
  const [tagsInput, setTagsInput] = useState("");

  // ── Step 2: Data packets & attributes ────────────────────────────
  const [contract, setContract] = useState<ContractSelection>(() => emptyContractSelection());

  // ── Step 3–4: Retrieval + Enquiry impact ────────────────────
  const [enquiryConfig, setEnquiryConfig] = useState<EnquiryConfig>(DEFAULT_ENQUIRY_CONFIG);
  const [trendedConfig, setTrendedConfig] = useState<TrendedConfig>({ ...DEFAULT_TRENDED_CONFIG });
  const [retroConfig, setRetroConfig] = useState<RetroConfig>({ ...DEFAULT_RETRO_CONFIG });

  // ── Preview-only controls (not persisted) ───────────────────
  const [previewScope, setPreviewScope] = useState<PreviewScope>("LATEST");
  const [previewWindow, setPreviewWindow] = useState<number>(6);
  const [previewEnquiryDate, setPreviewEnquiryDate] = useState(DEFAULT_RETRO_ENQUIRY_DATE);
  const [previewTab, setPreviewTab] = useState<"request" | "response">("request");

  // ── Hydrate from existing product ──────────────────────────
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setContract(selectionFromVersion(existing));
      setEnquiryConfig(normalizeEnquiryConfig(existing.enquiryConfig));
      setTrendedConfig(existing.trendedConfig ?? { ...DEFAULT_TRENDED_CONFIG });
      setRetroConfig(existing.retroConfig ?? { ...DEFAULT_RETRO_CONFIG });
      setMetadata({ ...EMPTY_META, ...existing.metadata });
      setTagsInput(existing.metadata.tags.join(", "));
    } else if (!isEdit) {
      setName("");
      setDescription("");
      setContract(emptyContractSelection());
      setEnquiryConfig(DEFAULT_ENQUIRY_CONFIG);
      setTrendedConfig({ ...DEFAULT_TRENDED_CONFIG });
      setRetroConfig({ ...DEFAULT_RETRO_CONFIG });
      setMetadata(EMPTY_META);
      setTagsInput("");
    }
  }, [existing, isEdit]);

  // Keep preview controls consistent with enabled retrieval modes.
  useEffect(() => {
    if (previewScope === "TRENDED" && !trendedConfig.enabled) {
      setPreviewScope("LATEST");
    } else if (previewScope === "RETRO" && !retroConfig.enabled) {
      setPreviewScope("LATEST");
    }
    if (trendedConfig.enabled) {
      setPreviewWindow((w) => clamp(w, 1, Math.max(trendedConfig.maxHistoryMonths, 1)));
    }
  }, [trendedConfig.enabled, trendedConfig.maxHistoryMonths, retroConfig.enabled, previewScope]);

  // ── Name validation ──────────────────────────────────────────
  const liveNameHint = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (trimmed.length < 5) return `${trimmed.length}/5 minimum characters`;
    if (trimmed.length > 80) return `${trimmed.length}/80 — over the limit`;
    const last = lastWordOf(trimmed);
    if (BLOCKED_NAME_SUFFIXES.has(last)) {
      return `Names ending in "${last}" are blocked — choose a more specific name.`;
    }
    return null;
  }, [name]);

  const nameConflict = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed.length < 3) return undefined;
    return productMgmtStore.findNameConflict(trimmed, id);
  }, [name, id]);

  function getStep1BlockingError(): string | null {
    const raw = name;
    const trimmed = raw.trim();
    if (!trimmed) return "Product name is required.";
    if (raw !== trimmed) return "Remove leading/trailing whitespace from the name.";
    if (trimmed.length < 5 || trimmed.length > 80) {
      return "Name must be between 5 and 80 characters.";
    }
    const last = lastWordOf(trimmed);
    if (BLOCKED_NAME_SUFFIXES.has(last)) {
      return `Name must not end with "${last}".`;
    }
    const conflict = productMgmtStore.findNameConflict(trimmed, id);
    if (conflict) return `A product named "${conflict.name}" already exists.`;
    return null;
  }

  // ── Fingerprint conflict (non-blocking) ─────────────────────
  const liveFingerprint = useMemo(
    () =>
      computeDefinitionFingerprint(
        contract.packetIds,
        contract.packetConfigs,
        enquiryConfig,
        trendedConfig,
        retroConfig,
        fingerprintExtrasFromVersion(contract)
      ),
    [contract, enquiryConfig, trendedConfig, retroConfig]
  );
  const fingerprintConflict = useMemo(
    () => productMgmtStore.findFingerprintConflict(liveFingerprint, id, existing?.productCode),
    [liveFingerprint, id, existing?.productCode]
  );

  const contractSummary = useMemo(() => summarizeContract(contract), [contract]);
  const step2Blockers = useMemo(() => contractContinueBlockers(contract), [contract]);

  // ── Preview product identity ────────────────────────────────
  const previewProductId = useMemo(() => {
    if (existing) return existing.productCode;
    const maxNum = productMgmtStore.listVersions().reduce((max, v) => {
      const m = /^PRD_(\d+)$/.exec(v.productCode);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `PRD_${String(maxNum + 1).padStart(4, "0")}`;
  }, [existing]);
  const previewProductVersion = existing?.version ?? 1;

  const requestPreview = useMemo(
    () =>
      buildRequestPreview({
        productId: previewProductId,
        productVersion: previewProductVersion,
        productName: name,
        enquiryType: preferredEnquiryType(enquiryConfig),
        trendedEnabled: trendedConfig.enabled,
        retroEnabled: retroConfig.enabled,
        previewScope,
        previewWindow,
        maxTrendedMonths: trendedConfig.maxHistoryMonths,
        enquiryDate: previewEnquiryDate,
      }),
    [
      previewProductId,
      previewProductVersion,
      name,
      enquiryConfig,
      trendedConfig,
      retroConfig.enabled,
      previewScope,
      previewWindow,
      previewEnquiryDate,
    ]
  );

  const responsePreview = useMemo(
    () =>
      buildContractResponsePreview({
        productId: previewProductId,
        productVersion: previewProductVersion,
        productName: name,
        selection: contract,
        enquiryConfig,
        enquiryType: preferredEnquiryType(enquiryConfig),
        trendedEnabled: trendedConfig.enabled,
        retroEnabled: retroConfig.enabled,
        previewScope,
        previewWindow,
        maxTrendedMonths: trendedConfig.maxHistoryMonths,
        enquiryDate: previewEnquiryDate,
      }),
    [
      previewProductId,
      previewProductVersion,
      name,
      contract,
      enquiryConfig,
      trendedConfig,
      retroConfig.enabled,
      previewScope,
      previewWindow,
      previewEnquiryDate,
    ]
  );

  const parsedMeta = (): ProductMetadata => ({
    ...metadata,
    sapItemCode: metadata.sapItemCode.trim(),
    tags: tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    sensitivity: contractSummary.sensitivity,
  });

  const draftPayload = () => ({
    name: name.trim(),
    description: description.trim(),
    packetIds: contract.packetIds,
    packetConfigs: contract.packetConfigs,
    enquiryConfig: normalizeEnquiryConfig(enquiryConfig),
    trendedConfig,
    retroConfig,
    subjectScope: contract.subjectScope,
    dictionaryVersion: contract.dictionaryVersion,
    eventStreamToggles: contract.eventStreamToggles,
    metadata: parsedMeta(),
  });

  // ── Wizard navigation ────────────────────────────────────────
  const handleNext = () => {
    if (step === 1) {
      const err = getStep1BlockingError();
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (step === 2) {
      const blockers = contractContinueBlockers(contract);
      if (blockers.length) {
        toast.error(blockers[0]);
        return;
      }
    }
    setStep((s) => clamp(s + 1, 1, 5) as WizardStep);
  };
  const handleBack = () => setStep((s) => clamp(s - 1, 1, 5) as WizardStep);
  const handleStepClick = (target: WizardStep) => {
    if (target < step) setStep(target);
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = () => {
    const err = getStep1BlockingError();
    if (err) {
      setStep(1);
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        if (existing && existing.status !== "draft") {
          toast.error("Only draft versions can be edited. Create a new version instead.");
          return;
        }
        const res = productMgmtStore.updateDraft(id, {
          ...draftPayload(),
        });
        if (!res.ok) {
          if (res.error === "name_conflict" && res.conflict) {
            toast.error(`Name conflicts with ${res.conflict.name}`);
          } else toast.error("Could not save draft");
          return;
        }
        toast.success("Draft saved");
        navigate(`/data-products/products/${id}`);
      } else {
        const res = productMgmtStore.createDraft({
          ...draftPayload(),
        });
        if (!res.ok) {
          toast.error(`Name conflicts with ${res.conflict.name}`, {
            action: {
              label: "Open",
              onClick: () => navigate(`/data-products/products/${res.conflict.id}`),
            },
          });
          return;
        }
        toast.success("Draft created");
        navigate(`/data-products/products/${res.version.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSubmit = () => {
    const err = getStep1BlockingError();
    if (err) {
      setStep(1);
      toast.error(err);
      return;
    }
    if (!id) return;
    const res = productMgmtStore.updateDraft(id, {
      ...draftPayload(),
    });
    if (!res.ok) {
      toast.error("Could not save draft");
      return;
    }
    navigate(`/data-products/products/${id}/submit`);
  };

  if (isEdit && existing && existing.status !== "draft") {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 max-w-md mx-auto text-center">
        <p className="text-muted-foreground">
          Published versions are immutable. Create a new version to change the definition.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/data-products/products/${id}`)}>
            Back to product
          </Button>
          <Button
            type="button"
            onClick={() => {
              const res = productMgmtStore.createNewVersion(id!);
              if (res.ok) navigate(`/data-products/products/${res.version.id}/edit`);
              else toast.error("Could not create version");
            }}
          >
            Create new version
          </Button>
        </div>
      </div>
    );
  }

  if (isEdit && !existing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Product not found.</p>
        <Button type="button" variant="outline" onClick={() => navigate("/data-products/products")}>
          Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <PageBreadcrumb
        segments={[
          { label: "Dashboard", href: "/" },
          { label: "Data Products", href: "/data-products/products" },
          { label: "Products", href: "/data-products/products" },
          { label: isEdit ? "Edit product" : "Create product" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 font-semibold text-foreground">
            {isEdit ? "Edit product" : "Create product"}
          </h1>
          <p className="text-caption text-muted-foreground mt-1">
            Compose from internal packets, configure fields, and set retrieval &amp; enquiry behaviour.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/data-products/products")}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save draft" : "Create product"}
          </Button>
          {isEdit && existing?.status === "draft" && (
            <Button type="button" size="sm" variant="secondary" onClick={handleSaveAndSubmit}>
              Save & submit
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Wizard ────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          <WizardStepper step={step} onStepClick={handleStepClick} />
          <Card>
            <CardContent className="space-y-5 pt-5">
              {/* ── STEP 1: Basics & metadata ──────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5 max-w-xl">
                    <Label htmlFor="pf-name" className="text-caption">
                      Product name
                    </Label>
                    <Input
                      id="pf-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full"
                      placeholder="e.g. SME Credit Decision Pack"
                    />
                    {liveNameHint && (
                      <p className="text-caption text-warning">{liveNameHint}</p>
                    )}
                    {nameConflict && (
                      <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2.5 text-caption space-y-1">
                        <p className="text-foreground">
                          A product named{" "}
                          <span className="font-medium">{nameConflict.name}</span> already
                          exists — {BRD_STATUS_LABEL[nameConflict.status]}
                        </p>
                        <Link
                          to={`/data-products/products/${nameConflict.id}`}
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View existing →
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 max-w-xl">
                    <Label htmlFor="pf-desc" className="text-caption">
                      Description
                    </Label>
                    <Textarea
                      id="pf-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full resize-y min-h-[80px]"
                      placeholder="Describe the purpose of this product..."
                    />
                  </div>

                  <div className="space-y-1.5 max-w-xl">
                    <Label htmlFor="pf-sap-item-code" className="text-caption">
                      SAP item code{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="pf-sap-item-code"
                      value={metadata.sapItemCode}
                      onChange={(e) =>
                        setMetadata((m) => ({ ...m, sapItemCode: e.target.value }))
                      }
                      className="w-full"
                      placeholder="e.g. SAP-0006"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    <div className="space-y-1.5">
                      <Label htmlFor="pf-bu" className="text-caption">
                        Business unit
                      </Label>
                      <Select
                        value={metadata.businessUnit || BUSINESS_UNIT_OPTIONS[0]}
                        onValueChange={(v) =>
                          setMetadata((m) => ({ ...m, businessUnit: v }))
                        }
                      >
                        <SelectTrigger id="pf-bu" className="w-full">
                          <SelectValue placeholder="Select business unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {!BUSINESS_UNIT_OPTIONS.includes(
                            metadata.businessUnit as (typeof BUSINESS_UNIT_OPTIONS)[number]
                          ) &&
                            metadata.businessUnit && (
                              <SelectItem value={metadata.businessUnit}>
                                {metadata.businessUnit}
                              </SelectItem>
                            )}
                          {BUSINESS_UNIT_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pf-segment" className="text-caption">
                        Segment
                      </Label>
                      <Select
                        value={metadata.targetSegment || SEGMENT_OPTIONS[0]}
                        onValueChange={(v) =>
                          setMetadata((m) => ({ ...m, targetSegment: v }))
                        }
                      >
                        <SelectTrigger id="pf-segment" className="w-full">
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                        <SelectContent>
                          {!SEGMENT_OPTIONS.includes(
                            metadata.targetSegment as (typeof SEGMENT_OPTIONS)[number]
                          ) &&
                            metadata.targetSegment && (
                              <SelectItem value={metadata.targetSegment}>
                                {metadata.targetSegment}
                              </SelectItem>
                            )}
                          {SEGMENT_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-xl">
                    <Label htmlFor="pf-release-note" className="text-caption">
                      Release note
                    </Label>
                    <Textarea
                      id="pf-release-note"
                      value={metadata.releaseNote}
                      onChange={(e) =>
                        setMetadata((m) => ({ ...m, releaseNote: e.target.value }))
                      }
                      rows={3}
                      className="w-full resize-y min-h-[72px]"
                      placeholder="Summarise what changed in this version..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    <div className="space-y-1.5">
                      <Label htmlFor="pf-tags" className="text-caption">
                        Tags
                      </Label>
                      <Input
                        id="pf-tags"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="comma, separated, tags"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pf-effective-start" className="text-caption">
                        Effective start
                      </Label>
                      <Input
                        id="pf-effective-start"
                        type="date"
                        className="w-full"
                        value={metadata.effectiveStart ?? ""}
                        onChange={(e) =>
                          setMetadata((m) => ({ ...m, effectiveStart: e.target.value || null }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Data packets & attributes ───────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <ContractStep selection={contract} onChange={setContract} />
                  {fingerprintConflict && (
                    <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2.5 text-caption space-y-1.5">
                      <p className="text-foreground font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                        Identical definition detected
                      </p>
                      <p className="text-muted-foreground">
                        This configuration matches{" "}
                        <span className="font-medium text-foreground">
                          {fingerprintConflict.name}
                        </span>{" "}
                        v{fingerprintConflict.version} ({fingerprintConflict.productCode}). Reuse
                        that product instead of saving a duplicate definition.
                      </p>
                      <Link
                        to={"/data-products/products/" + fingerprintConflict.id}
                        className="text-primary hover:underline"
                      >
                        Reuse existing product →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Retrieval ──────────────────────────── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-caption font-medium">Data coverage scope</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Scope information"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-caption">
                          <p className="font-medium mb-1">Coverage Scope</p>
                          <p className="mb-1 text-muted-foreground">
                            Whose data is queried — not who can see an enquiry footprint.
                          </p>
                          <ul className="space-y-0.5">
                            {(
                              Object.entries(SCOPE_TOOLTIPS) as [EnquiryConfig["scope"], string][]
                            ).map(([key, desc]) => (
                              <li key={key}>
                                <span className="font-medium">{key}:</span> {desc}
                              </li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={enquiryConfig.scope}
                      onValueChange={(v) =>
                        setEnquiryConfig((prev) => ({ ...prev, scope: v as EnquiryConfig["scope"] }))
                      }
                    >
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SELF">Self Data</SelectItem>
                        <SelectItem value="NETWORK">Network Data</SelectItem>
                        <SelectItem value="CONSORTIUM">Consortium Data</SelectItem>
                        <SelectItem value="VERTICAL">Vertical Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label className="text-caption font-medium">
                          Allow trended retrieval
                        </Label>
                        <p className="text-caption text-muted-foreground max-w-sm">
                          Consumers choose latest or history per request, up to this ceiling.
                        </p>
                      </div>
                      <Switch
                        checked={trendedConfig.enabled}
                        onCheckedChange={(v) =>
                          setTrendedConfig((t) => ({
                            enabled: v,
                            maxHistoryMonths: v ? t.maxHistoryMonths || 6 : t.maxHistoryMonths,
                          }))
                        }
                      />
                    </div>
                    {trendedConfig.enabled && !contractHasTrendedCapable(contract) && (
                      <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-caption text-muted-foreground">
                        No trended-capable attributes are included in this contract yet. Trended
                        retrieval will return latest values only until you add an event stream or
                        trended attribute in Step 2.
                      </div>
                    )}
                    {trendedConfig.enabled && (
                      <div className="space-y-1.5 max-w-xs">
                        <Label htmlFor="pf-max-history" className="text-caption">
                          Maximum history depth (months)
                        </Label>
                        <Input
                          id="pf-max-history"
                          type="number"
                          min={1}
                          max={60}
                          value={trendedConfig.maxHistoryMonths}
                          onChange={(e) =>
                            setTrendedConfig((t) => ({
                              ...t,
                              maxHistoryMonths: Math.max(1, Math.min(60, Number(e.target.value) || 1)),
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label className="text-caption font-medium">
                          Allow retro retrieval
                        </Label>
                        <p className="text-caption text-muted-foreground max-w-sm">
                          Consumers may request a point-in-time snapshot as of an enquiry date,
                          within this ceiling.
                        </p>
                      </div>
                      <Switch
                        checked={retroConfig.enabled}
                        onCheckedChange={(v) =>
                          setRetroConfig((t) => ({
                            enabled: v,
                            maxHistoryMonths: v ? t.maxHistoryMonths || 6 : t.maxHistoryMonths,
                          }))
                        }
                      />
                    </div>
                    {retroConfig.enabled && (
                      <div className="space-y-1.5 max-w-xs">
                        <Label htmlFor="pf-retro-max-history" className="text-caption">
                          Maximum history depth (months)
                        </Label>
                        <Input
                          id="pf-retro-max-history"
                          type="number"
                          min={1}
                          max={60}
                          value={retroConfig.maxHistoryMonths}
                          onChange={(e) =>
                            setRetroConfig((t) => ({
                              ...t,
                              maxHistoryMonths: Math.max(1, Math.min(60, Number(e.target.value) || 1)),
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 4: Enquiry impact ─────────────────────── */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <Label className="text-caption font-medium">Enquiry impact</Label>
                    <p className="text-caption text-muted-foreground">
                      Allow Soft and/or Hard enquiry independently. When an option is on, configure
                      whether to store a footprint and who can see it.
                    </p>
                  </div>

                  {(
                    [
                      {
                        key: "soft" as const,
                        title: "Allow soft enquiry",
                        blurb:
                          "Soft pulls do not typically affect credit decisioning severity.",
                      },
                      {
                        key: "hard" as const,
                        title: "Allow hard enquiry",
                        blurb:
                          "Hard pulls are recorded as formal enquiries when footprint storage is on.",
                      },
                    ] as const
                  ).map((block, idx) => {
                    const opt = enquiryConfig[block.key];
                    return (
                      <div key={block.key} className="space-y-3">
                        {idx > 0 && <Separator />}
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <Label className="text-caption font-medium">{block.title}</Label>
                            <p className="text-caption text-muted-foreground max-w-sm">
                              {block.blurb}
                            </p>
                          </div>
                          <Switch
                            checked={opt.enabled}
                            onCheckedChange={(v) =>
                              setEnquiryConfig((prev) =>
                                normalizeEnquiryConfig({
                                  ...prev,
                                  [block.key]: normalizeImpactOption({
                                    ...prev[block.key],
                                    enabled: v,
                                    storeFootprint: v ? prev[block.key].storeFootprint : false,
                                    footprintVisibility: v
                                      ? prev[block.key].footprintVisibility
                                      : null,
                                  }),
                                })
                              )
                            }
                          />
                        </div>

                        {opt.enabled && (
                          <div className="space-y-3 rounded-lg border border-border/80 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <Label className="text-caption font-medium">
                                  Store enquiry footprint
                                </Label>
                                <p className="text-caption text-muted-foreground max-w-sm">
                                  When enabled, an enquiry record is written for this impact type.
                                </p>
                              </div>
                              <Switch
                                checked={opt.storeFootprint}
                                onCheckedChange={(v) =>
                                  setEnquiryConfig((prev) =>
                                    normalizeEnquiryConfig({
                                      ...prev,
                                      [block.key]: normalizeImpactOption({
                                        ...prev[block.key],
                                        enabled: true,
                                        storeFootprint: v,
                                        footprintVisibility: v
                                          ? prev[block.key].footprintVisibility ?? "NETWORK"
                                          : null,
                                      }),
                                    })
                                  )
                                }
                              />
                            </div>

                            {opt.storeFootprint && (
                              <div className="space-y-2">
                                <Label className="text-caption font-medium">
                                  Footprint visibility
                                </Label>
                                <p className="text-caption text-muted-foreground">
                                  Who can see this enquiry on the subject&apos;s footprint.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      opt.footprintVisibility === "NETWORK" ? "default" : "outline"
                                    }
                                    onClick={() =>
                                      setEnquiryConfig((prev) =>
                                        normalizeEnquiryConfig({
                                          ...prev,
                                          [block.key]: normalizeImpactOption({
                                            ...prev[block.key],
                                            enabled: true,
                                            storeFootprint: true,
                                            footprintVisibility: "NETWORK",
                                          }),
                                        })
                                      )
                                    }
                                  >
                                    All network participants
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                      opt.footprintVisibility === "VERTICAL" ? "default" : "outline"
                                    }
                                    onClick={() =>
                                      setEnquiryConfig((prev) =>
                                        normalizeEnquiryConfig({
                                          ...prev,
                                          [block.key]: normalizeImpactOption({
                                            ...prev[block.key],
                                            enabled: true,
                                            storeFootprint: true,
                                            footprintVisibility: "VERTICAL",
                                          }),
                                        })
                                      )
                                    }
                                  >
                                    Vertical participants
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── STEP 5: Review ──────────────────────────────── */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/80 p-4 space-y-2">
                    <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
                      Basics & metadata
                    </p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-caption">
                      <div>
                        <dt className="text-muted-foreground">Name</dt>
                        <dd className="text-foreground font-medium">{name || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">SAP item code</dt>
                        <dd className="text-foreground">{metadata.sapItemCode || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Business unit</dt>
                        <dd className="text-foreground">{metadata.businessUnit || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Segment</dt>
                        <dd className="text-foreground">{metadata.targetSegment || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Effective start</dt>
                        <dd className="text-foreground">{metadata.effectiveStart || "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Release note</dt>
                        <dd className="text-foreground whitespace-pre-wrap">
                          {metadata.releaseNote || "—"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Tags</dt>
                        <dd className="text-foreground">
                          {tagsInput
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <ContractReviewCard selection={contract} fingerprint={liveFingerprint} />

                  <div className="rounded-lg border border-border/80 p-4 space-y-2">
                    <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
                      Retrieval & enquiry
                    </p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-caption">
                      <div>
                        <dt className="text-muted-foreground">Coverage scope</dt>
                        <dd className="text-foreground">{enquiryConfig.scope}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Impact</dt>
                        <dd className="text-foreground space-y-0.5">
                          <div>{formatImpactOption(enquiryConfig.soft, "Soft")}</div>
                          <div>{formatImpactOption(enquiryConfig.hard, "Hard")}</div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Trended retrieval</dt>
                        <dd className="text-foreground">
                          {trendedConfig.enabled
                            ? `Enabled · up to ${trendedConfig.maxHistoryMonths} months`
                            : "Disabled"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Retro retrieval</dt>
                        <dd className="text-foreground">
                          {retroConfig.enabled
                            ? `Enabled · up to ${retroConfig.maxHistoryMonths} months`
                            : "Disabled"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <p className="text-caption text-muted-foreground italic">
                    Full request/response JSON previews are below.
                  </p>
                </div>
              )}

              {/* ── Wizard nav ──────────────────────────────────── */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  disabled={step === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                {step < 5 ? (
                  step === 2 && step2Blockers.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button type="button" size="sm" disabled>
                            Continue
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <ContractContinueTooltip selection={contract} />
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button type="button" size="sm" onClick={handleNext}>
                      {step === 2 ? "Continue" : "Next"}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )
                ) : (
                  <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : isEdit ? "Save draft" : "Create product"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Live preview — always below the wizard, full width ─── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Live preview</CardTitle>
            <p className="text-caption text-muted-foreground mt-0.5">
              Reflects the definition as you configure it, across all wizard steps.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(trendedConfig.enabled || retroConfig.enabled) && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
                <span className="text-caption text-muted-foreground">Preview as</span>
                <div className="flex gap-1">
                  {(
                    [
                      { id: "LATEST" as const, enabled: true },
                      { id: "TRENDED" as const, enabled: trendedConfig.enabled },
                      { id: "RETRO" as const, enabled: retroConfig.enabled },
                    ] as const
                  ).map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant={previewScope === s.id ? "default" : "outline"}
                      className="h-7 text-caption px-2.5"
                      disabled={!s.enabled}
                      onClick={() => s.enabled && setPreviewScope(s.id)}
                    >
                      {s.id}
                    </Button>
                  ))}
                </div>
                {previewScope === "TRENDED" && trendedConfig.enabled && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Label htmlFor="pf-preview-window" className="text-caption text-muted-foreground">
                      Window
                    </Label>
                    <Input
                      id="pf-preview-window"
                      type="number"
                      min={1}
                      max={Math.max(trendedConfig.maxHistoryMonths, 1)}
                      value={previewWindow}
                      onChange={(e) =>
                        setPreviewWindow(
                          clamp(Number(e.target.value) || 1, 1, Math.max(trendedConfig.maxHistoryMonths, 1))
                        )
                      }
                      className="h-7 w-16 text-caption"
                    />
                    <span className="text-caption text-muted-foreground">
                      / {trendedConfig.maxHistoryMonths}mo
                    </span>
                  </div>
                )}
                {previewScope === "RETRO" && retroConfig.enabled && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Label
                      htmlFor="pf-preview-enquiry-date"
                      className="text-caption text-muted-foreground"
                    >
                      Enquiry date
                    </Label>
                    <Input
                      id="pf-preview-enquiry-date"
                      type="date"
                      value={previewEnquiryDate}
                      max={REFERENCE_DATE}
                      onChange={(e) => setPreviewEnquiryDate(e.target.value || DEFAULT_RETRO_ENQUIRY_DATE)}
                      className="h-7 w-[9.5rem] text-caption"
                    />
                  </div>
                )}
              </div>
            )}

            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "request" | "response")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="request" className="text-caption">
                  Request
                </TabsTrigger>
                <TabsTrigger value="response" className="text-caption">
                  Response
                </TabsTrigger>
              </TabsList>
              <TabsContent value="request" className="mt-3">
                <ScrollArea className="h-[min(60vh,520px)] rounded-md border border-border bg-muted/30">
                  <pre className="p-3 text-[10px] leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(requestPreview, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="response" className="mt-3 space-y-2">
                <ScrollArea className="h-[min(60vh,520px)] rounded-md border border-border bg-muted/30">
                  <pre className="p-3 text-[10px] leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(responsePreview, null, 2)}
                  </pre>
                </ScrollArea>
                <p className="text-caption text-muted-foreground italic">
                  NO_DATA is a valid outcome, not an error.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
