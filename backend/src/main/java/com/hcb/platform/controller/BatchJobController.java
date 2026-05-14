package com.hcb.platform.controller;

import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Batch Job Controller
 * - GET /api/v1/batch-jobs                 — paged batch job list
 * - GET /api/v1/batch-jobs/kpis            — batch KPI aggregates
 * - GET /api/v1/batch-jobs/charts          — volume / duration / error aggregates for monitoring charts
 * - GET /api/v1/batch-jobs/{id}            — single job detail
 * - GET /api/v1/batch-jobs/{id}/detail     — job with stage details
 * - POST /api/v1/batch-jobs/{id}/retry     — requeue a failed job
 * - POST /api/v1/batch-jobs/{id}/cancel    — cancel a queued/running job
 */
@RestController
@RequestMapping("/api/v1/batch-jobs")
@RequiredArgsConstructor
public class BatchJobController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String institutionId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE 1=1");
        List<Object> params = new ArrayList<>();
        String dbStatus = filterStatusToDb(status);
        if (dbStatus != null) {
            where.append(" AND bj.batch_job_status = ?");
            params.add(dbStatus);
        }
        if (institutionId != null && !institutionId.isBlank() && !"all".equalsIgnoreCase(institutionId)) {
            where.append(" AND bj.institution_id = ?");
            params.add(Long.parseLong(institutionId));
        }

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM batch_jobs bj " + where, Long.class, params.toArray());

        String sql = "SELECT bj.id AS batchId, bj.institution_id AS institutionId, bj.file_name AS fileName,"
            + " bj.batch_job_status AS dbStatus, bj.total_records AS totalRecords,"
            + " bj.success_count AS successRecords, bj.failed_count AS failedRecords,"
            + " bj.success_rate AS successRate, bj.duration_seconds AS durationSeconds,"
            + " bj.uploaded_at AS uploadedAt, COALESCE(u.email, u.display_name, '') AS uploadedBy"
            + " FROM batch_jobs bj LEFT JOIN users u ON u.id = bj.uploaded_by_user_id"
            + " " + where + " ORDER BY bj.uploaded_at DESC LIMIT ? OFFSET ?";
        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(size);
        dataParams.add(page * size);

        List<Map<String, Object>> raw = jdbc.queryForList(sql, dataParams.toArray());
        List<Map<String, Object>> content = new ArrayList<>(raw.size());
        for (Map<String, Object> row : raw) {
            content.add(toBatchJobListRow(row));
        }
        return ResponseEntity.ok(buildPage(content, total != null ? total : 0, page, size));
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> kpis() {
        Map<String, Object> k = new LinkedHashMap<>();
        Long totalBatchesToday = jdbc.queryForObject(
            "SELECT COUNT(*) FROM batch_jobs WHERE date(uploaded_at) = date('now')", Long.class);
        Long totalRecords = jdbc.queryForObject(
            "SELECT COALESCE(SUM(total_records),0) FROM batch_jobs", Long.class);
        Double avgRate = jdbc.queryForObject(
            "SELECT COALESCE(AVG(success_rate),0) FROM batch_jobs WHERE success_rate IS NOT NULL", Double.class);
        Long failedBatches = jdbc.queryForObject(
            "SELECT COUNT(*) FROM batch_jobs WHERE success_rate IS NOT NULL AND success_rate < 95", Long.class);
        Double avgDuration = jdbc.queryForObject(
            "SELECT COALESCE(AVG(duration_seconds),0) FROM batch_jobs WHERE duration_seconds IS NOT NULL AND duration_seconds > 0",
            Double.class);
        Long queueBacklog = jdbc.queryForObject(
            "SELECT COUNT(*) FROM batch_jobs WHERE batch_job_status = 'queued'", Long.class);

        k.put("totalBatchesToday", totalBatchesToday != null ? totalBatchesToday : 0);
        k.put("totalRecordsProcessed", totalRecords != null ? totalRecords : 0);
        k.put("avgBatchSuccessRate", avgRate != null ? Math.round(avgRate * 10.0) / 10.0 : 0.0);
        k.put("failedBatchesCount", failedBatches != null ? failedBatches : 0);
        k.put("avgProcessingDurationSec", avgDuration != null ? (int) Math.round(avgDuration) : 0);
        k.put("queueBacklogCount", queueBacklog != null ? queueBacklog : 0);
        return ResponseEntity.ok(k);
    }

    /**
     * Time-series and aggregates for Data Submission Batch monitoring charts (last 30 days of {@code uploaded_at}).
     */
    @GetMapping("/charts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> charts() {
        List<Map<String, Object>> volumeRaw = jdbc.queryForList(
            """
                SELECT strftime('%Y-%m-%d', uploaded_at) AS dayKey,
                       COUNT(*) AS batches,
                       COALESCE(SUM(success_count), 0) AS success,
                       COALESCE(SUM(failed_count), 0) AS failed
                FROM batch_jobs
                WHERE uploaded_at >= datetime('now', '-90 days')
                GROUP BY dayKey
                ORDER BY dayKey
                """
        );
        List<Map<String, Object>> volumeTrend = new ArrayList<>(volumeRaw.size());
        for (Map<String, Object> row : volumeRaw) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("dayKey", Objects.toString(ciGet(row, "dayKey"), ""));
            m.put("batches", toLong(ciGet(row, "batches")));
            m.put("success", toLong(ciGet(row, "success")));
            m.put("failed", toLong(ciGet(row, "failed")));
            volumeTrend.add(m);
        }

        List<Map<String, Object>> durationRaw = jdbc.queryForList(
            """
                SELECT strftime('%Y-%m-%d', uploaded_at) AS dayKey,
                       ROUND(AVG(CASE WHEN duration_seconds IS NOT NULL AND duration_seconds > 0
                                 THEN duration_seconds END), 1) AS avgSec
                FROM batch_jobs
                WHERE uploaded_at >= datetime('now', '-90 days')
                GROUP BY dayKey
                HAVING AVG(CASE WHEN duration_seconds IS NOT NULL AND duration_seconds > 0
                           THEN duration_seconds END) IS NOT NULL
                ORDER BY dayKey
                """
        );
        List<Map<String, Object>> durationTrend = new ArrayList<>(durationRaw.size());
        for (Map<String, Object> row : durationRaw) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("dayKey", Objects.toString(ciGet(row, "dayKey"), ""));
            Object avg = ciGet(row, "avgSec");
            m.put("avgSec", avg instanceof Number n ? n.doubleValue() : toDouble(avg));
            durationTrend.add(m);
        }

        List<Map<String, Object>> errRows = jdbc.queryForList(
            """
                SELECT COALESCE(NULLIF(TRIM(error_type), ''), 'Unknown') AS category, COUNT(*) AS cnt
                FROM batch_error_samples
                GROUP BY category
                ORDER BY cnt DESC
                LIMIT 10
                """
        );
        List<Map<String, Object>> topErrorCategories = new ArrayList<>();
        for (Map<String, Object> row : errRows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("category", Objects.toString(ciGet(row, "category"), "Unknown"));
            m.put("count", toLong(ciGet(row, "cnt")));
            topErrorCategories.add(m);
        }
        if (topErrorCategories.isEmpty()) {
            List<Map<String, Object>> fallback = jdbc.queryForList(
                """
                    SELECT CASE
                             WHEN lower(batch_job_status) = 'failed' THEN 'Failed batch jobs'
                             WHEN failed_count > 0 THEN 'Jobs with record failures'
                             ELSE 'Other'
                           END AS category,
                           COUNT(*) AS cnt
                    FROM batch_jobs
                    WHERE lower(batch_job_status) = 'failed' OR failed_count > 0
                    GROUP BY category
                    ORDER BY cnt DESC
                    LIMIT 8
                    """
            );
            for (Map<String, Object> row : fallback) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("category", Objects.toString(ciGet(row, "category"), ""));
                m.put("count", toLong(ciGet(row, "cnt")));
                topErrorCategories.add(m);
            }
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("volumeTrend", volumeTrend);
        body.put("durationTrend", durationTrend);
        body.put("topErrorCategories", topErrorCategories);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT bj.id, bj.institution_id, bj.file_name, bj.batch_job_status, bj.total_records,"
                + " bj.success_count, bj.failed_count, bj.success_rate, bj.duration_seconds, bj.uploaded_at,"
                + " COALESCE(u.email, u.display_name, '') AS uploaded_by"
                + " FROM batch_jobs bj LEFT JOIN users u ON u.id = bj.uploaded_by_user_id WHERE bj.id=?",
            id);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(toBatchJobResponseMap(rows.get(0)));
    }

    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Long id) {
        List<Map<String, Object>> phaseRows = jdbc.queryForList(
            "SELECT * FROM batch_phase_logs WHERE batch_job_id=? ORDER BY phase_order", id);
        List<Map<String, Object>> errors = jdbc.queryForList(
            "SELECT * FROM batch_error_samples WHERE batch_job_id=? LIMIT 50", id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("errorSamples", mapErrorSamples(errors));

        if (phaseRows.isEmpty()) {
            List<Map<String, Object>> legacyStages = jdbc.queryForList(
                "SELECT * FROM batch_stage_logs WHERE batch_job_id=? ORDER BY stage_order", id);
            result.put("phases", List.of());
            result.put("flowSegments", List.of());
            result.put("logs", List.of());
            result.put("stages", legacyStages);
            return ResponseEntity.ok(result);
        }

        List<Map<String, Object>> stageRows = jdbc.queryForList(
            """
                SELECT s.*, p.phase_key AS phase_key_join, p.phase_order AS phase_order_join
                FROM batch_stage_logs s
                INNER JOIN batch_phase_logs p ON p.id = s.phase_log_id
                WHERE s.batch_job_id=?
                ORDER BY p.phase_order, s.stage_order
                """,
            id);

        List<Map<String, Object>> phasesOut = new ArrayList<>(phaseRows.size());
        for (Map<String, Object> row : phaseRows) {
            phasesOut.add(toPhaseDetailDto(row));
        }
        List<Map<String, Object>> stagesOut = new ArrayList<>(stageRows.size());
        for (Map<String, Object> row : stageRows) {
            stagesOut.add(toStageDetailDto(row));
        }
        result.put("phases", phasesOut);
        result.put("stages", stagesOut);
        result.put("flowSegments", buildFlowSegments(phaseRows));
        result.put("logs", buildProcessingLogs(stageRows, errors));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> retry(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        int updated = jdbc.update(
            "UPDATE batch_jobs SET batch_job_status='queued' WHERE id=? AND batch_job_status='failed'", id);
        if (updated == 0) return ResponseEntity.badRequest().build();
        auditService.log(currentUser, "BATCH_RETRIED", "batch_job", String.valueOf(id), "Batch job queued for retry", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> cancel(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        int updated = jdbc.update(
            "UPDATE batch_jobs SET batch_job_status='cancelled' WHERE id=? AND batch_job_status IN ('queued','processing')",
            id);
        if (updated == 0) return ResponseEntity.badRequest().build();
        auditService.log(currentUser, "BATCH_CANCELLED", "batch_job", String.valueOf(id), "Batch job cancelled", getIp(req));
        return ResponseEntity.ok().build();
    }

    private static Map<String, Object> toBatchJobListRow(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        Object bid = ciGet(row, "batchId");
        m.put("batchId", bid != null ? idToString(bid) : "");
        Object inst = ciGet(row, "institutionId");
        m.put("institutionId", inst != null ? String.valueOf(inst) : "");
        m.put("fileName", Objects.toString(ciGet(row, "fileName"), ""));
        m.put("status", toUiBatchStatus(Objects.toString(ciGet(row, "dbStatus"), "queued")));
        m.put("totalRecords", toInt(ciGet(row, "totalRecords")));
        m.put("successRecords", toInt(ciGet(row, "successRecords")));
        m.put("failedRecords", toInt(ciGet(row, "failedRecords")));
        m.put("successRate", toDouble(ciGet(row, "successRate")));
        m.put("durationSeconds", toInt(ciGet(row, "durationSeconds")));
        m.put("uploadedAt", Objects.toString(ciGet(row, "uploadedAt"), ""));
        m.put("uploadedBy", Objects.toString(ciGet(row, "uploadedBy"), ""));
        return m;
    }

    /** SQLite JDBC often lowercases column labels; match keys case- and underscore-insensitively. */
    private static String normJdbcKey(String k) {
        if (k == null) {
            return "";
        }
        return k.toLowerCase(Locale.ROOT).replace("_", "");
    }

    private static Object ciGet(Map<String, Object> row, String logicalKey) {
        String t = normJdbcKey(logicalKey);
        for (Map.Entry<String, Object> e : row.entrySet()) {
            if (normJdbcKey(e.getKey()).equals(t)) {
                return e.getValue();
            }
        }
        return null;
    }

    private static String idToString(Object id) {
        if (id instanceof Number n) {
            return String.valueOf(n.longValue());
        }
        return String.valueOf(id);
    }

    private static Map<String, Object> toBatchJobResponseMap(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        Object bid = ciGet(row, "id");
        m.put("batchId", bid != null ? idToString(bid) : "");
        Object inst = ciGet(row, "institution_id");
        m.put("institutionId", inst != null ? String.valueOf(inst) : "");
        m.put("fileName", Objects.toString(ciGet(row, "file_name"), ""));
        m.put("status", toUiBatchStatus(Objects.toString(ciGet(row, "batch_job_status"), "queued")));
        m.put("totalRecords", toInt(ciGet(row, "total_records")));
        m.put("successRecords", toInt(ciGet(row, "success_count")));
        m.put("failedRecords", toInt(ciGet(row, "failed_count")));
        m.put("successRate", toDouble(ciGet(row, "success_rate")));
        m.put("durationSeconds", toInt(ciGet(row, "duration_seconds")));
        m.put("uploadedAt", Objects.toString(ciGet(row, "uploaded_at"), ""));
        m.put("uploadedBy", Objects.toString(ciGet(row, "uploaded_by"), ""));
        return m;
    }

    private static String filterStatusToDb(String status) {
        if (status == null || status.isBlank() || "all".equalsIgnoreCase(status)) {
            return null;
        }
        String s = status.trim();
        return switch (s) {
            case "Completed" -> "completed";
            case "Processing" -> "processing";
            case "Failed" -> "failed";
            case "Queued" -> "queued";
            case "Suspended" -> "suspended";
            case "Cancelled" -> "cancelled";
            default -> s.toLowerCase(Locale.ROOT);
        };
    }

    /** Maps DB batch_job_status to SPA monitoring PascalCase labels. */
    private static String toUiBatchStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Queued";
        }
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "completed" -> "Completed";
            case "processing", "partial" -> "Processing";
            case "failed" -> "Failed";
            case "queued" -> "Queued";
            case "cancelled" -> "Cancelled";
            case "suspended" -> "Suspended";
            default -> {
                String t = raw.trim();
                if (t.length() <= 1) {
                    yield t.toUpperCase(Locale.ROOT);
                }
                yield t.substring(0, 1).toUpperCase(Locale.ROOT) + t.substring(1).toLowerCase(Locale.ROOT);
            }
        };
    }

    private static int toInt(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(o.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static double toDouble(Object o) {
        if (o == null) return 0.0;
        if (o instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(o.toString());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private static long toLong(Object o) {
        if (o == null) return 0L;
        if (o instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(o.toString().trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private static final DateTimeFormatter SQLITE_DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static LocalDateTime parseSqliteDateTime(Object o) {
        if (o == null) return null;
        String s = o.toString().trim();
        if (s.isEmpty()) return null;
        try {
            return LocalDateTime.parse(s, SQLITE_DT);
        } catch (DateTimeParseException e) {
            try {
                return LocalDateTime.parse(s, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            } catch (DateTimeParseException e2) {
                return null;
            }
        }
    }

    private static String timePart(Object o) {
        LocalDateTime dt = parseSqliteDateTime(o);
        if (dt == null) return "";
        return String.format(Locale.ROOT, "%02d:%02d:%02d", dt.getHour(), dt.getMinute(), dt.getSecond());
    }

    private static Long elapsedMsBetween(Object start, Object end) {
        LocalDateTime a = parseSqliteDateTime(start);
        LocalDateTime b = parseSqliteDateTime(end);
        if (a == null || b == null) return null;
        return Duration.between(a, b).toMillis();
    }

    private static String formatElapsedHuman(Long ms) {
        if (ms == null || ms < 0) return null;
        double sec = ms / 1000.0;
        if (sec < 60) return String.format(Locale.ROOT, "%.1fs", sec);
        return String.format(Locale.ROOT, "%dm %ds", (int) (sec / 60), (int) (sec % 60));
    }

    /** Phase / stage step status for Batch Execution Console (PascalCase). */
    private static String toUiPhaseStatus(String raw) {
        if (raw == null || raw.isBlank()) return "Queued";
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "completed", "complete" -> "Completed";
            case "failed", "error" -> "Failed";
            case "processing", "running", "partial" -> "Processing";
            case "queued", "pending" -> "Queued";
            case "suspended" -> "Suspended";
            case "cancelled" -> "Queued";
            default -> {
                String t = raw.trim();
                if (t.length() <= 1) {
                    yield t.toUpperCase(Locale.ROOT);
                }
                yield t.substring(0, 1).toUpperCase(Locale.ROOT) + t.substring(1).toLowerCase(Locale.ROOT);
            }
        };
    }

    private static String toUiSystemLineStatus(String raw) {
        if (raw == null || raw.isBlank()) return "OK";
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "error", "ko" -> "Error";
            default -> "OK";
        };
    }

    private static String toUiBusinessLineStatus(String raw) {
        if (raw == null || raw.isBlank()) return "OK";
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "error", "ko" -> "Error";
            case "unknown" -> "Unknown";
            default -> "OK";
        };
    }

    private static String nullToEmpty(Object o) {
        return o == null ? "" : Objects.toString(o, "");
    }

    private static Map<String, Object> toPhaseDetailDto(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        String phaseKey = Objects.toString(ciGet(row, "phase_key"), "");
        m.put("phaseId", phaseKey);
        m.put("name", Objects.toString(ciGet(row, "display_name"), phaseKey));
        m.put("status", toUiPhaseStatus(Objects.toString(ciGet(row, "phase_status"), "")));
        m.put("systemStatus", toUiSystemLineStatus(Objects.toString(ciGet(row, "system_status"), "ok")));
        m.put("businessStatus", toUiBusinessLineStatus(Objects.toString(ciGet(row, "business_status"), "ok")));
        m.put("start", timePart(ciGet(row, "started_at")));
        m.put("end", timePart(ciGet(row, "completed_at")));
        Long el = elapsedMsBetween(ciGet(row, "started_at"), ciGet(row, "completed_at"));
        if (el != null) {
            m.put("elapsedMs", el);
        }
        m.put("flowUid", nullToEmpty(ciGet(row, "flow_uid")));
        m.put("phaseUid", nullToEmpty(ciGet(row, "phase_uid")));
        m.put("version", nullToEmpty(ciGet(row, "version")));
        Map<String, Object> counters = new LinkedHashMap<>();
        counters.put("to_be_processed", toInt(ciGet(row, "to_be_processed")));
        counters.put("processing", toInt(ciGet(row, "processing")));
        counters.put("system_ko", toInt(ciGet(row, "system_ko")));
        counters.put("business_ko", toInt(ciGet(row, "business_ko")));
        counters.put("business_ok", toInt(ciGet(row, "business_ok")));
        counters.put("total_records", toInt(ciGet(row, "total_records")));
        m.put("counters", counters);
        return m;
    }

    private static Map<String, Object> toStageDetailDto(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        Object sk = ciGet(row, "stage_key");
        Object sid = ciGet(row, "id");
        String stageId = sk != null && !sk.toString().isBlank() ? sk.toString() : "stg-" + sid;
        m.put("stageId", stageId);
        if (sid != null) {
            m.put("stageLogId", sid instanceof Number n ? n.longValue() : toLong(sid));
        }
        m.put("name", Objects.toString(ciGet(row, "stage_name"), "Stage"));
        String pk = Objects.toString(ciGet(row, "phase_key_join"), "");
        if (pk.isEmpty()) {
            pk = Objects.toString(ciGet(row, "phase_key"), "");
        }
        m.put("phaseKey", pk);
        m.put("status", toUiPhaseStatus(Objects.toString(ciGet(row, "stage_status"), "")));
        m.put("start", timePart(ciGet(row, "started_at")));
        m.put("end", timePart(ciGet(row, "completed_at")));
        m.put("recordsProcessed", toInt(ciGet(row, "records_processed")));
        m.put("errors", toInt(ciGet(row, "error_count")));
        m.put("skipped", toInt(ciGet(row, "skipped_count")));
        m.put("systemReturnCode", ciGet(row, "system_return_code"));
        m.put("businessReturnCode", ciGet(row, "business_return_code"));
        m.put("message", Objects.toString(ciGet(row, "message"), ""));
        return m;
    }

    private static List<Map<String, Object>> buildFlowSegments(List<Map<String, Object>> phaseRows) {
        List<Map<String, Object>> out = new ArrayList<>(phaseRows.size());
        for (Map<String, Object> row : phaseRows) {
            Map<String, Object> seg = new LinkedHashMap<>();
            String phaseKey = Objects.toString(ciGet(row, "phase_key"), "");
            seg.put("phaseId", phaseKey);
            seg.put("label", Objects.toString(ciGet(row, "display_name"), phaseKey));
            seg.put("status", toUiPhaseStatus(Objects.toString(ciGet(row, "phase_status"), "")));
            seg.put("start", timePart(ciGet(row, "started_at")));
            seg.put("end", timePart(ciGet(row, "completed_at")));
            Long el = elapsedMsBetween(ciGet(row, "started_at"), ciGet(row, "completed_at"));
            seg.put("elapsedTime", formatElapsedHuman(el));
            seg.put("recordCount", toInt(ciGet(row, "total_records")));
            out.add(seg);
        }
        return out;
    }

    private static List<Map<String, Object>> buildProcessingLogs(
        List<Map<String, Object>> stageRows,
        List<Map<String, Object>> errorRows
    ) {
        List<Map<String, Object>> logs = new ArrayList<>();
        for (Map<String, Object> row : stageRows) {
            String msg = Objects.toString(ciGet(row, "message"), "").trim();
            String st = Objects.toString(ciGet(row, "stage_status"), "").toLowerCase(Locale.ROOT);
            String sev = "failed".equals(st) || "error".equals(st) ? "ERROR" : "INFO";
            String ts = Objects.toString(ciGet(row, "completed_at"), "");
            if (ts.isBlank()) {
                ts = Objects.toString(ciGet(row, "started_at"), "");
            }
            if (ts.isBlank()) {
                ts = "-";
            }
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("timestamp", ts);
            line.put("component", Objects.toString(ciGet(row, "stage_name"), "Stage"));
            line.put("severity", sev);
            line.put("message", !msg.isEmpty() ? msg
                : "Stage " + Objects.toString(ciGet(row, "stage_name"), "") + " " + st);
            logs.add(line);
        }
        for (Map<String, Object> er : errorRows) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("timestamp", "-");
            line.put("component", "Validation");
            String sevRaw = Objects.toString(ciGet(er, "severity"), "").toLowerCase(Locale.ROOT);
            line.put("severity", sevRaw.contains("warn") ? "WARNING" : "ERROR");
            line.put("message", Objects.toString(ciGet(er, "error_message"),
                Objects.toString(ciGet(er, "error_type"), "Error")));
            logs.add(line);
        }
        return logs;
    }

    private static List<Map<String, Object>> mapErrorSamples(List<Map<String, Object>> raw) {
        List<Map<String, Object>> out = new ArrayList<>(raw.size());
        for (Map<String, Object> er : raw) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("recordId", Objects.toString(ciGet(er, "record_id"), ""));
            m.put("fieldName", Objects.toString(ciGet(er, "field_name"), ""));
            m.put("errorType", Objects.toString(ciGet(er, "error_type"), ""));
            m.put("errorMessage", Objects.toString(ciGet(er, "error_message"), ""));
            m.put("severity", Objects.toString(ciGet(er, "severity"), ""));
            Object stgId = ciGet(er, "batch_stage_log_id");
            if (stgId != null) {
                m.put("batchStageLogId", stgId instanceof Number n ? n.longValue() : toLong(stgId));
            }
            out.add(m);
        }
        return out;
    }

    private Map<String, Object> buildPage(List<Map<String, Object>> content, long total, int page, int size) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("content", content);
        p.put("totalElements", total);
        p.put("totalPages", size > 0 ? (int) Math.ceil((double) total / size) : 1);
        p.put("page", page);
        p.put("size", size);
        return p;
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
