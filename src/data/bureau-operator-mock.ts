import type {
  CRIFSLAMetrics,
  CRIFRequestFlow,
  CRIFDataSubmission,
  CRIFAlternateData,
  CRIFDataQuality,
  CRIFConsentOps,
  OperationsAlert,
} from "@/types/agents";

/** CRIF-only SLA (sla_events) */
export const mockCRIFSLAMetrics: CRIFSLAMetrics = {
  overall: 98.7,
  activeBreaches: 2,
  critical: 1,
  avgResponseTime: 1.7,
  p95Latency: 2.8,
  timeoutPct: 1.2,
  retryPct: 2.1,
};

/** crif_enquiry_requests + request flow */
export const mockCRIFRequestFlow: CRIFRequestFlow = {
  totalEnquiries: 12842,
  dataSubmissions: 847,
  alternateDataPulls: 312,
  hardEnquiries: 8012,
  softEnquiries: 4830,
  failedPct: 2.3,
};

/** crif_data_submissions, crif_submission_ack */
export const mockCRIFDataSubmission: CRIFDataSubmission = {
  filesSubmitted: 156,
  recordsProcessed: 4280,
  recordsRejected: 14,
  schemaValidationErrors: 14,
  hilMappingPending: 6,
  ackPending: 3,
};

/** alternate_data_jobs */
export const mockCRIFAlternateData: CRIFAlternateData = {
  bankStatementRequests: 189,
  gstPulls: 84,
  ocrParsingJobs: 39,
  alternateDataFailures: 8,
  avgProcessingTimeMs: 2450,
};

/** parsing_logs, data quality */
export const mockCRIFDataQuality: CRIFDataQuality = {
  missingMandatoryFields: 47,
  panMismatchPct: 0.8,
  dpdInconsistencyCount: 12,
  tradelineMappingErrors: 23,
  duplicateRecordCount: 5,
  scoreMissingCases: 8,
};

/** consent_events */
export const mockCRIFConsentOps: CRIFConsentOps = {
  successRate: 96.4,
  otpFailurePct: 2.1,
  expiredConsentPct: 1.2,
  consentLatencyAvgMs: 980,
  revokedConsentCount: 14,
};

/** CRIF-only alert types (no bureau switch / routing) */
export const mockAlertsFeed: OperationsAlert[] = [
  {
    id: "alert-1",
    type: "CRIF SLA Breach",
    message: "CRIF API response exceeded 4s threshold — HDFC Bank traffic",
    bureau: "CRIF",
    institution: "HDFC Bank",
    timestamp: "2026-02-27T10:42:00Z",
    severity: "Critical",
  },
  {
    id: "alert-2",
    type: "Consent Failure Surge",
    message: "OTP failure spike — 12% consent drop-off at ACME Bank",
    bureau: null,
    institution: "ACME Bank",
    timestamp: "2026-02-27T10:35:00Z",
    severity: "Medium",
  },
  {
    id: "alert-3",
    type: "Enquiry Failure Spike",
    message: "CRIF enquiry timeout surge — 4.8% increase in last 2 hours",
    bureau: null,
    institution: null,
    timestamp: "2026-02-27T10:21:00Z",
    severity: "Medium",
  },
  {
    id: "alert-4",
    type: "Parsing Error Increase",
    message: "PAN mismatch errors — 8 records flagged at Axis Bank",
    bureau: null,
    institution: "Axis Bank",
    timestamp: "2026-02-27T09:58:00Z",
    severity: "Low",
  },
  {
    id: "alert-5",
    type: "Data Submission Rejection Spike",
    message: "14 file submissions rejected (schema mismatch) today",
    bureau: null,
    institution: null,
    timestamp: "2026-02-27T09:44:00Z",
    severity: "Medium",
  },
  {
    id: "alert-6",
    type: "High Retry Rate",
    message: "CRIF enquiry retry rate elevated — 342 retries in last 2 hours",
    bureau: null,
    institution: null,
    timestamp: "2026-02-27T09:30:00Z",
    severity: "Critical",
  },
  {
    id: "alert-7",
    type: "Alternate Data Timeout",
    message: "Bank statement analysis requests timing out — avg 3.2s",
    bureau: null,
    institution: null,
    timestamp: "2026-02-27T09:15:00Z",
    severity: "Medium",
  },
  {
    id: "alert-8",
    type: "Acknowledgement Delay",
    message: "3 data submissions pending CRIF ack beyond SLA",
    bureau: null,
    institution: null,
    timestamp: "2026-02-27T08:58:00Z",
    severity: "Low",
  },
];

