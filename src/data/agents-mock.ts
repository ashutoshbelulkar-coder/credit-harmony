import data from "./agents.json";
import type { Agent, Customer, ChatMessage, RecentActivity } from "@/types/agents";

export const mockAgents = data.agents as Agent[];
export const mockRecentActivity = data.recentActivity as RecentActivity[];

export function generateMockCustomer(form: {
  fullName: string;
  pan: string;
  mobile: string;
  dob: string;
  address: string;
}): Customer {
  return {
    id: `cust-${Date.now()}`,
    fullName: form.fullName,
    pan: form.pan,
    mobile: form.mobile,
    dob: form.dob,
    address: form.address,
    profileId: `PRF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    riskTag: "Low",
    bureauScore: 785,
    activeLoans: 2,
    totalDebt: 1250000,
    dpdStatus: "0 DPD",
    enquiries6m: 3,
    utilizationPct: 15,
    creditMix: "Home Loan, Credit Card",
    worstStatus: "Current",
    oldestAccount: "8 Years",
    riskFlags: [],
    balance: 847500,
    income: 125000,
    spending: 68000,
    savings: 57000,
    regularIncome: 125000,
    monthlyEmi: 34500,
    savingsRatio: 45.6,
    incomeExpenseRatio: 1.84,
    runway: "14.8 months",
    negativeSavings: false,
    executiveSummary: `Customer ${form.fullName} holds a strong credit profile with a bureau score of 785. The credit mix includes a Home Loan and Credit Card with total outstanding of ₹12.5L. Zero DPD in last 24 months indicates consistent repayment discipline. Utilization at 15% is well within optimal range. Cash flow analysis shows stable income with a healthy savings ratio of 45.6%.`,
    tradelines: [
      { lender: "HDFC Bank", type: "Home Loan", sanctionedAmount: 3500000, currentBalance: 1100000, dpd: 0, status: "Active" },
      { lender: "ICICI Bank", type: "Credit Card", sanctionedAmount: 200000, currentBalance: 150000, dpd: 0, status: "Active" },
      { lender: "SBI", type: "Personal Loan", sanctionedAmount: 500000, currentBalance: 0, dpd: 0, status: "Closed" },
    ],
    enquiryHistory: [
      { date: "2026-02-15", institution: "Axis Bank", purpose: "Credit Card", amount: 300000 },
      { date: "2026-01-20", institution: "Bajaj Finance", purpose: "Personal Loan", amount: 500000 },
      { date: "2025-12-10", institution: "HDFC Bank", purpose: "Top-up Loan", amount: 1000000 },
    ],
    alerts: ["New enquiry from Axis Bank on Feb 15, 2026", "Credit utilization increased by 3% in last 30 days"],
    documents: [
      { name: "PAN Card", type: "Identity", uploadedAt: "2026-02-26", status: "Verified" },
      { name: "Aadhaar Card", type: "Identity", uploadedAt: "2026-02-26", status: "Verified" },
    ],
  };
}

export function generateBureauResponse(customer: Customer): ChatMessage {
  return {
    id: `msg-${Date.now()}`,
    role: "agent",
    content: `## CRIF Bureau Analysis Complete\n\n**Customer:** ${customer.fullName} | **PAN:** ${customer.pan} | **Profile:** ${customer.profileId}\n\n---\n\n### Summary\nCustomer bureau score is **${customer.bureauScore}** with **${customer.activeLoans} active loans**. ${customer.dpdStatus} in last 12 months. Utilization at **${customer.utilizationPct}%**. Credit mix includes ${customer.creditMix}.\n\n### Key Metrics\n| Metric | Value |\n|---|---|\n| Bureau Score | ${customer.bureauScore} |\n| Active Loans | ${customer.activeLoans} |\n| Total Debt | ₹${(customer.totalDebt / 100000).toFixed(1)}L |\n| Utilization | ${customer.utilizationPct}% |\n| Enquiries (6M) | ${customer.enquiries6m} |\n| Worst Status | ${customer.worstStatus} |\n| Oldest Account | ${customer.oldestAccount} |\n\n### Risk Assessment\n${customer.riskFlags.length === 0 ? "✅ No active risk flags detected." : customer.riskFlags.map(f => `⚠️ ${f}`).join("\n")}\n\n### Recommendation\nBased on the bureau analysis, the customer exhibits strong creditworthiness. Recommend proceeding with cash flow validation via bank statement analysis for comprehensive underwriting.`,
    timestamp: new Date().toISOString(),
    isStructured: true,
    actions: [
      { label: "Upload Bank Statement", toolId: "bank-upload" },
      { label: "Fetch GST Data", toolId: "gst-fetch" },
      { label: "Run Fraud Check", toolId: "fraud-check" },
      { label: "Simulate New Loan", toolId: "risk-simulation" },
      { label: "Request Documents", toolId: "doc-request" },
    ],
  };
}
