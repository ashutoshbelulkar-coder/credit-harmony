export type DqPeriodPreset = "24h" | "7d" | "30d" | "90d" | "custom";
export type DqChannel = "all" | "batch" | "api";
export type DqSeverity = "REJECT" | "WARNING" | "INFO";
export type DqGrade = "A" | "B" | "C" | "D" | "F";
export type DqEventStatus = "New" | "Acknowledged" | "Linked to RCA" | "Closed";
export type DqSavedView = "all" | "mine" | "watchlist";
export type DqReportType =
  | "member_scorecard"
  | "portfolio_summary"
  | "issue_extract"
  | "submission_extract"
  | "movers_report";
export type DqReportJobStatus = "Queued" | "Running" | "Ready";

export type DqFilters = {
  period: DqPeriodPreset;
  from: string;
  to: string;
  compare: boolean;
  channel: DqChannel;
  memberIds: string[];
  sourceType: string;
  profile: string;
  severity: string;
  grade: string;
};

export type DqHeadlineKpis = {
  dqi: number;
  grade: DqGrade;
  dqiDelta: number;
  recordsEvaluated: number;
  acceptedPct: number;
  rejected: number;
  warned: number;
  info: number;
  totalRules: number;
  duplicatesCollapsed: number;
  eventsOpen: number;
  eventsTotal: number;
  systemicIssues: number;
};

export type DqGradeBucket = {
  grade: DqGrade;
  members: number;
  membersPrev: number;
  recordsPct: number;
  recordsPctPrev: number;
};

export type DqMover = {
  memberId: string;
  memberName: string;
  dqi: number;
  delta: number;
  records: number;
  causeCode: string;
};

export type DqIssue = {
  code: string;
  ruleType: string;
  field: string;
  severity: DqSeverity;
  records: number;
  rejectSharePct: number;
  deltaPct: number;
  membersAffected: number;
  firstSeen: string;
  lastSeen: string;
  systemic: boolean;
  sparkline: number[];
  topMembers: { id: string; name: string; records: number }[];
  sampleRecordIds: string[];
};

export type DqThresholdEvent = {
  id: string;
  batchId: string;
  memberId: string;
  memberName: string;
  stageId: string;
  stageLabel: string;
  observedPct: number | null;
  configuredPct: number | null;
  pauseType: string;
  reasonCode: string;
  status: DqEventStatus;
  age: string;
  note?: string;
};

export type DqMemberRow = {
  id: string;
  name: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  sourceTypes: string[];
  profiles: string[];
  batchSharePct: number;
  recordsEvaluated: number;
  dqi: number;
  dqiPrev: number;
  grade: DqGrade;
  validity: number;
  completeness: number;
  dupIntegrity: number;
  rejectedPct: number;
  breaches: number;
  lastAssessment: string;
  attention: number;
  isMyMember: boolean;
  contact: string;
  named: boolean;
};

export type DqTrendPoint = {
  date: string;
  label: string;
  p90: number;
  median: number;
  p10: number;
  batchMedian: number;
  apiMedian: number;
};

export type DqBatchRow = {
  batchId: string;
  memberId: string;
  memberName: string;
  sourceType: string;
  profile: string;
  evaluated: number;
  accepted: number;
  rejected: number;
  warned: number;
  info: number;
  dqi: number;
  grade: DqGrade;
  firstBreachStage: string;
  completedAt: string;
};

export type DqApiAssessmentRow = {
  id: string;
  memberId: string;
  memberName: string;
  sourceType: string;
  profile: string;
  date: string;
  records: number;
  accepted: number;
  acceptedPct: number;
  rejected: number;
  dqi: number;
  grade: DqGrade;
  topCode: string;
  sparkline: number[];
};

export type DqMemberDetail = {
  member: DqMemberRow;
  trend: { date: string; label: string; dqi: number; acceptedPct: number }[];
  issues: DqIssue[];
  batches: DqBatchRow[];
  apiDays: DqApiAssessmentRow[];
  events: DqThresholdEvent[];
  batchCount: number;
  apiSourceTypeCount: number;
};

export type DqReportJob = {
  id: string;
  type: DqReportType;
  status: DqReportJobStatus;
  createdAt: string;
  rowCount?: number;
};

export type DqReportPrefill = {
  type?: DqReportType;
  memberId?: string;
  batchId?: string;
};
