export type ApprovalType = "institution" | "schema_mapping" | "consortium" | "product";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "changes_requested";

export interface ApprovalItem {
  id: string;
  type: ApprovalType;
  name: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  metadata: Record<string, string>;
}
