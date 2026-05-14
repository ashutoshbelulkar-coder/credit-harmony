import type {
  BatchConsoleData,
  BatchDetail,
  BatchJob,
  BatchLogEntry,
  BatchPhase,
  BatchStage,
  BatchStatus,
  BusinessStatus,
  FlowProgressSegment,
  LogSeverity,
  PhaseStatus,
  SystemStatus,
} from "@/data/monitoring-mock";

const PIPELINE_PHASE_ID = "pipeline";

function normKey(k: string): string {
  return k.toLowerCase().replace(/_/g, "");
}

function pickCi(row: Record<string, unknown>, logical: string): unknown {
  const t = normKey(logical);
  for (const [k, v] of Object.entries(row)) {
    if (normKey(k) === t) return v;
  }
  return undefined;
}

function toPhaseStatus(raw: string | undefined, fallback: PhaseStatus): PhaseStatus {
  const s = (raw ?? "").toLowerCase();
  if (s === "completed" || s === "complete") return "Completed";
  if (s === "failed" || s === "error") return "Failed";
  if (s === "processing" || s === "running" || s === "partial") return "Processing";
  if (s === "queued" || s === "pending") return "Queued";
  if (s === "suspended") return "Suspended";
  return fallback;
}

function jobStatusToPhaseStatus(status: BatchStatus): PhaseStatus {
  switch (status) {
    case "Completed":
      return "Completed";
    case "Processing":
      return "Processing";
    case "Failed":
      return "Failed";
    case "Queued":
      return "Queued";
    case "Suspended":
      return "Suspended";
    case "Cancelled":
      return "Queued";
    default:
      return "Queued";
  }
}

function toInt(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return Math.round(v);
  if (typeof v === "string") {
    const p = parseInt(v, 10);
    if (!Number.isNaN(p)) return p;
  }
  return fallback;
}

function parseApiPhaseStatus(raw: string, fallback: PhaseStatus): PhaseStatus {
  const allowed: PhaseStatus[] = ["Completed", "Processing", "Failed", "Queued", "Suspended"];
  if (allowed.includes(raw as PhaseStatus)) return raw as PhaseStatus;
  return toPhaseStatus(raw, fallback);
}

function parseSystemStatus(raw: string): SystemStatus {
  return raw === "Error" ? "Error" : "OK";
}

function parseBusinessStatus(raw: string): BusinessStatus {
  if (raw === "Error") return "Error";
  if (raw === "Unknown") return "Unknown";
  return "OK";
}

function toLogSeverity(raw: unknown): LogSeverity {
  const s = String(raw ?? "INFO").toUpperCase();
  if (s === "ERROR") return "ERROR";
  if (s === "WARNING" || s === "WARN") return "WARNING";
  return "INFO";
}

function normalizeErrorSamplesForStage(
  raw: unknown,
  stageLogId: number,
): NonNullable<BatchStage["error_rows"]> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => {
      const r = row as Record<string, unknown>;
      const id = pickCi(r, "batchStageLogId") ?? pickCi(r, "batch_stage_log_id");
      return id != null && Number(id) === stageLogId;
    })
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        record_id: String(pickCi(r, "record_id") ?? pickCi(r, "recordId") ?? ""),
        field_name: String(pickCi(r, "field_name") ?? pickCi(r, "fieldName") ?? ""),
        error_code: String(pickCi(r, "error_type") ?? pickCi(r, "errorType") ?? ""),
        error_description: String(pickCi(r, "error_message") ?? pickCi(r, "errorMessage") ?? ""),
      };
    });
}

