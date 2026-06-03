import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PropertyMatchCard } from "@/components/real-estate-bureau/PropertyMatchCard";
import { useRealEstateBureau } from "./RealEstateBureauLayout";

export default function PropertyMatchSelectionPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const { getMatchesForInquiry, completeInquiry } = useRealEstateBureau();
  const matches = getMatchesForInquiry(inquiryId ?? "");

  const handleSelect = (reportId: string) => {
    if (!inquiryId) return;
    completeInquiry(inquiryId, {
      scenario: "multiple_match",
      reportId,
      reportStatus: "Ready",
      matchStatus: "Multiple Matches",
    });
    navigate(`/real-estate-bureau/report/${inquiryId}`, { state: { reportId } });
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1" asChild>
          <Link to="/real-estate-bureau/new">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <h1 className="text-h2 font-semibold text-foreground">Select Matching Property</h1>
        <p className="text-caption text-muted-foreground mt-1">
          Multiple property records matched your inquiry. Select the correct property to generate
          the bureau report.
          {inquiryId && (
            <span className="font-mono text-foreground ml-1">({inquiryId})</span>
          )}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match) => (
          <PropertyMatchCard
            key={match.matchId}
            match={match}
            onViewReport={() => handleSelect(match.reportId)}
          />
        ))}
      </div>
    </div>
  );
}
