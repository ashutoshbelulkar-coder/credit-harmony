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
