import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  productCatalogPacketOptions,
  packetMockData,
  DEFAULT_ENQUIRY_CONFIG,
  normalizeEnquiryConfig,
  type EnquiryConfig,
  type PacketConfig,
} from "@/data/data-products-mock";
import {
  buildProductFormPacketRows,
  filterCatalogOptionsForProductForm,
  groupPacketRowsByDataDomain,
  sortPacketIdsByCatalogOrder,
  type ProductFormPacketRow,
} from "@/lib/product-packet-catalog";
import { PacketConfigModal } from "@/components/data-products/PacketConfigModal";
import {
  productMgmtStore,
  useProductMgmtVersion,
} from "@/lib/product-management-demo-store";
import {
  BRD_STATUS_LABEL,
  DEFAULT_PROFILE_CONFIG,
  DEFAULT_PROFILE_FIELDS,
  DEFAULT_TRENDED_CONFIG,
  computeDefinitionFingerprint,
  inferAttributeMode,
  type ProductMetadata,
  type ProfileBlockConfig,
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
  legalConditions:
    "Access is governed by the applicable member participation agreement and data protection law. Enquiries must be purpose-limited and consent-backed where required.",
  dataAcquisitionType: "Member-contributed",
  dataAvailabilityType: "Managed by bureau, available for direct enquiry",
  accessRestrictions: "Active subscription required; purpose-bound use only",
};

const SCOPE_TOOLTIPS: Record<EnquiryConfig["scope"], string> = {
  SELF: "Returns data sourced directly from the subject entity's own records.",
  NETWORK: "Includes linked entities and immediate network connections.",
  CONSORTIUM: "Draws from the shared cross-lender consortium data pool.",
  VERTICAL: "Restricted to a specific industry vertical dataset.",
};

const BLOCKED_NAME_SUFFIXES = new Set(["new", "final", "copy"]);

type WizardStep = 1 | 2 | 3 | 4;

const WIZARD_STEPS: { id: WizardStep; label: string; shortTitle: string }[] = [
  { id: 1, label: "Basics & metadata", shortTitle: "Basics" },
  { id: 2, label: "Data packets", shortTitle: "Packets" },
  { id: 3, label: "Enquiry & trended", shortTitle: "Enquiry" },
  { id: 4, label: "Review", shortTitle: "Review" },
];

const REFERENCE_MONTH = "2026-06";

const PROFILE_MOCK_VALUES: Record<string, unknown> = {
  fullName: "Aarav Sharma",
  dateOfBirth: "1990-05-14",
  gender: "Male",
  currentAddress: "12, MG Road, Bengaluru, KA 560001",
  primaryIdentifier: "XXXXXXXX1234",
  contactNumber: "+91-98XXXXXX10",
};

