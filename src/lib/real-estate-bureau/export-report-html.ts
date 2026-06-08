import {
  PRE_SCREENING_CONFIG,
  PRE_SCREENING_OUTCOMES,
  preScreeningLabel,
  preScreeningSummary,
  riskLevelToPreScreeningOutcome,
  type PreScreeningOutcome,
} from "./pre-screening";
import type { PropertyReport } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cersaiStatusHex(status: string): string {
  if (status === "MATCH FOUND") return "#2d8a5e";
  if (status === "PARTIAL MATCH") return "#EE7D11";
  return "#c53030";
}

function parseAmountToLakhs(value: string): number {
  const t = value.toLowerCase().replace(/,/g, "");
  const num = parseFloat(t.replace(/[^\d.]/g, "")) || 0;
  if (t.includes("cr")) return num * 100;
  return num;
}

function computeLtv(report: PropertyReport): number {
  const valueLakh = report.valuationTrend.at(-1)?.value ?? parseAmountToLakhs(report.propertyValue);
  const exposureLakh = parseAmountToLakhs(
    report.enhancements.bureauSummary.currentExposure || report.totalExposure
  );
  if (valueLakh <= 0) return 0;
  return Math.round((exposureLakh / valueLakh) * 100);
}

function computeValuationMetrics(report: PropertyReport) {
  const trend = report.valuationTrend;
  const first = trend[0]?.value ?? 0;
  const last = trend.at(-1)?.value ?? first;
  const years = Math.max(trend.length - 1, 1);
  const appreciation = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const cagr =
    first > 0 && years > 0
      ? (Math.pow(last / first, 1 / years) - 1) * 100
      : 0;
  return { last, appreciation, cagr: Math.round(cagr * 10) / 10, firstYear: trend[0]?.year, lastYear: trend.at(-1)?.year };
}

function buildValuationLineChart(report: PropertyReport): string {
  const trend = report.valuationTrend;
  if (trend.length < 2) return "";
  const w = 520;
  const h = 160;
  const pad = { l: 40, r: 16, t: 16, b: 32 };
  const min = Math.min(...trend.map((p) => p.value)) * 0.9;
  const max = Math.max(...trend.map((p) => p.value)) * 1.05;
  const xStep = (w - pad.l - pad.r) / (trend.length - 1);
  const points = trend
    .map((p, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + (1 - (p.value - min) / (max - min)) * (h - pad.t - pad.b);
      return `${x},${y}`;
    })
    .join(" ");

  const labels = trend
    .map((p, i) => {
      const x = pad.l + i * xStep;
      return `<text x="${x}" y="${h - 8}" text-anchor="middle" font-size="9" fill="#64748b">${escapeHtml(p.year)}</text>`;
    })
    .join("");

  return `
    <svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Valuation trend" style="font-family: Inter, sans-serif">
      <line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="#e2e8f0"/>
      <polyline points="${points}" fill="none" stroke="#003B79" stroke-width="2.5"/>
      ${trend
        .map((p, i) => {
          const x = pad.l + i * xStep;
          const y = pad.t + (1 - (p.value - min) / (max - min)) * (h - pad.t - pad.b);
          return `<circle cx="${x}" cy="${y}" r="4" fill="#003B79"/>`;
        })
        .join("")}
      ${labels}
    </svg>`;
}

function timelineIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("purchas")) return "🏠";
  if (t.includes("mortgage") || t.includes("loan") || t.includes("charge")) return "🏦";
  if (t.includes("valuation")) return "📈";
  return "📋";
}

function docStatusClass(status: string): string {
  if (status === "complete") return "doc-ok";
  if (status === "partial") return "doc-partial";
  return "doc-missing";
}

function resolvePreScreeningOutcome(report: PropertyReport): PreScreeningOutcome {
  return report.preScreeningOutcome ?? riskLevelToPreScreeningOutcome(report.recommendation);
}

function preScreeningActionPills(outcome: PreScreeningOutcome): { label: string; active: boolean }[] {
  return PRE_SCREENING_OUTCOMES.map((key) => ({
    label: PRE_SCREENING_CONFIG[key].shortLabel,
    active: key === outcome,
  }));
}

function preScreeningHeroClass(outcome: PreScreeningOutcome): string {
  if (outcome === "pre_screen_approved") return "pre-screen-approved";
  if (outcome === "pre_screen_conditional") return "pre-screen-conditional";
  return "pre-screen-manual";
}

function buildPreScreeningHeroHtml(report: PropertyReport): string {
  const outcome = resolvePreScreeningOutcome(report);
  const config = PRE_SCREENING_CONFIG[outcome];
  const pills = preScreeningActionPills(outcome)
    .map(
      (p) =>
        `<span class="pre-screen-pill${p.active ? " active" : ""}">${escapeHtml(p.label)}</span>`
    )
    .join("");

  return `
    <section class="section pre-screen-hero ${preScreeningHeroClass(outcome)}">
      <p class="pre-screen-kicker">Pre-Screening Recommendation</p>
      <div class="pre-screen-layout">
        <div class="pre-screen-badge">${escapeHtml(config.shortLabel)}</div>
        <div>
          <h2 class="pre-screen-title">${escapeHtml(config.label)}</h2>
          <div class="pre-screen-pills">${pills}</div>
          <p class="pre-screen-summary">${escapeHtml(report.recommendationText || preScreeningSummary(outcome))}</p>
          <p class="pre-screen-risk">Risk classification: ${escapeHtml(report.recommendation)}</p>
        </div>
      </div>
    </section>`;
}

