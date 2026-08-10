import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Settings2,
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
  formatImpactOption,
  footprintCreatedForType,
  normalizeEnquiryConfig,
  normalizeImpactOption,
  preferredEnquiryType,
  type EnquiryConfig,
  type EnquiryDataScope,
  type PacketConfig,
} from "@/data/data-products-mock";
import {
  PREVIEW_SAMPLE_APPLICATION,
  PREVIEW_SAMPLE_META,
  PREVIEW_SAMPLE_SUBJECT,
} from "@/data/product-enquiry-preview-samples";
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
  DEFAULT_RETRO_CONFIG,
  DEFAULT_TRENDED_CONFIG,
  computeDefinitionFingerprint,
  inferAttributeMode,
  type ProductMetadata,
  type ProfileBlockConfig,
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
  { id: 2, label: "Data packets", shortTitle: "Packets" },
  { id: 3, label: "Retrieval", shortTitle: "Retrieval" },
  { id: 4, label: "Enquiry impact", shortTitle: "Impact" },
  { id: 5, label: "Review", shortTitle: "Review" },
];

const REFERENCE_MONTH = "2026-06";
/** Demo reference date for retro enquiryDate ceiling checks. */
const REFERENCE_DATE = "2026-06-30";
const DEFAULT_RETRO_ENQUIRY_DATE = "2025-06-15";

type PreviewScope = EnquiryDataScope;

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

function retrievalAnchorFor(scope: PreviewScope, enquiryDate: string): string {
  if (scope === "TRENDED") return "PERIOD_WINDOW";
  if (scope === "RETRO") return `AS_OF ${enquiryDate}`;
  return "CURRENT";
}