/** Daily ops summary for proactive card (CRIF-only) */
export const mockDailyOpsSummary = `CRIF Operations Summary — Today:
• ${mockCRIFRequestFlow.totalEnquiries.toLocaleString()} enquiries processed
• ${mockCRIFRequestFlow.failedPct}% failure rate (↑ 0.8% vs yesterday)
• ${mockCRIFDataSubmission.recordsRejected} file submissions rejected (schema mismatch)
• Consent success rate: ${mockCRIFConsentOps.successRate}%
• Avg SLA: ${mockCRIFSLAMetrics.avgResponseTime}s`;

export const mockBureauOperatorResponses: Record<string, string> = {
  "/sla": `## CRIF SLA Status — Today (Feb 27, 2026)

**Overall SLA Compliance: ${mockCRIFSLAMetrics.overall}%** · Active Breaches: ${mockCRIFSLAMetrics.activeBreaches} · Critical: ${mockCRIFSLAMetrics.critical}

### CRIF SLA Metrics
| Metric | Value | Target | Status |
|---|---|---|---|
| Overall SLA | ${mockCRIFSLAMetrics.overall}% | 99.5% | Below target |
| Avg Response Time | ${mockCRIFSLAMetrics.avgResponseTime}s | <2.0s | OK |
| 95th Percentile Latency | ${mockCRIFSLAMetrics.p95Latency}s | <3.0s | Warning |
| Timeout % | ${mockCRIFSLAMetrics.timeoutPct}% | <1% | Elevated |
| Retry % | ${mockCRIFSLAMetrics.retryPct}% | <2% | Slightly above |

### Active Breach Summary
| Breach Type | Duration | Severity | Institution |
|---|---|---|---|
| Response Timeout | 18 mins | Critical | HDFC Bank |
| Enquiry API latency | 12 mins | Medium | All |

**Recommendation:** Escalate to CRIF NOC for response time root cause. No traffic switching — CRIF is the only bureau.`,

  "/alerts": `## CRIF Operational Alerts — Last 2 Hours

**${mockAlertsFeed.length} alerts active** · 2 Critical · 4 Medium · 2 Low

### Critical
- **CRIF SLA Breach** — API response exceeded 4s at 10:42 AM (HDFC Bank traffic)
- **High Retry Rate** — CRIF enquiry retry rate elevated (342 retries in 2 hours)

### Medium
- **Consent Failure Surge** — ACME Bank OTP failures up 12% vs yesterday
- **Enquiry Failure Spike** — CRIF enquiry timeouts up 4.8% in last 2 hours
- **Data Submission Rejection Spike** — 14 files rejected (schema mismatch) today
- **Alternate Data Timeout** — Bank statement analysis avg 3.2s (target <2.5s)

### Low
- **Parsing Error Increase** — 8 PAN mismatch records at Axis Bank
- **Acknowledgement Delay** — 3 submissions pending CRIF ack beyond SLA

**Recommended actions:** Escalate CRIF SLA breach to NOC · Review schema validation rules · Contact ACME Bank re: OTP delivery`,

  "/volume": `## CRIF Request Flow — Today

**Total Enquiries: ${mockCRIFRequestFlow.totalEnquiries.toLocaleString()}** · Data Submissions: ${mockCRIFRequestFlow.dataSubmissions} · Alternate Data: ${mockCRIFRequestFlow.alternateDataPulls}

### Enquiry Breakdown
| Type | Count | % Share |
|---|---|---|
| Hard Enquiries | ${mockCRIFRequestFlow.hardEnquiries.toLocaleString()} | ${((mockCRIFRequestFlow.hardEnquiries / mockCRIFRequestFlow.totalEnquiries) * 100).toFixed(1)}% |
| Soft Enquiries | ${mockCRIFRequestFlow.softEnquiries.toLocaleString()} | ${((mockCRIFRequestFlow.softEnquiries / mockCRIFRequestFlow.totalEnquiries) * 100).toFixed(1)}% |
| Failed | ${mockCRIFRequestFlow.failedPct}% | failure rate |

### Operational Volume
| Stream | Count |
|---|---|
| Total Enquiries Today | ${mockCRIFRequestFlow.totalEnquiries.toLocaleString()} |
| Data Submissions Today | ${mockCRIFRequestFlow.dataSubmissions} |
| Alternate Data Pulls | ${mockCRIFRequestFlow.alternateDataPulls} |

**Note:** All volumes are CRIF-only. No multi-bureau comparison.`,

  "/consent": `## CRIF Consent Operations — Today

**Consent Success Rate: ${mockCRIFConsentOps.successRate}%** · DPDP Compliance Status: Active

### Key Metrics
| Metric | Value | Threshold | Status |
|---|---|---|---|
| Success Rate | ${mockCRIFConsentOps.successRate}% | ≥95% | OK |
| OTP Failure % | ${mockCRIFConsentOps.otpFailurePct}% | ≤3% | OK |
| Expired Consent % | ${mockCRIFConsentOps.expiredConsentPct}% | ≤2% | OK |
| Consent Latency Avg | ${mockCRIFConsentOps.consentLatencyAvgMs}ms | ≤1,000ms | OK |
| Revoked Consent Count | ${mockCRIFConsentOps.revokedConsentCount} | — | — |

**Root Cause (ACME Bank):** OTP delivery failure — 9.3% drop between sent and delivered. Recommend escalating to ACME Bank tech team with OTP delivery logs.`,

  "/failures": `## CRIF Enquiry Failure Analysis — Today

**Total Failures: ${Math.round((mockCRIFRequestFlow.totalEnquiries * mockCRIFRequestFlow.failedPct) / 100)}** (${mockCRIFRequestFlow.failedPct}% of ${mockCRIFRequestFlow.totalEnquiries.toLocaleString()} enquiries)

### Failure Pattern (CRIF Only)
| Error Type | Count | % |
|---|---|---|
| 408 Timeout | 134 | 39% |
| 503 Unavailable | 98 | 29% |
| 422 Validation | 67 | 20% |
| 500 Internal | 43 | 13% |

### Root Cause
CRIF response time increased by **18%** in the last 2 hours. Primary contributor: **Enquiry API timeout spike** during peak hour (10:00–11:00 AM).

**Recommendation:** Escalate to CRIF NOC · Review enquiry payload size and retry backoff. No bureau switch — CRIF is the only bureau.`,

  "/cost": `## CRIF Cost & Billing — February 2026

**Total CRIF Spend: ₹2,02,440** · API Calls: 48,200 · Cost per Call: ₹4.20

### Cost Leakage (CRIF)
| Category | Count | Cost |
|---|---|---|
| Failed requests (charged) | 295 | ₹1,237 |
| Retry inflation | 342 | ₹1,437 |
| Duplicate calls | 28 | ₹118 |

**Savings Opportunity:** Reducing retry inflation could save ~₹1,437/day. Recommend exponential backoff and circuit breaker for CRIF enquiry client.`,

  "/dailyops": `## CRIF Daily Operations Report — Feb 27, 2026

${mockDailyOpsSummary}

### Data Submission
| Metric | Value |
|---|---|
| Files Submitted | ${mockCRIFDataSubmission.filesSubmitted} |
| Records Processed | ${mockCRIFDataSubmission.recordsProcessed} |
| Records Rejected | ${mockCRIFDataSubmission.recordsRejected} |
| Schema Errors | ${mockCRIFDataSubmission.schemaValidationErrors} |
| HIL Mapping Pending | ${mockCRIFDataSubmission.hilMappingPending} |
| Ack Pending from CRIF | ${mockCRIFDataSubmission.ackPending} |

### Alternate Data
| Metric | Value |
|---|---|
| Bank Statement Requests | ${mockCRIFAlternateData.bankStatementRequests} |
| GST Pulls | ${mockCRIFAlternateData.gstPulls} |
| OCR Parsing Jobs | ${mockCRIFAlternateData.ocrParsingJobs} |
| Failures | ${mockCRIFAlternateData.alternateDataFailures} |
| Avg Processing Time | ${(mockCRIFAlternateData.avgProcessingTimeMs / 1000).toFixed(2)}s |

### Data Quality
| Issue | Count |
|---|---|
| Missing Mandatory Fields | ${mockCRIFDataQuality.missingMandatoryFields} |
| PAN Mismatch % | ${mockCRIFDataQuality.panMismatchPct}% |
| DPD Inconsistency | ${mockCRIFDataQuality.dpdInconsistencyCount} |
| Tradeline Mapping Errors | ${mockCRIFDataQuality.tradelineMappingErrors} |
| Duplicate Records | ${mockCRIFDataQuality.duplicateRecordCount} |
| Score Missing | ${mockCRIFDataQuality.scoreMissingCases} |`,

  "sla-breaches": `## CRIF SLA Breach Detail — Active Incidents

**${mockCRIFSLAMetrics.activeBreaches} active breach(es)** as of 10:42 AM

### Incident #1 — CRITICAL
**Institution:** HDFC Bank
**Breach:** CRIF API response time 4.3s (SLA: 3.0s)
**Duration:** 18 minutes · **Impact:** ~240 enquiries delayed
**Probable Cause:** CRIF upstream queue congestion during peak hour
**Recommended Action:** Escalate to CRIF NOC · No traffic switch (CRIF only)

---

### Incident #2 — MEDIUM
**Institution:** All
**Breach:** Enquiry API latency 2.4s (SLA: 2.0s)
**Duration:** 12 minutes · **Impact:** ~180 enquiries affected
**Probable Cause:** Peak load 10:00–11:00 AM
**Recommended Action:** Monitor · Escalate if persists beyond 30 mins`,

  "enquiry-failures": `## CRIF Enquiry Failure Analysis — Today

**Total Failures: ${Math.round((mockCRIFRequestFlow.totalEnquiries * mockCRIFRequestFlow.failedPct) / 100)}** (${mockCRIFRequestFlow.failedPct}% of ${mockCRIFRequestFlow.totalEnquiries.toLocaleString()} enquiries)

### Failure Pattern (CRIF Only)
| Error Type | Count | % |
|---|---|---|
| 408 Timeout | 134 | 39% |
| 503 Unavailable | 98 | 29% |
| 422 Validation | 67 | 20% |
| 500 Internal | 43 | 13% |

### Root Cause
CRIF response time increased by **18%** in the last 2 hours. Primary contributor: **Enquiry API timeout spike** during peak hour.

**Recommendation:** Escalate to CRIF NOC · Review enquiry payload and retry backoff.`,

  "api-failures": `## CRIF Enquiry Failure Root Cause Analysis

**Analyzing last 2 hours of failure data (CRIF only)...**

### Top Failure Pattern
CRIF enquiry **failure rate 2.3%** — 0.8% above baseline of 1.5%.

**Confidence: High (94%)**

### Evidence
1. Failure spike began at **10:00 AM** — aligns with peak hour
2. Majority **408 Timeout** and **503 Unavailable**
3. No auth (401) spike — CRIF credentials valid
4. Retry count elevated (342 in 2 hours)

### Root Cause
**CRIF Enquiry API timeout spike** — upstream latency increase during peak. Not token or auth related.

### Recommended Actions
1. **Immediate:** Escalate to CRIF NOC with timeout samples
2. **Short-term:** Increase client timeout to 5s with backoff
3. **Long-term:** Implement circuit breaker and fallback queue for non-real-time enquiries`,

  "data-submission-errors": `## CRIF Data Submission Errors — Today

**Records Rejected: ${mockCRIFDataSubmission.recordsRejected}** · Schema Errors: ${mockCRIFDataSubmission.schemaValidationErrors}

### Rejection Summary
| Reason | Count |
|---|---|
| Schema validation mismatch | 14 |
| HIL mapping pending | 6 |
| Acknowledgement pending from CRIF | 3 |

### Top Schema Validation Errors
1. **Missing mandatory field:** account_type (8 files)
2. **Invalid date format:** last_payment_date (4 files)
3. **PAN format mismatch:** (2 files)

**Recommendation:** Update data submission validation rules · Retry rejected files after schema fix · Follow up with CRIF on ack delay for 3 submissions.`,

  "consent-drop": `## Consent Drop-off Analysis — ACME Bank

**Institution:** ACME Bank · **Period:** Last 24 hours
**Consent Success Rate: 79.3%** (vs platform avg: ${mockCRIFConsentOps.successRate}%)

### Funnel Analysis
| Stage | Count | Drop-off |
|---|---|---|
| Consent Initiated | 1,240 | — |
| OTP Sent | 1,198 | -3.4% |
| OTP Delivered | 1,087 | -9.3% ⚠️ |
| OTP Verified | 988 | -9.1% ⚠️ |
| Consent Completed | 984 | -0.4% |

### Root Cause
**OTP delivery failure** — 9.3% drop between sent and delivered. DPDP compliance at risk for ACME Bank (below 85%).

**Recommended Action:** Escalate to ACME Bank tech team with OTP delivery logs · Consider WhatsApp OTP as backup.`,

  "parsing-errors": `## CRIF Parsing & Data Quality — Top Issues This Week

| Issue | Count | Severity | Trend |
|---|---|---|---|
| Missing Mandatory Fields | ${mockCRIFDataQuality.missingMandatoryFields} | Medium | Up |
| PAN Mismatch % | ${mockCRIFDataQuality.panMismatchPct}% | High | Stable |
| DPD Inconsistency | ${mockCRIFDataQuality.dpdInconsistencyCount} | Medium | Down |
| Tradeline Mapping Errors | ${mockCRIFDataQuality.tradelineMappingErrors} | Medium | Down |
| Duplicate Record Detection | ${mockCRIFDataQuality.duplicateRecordCount} | Low | Stable |
| Score Missing Cases | ${mockCRIFDataQuality.scoreMissingCases} | High | Stable |

**Top 5 data integrity issues:** Missing mandatory fields (47), PAN mismatch (0.8%), tradeline mapping (23), DPD inconsistency (12), score missing (8).

**Recommendation:** Prioritize PAN validation and score pipeline checks. Review mandatory field mapping with CRIF spec.`,

  "incident-report": `## CRIF Incident Report — Feb 27, 2026

**Generated:** 10:45 AM IST · **Report ID:** INC-2026-0227-001

### Executive Summary
${mockCRIFSLAMetrics.activeBreaches} active CRIF SLA incidents and ${mockAlertsFeed.length} alerts in the last 2 hours. Primary issues: CRIF enquiry timeout spike and data submission schema rejections. Total estimated impact: ~420 enquiries affected.

### Incident Timeline
| Time | Event | Severity | Status |
|---|---|---|---|
| 08:58 AM | Acknowledgement delay — 3 submissions pending CRIF ack | Low | Open |
| 09:15 AM | Alternate data timeout — bank statement avg 3.2s | Medium | Monitoring |
| 09:30 AM | High retry rate — 342 CRIF enquiry retries | Critical | Active |
| 09:44 AM | Data submission rejection spike — 14 schema mismatch | Medium | Open |
| 09:58 AM | Parsing error — PAN mismatch at Axis Bank | Low | Open |
| 10:21 AM | CRIF enquiry failure spike — 4.8% increase | Medium | Active |
| 10:35 AM | Consent failure surge — ACME Bank | Medium | Open |
| 10:42 AM | CRIF SLA breach — HDFC Bank traffic | Critical | Active |

### Recommended Actions
1. Escalate CRIF SLA breach to CRIF NOC
2. Review schema validation rules for data submissions
3. Contact ACME Bank re: OTP gateway
4. Monitor CRIF enquiry latency — no traffic switch (CRIF only)`,

  "volume-spike": `## CRIF Enquiry Volume — Kotak Mahindra

**Institution:** Kotak Mahindra · **Spike Detected:** 09:44 AM
**Volume:** 1,923 CRIF enquiries (340% above 7-day baseline of 565)

### Pattern
| Time Window | Enquiries | vs Baseline |
|---|---|---|
| 08:00–09:00 | 487 | +8% |
| 09:00–09:30 | 392 | +7% |
| 09:30–09:45 | 628 | +221% ⚠️ |
| 09:45–10:00 | 416 | +147% ⚠️ |

### Risk Assessment
Bulk batch pattern — 80% hard enquiries. Possible pre-approved campaign or integration duplicate.

**Recommended Action:** Contact Kotak Mahindra integration team · Consider rate-limit to 2x baseline if no response.`,

  "retry-spike": `## CRIF Retry Spike Analysis

**342 retries** in the last 2 hours (2.1% of enquiries)

### Pattern
- Spike began **09:30 AM** — correlates with CRIF latency increase
- Majority **408 Timeout** → client retry
- No auth (401) pattern — credentials OK

### Root Cause
**CRIF Enquiry API latency** during peak hour causing client-side timeouts and retries.

**Recommendation:** Escalate to CRIF NOC · Implement exponential backoff (max 3 retries) · Consider queue for non-real-time enquiries.`,

  "alternate-data": `## CRIF Alternate Data Performance — Today

| Metric | Value |
|---|---|
| Bank Statement Analysis Requests | ${mockCRIFAlternateData.bankStatementRequests} |
| GST Data Pulls | ${mockCRIFAlternateData.gstPulls} |
| OCR Parsing Jobs | ${mockCRIFAlternateData.ocrParsingJobs} |
| Alternate Data Failures | ${mockCRIFAlternateData.alternateDataFailures} |
| Avg Processing Time | ${(mockCRIFAlternateData.avgProcessingTimeMs / 1000).toFixed(2)}s |

### Failure Breakdown
- Bank statement timeouts: 5
- GST pull failures: 2
- OCR parsing errors: 1

**Recommendation:** Investigate bank statement timeout spike — avg 3.2s (target <2.5s). Check alternate data gateway health.`,

  "daily-ops-report": `## CRIF Daily Ops Report — Feb 27, 2026

${mockDailyOpsSummary}

### SLA
- Overall: ${mockCRIFSLAMetrics.overall}% · Breaches: ${mockCRIFSLAMetrics.activeBreaches} · Avg: ${mockCRIFSLAMetrics.avgResponseTime}s

### Data Submission
- Submitted: ${mockCRIFDataSubmission.filesSubmitted} · Processed: ${mockCRIFDataSubmission.recordsProcessed} · Rejected: ${mockCRIFDataSubmission.recordsRejected}

### Consent
- Success: ${mockCRIFConsentOps.successRate}% · Revoked: ${mockCRIFConsentOps.revokedConsentCount}

**Export:** Use Export Report for full PDF.`,

  "root-cause": `## AI Root Cause Analysis — CRIF Incidents

**Analyzing cluster of ${mockAlertsFeed.length} CRIF operational alerts...**

### Pattern Recognition

**Cluster 1: CRIF Enquiry Latency (High Confidence: 91%)**
- SLA breach — HDFC Bank traffic
- Enquiry failure spike
- High retry rate
- **Probable cause:** CRIF Enquiry API latency during peak 09:30–11:00 AM

**Cluster 2: Data Submission (Medium Confidence: 85%)**
- Schema validation rejections (14 files)
- Acknowledgement delay (3 pending)
- **Probable cause:** Schema version mismatch or mandatory field mapping

**Cluster 3: Consent (Medium Confidence: 78%)**
- ACME Bank OTP delivery drop
- **Probable cause:** Telecom gateway — unrelated to CRIF API

### Priority Actions
1. **Immediate:** Escalate CRIF SLA breach to CRIF NOC
2. **15 mins:** Review data submission schema and retry rejected files
3. **1 hour:** Investigate Kotak Mahindra volume spike
4. **Today:** Contact ACME Bank re: OTP delivery
5. No bureau switch — CRIF is the only bureau.`,
};

export const mockChatHistoryList = [
  { id: "boh-1", title: "CRIF SLA breach investigation", date: "Today, 09:15 AM" },
  { id: "boh-2", title: "CRIF enquiry failure root cause", date: "Today, 08:47 AM" },
  { id: "boh-3", title: "CRIF volume spike analysis — Feb 26", date: "Yesterday, 4:30 PM" },
  { id: "boh-4", title: "Consent drop-off DPDP audit prep", date: "Yesterday, 11:00 AM" },
  { id: "boh-5", title: "CRIF daily ops report — Jan", date: "Feb 25, 3:45 PM" },
];