/** Maps enriched {@code GET /v1/batch-jobs/{id}/detail} with {@code phases} + camelCase DTOs. */
function structuredBatchConsoleFromApiDetail(
  o: Record<string, unknown>,
  ctx: { batchId: string; jobStatus: BatchStatus; detail: BatchDetail },
): BatchConsoleData {
  const phasesRaw = o.phases as unknown[] | undefined;
  const stagesRaw = (o.stages as unknown[]) ?? [];
  const flowRaw = o.flowSegments ?? o.flow_segments;
  const logsRaw = o.logs ?? [];
  const errorSamplesAll = o.errorSamples ?? o.error_samples;

  const phases: BatchPhase[] = (phasesRaw ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const phaseId = String(pickCi(r, "phaseId") ?? pickCi(r, "phase_id") ?? "");
    const c = (pickCi(r, "counters") ?? {}) as Record<string, unknown>;
    const statusStr = String(pickCi(r, "status") ?? "");
    const elapsedMsRaw = pickCi(r, "elapsedMs") ?? pickCi(r, "elapsed_ms");
    let elapsedMs: number | undefined;
    if (typeof elapsedMsRaw === "number" && !Number.isNaN(elapsedMsRaw)) {
      elapsedMs = elapsedMsRaw;
    } else if (elapsedMsRaw != null) {
      const n = toInt(elapsedMsRaw, NaN);
      elapsedMs = Number.isNaN(n) ? undefined : n;
    }
    return {
      phase_id: phaseId,
      name: String(pickCi(r, "name") ?? phaseId),
      version: String(pickCi(r, "version") ?? "") || undefined,
      status: parseApiPhaseStatus(statusStr, jobStatusToPhaseStatus(ctx.jobStatus)),
      system_status: parseSystemStatus(String(pickCi(r, "systemStatus") ?? pickCi(r, "system_status") ?? "OK")),
      business_status: parseBusinessStatus(
        String(pickCi(r, "businessStatus") ?? pickCi(r, "business_status") ?? "OK"),
      ),
      start: (() => {
        const s = String(pickCi(r, "start") ?? "").trim();
        return s === "" ? "—" : s;
      })(),
      end: (() => {
        const s = String(pickCi(r, "end") ?? "").trim();
        return s === "" ? undefined : s;
      })(),
      elapsed_ms: elapsedMs,
      flow_uid: String(pickCi(r, "flowUid") ?? pickCi(r, "flow_uid") ?? "") || undefined,
      phase_uid: String(pickCi(r, "phaseUid") ?? pickCi(r, "phase_uid") ?? "") || undefined,
      counters: {
        to_be_processed: toInt(pickCi(c, "to_be_processed")),
        processing: toInt(pickCi(c, "processing")),
        system_ko: toInt(pickCi(c, "system_ko")),
        business_ko: toInt(pickCi(c, "business_ko")),
        business_ok: toInt(pickCi(c, "business_ok")),
        total_records: toInt(pickCi(c, "total_records")),
      },
    };
  });

  const stages: BatchStage[] = (stagesRaw as Record<string, unknown>[]).map((r) => {
    const stageLogIdRaw = pickCi(r, "stageLogId") ?? pickCi(r, "stage_log_id");
    const stageLogId =
      stageLogIdRaw != null && stageLogIdRaw !== "" ? Number(stageLogIdRaw) : NaN;
    const errRows = Number.isFinite(stageLogId)
      ? normalizeErrorSamplesForStage(errorSamplesAll, stageLogId)
      : [];
    const apiErrN = toInt(pickCi(r, "errors") ?? pickCi(r, "error_count"));
    const msg = String(pickCi(r, "message") ?? "").trim();
    const statusStr = String(pickCi(r, "status") ?? "");
    return {
      stage_id: String(pickCi(r, "stageId") ?? pickCi(r, "stage_id") ?? "stg-unknown"),
      name: String(pickCi(r, "name") ?? pickCi(r, "stage_name") ?? "Stage"),
      phase_id: String(pickCi(r, "phaseKey") ?? pickCi(r, "phase_key") ?? PIPELINE_PHASE_ID),
      status: parseApiPhaseStatus(statusStr, jobStatusToPhaseStatus(ctx.jobStatus)),
      start: (() => {
        const s = String(pickCi(r, "start") ?? "").trim();
        return s === "" ? undefined : s;
      })(),
      end: (() => {
        const s = String(pickCi(r, "end") ?? "").trim();
        return s === "" ? undefined : s;
      })(),
      records_processed: toInt(pickCi(r, "recordsProcessed") ?? pickCi(r, "records_processed")),
      errors: errRows.length > 0 ? errRows.length : apiErrN,
      skipped: toInt(pickCi(r, "skipped") ?? pickCi(r, "skipped_count")),
      system_return_code: (() => {
        const v = pickCi(r, "systemReturnCode") ?? pickCi(r, "system_return_code");
        if (v == null) return undefined;
        const n = toInt(v, NaN);
        return Number.isNaN(n) ? undefined : n;
      })(),
      business_return_code: (() => {
        const v = pickCi(r, "businessReturnCode") ?? pickCi(r, "business_return_code");
        if (v == null) return undefined;
        const n = toInt(v, NaN);
        return Number.isNaN(n) ? undefined : n;
      })(),
      error_rows: errRows.length > 0 ? errRows : undefined,
      diagnostic_lines: msg ? [msg] : undefined,
    };
  });

  let flow_segments: FlowProgressSegment[] = [];
  if (Array.isArray(flowRaw) && flowRaw.length > 0) {
    flow_segments = (flowRaw as Record<string, unknown>[]).map((seg) => ({
      phase_id: String(pickCi(seg, "phaseId") ?? pickCi(seg, "phase_id") ?? ""),
      label: String(pickCi(seg, "label") ?? ""),
      status: parseApiPhaseStatus(
        String(pickCi(seg, "status") ?? ""),
        jobStatusToPhaseStatus(ctx.jobStatus),
      ),
      elapsed_time: (() => {
        const et = pickCi(seg, "elapsedTime") ?? pickCi(seg, "elapsed_time");
        return et != null && String(et).trim() !== "" ? String(et) : undefined;
      })(),
      record_count: toInt(pickCi(seg, "recordCount") ?? pickCi(seg, "record_count")),
      start: String(pickCi(seg, "start") ?? "") || undefined,
      end: String(pickCi(seg, "end") ?? "") || undefined,
    }));
  } else if (phases.length > 0) {
    flow_segments = phases.map((p) => ({
      phase_id: p.phase_id,
      label: p.name,
      status: p.status,
      start: p.start || undefined,
      end: p.end || undefined,
      elapsed_time:
        p.elapsed_ms != null && !Number.isNaN(p.elapsed_ms)
          ? `${(p.elapsed_ms / 1000).toFixed(1)}s`
          : undefined,
      record_count: p.counters?.total_records,
    }));
  }

  const logs: BatchLogEntry[] = Array.isArray(logsRaw)
    ? (logsRaw as Record<string, unknown>[]).map((r) => ({
        timestamp: String(pickCi(r, "timestamp") ?? "-"),
        component: String(pickCi(r, "component") ?? ""),
        severity: toLogSeverity(pickCi(r, "severity")),
        message: String(pickCi(r, "message") ?? ""),
      }))
    : [];

  return {
    batch_id: ctx.batchId,
    flow_segments,
    phases,
    stages,
    logs,
  };
}

