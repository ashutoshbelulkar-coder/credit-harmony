export interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  icon: string;
  tags: string[];
  status: "active" | "draft";
  subscribed?: boolean;
  modelConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  tools: AgentTool[];
  capabilities: Record<string, boolean>;
  sources: Record<string, boolean>;
  suggestedPrompts: SuggestedPrompt[];
  subAgents?: SubAgent[];
}

export interface SubAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  comingSoon?: boolean;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredFields?: string[];
}

export interface SuggestedPrompt {
  id: string;
  title: string;
  message: string;
}

export interface Customer {
  id: string;
  fullName: string;
  pan: string;
  mobile: string;
  dob: string;
  address: string;
  profileId: string;
  riskTag: "Low" | "Medium" | "High" | "Critical";
  bureauScore: number;
  activeLoans: number;
  totalDebt: number;
  dpdStatus: string;
  enquiries6m: number;
  utilizationPct: number;
  creditMix: string;
  worstStatus: string;
  oldestAccount: string;
  riskFlags: string[];
  balance: number;
  income: number;
  spending: number;
  savings: number;
  regularIncome: number;
  monthlyEmi: number;
  savingsRatio: number;
  incomeExpenseRatio: number;
  runway: string;
  negativeSavings: boolean;
  tradelines: Tradeline[];
  enquiryHistory: EnquiryRecord[];
  alerts: string[];
  documents: CustomerDocument[];
  executiveSummary: string;
}

export interface Tradeline {
  lender: string;
  type: string;
  sanctionedAmount: number;
  currentBalance: number;
  dpd: number;
  status: "Active" | "Closed" | "Written Off";
}

export interface EnquiryRecord {
  date: string;
  institution: string;
  purpose: string;
  amount: number;
}

export interface CustomerDocument {
  name: string;
  type: string;
  uploadedAt: string;
  status: "Verified" | "Pending" | "Rejected";
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  actions?: SuggestedAction[];
  isStructured?: boolean;
}

export interface SuggestedAction {
  label: string;
  toolId: string;
}

export interface BureauApiHealth {
  bureau: string;
  uptime: number;
  avgLatency: number;
  failRate: number;
  status: "Healthy" | "Warning" | "Critical";
}

export interface SLAMetrics {
  overall: number;
  activeBreaches: number;
  critical: number;
  avgResponseTime: number;
}

/** CRIF-only SLA: extends base with p95, timeout %, retry % */
export interface CRIFSLAMetrics extends SLAMetrics {
  p95Latency: number;
  timeoutPct: number;
  retryPct: number;
}

export interface CRIFRequestFlow {
  totalEnquiries: number;
  dataSubmissions: number;
  alternateDataPulls: number;
  hardEnquiries: number;
  softEnquiries: number;
  failedPct: number;
}

export interface CRIFDataSubmission {
  filesSubmitted: number;
  recordsProcessed: number;
  recordsRejected: number;
  schemaValidationErrors: number;
  hilMappingPending: number;
  ackPending: number;
}

export interface CRIFAlternateData {
  bankStatementRequests: number;
  gstPulls: number;
  ocrParsingJobs: number;
  alternateDataFailures: number;
  avgProcessingTimeMs: number;
}

export interface CRIFDataQuality {
  missingMandatoryFields: number;
  panMismatchPct: number;
  dpdInconsistencyCount: number;
  tradelineMappingErrors: number;
  duplicateRecordCount: number;
  scoreMissingCases: number;
}

export interface CRIFConsentOps {
  successRate: number;
  otpFailurePct: number;
  expiredConsentPct: number;
  consentLatencyAvgMs: number;
  revokedConsentCount: number;
}

export type SegmentFilter = "All" | "Enquiry" | "Data Submission" | "Alternate Data" | "Consent" | "Parsing";

export interface OperationsAlert {
  id: string;
  type: string;
  message: string;
  bureau: string | null;
  institution: string | null;
  timestamp: string;
  severity: "Low" | "Medium" | "Critical";
}

export interface VolumeStats {
  totalRequests: number;
  hardInquiryPct: number;
  softInquiryPct: number;
  retryCount: number;
  failedPct: number;
  requestsPerMinute: number;
  peakHour: string;
}

export interface ConsentMetrics {
  successRate: number;
  otpFailurePct: number;
  expiredConsentPct: number;
  avgConsentLatencyMs: number;
  topDropOffInstitution: string;
}

export interface DataQualityIssue {
  id: string;
  issue: string;
  count: number;
  bureau: string;
  severity: "Low" | "Medium" | "High";
  trend: "up" | "down" | "stable";
}

export interface DisputeStats {
  active: number;
  avgTATDays: number;
  pendingOverSLA: number;
  rejectedPct: number;
  bureauBreakdown: { bureau: string; count: number }[];
}

export interface BureauEnquiryForm {
  fullName: string;
  pan: string;
  mobile: string;
  dob: string;
  address: string;
  consent: boolean;
}

export interface RecentActivity {
  id: string;
  date: string;
  title: string;
  agentId: string;
  agentName: string;
}
