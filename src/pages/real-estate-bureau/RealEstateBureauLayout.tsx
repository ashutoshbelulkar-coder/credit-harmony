import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRealEstateBureauAccess } from "@/lib/real-estate-bureau/feature-gate";
import { useAuth } from "@/contexts/AuthContext";
import {
  INITIAL_INQUIRY_HISTORY,
  makeInquiryId,
  PROPERTY_MATCHES,
  REPORTS_BY_ID,
} from "@/lib/real-estate-bureau/mock-data";
import type {
  InquiryFormData,
  InquiryHistoryRow,
  InquiryScenario,
  PendingInquiry,
  PropertyReport,
} from "@/lib/real-estate-bureau/types";
import RealEstateBureauForbidden from "./Forbidden";

type RealEstateBureauContextValue = {
  inquiries: InquiryHistoryRow[];
  pendingInquiry: PendingInquiry | null;
  setPendingInquiry: (inquiry: PendingInquiry | null) => void;
  submitInquiry: (form: InquiryFormData, scenario: InquiryScenario) => PendingInquiry;
  completeInquiry: (
    inquiryId: string,
    outcome: {
      scenario: InquiryScenario;
      reportId?: string;
      errorType?: InquiryHistoryRow["errorType"];
      reportStatus?: InquiryHistoryRow["reportStatus"];
      matchStatus?: InquiryHistoryRow["matchStatus"];
    }
  ) => void;
  getReport: (reportId: string) => PropertyReport | undefined;
  getMatchesForInquiry: (inquiryId: string) => typeof PROPERTY_MATCHES;
  rerunInquiry: (inquiryId: string) => InquiryHistoryRow | undefined;
};

const RealEstateBureauContext = createContext<RealEstateBureauContextValue | null>(null);

const STORAGE_KEY = "reb-inquiry-history-v1";

function loadHistory(): InquiryHistoryRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as InquiryHistoryRow[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [...INITIAL_INQUIRY_HISTORY];
}

function saveHistory(rows: InquiryHistoryRow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function useRealEstateBureau() {
  const ctx = useContext(RealEstateBureauContext);
  if (!ctx) throw new Error("useRealEstateBureau must be used within RealEstateBureauLayout");
  return ctx;
}

export function RealEstateBureauLayout() {
  const hasAccess = useRealEstateBureauAccess();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<InquiryHistoryRow[]>(loadHistory);
  const [pendingInquiry, setPendingInquiry] = useState<PendingInquiry | null>(null);
  const pendingRef = useRef<PendingInquiry | null>(null);
  const counterRef = useRef(inquiries.length + 10);

  const createdBy = useMemo(() => {
    const email = user?.email ?? "unknown";
    const local = email.split("@")[0];
    return local;
  }, [user?.email]);

  const submitInquiry = useCallback(
    (form: InquiryFormData, scenario: InquiryScenario): PendingInquiry => {
      counterRef.current += 1;
      const inquiry: PendingInquiry = {
        inquiryId: makeInquiryId(counterRef.current),
        formData: form,
        scenario,
        createdAt: new Date().toISOString().slice(0, 10),
        createdBy,
      };
      setPendingInquiry(inquiry);
      pendingRef.current = inquiry;
      return inquiry;
    },
    [createdBy]
  );

  const completeInquiry = useCallback(
    (
      inquiryId: string,
      outcome: {
        scenario: InquiryScenario;
        reportId?: string;
        errorType?: InquiryHistoryRow["errorType"];
        reportStatus?: InquiryHistoryRow["reportStatus"];
        matchStatus?: InquiryHistoryRow["matchStatus"];
      }
    ) => {
      const pending =
        pendingRef.current?.inquiryId === inquiryId ? pendingRef.current : null;
      if (pending?.inquiryId === inquiryId) {
        pendingRef.current = null;
        setPendingInquiry(null);
      }
      const borrowerName =
        pending?.formData.borrower.borrowerName ??
        inquiries.find((i) => i.inquiryId === inquiryId)?.borrowerName ??
        "Unknown";
      const propertySummary =
        pending?.formData.property.projectName ||
        pending?.formData.property.buildingName ||
        [pending?.formData.property.locality, pending?.formData.property.city]
          .filter(Boolean)
          .join(", ") ||
        inquiries.find((i) => i.inquiryId === inquiryId)?.propertySummary ||
        "—";

      const row: InquiryHistoryRow = {
        inquiryId,
        borrowerName,
        propertySummary,
        inquiryDate: new Date().toISOString().slice(0, 10),
        matchStatus:
          outcome.matchStatus ??
          (outcome.scenario === "multiple_match" ? "Multiple Matches" : "Single Match"),
        reportStatus: outcome.reportStatus ?? (outcome.reportId ? "Ready" : "Failed"),
        createdBy,
        scenario: outcome.scenario,
        reportId: outcome.reportId,
        errorType: outcome.errorType,
      };

      setInquiries((prev) => {
        const next = [row, ...prev.filter((r) => r.inquiryId !== inquiryId)];
        saveHistory(next);
        return next;
      });
    },
    [createdBy, inquiries]
  );

  const getReport = useCallback((reportId: string) => REPORTS_BY_ID[reportId], []);

  const getMatchesForInquiry = useCallback(() => PROPERTY_MATCHES, []);

  const rerunInquiry = useCallback(
    (inquiryId: string) => inquiries.find((i) => i.inquiryId === inquiryId),
    [inquiries]
  );

  const value = useMemo(
    () => ({
      inquiries,
      pendingInquiry,
      setPendingInquiry,
      submitInquiry,
      completeInquiry,
      getReport,
      getMatchesForInquiry,
      rerunInquiry,
    }),
    [
      inquiries,
      pendingInquiry,
      submitInquiry,
      completeInquiry,
      getReport,
      getMatchesForInquiry,
      rerunInquiry,
    ]
  );

  if (!hasAccess) {
    return <RealEstateBureauForbidden />;
  }

  return (
    <RealEstateBureauContext.Provider value={value}>
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in min-w-0">
          <Outlet />
        </div>
      </DashboardLayout>
    </RealEstateBureauContext.Provider>
  );
}