function formatTimeOnly(dt: unknown): string | undefined {
  if (dt == null) return undefined;
  const s = String(dt).trim();
  if (!s || s === "-") return undefined;
  if (s.includes(" ")) {
    const part = s.split(/\s+/)[1];
    return part?.slice(0, 8) ?? undefined;
  }
  if (s.includes("T")) {
    const part = s.split("T")[1];
    return part?.slice(0, 8) ?? undefined;
  }
  return s.length >= 8 ? s.slice(0, 8) : s;
}

function timelineStepStatus(
  step: { completed: boolean },
  index: number,
  timeline: { completed: boolean }[],
  jobStatus: BatchStatus,
): PhaseStatus {
  if (step.completed) return "Completed";
  const firstIncomplete = timeline.findIndex((t) => !t.completed);
  if (jobStatus === "Queued") return "Queued";
  if (jobStatus === "Processing") {
    return index === firstIncomplete ? "Processing" : "Queued";
  }
  if (jobStatus === "Failed") {
    return index === firstIncomplete ? "Failed" : "Queued";
  }
  if (jobStatus === "Suspended") return index === firstIncomplete ? "Suspended" : "Queued";
  if (jobStatus === "Cancelled") return "Queued";
  if (jobStatus === "Completed") return "Completed";
  return "Queued";
}

/**
 * Maps Spring {@code GET /v1/batch-jobs/{id}/detail} body into {@link BatchConsoleData}.
 * Returns null when there are no stage rows (caller may use a synthetic console).
 */
