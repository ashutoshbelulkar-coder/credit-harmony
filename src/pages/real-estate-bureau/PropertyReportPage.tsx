import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { RiskGauge } from "@/components/real-estate-bureau/report/RiskGauge";
import { ReportKpiCards } from "@/components/real-estate-bureau/report/ReportKpiCards";
import {
  CersaiFindingsSection,
  DocumentCompletenessSection,
  InquiryDetailsSection,
  MortgageSections,
  OwnershipSection,
  PropertyOverviewSection,
  PropertyTimelineSection,
  RecommendationSection,
  RiskInsightsSection,
  ValuationTrendSection,
} from "@/components/real-estate-bureau/report/ReportSections";
import { RebErrorState } from "@/components/real-estate-bureau/RebErrorState";
import { useRealEstateBureau } from "./RealEstateBureauLayout";
import { exportPropertyReportHtml } from "@/lib/real-estate-bureau/export-report-html";
import { REPORT_SCENARIO_1 } from "@/lib/real-estate-bureau/mock-data";
import { toast } from "sonner";
import type { RebErrorType } from "@/lib/real-estate-bureau/types";

export default function PropertyReportPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getReport, inquiries, rerunInquiry } = useRealEstateBureau();

  const stateReportId = (location.state as { reportId?: string })?.reportId;
  const historyRow = inquiries.find((i) => i.inquiryId === inquiryId);
  const reportId = stateReportId ?? historyRow?.reportId ?? REPORT_SCENARIO_1.reportId;
  const report = getReport(reportId);

  if (historyRow?.errorType && !report) {
    return (
      <div className="space-y-6">
        <ReportHeader inquiryId={inquiryId} onExport={() => {}} showExport={false} />
        <div className="rounded-xl border border-border bg-card">
          <RebErrorState
            errorType={historyRow.errorType as RebErrorType}
            onRetry={() => {
              rerunInquiry(inquiryId ?? "");
              navigate("/real-estate-bureau/new");
            }}
          />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <ReportHeader inquiryId={inquiryId} onExport={() => {}} showExport={false} />
        <RebErrorState
          errorType="system_error"
          onRetry={() => navigate("/real-estate-bureau/new")}
        />
      </div>
    );
  }

  const handleExport = () => {
    exportPropertyReportHtml(report);
    toast.success("Property Bureau Report exported as HTML");
  };

  return (
    <div className="space-y-6 no-print">
      <ReportHeader inquiryId={inquiryId} onExport={handleExport} showExport />

      <div className="space-y-6" id="reb-report-content">
        <RiskGauge score={report.riskScore} level={report.riskLevel} />
        <ReportKpiCards report={report} />
        <PropertyOverviewSection report={report} />
        <OwnershipSection report={report} />
        <MortgageSections report={report} />
        <CersaiFindingsSection report={report} />
        <PropertyTimelineSection report={report} />
        <DocumentCompletenessSection report={report} />
        <ValuationTrendSection report={report} />
        <RiskInsightsSection report={report} />
        <RecommendationSection report={report} />
        <InquiryDetailsSection report={report} />
      </div>
    </div>
  );
}

function ReportHeader({
  inquiryId,
  onExport,
  showExport,
}: {
  inquiryId?: string;
  onExport: () => void;
  showExport: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1" asChild>
          <Link to="/real-estate-bureau">
            <ArrowLeft className="h-4 w-4" /> Back to inquiries
          </Link>
        </Button>
        <h1 className="text-h2 font-semibold text-foreground">Property Bureau Report</h1>
        {inquiryId && (
          <p className="text-caption text-muted-foreground mt-1 font-mono">{inquiryId}</p>
        )}
      </div>
      {showExport && (
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={onExport}>
          <Download className="w-4 h-4" />
          Export HTML
        </Button>
      )}
    </div>
  );
}
