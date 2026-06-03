import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProcessingLoader } from "@/components/real-estate-bureau/ProcessingLoader";
import { SmartGuidedInquiry } from "@/components/real-estate-bureau/inquiry/SmartGuidedInquiry";
import { useRealEstateBureau } from "./RealEstateBureauLayout";
import { REPORT_SCENARIO_1 } from "@/lib/real-estate-bureau/mock-data";
import type { InquiryFormData, InquiryScenario } from "@/lib/real-estate-bureau/types";

export default function NewInquiryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { submitInquiry, completeInquiry, pendingInquiry } = useRealEstateBureau();
  const [loading, setLoading] = useState(false);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<InquiryScenario>("single_match");

  const handleLoaderComplete = useCallback(() => {
    setLoading(false);
    if (!activeInquiryId) return;
    if (scenario === "single_match") {
      completeInquiry(activeInquiryId, {
        scenario: "single_match",
        reportId: REPORT_SCENARIO_1.reportId,
        reportStatus: "Ready",
        matchStatus: "Single Match",
      });
      navigate(`/real-estate-bureau/report/${activeInquiryId}`, {
        state: { reportId: REPORT_SCENARIO_1.reportId },
      });
    } else {
      completeInquiry(activeInquiryId, {
        scenario: "multiple_match",
        reportStatus: "Pending",
        matchStatus: "Multiple Matches",
      });
      navigate(`/real-estate-bureau/match/${activeInquiryId}`);
    }
  }, [activeInquiryId, scenario, completeInquiry, navigate]);

  const handleSubmit = (form: InquiryFormData, nextScenario: InquiryScenario) => {
    setScenario(nextScenario);
    const inquiry = submitInquiry(form, nextScenario);
    setActiveInquiryId(inquiry.inquiryId);
    setLoading(true);
  };

  useEffect(() => {
    if ((location.state as { autoRun?: boolean })?.autoRun && pendingInquiry) {
      setScenario(pendingInquiry.scenario);
      setActiveInquiryId(pendingInquiry.inquiryId);
      setLoading(true);
      window.history.replaceState({}, "");
    }
  }, [location.state, pendingInquiry]);

  return (
    <>
      {loading && <ProcessingLoader onComplete={handleLoaderComplete} />}
      <div className="space-y-5">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1" asChild>
            <Link to="/real-estate-bureau">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <h1 className="text-h2 font-semibold text-foreground">New Property Inquiry</h1>
          <p className="text-caption text-muted-foreground mt-1 max-w-2xl">
            Tell us what you know — the Property Bureau identifies the asset, enriches records,
            and builds your report. Minimum input, maximum intelligence.
          </p>
        </div>
        <SmartGuidedInquiry onSubmit={handleSubmit} />
      </div>
    </>
  );
}