export function batchConsoleFromApiDetail(
  api: unknown,
  ctx: { batchId: string; jobStatus: BatchStatus; detail: BatchDetail },
): BatchConsoleData | null {
  if (!api || typeof api !== "object") return null;
  const o = api as Record<string, unknown>;
  const phasesRaw = o.phases;
  if (Array.isArray(phasesRaw) && phasesRaw.length > 0) {
    return structuredBatchConsoleFromApiDetail(o, ctx);
  }

  const stagesRaw = o.stages;
  if (!Array.isArray(stagesRaw) || stagesRaw.length === 0) return null;

  const errorRows = normalizeErrorSamples(o.errorSamples ?? o.error_samples);

  const stages: BatchStage[] = stagesRaw.map((row, idx) => {
    const r = row as Record<string, unknown>;
    const id = pickCi(r, "id");
    const name = String(pickCi(r, "stage_name") ?? pickCi(r, "stageName") ?? "Stage");
    const st = String(pickCi(r, "stage_status") ?? pickCi(r, "stageStatus") ?? "");
    const started = pickCi(r, "started_at") ?? pickCi(r, "startedAt");
    const completed = pickCi(r, "completed_at") ?? pickCi(r, "completedAt");
    const message = pickCi(r, "message");
    const fallback: PhaseStatus =
      ctx.jobStatus === "Completed" ? "Completed" : ctx.jobStatus === "Failed" ? "Failed" : "Processing";
    const status = toPhaseStatus(st, fallback);
    const start = formatTimeOnly(started);
    const end = formatTimeOnly(completed);
    const diagnostic =
      message != null && String(message).trim() !== "" ? [String(message)] : undefined;
    return {
      stage_id: `stg-${id != null ? id : idx}`,
      name,
      phase_id: PIPELINE_PHASE_ID,
      status,
      start,
      end,
      records_processed: ctx.detail.total_records,
      errors: 0,
      diagnostic_lines: diagnostic,
    };
  });

  const attachIdx = pickStageIndexForErrors(stages);
  if (errorRows.length > 0 && attachIdx >= 0) {
    const prev = stages[attachIdx];
    stages[attachIdx] = {
      ...prev,
      errors: errorRows.length,
      error_rows: errorRows,
    };
  }

  const phaseStatus: PhaseStatus = stages.some((s) => s.status === "Failed")
    ? "Failed"
    : stages.every((s) => s.status === "Completed")
      ? "Completed"
      : jobStatusToPhaseStatus(ctx.jobStatus);

  const phase: BatchPhase = {
    phase_id: PIPELINE_PHASE_ID,
    name: "Processing pipeline",
    status: phaseStatus,
    system_status: stages.some((s) => s.status === "Failed") ? "Error" : "OK",
    business_status: ctx.detail.failed_records > 0 ? "Error" : "OK",
    start: String(pickCi(stagesRaw[0] as Record<string, unknown>, "started_at") ?? ctx.detail.upload_time),
    end: (() => {
      const last = stagesRaw[stagesRaw.length - 1] as Record<string, unknown>;
      const c = pickCi(last, "completed_at");
      return c != null ? String(c) : undefined;
    })(),
    flow_uid: `FLOW-${ctx.batchId}`,
    phase_uid: `PHASE-${ctx.batchId}`,
    counters: {
      to_be_processed: ctx.detail.total_records,
      processing: ctx.jobStatus === "Processing" ? ctx.detail.total_records : 0,
      system_ko: ctx.jobStatus === "Failed" ? 1 : 0,
      business_ko: ctx.detail.failed_records,
      business_ok: ctx.detail.success_records,
      total_records: ctx.detail.total_records,
    },
  };

  const logs: BatchLogEntry[] = [];
  for (const s of stages) {
    const ts =
      s.start && ctx.detail.upload_time.includes(" ")
        ? `${ctx.detail.upload_time.split(/\s+/)[0]} ${s.start}`
        : ctx.detail.upload_time;
    logs.push({
      timestamp: ts,
      component: s.name,
      severity: s.status === "Failed" ? "ERROR" : "INFO",
      message:
        s.diagnostic_lines?.[0] ??
        `Stage "${s.name}" ${s.status.toLowerCase()}`,
    });
  }

  const flow_segments = stages.map((s) => ({
    phase_id: s.stage_id,
    label: s.name,
    status: s.status,
    start: s.start,
    end: s.end,
    elapsed_time:
      s.start && s.end
        ? `${(
            (Date.parse(`1970-01-01T${s.end}`) - Date.parse(`1970-01-01T${s.start}`)) /
            1000
          ).toFixed(1)}s`
        : undefined,
    record_count: ctx.detail.total_records,
  }));

  return {
    batch_id: ctx.batchId,
    flow_segments,
    phases: [phase],
    stages,
    logs,
  };
}