function profileMockValue(field: string): unknown {
  return PROFILE_MOCK_VALUES[field] ?? `[mock:${field}]`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Ascending list of "YYYY-MM" strings ending at the fixed demo reference month. */
function generatePeriods(window: number): string[] {
  const [refYear, refMonth] = REFERENCE_MONTH.split("-").map(Number);
  const periods: string[] = [];
  for (let i = window - 1; i >= 0; i--) {
    const d = new Date(refYear, refMonth - 1 - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periods;
}

function buildTrendedSeries(base: number, periods: string[]): { period: string; value: number }[] {
  const mid = (periods.length - 1) / 2;
  return periods.map((period, i) => {
    const drift = 1 + (i - mid) * 0.025;
    return { period, value: Math.round(base * drift * 100) / 100 };
  });
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
  trendedEnabled: boolean;
  previewScope: "LATEST" | "TRENDED";
  previewWindow: number;
  maxHistoryMonths: number;
}): object {
  const productEntry: Record<string, unknown> = {
    productId: params.productId,
    productVersion: params.productVersion,
  };
  if (params.trendedEnabled) {
    productEntry.dataScope = params.previewScope;
    if (params.previewScope === "TRENDED") {
      productEntry.window = clamp(params.previewWindow, 1, Math.max(params.maxHistoryMonths, 1));
    }
  }
  return {
    products: [productEntry],
    subject: { "…": "…" },
  };
}

function buildResponsePreview(params: {
  productId: string;
  productVersion: number;
  orderedPacketIds: string[];
  packetConfigs: PacketConfig[];
  profileConfig: ProfileBlockConfig;
  trendedEnabled: boolean;
  previewScope: "LATEST" | "TRENDED";
  previewWindow: number;
  maxHistoryMonths: number;
}): object {
  const effectiveScope: "LATEST" | "TRENDED" = params.trendedEnabled ? params.previewScope : "LATEST";
  const window = clamp(params.previewWindow, 1, Math.max(params.maxHistoryMonths, 1));
  const periods = effectiveScope === "TRENDED" ? generatePeriods(window) : [];

  const header = {
    productId: params.productId,
    productVersion: params.productVersion,
    requestId: "REQ_DEMO_00001",
    generatedAt: "2026-08-05T00:00:00.000Z",
  };

  const profile: Record<string, unknown> = {};
  for (const field of params.profileConfig.includedFields) {
    profile[field] = profileMockValue(field);
  }

  const configMap = new Map(params.packetConfigs.map((c) => [c.packetId, c]));
  const sections: Record<string, unknown> = {};
  const noDataIndex = params.orderedPacketIds.length >= 2 ? params.orderedPacketIds.length - 1 : -1;

  params.orderedPacketIds.forEach((pid, idx) => {
    const opt = productCatalogPacketOptions.find((o) => o.id === pid);
    if (!opt) return;
    const key = opt.previewKey;

    if (idx === noDataIndex) {
      sections[key] = { status: "NO_DATA", data: null };
      return;
    }

    const fullPayload = packetMockData[pid] ?? {};
    const cfg = configMap.get(pid);
    const selectedFields = cfg?.selectedFields;
    const disabledSet = new Set((cfg?.disabledFields ?? []).filter(Boolean));
    const fieldEntries =
      selectedFields && selectedFields.length > 0
        ? Object.entries(fullPayload).filter(
            ([k]) => selectedFields.includes(k) && !disabledSet.has(k)
          )
        : Object.entries(fullPayload);

    const data: Record<string, unknown> = {};
    for (const [k, v] of fieldEntries) {
      if (effectiveScope === "TRENDED" && typeof v === "number" && inferAttributeMode(k) === "TRENDED") {
        data[k] = buildTrendedSeries(v, periods);
      } else {
        data[k] = v;
      }
    }
    const derivedSel = cfg?.selectedDerivedFields?.filter(Boolean) ?? [];
    if (derivedSel.length > 0) {
      data.__derived = Object.fromEntries(derivedSel.map((d) => [d, `[computed:${d}]`]));
    }

    sections[key] = {
      status: "SERVED",
      versionServed: params.productVersion,
      dataScope: effectiveScope,
      data,
    };
  });

  return { header, profile, sections };
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

  // Local catalogue is source of truth for the form (avoids stale API packet-catalog responses).
  const catalogOptions = productCatalogPacketOptions;
  const catalogOrderIds = useMemo(
    () => filterCatalogOptionsForProductForm(catalogOptions).map((o) => o.id),
    [catalogOptions]
  );
  const visibleCatalogIdSet = useMemo(() => new Set(catalogOrderIds), [catalogOrderIds]);
  const packetRowsByDomain = useMemo(
    () => groupPacketRowsByDataDomain(buildProductFormPacketRows(catalogOptions)),
    [catalogOptions]
  );

  // ── Step 1: Basics & metadata ───────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState<ProductMetadata>(EMPTY_META);
  const [tagsInput, setTagsInput] = useState("");

  // ── Step 2: Data packets ────────────────────────────────────
  const [orderedPacketIds, setOrderedPacketIds] = useState<string[]>([]);
  const [packetConfigs, setPacketConfigs] = useState<PacketConfig[]>([]);
  const [packetModalIds, setPacketModalIds] = useState<string[] | null>(null);
  const [profileConfig, setProfileConfig] = useState<ProfileBlockConfig>({
    includedFields: [...DEFAULT_PROFILE_CONFIG.includedFields],
  });
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileDraftFields, setProfileDraftFields] = useState<string[]>([]);

  // ── Step 3: Enquiry & trended ────────────────────────────────
  const [enquiryConfig, setEnquiryConfig] = useState<EnquiryConfig>(DEFAULT_ENQUIRY_CONFIG);
  const [trendedConfig, setTrendedConfig] = useState<TrendedConfig>({ ...DEFAULT_TRENDED_CONFIG });

  // ── Preview-only controls (not persisted) ───────────────────
  const [previewScope, setPreviewScope] = useState<"LATEST" | "TRENDED">("LATEST");
  const [previewWindow, setPreviewWindow] = useState<number>(6);
  const [previewTab, setPreviewTab] = useState<"request" | "response">("request");

  // ── Hydrate from existing product ──────────────────────────
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setOrderedPacketIds(sortPacketIdsByCatalogOrder(existing.packetIds, catalogOrderIds));
      setPacketConfigs(existing.packetConfigs ?? []);
      setEnquiryConfig(normalizeEnquiryConfig(existing.enquiryConfig));
      setTrendedConfig(existing.trendedConfig ?? { ...DEFAULT_TRENDED_CONFIG });
      setProfileConfig(
        existing.profileConfig?.includedFields?.length
          ? { includedFields: [...existing.profileConfig.includedFields] }
          : { includedFields: [...DEFAULT_PROFILE_CONFIG.includedFields] }
      );
      setMetadata({ ...EMPTY_META, ...existing.metadata });
      setTagsInput(existing.metadata.tags.join(", "));
    } else if (!isEdit) {
      setName("");
      setDescription("");
      setOrderedPacketIds([]);
      setPacketConfigs([]);
      setEnquiryConfig(DEFAULT_ENQUIRY_CONFIG);
      setTrendedConfig({ ...DEFAULT_TRENDED_CONFIG });
      setProfileConfig({ includedFields: [...DEFAULT_PROFILE_CONFIG.includedFields] });
      setMetadata(EMPTY_META);
      setTagsInput("");
    }
  }, [existing, isEdit, catalogOrderIds]);

  // Keep preview controls consistent with the trended ceiling.
  useEffect(() => {
    if (!trendedConfig.enabled) {
      setPreviewScope("LATEST");
    } else {
      setPreviewWindow((w) => clamp(w, 1, Math.max(trendedConfig.maxHistoryMonths, 1)));
    }
  }, [trendedConfig.enabled, trendedConfig.maxHistoryMonths]);

  // ── Packet selection (row = source type group, or one custom packet) ──
  const togglePacketRow = useCallback(
    (row: ProductFormPacketRow) => {
      setOrderedPacketIds((prev) => {
        const anySelected = row.packetIds.some((pid) => prev.includes(pid));
        const next = anySelected
          ? prev.filter((pid) => !row.packetIds.includes(pid))
          : [...prev, ...row.packetIds.filter((pid) => !prev.includes(pid))];
        return sortPacketIdsByCatalogOrder(next, catalogOrderIds);
      });
    },
    [catalogOrderIds]
  );

  const toggleOrphanPacket = useCallback(
    (packetId: string) => {
      setOrderedPacketIds((prev) => {
        const next = prev.includes(packetId)
          ? prev.filter((x) => x !== packetId)
          : [...prev, packetId];
        return sortPacketIdsByCatalogOrder(next, catalogOrderIds);
      });
    },
    [catalogOrderIds]
  );

  // ── Field-level config ─────────────────────────────────────
  const getPacketConfig = useCallback(
    (packetId: string): PacketConfig =>
      packetConfigs.find((c) => c.packetId === packetId) ?? {
        packetId,
        selectedFields: [],
        disabledFields: [],
        selectedDerivedFields: [],
      },
    [packetConfigs]
  );

  const handleSavePacketFields = useCallback(
    (
      packetId: string,
      payload: {
        selectedFields: string[];
        disabledFields?: string[];
        selectedDerivedFields: string[];
      }
    ) => {
      setPacketConfigs((prev) => {
        const without = prev.filter((c) => c.packetId !== packetId);
        const selectedSet = new Set(payload.selectedFields);
        const disabled =
          payload.disabledFields?.filter((f) => selectedSet.has(f)) ?? [];
        return [
          ...without,
          {
            packetId,
            selectedFields: payload.selectedFields,
            disabledFields: disabled,
            selectedDerivedFields: payload.selectedDerivedFields,
          },
        ];
      });
    },
    []
  );

  const openProfileDialog = () => {
    setProfileDraftFields(profileConfig.includedFields);
    setProfileDialogOpen(true);
  };
  const saveProfileDialog = () => {
    setProfileConfig({ includedFields: profileDraftFields });
    setProfileDialogOpen(false);
  };

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
    () => computeDefinitionFingerprint(orderedPacketIds, packetConfigs, enquiryConfig, trendedConfig),
    [orderedPacketIds, packetConfigs, enquiryConfig, trendedConfig]
  );
  const fingerprintConflict = useMemo(
    () => productMgmtStore.findFingerprintConflict(liveFingerprint, id, existing?.productCode),
    [liveFingerprint, id, existing?.productCode]
  );

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
        trendedEnabled: trendedConfig.enabled,
        previewScope,
        previewWindow,
        maxHistoryMonths: trendedConfig.maxHistoryMonths,
      }),
    [previewProductId, previewProductVersion, trendedConfig, previewScope, previewWindow]
  );

  const responsePreview = useMemo(
    () =>
      buildResponsePreview({
        productId: previewProductId,
        productVersion: previewProductVersion,
        orderedPacketIds,
        packetConfigs,
        profileConfig,
        trendedEnabled: trendedConfig.enabled,
        previewScope,
        previewWindow,
        maxHistoryMonths: trendedConfig.maxHistoryMonths,
      }),
    [
      previewProductId,
      previewProductVersion,
      orderedPacketIds,
      packetConfigs,
      profileConfig,
      trendedConfig,
      previewScope,
      previewWindow,
    ]
  );

  const parsedMeta = (): ProductMetadata => ({
    ...metadata,
    sapItemCode: metadata.sapItemCode.trim(),
    tags: tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
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
    setStep((s) => (clamp(s + 1, 1, 4) as WizardStep));
  };
  const handleBack = () => setStep((s) => (clamp(s - 1, 1, 4) as WizardStep));
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
          name: name.trim(),
          description: description.trim(),
          packetIds: orderedPacketIds,
          packetConfigs,
          enquiryConfig: normalizeEnquiryConfig(enquiryConfig),
          trendedConfig,
          profileConfig,
          metadata: parsedMeta(),
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
          name: name.trim(),
          description: description.trim(),
          packetIds: orderedPacketIds,
          packetConfigs,
          enquiryConfig: normalizeEnquiryConfig(enquiryConfig),
          trendedConfig,
          profileConfig,
          metadata: parsedMeta(),
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
      name: name.trim(),
      description: description.trim(),
      packetIds: orderedPacketIds,
      packetConfigs,
      enquiryConfig: normalizeEnquiryConfig(enquiryConfig),
      trendedConfig,
      profileConfig,
      metadata: parsedMeta(),
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

  const quorumPolicy = productMgmtStore.getPolicies().find((p) => p.id === "POL_QUORUM");

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
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
            Compose from internal packets, configure fields, and set enquiry &amp; trended-data behaviour.
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
                      <Input
                        id="pf-bu"
                        value={metadata.businessUnit}
                        onChange={(e) =>
                          setMetadata((m) => ({ ...m, businessUnit: e.target.value }))
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pf-segment" className="text-caption">
                        Segment
                      </Label>
                      <Input
                        id="pf-segment"
                        value={metadata.targetSegment}
                        onChange={(e) =>
                          setMetadata((m) => ({ ...m, targetSegment: e.target.value }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-xs">
                    <Label htmlFor="pf-sensitivity" className="text-caption">
                      Sensitivity
                    </Label>
                    <Select
                      value={metadata.sensitivity}
                      onValueChange={(v) =>
                        setMetadata((m) => ({
                          ...m,
                          sensitivity: v as ProductMetadata["sensitivity"],
                        }))
                      }
                    >
                      <SelectTrigger id="pf-sensitivity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                    {metadata.sensitivity === "High" && (
                      <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-caption text-primary w-fit">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        {quorumPolicy?.name ?? "Governance quorum"} — POL_QUORUM
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 max-w-xl">
                    <Label htmlFor="pf-legal" className="text-caption">
                      Legal conditions
                    </Label>
                    <Textarea
                      id="pf-legal"
                      value={metadata.legalConditions}
                      onChange={(e) =>
                        setMetadata((m) => ({ ...m, legalConditions: e.target.value }))
                      }
                      rows={3}
                      className="w-full resize-y min-h-[72px]"
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

              {/* ── STEP 2: Data packets ───────────────────────── */}
              {step === 2 && (
                <div className="space-y-4">
                  <Card className="border-primary/30 bg-primary/[0.03]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle>Customer Profile</CardTitle>
                          <Badge variant="secondary" className="font-normal">
                            System block
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={openProfileDialog}
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          Configure
                        </Button>
                      </div>
                      <p className="text-caption text-muted-foreground mt-0.5">
                        Always included — not a data packet, not removable.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ul className="flex flex-wrap gap-1.5">
                        {profileConfig.includedFields.map((f) => (
                          <li
                            key={f}
                            className="rounded-full bg-muted px-2.5 py-1 text-caption font-mono text-muted-foreground"
                          >
                            {f}
                          </li>
                        ))}
                        {profileConfig.includedFields.length === 0 && (
                          <li className="text-caption text-muted-foreground">
                            No fields selected.
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <div>
                    <p className="text-caption text-muted-foreground mb-2">
                      Click <span className="font-medium text-foreground">Configure</span> to
                      choose fields per packet.
                    </p>
                    <div className="space-y-4">
                      {packetRowsByDomain.map(([domain, rows], di) => (
                        <div key={domain}>
                          {di > 0 && <Separator className="mb-4" />}
                          <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            {domain}
                          </p>
                          <ul className="space-y-1.5">
                            {rows.map((row) => {
                              const rowFullySelected =
                                row.packetIds.length > 0 &&
                                row.packetIds.every((pid) => orderedPacketIds.includes(pid));
                              const rowPartial =
                                !rowFullySelected &&
                                row.packetIds.some((pid) => orderedPacketIds.includes(pid));
                              const chkId = `pkt-grp-${row.packetIds[0]}`;
                              return (
                                <li
                                  key={chkId}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                                    rowFullySelected || rowPartial
                                      ? "border-primary/30 bg-primary/5"
                                      : "border-border/80 bg-transparent hover:bg-muted/30"
                                  )}
                                >
                                  <Checkbox
                                    id={chkId}
                                    checked={rowPartial ? "indeterminate" : rowFullySelected}
                                    onCheckedChange={() => togglePacketRow(row)}
                                    className="shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <label
                                      htmlFor={chkId}
                                      className="text-[11px] text-muted-foreground cursor-pointer leading-tight block"
                                    >
                                      {row.sourceTypeLabel}
                                    </label>
                                  </div>
                                  {(rowFullySelected || rowPartial) && (() => {
                                    const selectedPkts = row.packets.filter((opt) =>
                                      orderedPacketIds.includes(opt.id)
                                    );
                                    if (selectedPkts.length === 0) return null;

                                    const rowFieldCount = selectedPkts.reduce((sum, opt) => {
                                      const cfg = getPacketConfig(opt.id);
                                      return (
                                        sum +
                                        cfg.selectedFields.length +
                                        (cfg.selectedDerivedFields?.length ?? 0)
                                      );
                                    }, 0);

                                    return (
                                      <div className="flex shrink-0 items-center min-w-[7rem]">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 gap-1.5 px-2 justify-start text-caption leading-snug overflow-visible"
                                          onClick={() =>
                                            setPacketModalIds(
                                              sortPacketIdsByCatalogOrder(
                                                selectedPkts.map((o) => o.id),
                                                catalogOrderIds
                                              )
                                            )
                                          }
                                        >
                                          <Settings2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                          <span className="min-w-0">Configure</span>
                                          {rowFieldCount > 0 && (
                                            <Badge
                                              variant="secondary"
                                              className="h-4 px-1.5 text-[10px] font-mono shrink-0"
                                            >
                                              {rowFieldCount}
                                            </Badge>
                                          )}
                                        </Button>
                                      </div>
                                    );
                                  })()}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                      {orderedPacketIds.some((pid) => !visibleCatalogIdSet.has(pid)) && (
                        <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 space-y-2">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Packets not in the standard catalogue (e.g. custom source). Uncheck
                            to remove from this product.
                          </p>
                          <ul className="space-y-1.5">
                            {orderedPacketIds
                              .filter((pid) => !visibleCatalogIdSet.has(pid))
                              .map((pid) => {
                                const meta = catalogOptions.find((o) => o.id === pid);
                                return (
                                  <li
                                    key={pid}
                                    className="flex items-center gap-3 rounded-md border border-border/60 bg-background/50 px-2 py-2"
                                  >
                                    <Checkbox
                                      id={`pkt-orphan-${pid}`}
                                      checked
                                      onCheckedChange={() => toggleOrphanPacket(pid)}
                                      className="shrink-0"
                                    />
                                    <label
                                      htmlFor={`pkt-orphan-${pid}`}
                                      className="text-caption cursor-pointer flex-1 min-w-0"
                                    >
                                      {meta?.label ?? pid}
                                      {meta?.description && (
                                        <span className="text-muted-foreground block mt-0.5">
                                          {meta.description}
                                        </span>
                                      )}
                                    </label>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

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
                        to={`/data-products/products/${fingerprintConflict.id}`}
                        className="text-primary hover:underline"
                      >
                        Reuse existing product →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Enquiry & trended ──────────────────── */}
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

                  <div className="space-y-2">
                    <Label className="text-caption font-medium">Enquiry impact</Label>
                    <p className="text-caption text-muted-foreground">
                      Soft enquiry does not affect the subject's credit footprint; hard enquiry
                      is recorded as a formal enquiry.
                    </p>
                    <div className="flex gap-2 mt-1">
                      {(["SOFT", "HARD"] as const).map((impact) => (
                        <Button
                          key={impact}
                          type="button"
                          variant={enquiryConfig.impactType === impact ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setEnquiryConfig((prev) => ({ ...prev, impactType: impact }))
                          }
                        >
                          {impact === "SOFT" ? "Soft enquiry" : "Hard enquiry"}
                        </Button>
                      ))}
                    </div>
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
                              maxHistoryMonths: Math.max(1, Number(e.target.value) || 1),
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 4: Review ──────────────────────────────── */}
              {step === 4 && (
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
                        <dt className="text-muted-foreground">Sensitivity</dt>
                        <dd className="text-foreground">{metadata.sensitivity}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Effective start</dt>
                        <dd className="text-foreground">{metadata.effectiveStart || "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Tags</dt>
                        <dd className="text-foreground">{tagsInput || "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Description</dt>
                        <dd className="text-foreground">{description || "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Legal conditions</dt>
                        <dd className="text-foreground">{metadata.legalConditions || "—"}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border border-border/80 p-4 space-y-2">
                    <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
                      Data packets
                    </p>
                    <p className="text-caption text-muted-foreground">
                      Customer Profile: {profileConfig.includedFields.length} field(s) ·{" "}
                      {orderedPacketIds.length} packet(s) selected
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {orderedPacketIds.map((pid) => {
                        const label = catalogOptions.find((o) => o.id === pid)?.label ?? pid;
                        return (
                          <li
                            key={pid}
                            className="rounded-full bg-muted px-2.5 py-1 text-caption text-muted-foreground"
                          >
                            {label}
                          </li>
                        );
                      })}
                      {orderedPacketIds.length === 0 && (
                        <li className="text-caption text-muted-foreground">
                          No packets selected.
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border/80 p-4 space-y-2">
                    <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
                      Enquiry & trended
                    </p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-caption">
                      <div>
                        <dt className="text-muted-foreground">Coverage scope</dt>
                        <dd className="text-foreground">{enquiryConfig.scope}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Impact</dt>
                        <dd className="text-foreground">
                          {enquiryConfig.impactType === "SOFT" ? "Soft enquiry" : "Hard enquiry"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Trended retrieval</dt>
                        <dd className="text-foreground">
                          {trendedConfig.enabled
                            ? `Enabled · up to ${trendedConfig.maxHistoryMonths} months`
                            : "Disabled"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <p className="text-caption text-muted-foreground italic">
                    Full request/response JSON previews are in the right column.
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
                {step < 4 ? (
                  <Button type="button" size="sm" onClick={handleNext}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
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
            {trendedConfig.enabled && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-2.5 py-2">
                <span className="text-caption text-muted-foreground">Preview as</span>
                <div className="flex gap-1">
                  {(["LATEST", "TRENDED"] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={previewScope === s ? "default" : "outline"}
                      className="h-7 text-caption px-2.5"
                      onClick={() => setPreviewScope(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
                {previewScope === "TRENDED" && (
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

      {packetModalIds && (
        <PacketConfigModal
          key={packetModalIds.join(",")}
          packetIds={packetModalIds}
          catalogOptions={catalogOptions}
          onClose={() => setPacketModalIds(null)}
          getPacketConfig={(pid) => {
            const c = getPacketConfig(pid);
            return {
              selectedFields: c.selectedFields,
              disabledFields: c.disabledFields ?? [],
              selectedDerivedFields: c.selectedDerivedFields ?? [],
            };
          }}
          onSave={handleSavePacketFields}
        />
      )}

      {profileDialogOpen && (
        <Dialog open onOpenChange={(v) => !v && setProfileDialogOpen(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-h4">Customer Profile fields</DialogTitle>
            </DialogHeader>
            <p className="text-caption text-muted-foreground">
              System profile block fields — not a data packet, always included in every product.
            </p>
            <ul className="space-y-1 py-1">
              {DEFAULT_PROFILE_FIELDS.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`profile-field-${f}`}
                    checked={profileDraftFields.includes(f)}
                    onCheckedChange={(v) =>
                      setProfileDraftFields((prev) =>
                        v ? [...prev, f] : prev.filter((x) => x !== f)
                      )
                    }
                  />
                  <Label
                    htmlFor={`profile-field-${f}`}
                    className="text-body font-mono font-normal cursor-pointer flex-1 select-none"
                  >
                    {f}
                  </Label>
                </li>
              ))}
            </ul>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProfileDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={saveProfileDialog}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