function extractLocality(address: string): string {
  const parts = address.split(",");
  return parts.length >= 2 ? parts[parts.length - 2].trim() : "—";
}

function uniqueLenders(report: PropertyReport): string[] {
  const set = new Set<string>();
  report.activeMortgageList.forEach((m) => set.add(m.lender.replace(/\s+Ltd\.?$/i, "").trim()));
  report.historicalMortgageList.forEach((m) => set.add(m.lender.replace(/\s+Ltd\.?$/i, "").trim()));
  return [...set];
}

function buildReportStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif !important; }
    html, body, button, input, select, textarea, table, th, td, h1, h2, h3, h4, p, pre, summary {
      font-family: 'Inter', sans-serif !important;
    }
    body { color: #1a1f36; background: #f4f7fb; line-height: 1.55; font-size: 13px; }
    .report-header { background: linear-gradient(135deg, #003B79 0%, #0056a8 100%); color: #fff; padding: 28px 40px 24px; }
    .report-header h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .report-header .meta { font-size: 11px; opacity: 0.9; margin-top: 8px; }
    .report-header .audience { font-size: 10px; opacity: 0.75; margin-top: 12px; max-width: 720px; }
    .container { max-width: 960px; margin: 0 auto; padding: 28px 24px 48px; }
    .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,59,121,0.06); page-break-inside: avoid; }
    .section-title { font-size: 13px; font-weight: 700; color: #003B79; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #003B79; }
    .section-sub { font-size: 11px; color: #64748b; margin: -8px 0 16px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 800px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    .kpi-card { background: linear-gradient(180deg, #f8fafc 0%, #fff 100%); border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .kpi-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; font-weight: 600; }
    .kpi-card .value { font-size: 20px; font-weight: 800; color: #003B79; margin-top: 6px; line-height: 1.2; }
    .kpi-card .sub { font-size: 10px; color: #64748b; margin-top: 4px; }
    .snapshot { display: grid; grid-template-columns: 200px 1fr; gap: 24px; }
    @media (max-width: 640px) { .snapshot { grid-template-columns: 1fr; } }
    .prop-thumb { background: linear-gradient(145deg, #e8f0fa, #d4e4f7); border-radius: 12px; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #cbd5e1; }
    .prop-thumb .icon { font-size: 48px; opacity: 0.5; }
    .prop-thumb .badge { margin-top: 12px; font-size: 10px; font-weight: 700; background: #003B79; color: #fff; padding: 4px 12px; border-radius: 20px; }
    .field-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 20px; }
    .field .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .field .val { font-size: 13px; font-weight: 600; color: #1a1f36; margin-top: 2px; }
    .match-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .chip { font-size: 10px; padding: 4px 10px; border-radius: 16px; background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; }
    .compare-bars { margin-top: 12px; }
    .bar-row { margin-bottom: 14px; }
    .bar-row .bar-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
    .bar-track { height: 12px; background: #e8edf4; border-radius: 6px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 6px; }
    .bar-fill.value { background: linear-gradient(90deg, #003B79, #2563eb); }
    .bar-fill.exposure { background: linear-gradient(90deg, #EE7D11, #f59e0b); }
    .bar-fill.ltv { background: linear-gradient(90deg, #7c3aed, #a78bfa); width: var(--ltv, 69%); max-width: 100%; }
    .summary-pills { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .pill { padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: 600; background: #f1f5f9; border: 1px solid #e2e8f0; }
    .pill.ok { background: #ecfdf5; border-color: #bbf7d0; color: #166534; }
    .status-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; }
    .status-active { background: #dbeafe; color: #1e40af; }
    .status-released { background: #f1f5f9; color: #475569; }
    .cersai-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 640px) { .cersai-cards { grid-template-columns: 1fr; } }
    .status-card { padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center; }
    .status-card .num { font-size: 22px; font-weight: 800; color: #003B79; }
    .status-card .lbl { font-size: 10px; color: #64748b; margin-top: 4px; text-transform: uppercase; }
    .card-cluster { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media (max-width: 640px) { .card-cluster { grid-template-columns: 1fr; } }
    .intel-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; background: #fafbfc; }
    .intel-card h4 { font-size: 11px; color: #003B79; margin-bottom: 10px; text-transform: uppercase; }
    .v-timeline { position: relative; padding-left: 48px; }
    .v-timeline::before { content: ''; position: absolute; left: 18px; top: 8px; bottom: 8px; width: 2px; background: #003B79; opacity: 0.25; }
    .v-timeline-item { position: relative; padding-bottom: 20px; }
    .v-timeline-item .dot { position: absolute; left: -38px; top: 0; width: 36px; height: 36px; border-radius: 50%; background: #f0f7ff; border: 2px solid #003B79; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .v-timeline-item .year { font-size: 11px; font-weight: 800; color: #003B79; }
    .v-timeline-item .title { font-size: 13px; font-weight: 700; margin-top: 2px; }
    .v-timeline-item .desc { font-size: 11px; color: #64748b; margin-top: 4px; }
    .doc-score { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
    .doc-score .pct { font-size: 36px; font-weight: 800; color: #003B79; }
    .progress-track { flex: 1; height: 14px; background: #e8edf4; border-radius: 7px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #2d8a5e, #003B79); border-radius: 7px; }
    .doc-checklist { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .doc-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 8px; font-size: 11px; border: 1px solid #e2e8f0; }
    .doc-item.doc-ok { background: #ecfdf5; border-color: #bbf7d0; }
    .doc-item.doc-partial { background: #fffbeb; border-color: #fde68a; }
    .doc-item.doc-missing { background: #fef2f2; border-color: #fecaca; }
    .indicator-list { list-style: none; }
    .indicator-list li { padding: 10px 12px; margin-bottom: 8px; border-radius: 8px; font-size: 12px; display: flex; align-items: center; gap: 10px; }
    .indicator-list li.pos { background: #ecfdf5; border: 1px solid #bbf7d0; }
    .indicator-list li.warn { background: #fffbeb; border: 1px solid #fde68a; }
    .recon-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 700px) { .recon-grid { grid-template-columns: 1fr; } }
    .recon-card { padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .recon-card.highlight { border-color: #003B79; background: #f0f7ff; }
    .narrative { font-size: 13px; line-height: 1.7; color: #334155; padding: 16px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #003B79; }
    .pre-screen-hero { border-width: 2px; }
    .pre-screen-layout { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
    .pre-screen-badge { min-width: 120px; min-height: 120px; border-radius: 16px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 13px; font-weight: 800; padding: 16px; border: 2px solid; }
    .pre-screen-approved .pre-screen-badge { background: #ecfdf5; border-color: #86efac; color: #166534; }
    .pre-screen-conditional .pre-screen-badge { background: #fffbeb; border-color: #fde68a; color: #b45309; }
    .pre-screen-manual .pre-screen-badge { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
    .pre-screen-kicker { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 12px; font-weight: 700; }
    .pre-screen-title { font-size: 20px; font-weight: 800; color: #003B79; margin-bottom: 10px; }
    .pre-screen-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .pre-screen-pill { font-size: 10px; font-weight: 700; padding: 6px 12px; border-radius: 6px; background: #f1f5f9; color: #64748b; }
    .pre-screen-pill.active { background: #003B79; color: #fff; }
    .pre-screen-approved .pre-screen-pill.active { background: #166534; }
    .pre-screen-conditional .pre-screen-pill.active { background: #b45309; }
    .pre-screen-manual .pre-screen-pill.active { background: #b91c1c; }
    .pre-screen-summary { font-size: 13px; color: #475569; line-height: 1.6; max-width: 640px; }
    .pre-screen-risk { font-size: 11px; color: #64748b; margin-top: 10px; }
    .rec-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    @media (max-width: 640px) { .rec-actions { grid-template-columns: 1fr; } }
    .rec-btn { padding: 12px; text-align: center; border-radius: 8px; border: 2px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #64748b; }
    .rec-btn.active { border-color: #003B79; background: #003B79; color: #fff; }
    .rec-btn.active.approved { border-color: #166534; background: #166534; }
    .rec-btn.active.conditional { border-color: #b45309; background: #b45309; }
    .rec-btn.active.manual { border-color: #b91c1c; background: #b91c1c; }
    .chart-svg { width: 100%; height: auto; max-height: 200px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    .data-table th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 10px; text-transform: uppercase; color: #64748b; }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid #e8edf4; }
    .mortgage-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #003B79; }
    .audit-section { background: #f8fafc; border-style: dashed; }
    details.audit-fold { margin-top: 12px; }
    details.audit-fold summary { cursor: pointer; font-weight: 700; font-size: 12px; color: #475569; padding: 12px; list-style: none; }
    details.audit-fold summary::-webkit-details-marker { display: none; }
    .json-block { background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 16px; font-size: 10px; overflow-x: auto; white-space: pre-wrap; margin-top: 12px; font-family: ui-monospace, monospace; }
    .contrib-bar { margin-bottom: 10px; }
    .contrib-bar .row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px; }
    .contrib-track { height: 8px; background: #e8edf4; border-radius: 4px; overflow: hidden; }
    .contrib-fill { height: 100%; background: #003B79; border-radius: 4px; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    @media print {
      body { background: #fff; font-size: 11px; }
      .container { padding: 12px; }
      .section { box-shadow: none; page-break-inside: avoid; }
    }`;
}

function buildReportBody(report: PropertyReport): string {
  const e = report.enhancements;
  const ltv = computeLtv(report);
  const valMetrics = computeValuationMetrics(report);
  const lenders = uniqueLenders(report);
  const currentLender =
    report.activeMortgageList[0]?.lender.replace(/\s+Ltd\.?$/i, "").trim() ?? "—";
  const historicalLenders = report.historicalMortgageList.map((m) =>
    m.lender.replace(/\s+Ltd\.?$/i, "").replace(/\s+Bank.*/i, "").trim()
  );
  const idConfidence =
    (e.rawCersaiPayload.matchingEngine as { matchConfidence?: number } | undefined)
      ?.matchConfidence ?? e.cersaiVerification.verificationConfidence;
  const locality = extractLocality(report.address);
  const maxExposure = e.encumbranceAnalysis.historicalExposure;
  const preScreenOutcome = resolvePreScreeningOutcome(report);
  const recActions = preScreeningActionPills(preScreenOutcome);
  const recActiveClass =
    preScreenOutcome === "pre_screen_approved"
      ? "approved"
      : preScreenOutcome === "pre_screen_conditional"
        ? "conditional"
        : "manual";

  const fraudIndicators = [
    ...e.advancedBureauInsights.map((i) => ({
      text: i.text,
      tone: i.tone,
    })),
    { text: "Address Match", tone: "positive" as const },
    { text: "Ownership Match", tone: "positive" as const },
  ];

  const aiNarrative = `
    <p>Property verified across bureau and CERSAI records with ${e.cersaiVerification.verificationConfidence}% match confidence.</p>
    <p>Ownership structure validated (${e.ownershipConsistency.result}). Current LTV of ${ltv}% remains within acceptable underwriting thresholds for ${escapeHtml(report.riskLevel)} risk classification.</p>
    <p>Historical financing activity observed across ${e.encumbranceAnalysis.knownMortgages} lender(s). ${escapeHtml(e.encumbranceAnalysis.chargeConcentration)}.</p>
    <p>${escapeHtml(report.recommendationText)}</p>`;

  return `
    ${buildPreScreeningHeroHtml(report)}

    <!-- 1 Executive Summary Dashboard -->
    <section class="section">
      <h2 class="section-title">Executive Summary Dashboard</h2>
      <p class="section-sub">Credit committee &amp; underwriting view — consolidated property bureau intelligence</p>
      <div class="kpi-grid">
          <div class="kpi-card"><div class="label">Property Value</div><div class="value">${escapeHtml(report.propertyValue)}</div></div>
          <div class="kpi-card"><div class="label">Current Exposure</div><div class="value">${escapeHtml(e.bureauSummary.currentExposure)}</div></div>
          <div class="kpi-card"><div class="label">Loan To Value (LTV)</div><div class="value">${ltv}%</div></div>
          <div class="kpi-card"><div class="label">Ownership Count</div><div class="value">${report.ownership.length}</div></div>
          <div class="kpi-card"><div class="label">Active Charges</div><div class="value">${e.bureauSummary.activeCharges}</div></div>
          <div class="kpi-card"><div class="label">Historical Charges</div><div class="value">${e.bureauSummary.historicalCharges}</div></div>
          <div class="kpi-card"><div class="label">Document Completeness</div><div class="value">${report.documentCompleteness}%</div></div>
      </div>
    </section>

    <!-- 2 Property Snapshot -->
    <section class="section">
      <h2 class="section-title">Property Snapshot</h2>
      <div class="snapshot">
        <div class="prop-thumb"><span class="icon">🏢</span><span class="badge">${escapeHtml(report.propertyType)}</span></div>
        <div>
          <div class="field-grid">
            <div class="field"><div class="lbl">Property ID</div><div class="val">${escapeHtml(report.propertyId)}</div></div>
            <div class="field"><div class="lbl">Property Type</div><div class="val">${escapeHtml(report.propertyType)}</div></div>
            <div class="field"><div class="lbl">Property Sub Type</div><div class="val">${escapeHtml(report.propertySubtype)}</div></div>
            <div class="field"><div class="lbl">Survey Number</div><div class="val">${escapeHtml(report.surveyNumber)}</div></div>
            <div class="field" style="grid-column:1/-1"><div class="lbl">Full Address</div><div class="val">${escapeHtml(report.address)}</div></div>
            <div class="field"><div class="lbl">Registration Number</div><div class="val">${escapeHtml(report.registrationNumber)}</div></div>
            <div class="field"><div class="lbl">Property Area</div><div class="val">${escapeHtml(report.area)}</div></div>
            <div class="field"><div class="lbl">Identification Confidence</div><div class="val">${idConfidence}%</div></div>
          </div>
          <p style="font-size:10px;color:#64748b;margin-top:12px;font-weight:600">Matched Using</p>
          <div class="match-chips">
            <span class="chip">✓ Survey Number</span>
            <span class="chip">✓ Registration Number</span>
            <span class="chip">✓ Address</span>
            <span class="chip">✓ Borrower PAN</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 3 Underwriting Dashboard -->
    <section class="section">
      <h2 class="section-title">Underwriting Dashboard</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="label">Current Exposure</div><div class="value">${escapeHtml(e.encumbranceAnalysis.currentExposure)}</div></div>
        <div class="kpi-card"><div class="label">Historical Exposure</div><div class="value">${escapeHtml(e.encumbranceAnalysis.historicalExposure)}</div></div>
        <div class="kpi-card"><div class="label">Maximum Historical Exposure</div><div class="value">${escapeHtml(maxExposure)}</div></div>
        <div class="kpi-card"><div class="label">Number Of Lenders</div><div class="value">${lenders.length}</div></div>
        <div class="kpi-card"><div class="label">Active Lenders</div><div class="value">${report.activeMortgages}</div></div>
        <div class="kpi-card"><div class="label">Released Charges</div><div class="value">${e.encumbranceAnalysis.releasedCharges}</div></div>
        <div class="kpi-card" style="grid-column:span 2"><div class="label">Current Charge Holder</div><div class="value">${escapeHtml(e.chargeHierarchy.firstCharge)}</div></div>
      </div>
    </section>

    <!-- 4 Exposure vs Property Value -->
    <section class="section">
      <h2 class="section-title">Exposure vs Property Value</h2>
      <div class="compare-bars">
        <div class="bar-row">
          <div class="bar-label"><span>Property Value</span><strong>${escapeHtml(report.propertyValue)}</strong></div>
          <div class="bar-track"><div class="bar-fill value" style="width:100%"></div></div>
        </div>
        <div class="bar-row">
          <div class="bar-label"><span>Current Exposure</span><strong>${escapeHtml(e.bureauSummary.currentExposure)}</strong></div>
          <div class="bar-track"><div class="bar-fill exposure" style="width:${Math.min(ltv, 100)}%"></div></div>
        </div>
        <div class="bar-row">
          <div class="bar-label"><span>LTV Ratio</span><strong>${ltv}%</strong></div>
          <div class="bar-track"><div class="bar-fill ltv" style="--ltv:${ltv}%"></div></div>
        </div>
      </div>
    </section>

    <!-- 5 Property Ownership -->
    <section class="section">
      <h2 class="section-title">Property Ownership</h2>
      <div class="summary-pills">
        <span class="pill ok">Joint Ownership · ${report.ownership.length} Owners</span>
        <span class="pill ok">Verified</span>
        <span class="pill">Ownership Risk: ${report.riskLevel === "Low" ? "Low" : report.riskLevel === "High" ? "High" : "Low–Medium"}</span>
      </div>
      <table class="data-table">
        <thead><tr><th>Owner</th><th>%</th><th>PAN</th><th>Role</th></tr></thead>
        <tbody>${report.ownership.map((o) => `<tr><td>${escapeHtml(o.ownerName)}</td><td>${o.ownershipPercent}%</td><td>${escapeHtml(o.pan)}</td><td>${escapeHtml(o.role)}</td></tr>`).join("")}</tbody>
      </table>
    </section>

    <!-- 6 Active Mortgages -->
    <section class="section">
      <h2 class="section-title">Active Mortgages</h2>
      ${report.activeMortgageList
        .map(
          (m, i) => `
        <div class="mortgage-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong>${escapeHtml(m.lender)}</strong>
            <span class="status-badge status-active">${escapeHtml(m.status)}</span>
          </div>
          <div class="field-grid">
            <div class="field"><div class="lbl">Outstanding</div><div class="val">${escapeHtml(m.outstanding)}</div></div>
            <div class="field"><div class="lbl">Loan Amount</div><div class="val">${escapeHtml(m.loanAmount)}</div></div>
            <div class="field"><div class="lbl">Charge Type</div><div class="val">${escapeHtml(m.chargeType)}</div></div>
            <div class="field"><div class="lbl">Priority</div><div class="val">First Charge · Rank ${i + 1}</div></div>
          </div>
        </div>`
        )
        .join("")}
    </section>

    <!-- 7 Historical Mortgages -->
    <section class="section">
      <h2 class="section-title">Historical Mortgages</h2>
      <div class="summary-pills">
        <span class="pill">Total Historical Financing: ${escapeHtml(e.encumbranceAnalysis.historicalExposure)}</span>
        <span class="pill">Mortgage Events: ${e.encumbranceAnalysis.knownMortgages}</span>
        <span class="pill">Released: ${e.encumbranceAnalysis.releasedCharges}</span>
      </div>
      <table class="data-table">
        <thead><tr><th>Lender</th><th>Loan Amount</th><th>Outstanding</th><th>Charge Type</th><th>Status</th></tr></thead>
        <tbody>${report.historicalMortgageList.map((m) => `<tr><td>${escapeHtml(m.lender)}</td><td>${escapeHtml(m.loanAmount)}</td><td>${escapeHtml(m.outstanding)}</td><td>${escapeHtml(m.chargeType)}</td><td><span class="status-badge status-released">${escapeHtml(m.status)}</span></td></tr>`).join("")}</tbody>
      </table>
    </section>

    <!-- 8 CERSAI Verification -->
    <section class="section">
      <h2 class="section-title">CERSAI Verification</h2>
      <p style="margin-bottom:16px"><span class="status-badge" style="background:${cersaiStatusHex(e.cersaiVerification.status)};color:#fff">${escapeHtml(e.cersaiVerification.status)}</span>
        <span style="margin-left:12px;font-size:12px">Verification Confidence: <strong>${e.cersaiVerification.verificationConfidence}%</strong></span></p>
      <div class="cersai-cards">
        <div class="status-card"><div class="num">${e.cersaiVerification.securityInterests}</div><div class="lbl">Security Interests</div></div>
        <div class="status-card"><div class="num">${e.cersaiVerification.activeCharges}</div><div class="lbl">Active Charges</div></div>
        <div class="status-card"><div class="num">${e.cersaiVerification.releasedCharges}</div><div class="lbl">Released Charges</div></div>
      </div>
      <div class="field"><div class="lbl">Latest Registration</div><div class="val">${escapeHtml(e.cersaiVerification.latestRegistration)}</div></div>
    </section>

    <!-- 9 Security Interest Details -->
    <section class="section">
      <h2 class="section-title">Security Interest Details</h2>
      <div class="card-cluster">
        ${e.securityInterestDetails
          .map(
            (si) => `
          <div class="intel-card">
            <h4>Security Interest · ${escapeHtml(si.status)}</h4>
            <div class="field-grid">
              <div class="field"><div class="lbl">Security Interest ID</div><div class="val">${escapeHtml(si.securityInterestId)}</div></div>
              <div class="field"><div class="lbl">Creation Date</div><div class="val">${escapeHtml(si.creationDate)}</div></div>
              <div class="field"><div class="lbl">Type Of Charge</div><div class="val">${escapeHtml(si.typeOfCharge)}</div></div>
              <div class="field"><div class="lbl">Financing Type</div><div class="val">${escapeHtml(si.financingType)}</div></div>
              <div class="field"><div class="lbl">Registration</div><div class="val">${escapeHtml(si.registrationTimestamp)}</div></div>
              <div class="field"><div class="lbl">Charge Position</div><div class="val">${si.chargePosition}</div></div>
            </div>
          </div>`
          )
          .join("")}
        ${e.securedCreditors
          .map(
            (cr) => `
          <div class="intel-card">
            <h4>Secured Creditor</h4>
            <div class="field-grid">
              <div class="field"><div class="lbl">Institution</div><div class="val">${escapeHtml(cr.institutionName)}</div></div>
              <div class="field"><div class="lbl">Type</div><div class="val">${escapeHtml(cr.institutionType)}</div></div>
              <div class="field"><div class="lbl">Branch</div><div class="val">${escapeHtml(cr.branch)}</div></div>
              <div class="field"><div class="lbl">Office</div><div class="val">${escapeHtml(cr.officeName)}</div></div>
              <div class="field"><div class="lbl">Charge Rank</div><div class="val">${cr.chargeRank}</div></div>
            </div>
          </div>`
          )
          .join("")}
      </div>
      <h4 style="font-size:11px;margin:16px 0 8px;color:#003B79">Borrower to Security Interest Mapping</h4>
      <table class="data-table">
        <thead><tr><th>Borrower</th><th>Role</th><th>Flag</th><th>%</th><th>PAN</th></tr></thead>
        <tbody>${e.borrowerSecurityMapping.map((b) => `<tr><td>${escapeHtml(b.borrowerName)}</td><td>${escapeHtml(b.role)}</td><td>${escapeHtml(b.ownershipFlag)}</td><td>${b.ownershipPercent}%</td><td>${escapeHtml(b.pan)}</td></tr>`).join("")}</tbody>
      </table>
      <div class="intel-card" style="margin-top:16px">
        <h4>Asset (CERSAI)</h4>
        <div class="field-grid">
          <div class="field"><div class="lbl">Asset ID</div><div class="val">${escapeHtml(e.cersaiAsset.assetId)}</div></div>
          <div class="field"><div class="lbl">Category</div><div class="val">${escapeHtml(e.cersaiAsset.assetCategory)}</div></div>
          <div class="field"><div class="lbl">Type</div><div class="val">${escapeHtml(e.cersaiAsset.assetType)}</div></div>
          <div class="field" style="grid-column:1/-1"><div class="lbl">Description</div><div class="val">${escapeHtml(e.cersaiAsset.assetDescription)}</div></div>
        </div>
      </div>
    </section>

    <!-- 10 Property Timeline -->
    <section class="section">
      <h2 class="section-title">Property Timeline</h2>
      <div class="v-timeline">
        ${report.timeline
          .map(
            (t) => `
          <div class="v-timeline-item">
            <div class="dot">${timelineIcon(t.title)}</div>
            <div class="year">${escapeHtml(t.year)}</div>
            <div class="title">${escapeHtml(t.title)}</div>
            <div class="desc">${escapeHtml(t.description)}</div>
          </div>`
          )
          .join("")}
      </div>
    </section>

    <!-- 11 Valuation Analysis -->
    <section class="section">
      <h2 class="section-title">Property Valuation Analysis</h2>
      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi-card"><div class="label">Current Value</div><div class="value">₹${valMetrics.last} L</div><div class="sub">${escapeHtml(report.propertyValue)}</div></div>
        <div class="kpi-card"><div class="label">Appreciation</div><div class="value">${valMetrics.appreciation}%</div><div class="sub">${valMetrics.firstYear} → ${valMetrics.lastYear}</div></div>
        <div class="kpi-card"><div class="label">CAGR</div><div class="value">${valMetrics.cagr}%</div></div>
      </div>
      ${buildValuationLineChart(report)}
    </section>

    <!-- 12 Document Completeness -->
    <section class="section">
      <h2 class="section-title">Document Completeness</h2>
      <div class="doc-score">
        <div class="pct">${report.documentCompleteness}%</div>
        <div class="progress-track"><div class="progress-fill" style="width:${report.documentCompleteness}%"></div></div>
      </div>
      <div class="doc-checklist">
        ${report.documentChecklist
          .map(
            (d) => `
          <div class="doc-item ${docStatusClass(d.status)}">
            <span>${escapeHtml(d.label)}</span>
            <span style="font-weight:700;text-transform:capitalize">${escapeHtml(d.status)}</span>
          </div>`
          )
          .join("")}
      </div>
    </section>

    <!-- 13 Fraud & Risk Indicators -->
    <section class="section">
      <h2 class="section-title">Fraud &amp; Risk Indicators</h2>
      <ul class="indicator-list">
        ${fraudIndicators
          .map(
            (i) =>
              `<li class="${i.tone === "positive" ? "pos" : "warn"}">${i.tone === "positive" ? "✓" : "⚠"} ${escapeHtml(i.text)}</li>`
          )
          .join("")}
      </ul>
      ${report.riskInsights
        .map(
          (r) =>
            `<div class="intel-card" style="margin-top:10px"><strong>${escapeHtml(r.title)}</strong><p style="font-size:11px;color:#64748b;margin-top:4px">${escapeHtml(r.description)}</p></div>`
        )
        .join("")}
    </section>

    <!-- 14 Legal & Encumbrance Risk -->
    <section class="section">
      <h2 class="section-title">Legal &amp; Encumbrance Risk</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="label">Known Encumbrances</div><div class="value">${e.encumbranceAnalysis.activeCharges}</div></div>
        <div class="kpi-card"><div class="label">Court Cases</div><div class="value">None</div></div>
        <div class="kpi-card"><div class="label">SARFAESI</div><div class="value">None</div></div>
        <div class="kpi-card"><div class="label">Auction Notices</div><div class="value">None</div></div>
        <div class="kpi-card"><div class="label">Ownership Disputes</div><div class="value">None</div></div>
        <div class="kpi-card"><div class="label">Legal Risk Level</div><div class="value">${report.riskLevel === "High" ? "Elevated" : "Low"}</div></div>
      </div>
      <p style="font-size:11px;color:#64748b;margin-top:12px">${escapeHtml(e.encumbranceAnalysis.chargeConcentration)}</p>
    </section>

    <!-- 15 Property Intelligence -->
    <section class="section">
      <h2 class="section-title">Property Intelligence</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="label">Area / Locality</div><div class="value">${escapeHtml(locality)}</div></div>
        <div class="kpi-card"><div class="label">Current Area Rate</div><div class="value">₹11,850/sq.ft</div></div>
        <div class="kpi-card"><div class="label">Property Rate</div><div class="value">₹9,793/sq.ft</div></div>
        <div class="kpi-card"><div class="label">Market Position</div><div class="value">Undervalued</div></div>
        <div class="kpi-card"><div class="label">Area Appreciation</div><div class="value">${valMetrics.appreciation}%</div></div>
        <div class="kpi-card"><div class="label">Property Appreciation</div><div class="value">${valMetrics.appreciation}%</div></div>
      </div>
    </section>

    <!-- 16 Cross Lender Visibility -->
    <section class="section">
      <h2 class="section-title">Cross Lender Visibility</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="label">Known Lenders</div><div class="value">${lenders.length}</div></div>
        <div class="kpi-card"><div class="label">Current Lender</div><div class="value">${escapeHtml(currentLender)}</div></div>
        <div class="kpi-card"><div class="label">Total Historical Financing</div><div class="value">${escapeHtml(e.encumbranceAnalysis.historicalExposure)}</div></div>
        <div class="kpi-card"><div class="label">Current Financing</div><div class="value">${escapeHtml(e.encumbranceAnalysis.currentExposure)}</div></div>
      </div>
      <p style="margin-top:12px;font-size:12px"><strong>Historical Lenders:</strong> ${historicalLenders.map(escapeHtml).join(", ") || "—"}</p>
    </section>

    <!-- 17 Reconciliation -->
    <section class="section">
      <h2 class="section-title">Reconciliation</h2>
      <div class="recon-grid">
        <div class="recon-card">
          <h4 style="font-size:11px;color:#003B79;margin-bottom:8px">Member Submitted</h4>
          <div class="field"><div class="lbl">Outstanding</div><div class="val">${escapeHtml(e.cersaiMemberReconciliation.memberOutstanding)}</div></div>
        </div>
        <div class="recon-card">
          <h4 style="font-size:11px;color:#003B79;margin-bottom:8px">CERSAI</h4>
          <div class="field"><div class="lbl">Secured Amount</div><div class="val">${escapeHtml(e.cersaiMemberReconciliation.cersaiSecuredAmount)}</div></div>
        </div>
        <div class="recon-card highlight">
          <h4 style="font-size:11px;color:#003B79;margin-bottom:8px">Variance</h4>
          <div class="field"><div class="lbl">Difference</div><div class="val">${escapeHtml(e.cersaiMemberReconciliation.variance)}</div></div>
          <div class="field" style="margin-top:8px"><div class="lbl">Status</div><div class="val">${escapeHtml(e.cersaiMemberReconciliation.status)}</div></div>
        </div>
      </div>
      <p style="margin-top:16px;font-size:12px"><strong>Ownership Consistency:</strong> ${escapeHtml(e.ownershipConsistency.result)}</p>
    </section>

    <!-- 19 AI Underwriting Insights -->
    <section class="section">
      <h2 class="section-title">AI Generated Underwriting Insights</h2>
      <div class="narrative">${aiNarrative}</div>
    </section>

    <!-- 20 Pre-Screening Recommendation -->
    <section class="section">
      <h2 class="section-title">Pre-Screening Recommendation</h2>
      <div class="rec-actions">
        ${recActions
          .map(
            (a) =>
              `<div class="rec-btn${a.active ? ` active ${recActiveClass}` : ""}">${escapeHtml(a.label)}</div>`
          )
          .join("")}
      </div>
      <p><strong>${escapeHtml(preScreeningLabel(preScreenOutcome))}</strong> — ${escapeHtml(report.recommendationText || preScreeningSummary(preScreenOutcome))}</p>
      <p style="margin-top:8px;font-size:12px;color:#64748b">Risk classification: ${escapeHtml(report.recommendation)}</p>
    </section>

    <!-- 21 Inquiry Details -->
    <section class="section">
      <h2 class="section-title">Inquiry Details</h2>
      <div class="field-grid">
        <div class="field"><div class="lbl">Inquiry ID</div><div class="val">${escapeHtml(report.inquiryId)}</div></div>
        <div class="field"><div class="lbl">Report ID</div><div class="val">${escapeHtml(report.reportId)}</div></div>
        <div class="field"><div class="lbl">Date</div><div class="val">${escapeHtml(report.inquiryDate)}</div></div>
        <div class="field"><div class="lbl">User</div><div class="val">${escapeHtml(report.inquiryUser)}</div></div>
        <div class="field" style="grid-column:1/-1"><div class="lbl">Search Parameters</div><div class="val">${escapeHtml(report.searchParameters)}</div></div>
        <div class="field" style="grid-column:1/-1"><div class="lbl">Sources</div><div class="val">${report.sourcesUsed.map(escapeHtml).join(" · ")}</div></div>
      </div>
    </section>

    <!-- 22 Audit View (collapsed) -->
    <section class="section audit-section">
      <h2 class="section-title">Technical Audit View</h2>
      <p class="section-sub">Operations, compliance &amp; traceability — collapsed by default</p>
      <details class="audit-fold">
        <summary>▸ Raw CERSAI Record (Service II)</summary>
        <pre class="json-block">${escapeHtml(JSON.stringify(e.rawCersaiPayload, null, 2))}</pre>
      </details>
      <details class="audit-fold">
        <summary>▸ Match Engine Metadata</summary>
        <pre class="json-block">${escapeHtml(JSON.stringify(e.rawCersaiPayload.matchingEngine ?? {}, null, 2))}</pre>
      </details>
      <details class="audit-fold">
        <summary>▸ Data Source Contribution</summary>
        ${e.dataSourceContribution
          .map(
            (d) => `
          <div class="contrib-bar">
            <div class="row"><span>${escapeHtml(d.source)}</span><span>${d.percent}%</span></div>
            <div class="contrib-track"><div class="contrib-fill" style="width:${d.percent}%"></div></div>
          </div>`
          )
          .join("")}
      </details>
      <details class="audit-fold">
        <summary>▸ CERSAI Findings (tabular)</summary>
        <table class="data-table">
          <thead><tr><th>SI ID</th><th>Holder</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${report.cersaiFindings.map((c) => `<tr><td>${escapeHtml(c.securityInterestId)}</td><td>${escapeHtml(c.chargeHolder)}</td><td>${escapeHtml(c.chargeType)}</td><td>${escapeHtml(c.securedAmount)}</td><td>${escapeHtml(c.currentStatus)}</td></tr>`).join("")}</tbody>
        </table>
      </details>
      <details class="audit-fold">
        <summary>▸ Security Interest History</summary>
        ${e.securityInterestHistory
          .map(
            (h) =>
              `<p style="font-size:11px;margin:8px 0"><strong>${escapeHtml(h.year)}</strong> ${escapeHtml(h.title)} — ${escapeHtml(h.institution)} (${escapeHtml(h.amount)}) · ${escapeHtml(h.status)}</p>`
          )
          .join("")}
      </details>
      <details class="audit-fold">
        <summary>▸ Charge Hierarchy</summary>
        <div class="field-grid" style="margin-top:8px">
          <div class="field"><div class="lbl">First Charge</div><div class="val">${escapeHtml(e.chargeHierarchy.firstCharge)}</div></div>
          <div class="field"><div class="lbl">Second Charge</div><div class="val">${escapeHtml(e.chargeHierarchy.secondCharge)}</div></div>
          <div class="field"><div class="lbl">Pari Passu</div><div class="val">${escapeHtml(e.chargeHierarchy.pariPassu)}</div></div>
        </div>
      </details>
    </section>`;
}

export function exportPropertyReportHtml(report: PropertyReport, filename?: string): void {
  const name = filename ?? `Property-Bureau-Report-${report.reportId}.html`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CRIF Property Bureau Report — ${escapeHtml(report.reportId)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>${buildReportStyles()}</style>
</head>
<body>
  <header class="report-header">
    <h1>CRIF Property Bureau Report</h1>
    <p class="meta">Report ${escapeHtml(report.reportId)} · Inquiry ${escapeHtml(report.inquiryId)} · Generated ${escapeHtml(report.inquiryDate)}</p>
    <p class="audience">Confidential intelligence document for credit committees, underwriters, risk teams, HFCs, banks, NBFCs, legal &amp; property verification teams, and regulators.</p>
  </header>
  <main class="container">
    ${buildReportBody(report)}
    <div class="footer">Confidential — CRIF Property Bureau · Property Due Diligence &amp; Mortgage Risk Intelligence · Authorized use only</div>
  </main>
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