function normalizeErrorSamples(raw: unknown): BatchStage["error_rows"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      record_id: String(pickCi(r, "record_id") ?? pickCi(r, "recordId") ?? ""),
      field_name: String(pickCi(r, "field_name") ?? pickCi(r, "fieldName") ?? ""),
      error_code: String(pickCi(r, "error_type") ?? pickCi(r, "errorType") ?? ""),
      error_description: String(pickCi(r, "error_message") ?? pickCi(r, "errorMessage") ?? ""),
    };
  });
}

function pickStageIndexForErrors(stages: BatchStage[]): number {
  if (stages.length === 0) return -1;
  const idxVal = stages.findIndex((s) => /valid|transform|parse|business/i.test(s.name));
  if (idxVal >= 0) return idxVal;
  return stages.length - 1;
}

/**
 * When the API has no stage logs, derive phases/stages/logs from the summary timeline
 * (built for list rows) so the console is not empty.
 */
export function syntheticBatchConsoleFromDetail(detail: BatchDetail, jobStatus: BatchStatus): BatchConsoleData {
  const timeline = detail.timeline?.length ? detail.timeline : defaultTimelineForStatus(jobStatus);
  const stages: BatchStage[] = timeline.map((step, i) => ({
    stage_id: `tl-${i}`,
    name: step.step,
    phase_id: PIPELINE_PHASE_ID,
    status: timelineStepStatus(step, i, timeline, jobStatus),
    start: formatTimeOnly(step.timestamp),
    end: undefined,
    records_processed: detail.total_records,
    errors: 0,
  }));

  const phaseStatus = jobStatusToPhaseStatus(jobStatus);
  const phase: BatchPhase = {
    phase_id: PIPELINE_PHASE_ID,
    name: "Processing pipeline",
    status: phaseStatus,
    system_status: jobStatus === "Failed" ? "Error" : "OK",
    business_status: detail.failed_records > 0 ? "Error" : "OK",
    start: detail.upload_time,
    end: detail.processing_end !== "-" ? detail.processing_end : undefined,
    flow_uid: `FLOW-${detail.batch_id}`,
    phase_uid: `PHASE-${detail.batch_id}`,
    counters: {
      to_be_processed: detail.total_records,
      processing: jobStatus === "Processing" ? detail.total_records : 0,
      system_ko: jobStatus === "Failed" ? 1 : 0,
      business_ko: detail.failed_records,
      business_ok: detail.success_records,
      total_records: detail.total_records,
    },
  };

  const logs: BatchLogEntry[] = timeline.map((step, i) => ({
    timestamp: step.timestamp !== "-" ? step.timestamp : detail.upload_time,
    component: "Pipeline",
    severity: "INFO",
    message: `${step.step}: ${step.completed ? "done" : "pending"}`,
  }));

  const flow_segments = stages.map((s) => ({
    phase_id: s.stage_id,
    label: s.name,
    status: s.status,
    start: s.start,
    end: s.end,
    record_count: detail.total_records,
  }));

  return {
    batch_id: detail.batch_id,
    flow_segments,
    phases: [phase],
    stages,
    logs,
  };
}

function defaultTimelineForStatus(status: BatchStatus): BatchDetail["timeline"] {
  const done = status === "Completed";
  const failed = status === "Failed";
  const processing = status === "Processing";
  return [
    { step: "File uploaded", timestamp: "-", completed: true },
    { step: "Schema validated", timestamp: "-", completed: done || failed || processing },
    { step: "Records parsed", timestamp: "-", completed: done || failed },
    { step: "Validation completed", timestamp: "-", completed: done || failed },
    { step: "Stored to database", timestamp: "-", completed: done },
    { step: "Completed", timestamp: "-", completed: done },
  ];
}

/** Resolve console payload: mock catalogue, then API detail, then synthetic timeline. */
export function resolveBatchConsoleData(
  detail: BatchDetail,
  job: BatchJob | null | undefined,
  apiDetail: unknown,
  mockById: Record<string, BatchConsoleData>,
): BatchConsoleData {
  const mock = mockById[detail.batch_id];
  if (mock) return mock;
  const jobStatus = (job?.status ?? "Queued") as BatchStatus;
  const fromApi = batchConsoleFromApiDetail(apiDetail, {
    batchId: detail.batch_id,
    jobStatus,
    detail,
  });
  if (fromApi) return fromApi;
  return syntheticBatchConsoleFromDetail(detail, jobStatus);
}