function buildResponsePreview(params: {
  productId: string;
  productVersion: number;
  productName: string;
  orderedPacketIds: string[];
  packetConfigs: PacketConfig[];
  profileConfig: ProfileBlockConfig;
  enquiryConfig: EnquiryConfig;
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

  const window = clamp(params.previewWindow, 1, Math.max(params.maxTrendedMonths, 1));
  const periods = effectiveScope === "TRENDED" ? generatePeriods(window) : [];
  const footprintCreated = footprintCreatedForType(params.enquiryConfig, params.enquiryType);

  const customerProfile: Record<string, unknown> = {};
  for (const field of params.profileConfig.includedFields) {
    customerProfile[field] = profileMockValue(field);
  }
  // Align demo profile with sample subject where fields overlap
  if ("fullName" in customerProfile) {
    customerProfile.fullName = PREVIEW_SAMPLE_SUBJECT.individual.name.fullName;
  }
  if ("dateOfBirth" in customerProfile) {
    customerProfile.dateOfBirth = PREVIEW_SAMPLE_SUBJECT.individual.birth.dateOfBirth;
  }
  if ("currentAddress" in customerProfile) {
    customerProfile.currentAddress = "12 Riverside Drive, Westlands, Nairobi";
  }
  if ("primaryIdentifier" in customerProfile) {
    customerProfile.primaryIdentifier = "XXXX-5678";
  }

  const configMap = new Map(params.packetConfigs.map((c) => [c.packetId, c]));
  const dataSections: Record<string, unknown> = {};
  const noDataIndex = params.orderedPacketIds.length >= 2 ? params.orderedPacketIds.length - 1 : -1;

  params.orderedPacketIds.forEach((pid, idx) => {
    const opt = productCatalogPacketOptions.find((o) => o.id === pid);
    if (!opt) return;
    const key = opt.previewKey;

    if (idx === noDataIndex) {
      dataSections[key] = { status: "NO_DATA", data: null };
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

    const sectionData: Record<string, unknown> = {};
    for (const [k, v] of fieldEntries) {
      if (effectiveScope === "TRENDED" && typeof v === "number" && inferAttributeMode(k) === "TRENDED") {
        sectionData[k] = buildTrendedSeries(v, periods);
      } else {
        sectionData[k] = v;
      }
    }
    const derivedSel = cfg?.selectedDerivedFields?.filter(Boolean) ?? [];
    if (derivedSel.length > 0) {
      sectionData.__derived = Object.fromEntries(derivedSel.map((d) => [d, `[computed:${d}]`]));
    }

    dataSections[key] = sectionData;
  });

  const data: Record<string, unknown> = {
    accountsSummary: {
      totalAccounts: 4,
      activeAccounts: 3,
      closedAccounts: 1,
      delinquentAccounts: 0,
    },
    totalExposure: 850000.0,
    worstDpdDays: 0,
    accounts: [
      {
        facilityType: "PERSONAL_LOAN",
        outstandingBalance: 250000.0,
        dpdDays: 0,
        status: "ACTIVE",
      },
    ],
    ...dataSections,
  };
  if (footprintCreated) {
    data.enquiryFootprint = {
      totalEnquiries12Months: 4,
      hardEnquiries6Months: 2,
    };
  }

  return {
    enquiryId: "ENQ-2026-031-001",
    status: "SUCCESS",
    enquiryType: params.enquiryType,
    subjectFound: true,
    matchConfidence: "HIGH",
    subject: { entityType: "INDIVIDUAL" },
    application: { applicationRef: PREVIEW_SAMPLE_APPLICATION.applicationRef },
    products: [
      {
        enquiryItemId: "ENQ-2026-031-001-RCP",
        outcome: "SERVED",
        productVersionServed: params.productVersion,
        dataScope: effectiveScope,
        retrievalAnchor: retrievalAnchorFor(effectiveScope, params.enquiryDate),
        customerProfile,
        productId: params.productId,
        productName: params.productName || "Untitled product",
        data,
        analytics: {
          summary: "Low delinquency; stable utilisation",
          indicators: {
            utilisationRatio: 0.34,
            trendDirection: "STABLE",
          },
        },
      },
    ],
    completedAt: "2026-03-31T14:00:00Z",
    footprintCreated,
  };
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
      setOrderedPacketIds(sortPacketIdsByCatalogOrder(existing.packetIds, catalogOrderIds));
      setPacketConfigs(existing.packetConfigs ?? []);
      setEnquiryConfig(normalizeEnquiryConfig(existing.enquiryConfig));
      setTrendedConfig(existing.trendedConfig ?? { ...DEFAULT_TRENDED_CONFIG });
      setRetroConfig(existing.retroConfig ?? { ...DEFAULT_RETRO_CONFIG });
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
      setRetroConfig({ ...DEFAULT_RETRO_CONFIG });
      setProfileConfig({ includedFields: [...DEFAULT_PROFILE_CONFIG.includedFields] });
      setMetadata(EMPTY_META);
      setTagsInput("");
    }
  }, [existing, isEdit, catalogOrderIds]);

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
    () =>
      computeDefinitionFingerprint(
        orderedPacketIds,
        packetConfigs,
        enquiryConfig,
        trendedConfig,
        retroConfig
      ),
    [orderedPacketIds, packetConfigs, enquiryConfig, trendedConfig, retroConfig]
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
      buildResponsePreview({
        productId: previewProductId,
        productVersion: previewProductVersion,
        productName: name,
        orderedPacketIds,
        packetConfigs,
        profileConfig,
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
      orderedPacketIds,
      packetConfigs,
      profileConfig,
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
          name: name.trim(),
          description: description.trim(),
          packetIds: orderedPacketIds,
          packetConfigs,
          enquiryConfig: normalizeEnquiryConfig(enquiryConfig),
          trendedConfig,
          retroConfig,
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
          retroConfig,
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
      retroConfig,
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

                  <div className="rounded-lg border border-border/80 p-4 space-y-2">
                    <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
                      Packets
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {orderedPacketIds.map((pid) => {
                        const label =
                          productCatalogPacketOptions.find((o) => o.id === pid)?.label ?? pid;
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
