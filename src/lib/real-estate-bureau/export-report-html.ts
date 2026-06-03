import type { PropertyReport } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function riskColor(level: string): string {
  if (level === "Low") return "#2d8a5e";
  if (level === "High") return "#c53030";
  return "#EE7D11";
}

export function exportPropertyReportHtml(report: PropertyReport, filename?: string): void {
  const name = filename ?? `Property-Bureau-Report-${report.reportId}.html`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Property Bureau Report — ${escapeHtml(report.reportId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Inter, system-ui, sans-serif; color: #1a1f36; background: #fff; line-height: 1.5; font-size: 13px; }
    .header { background: #003B79; color: #fff; padding: 24px 32px; }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
    .container { max-width: 900px; margin: 0 auto; padding: 32px; }
    .score-box { display: flex; align-items: center; gap: 24px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; }
    .score { font-size: 48px; font-weight: 800; color: #003B79; }
    .risk { font-size: 14px; font-weight: 600; padding: 4px 12px; border-radius: 4px; color: #fff; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .kpi label { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .kpi value { font-size: 18px; font-weight: 700; color: #003B79; margin-top: 4px; }
    h2 { font-size: 14px; font-weight: 700; color: #003B79; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #003B79; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; color: #64748b; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .timeline-item { padding: 8px 0; border-left: 3px solid #003B79; padding-left: 16px; margin-bottom: 8px; }
    .timeline-year { font-weight: 700; color: #003B79; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { font-size: 11px; } .container { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>CRIF Property Bureau Report</h1>
    <p>Report ID: ${escapeHtml(report.reportId)} | Inquiry: ${escapeHtml(report.inquiryId)} | Generated: ${escapeHtml(report.inquiryDate)}</p>
  </div>
  <div class="container">
    <div class="score-box">
      <div class="score">${report.riskScore}</div>
      <div>
        <div>Property Risk Score</div>
        <span class="risk" style="background:${riskColor(report.riskLevel)}">${escapeHtml(report.riskLevel)} Risk</span>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi"><label>Property Value</label><div class="value">${escapeHtml(report.propertyValue)}</div></div>
      <div class="kpi"><label>Total Exposure</label><div class="value">${escapeHtml(report.totalExposure)}</div></div>
      <div class="kpi"><label>Active Mortgages</label><div class="value">${report.activeMortgages}</div></div>
      <div class="kpi"><label>Historical Mortgages</label><div class="value">${report.historicalMortgages}</div></div>
      <div class="kpi"><label>Ownership Changes</label><div class="value">${report.ownershipChanges}</div></div>
      <div class="kpi"><label>Document Completeness</label><div class="value">${report.documentCompleteness}%</div></div>
    </div>
    <h2>Property Overview</h2>
    <table>
      <tr><td><strong>Property ID</strong></td><td>${escapeHtml(report.propertyId)}</td></tr>
      <tr><td><strong>Type</strong></td><td>${escapeHtml(report.propertyType)} — ${escapeHtml(report.propertySubtype)}</td></tr>
      <tr><td><strong>Address</strong></td><td>${escapeHtml(report.address)}</td></tr>
      <tr><td><strong>Survey Number</strong></td><td>${escapeHtml(report.surveyNumber)}</td></tr>
      <tr><td><strong>Registration</strong></td><td>${escapeHtml(report.registrationNumber)}</td></tr>
      <tr><td><strong>Area</strong></td><td>${escapeHtml(report.area)}</td></tr>
    </table>
    <h2>Ownership</h2>
    <table>
      <thead><tr><th>Owner</th><th>%</th><th>PAN</th><th>Role</th></tr></thead>
      <tbody>
        ${report.ownership.map((o) => `<tr><td>${escapeHtml(o.ownerName)}</td><td>${o.ownershipPercent}%</td><td>${escapeHtml(o.pan)}</td><td>${escapeHtml(o.role)}</td></tr>`).join("")}
      </tbody>
    </table>
    <h2>Active Mortgages</h2>
    <table>
      <thead><tr><th>Lender</th><th>Loan Amount</th><th>Outstanding</th><th>Charge Type</th><th>Status</th></tr></thead>
      <tbody>
        ${report.activeMortgageList.map((m) => `<tr><td>${escapeHtml(m.lender)}</td><td>${escapeHtml(m.loanAmount)}</td><td>${escapeHtml(m.outstanding)}</td><td>${escapeHtml(m.chargeType)}</td><td>${escapeHtml(m.status)}</td></tr>`).join("")}
      </tbody>
    </table>
    <h2>CERSAI Findings</h2>
    <table>
      <thead><tr><th>Security Interest ID</th><th>Charge Holder</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>
        ${report.cersaiFindings.map((c) => `<tr><td>${escapeHtml(c.securityInterestId)}</td><td>${escapeHtml(c.chargeHolder)}</td><td>${escapeHtml(c.chargeType)}</td><td>${escapeHtml(c.securedAmount)}</td><td>${escapeHtml(c.currentStatus)}</td></tr>`).join("")}
      </tbody>
    </table>
    <h2>Property Timeline</h2>
    ${report.timeline.map((t) => `<div class="timeline-item"><span class="timeline-year">${escapeHtml(t.year)}</span> — <strong>${escapeHtml(t.title)}</strong><br/>${escapeHtml(t.description)}</div>`).join("")}
    <h2>Recommendation</h2>
    <p><strong>${escapeHtml(report.recommendation)} Risk</strong> — ${escapeHtml(report.recommendationText)}</p>
    <h2>Inquiry Details</h2>
    <table>
      <tr><td><strong>Inquiry ID</strong></td><td>${escapeHtml(report.inquiryId)}</td></tr>
      <tr><td><strong>Date</strong></td><td>${escapeHtml(report.inquiryDate)}</td></tr>
      <tr><td><strong>User</strong></td><td>${escapeHtml(report.inquiryUser)}</td></tr>
      <tr><td><strong>Search Parameters</strong></td><td>${escapeHtml(report.searchParameters)}</td></tr>
      <tr><td><strong>Sources</strong></td><td>${report.sourcesUsed.map(escapeHtml).join(", ")}</td></tr>
    </table>
    <div class="footer">Confidential — CRIF Property Bureau | For authorized use only</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
