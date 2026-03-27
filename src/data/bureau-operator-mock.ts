import data from "./bureau-operator.json";
import type {
  CRIFSLAMetrics,
  CRIFRequestFlow,
  CRIFDataSubmission,
  CRIFAlternateData,
  CRIFDataQuality,
  CRIFConsentOps,
  OperationsAlert,
} from "@/types/agents";

export const mockCRIFSLAMetrics = data.slaMetrics as CRIFSLAMetrics;
export const mockCRIFRequestFlow = data.requestFlow as CRIFRequestFlow;
export const mockCRIFDataSubmission = data.dataSubmission as CRIFDataSubmission;
export const mockCRIFAlternateData = data.alternateData as CRIFAlternateData;
export const mockCRIFDataQuality = data.dataQuality as CRIFDataQuality;
export const mockCRIFConsentOps = data.consentOps as CRIFConsentOps;
export const mockAlertsFeed = data.alertsFeed as OperationsAlert[];
export const mockChatHistoryList = data.chatHistoryList as { id: string; title: string; date: string }[];

export const mockDailyOpsSummary = `CRIF Operations Summary — Today:
• ${mockCRIFRequestFlow.totalEnquiries.toLocaleString()} enquiries processed
• ${mockCRIFRequestFlow.failedPct}% failure rate (↑ 0.8% vs yesterday)
• ${mockCRIFDataSubmission.recordsRejected} file submissions rejected (schema mismatch)
• Consent success rate: ${mockCRIFConsentOps.successRate}%
• Avg SLA: ${mockCRIFSLAMetrics.avgResponseTime}s`;

export const mockBureauOperatorResponses: Record<string, string> = {
  "/sla": `## CRIF SLA Status — Today\n\n**Overall SLA Compliance: ${mockCRIFSLAMetrics.overall}%** · Active Breaches: ${mockCRIFSLAMetrics.activeBreaches} · Critical: ${mockCRIFSLAMetrics.critical}\n\n**Recommendation:** Escalate to CRIF NOC for response time root cause. No traffic switching — CRIF is the only bureau.`,
  "/alerts": `## CRIF Operational Alerts — Last 2 Hours\n\n**${mockAlertsFeed.length} alerts active** · 2 Critical · 4 Medium · 2 Low\n\n**Recommended actions:** Escalate CRIF SLA breach to NOC · Review schema validation rules`,
  "/volume": `## CRIF Request Flow — Today\n\n**Total Enquiries: ${mockCRIFRequestFlow.totalEnquiries.toLocaleString()}** · Data Submissions: ${mockCRIFRequestFlow.dataSubmissions} · Alternate Data: ${mockCRIFRequestFlow.alternateDataPulls}\n\n**Note:** All volumes are CRIF-only. No multi-bureau comparison.`,
  "/consent": `## CRIF Consent Operations — Today\n\n**Consent Success Rate: ${mockCRIFConsentOps.successRate}%** · DPDP Compliance Status: Active`,
  "/failures": `## CRIF Enquiry Failure Analysis — Today\n\n**Total Failures: ${Math.round((mockCRIFRequestFlow.totalEnquiries * mockCRIFRequestFlow.failedPct) / 100)}** (${mockCRIFRequestFlow.failedPct}% of ${mockCRIFRequestFlow.totalEnquiries.toLocaleString()} enquiries)`,
  "/dailyops": `## CRIF Daily Operations Report\n\n${mockDailyOpsSummary}`,
};
