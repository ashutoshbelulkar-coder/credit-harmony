package com.hcb.platform.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Dashboard Controller
 * - GET /api/v1/dashboard/metrics       — KPI tile values for the selected time window
 * - GET /api/v1/dashboard/charts        — chart-ready aggregations for the same window
 * - GET /api/v1/dashboard/command-center — ops counts plus agents, batch pipeline, anomalies, member quality
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private static final Pattern ISO_DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

    private final JdbcTemplate jdbc;

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> metrics(
        @RequestParam(defaultValue = "30d") String range,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        Map<String, Object> m = new LinkedHashMap<>();

        String volWhere = apiRequestTimeWhere(range, from, to);
        String volPriorWhere = apiRequestPriorWhere(range, from, to);

        Long apiVol = jdbc.queryForObject("SELECT COUNT(*) FROM api_requests WHERE " + volWhere, Long.class);
        long apiVolLong = apiVol != null ? apiVol : 0;

        Long failedVol = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status IN ('failed','partial') AND " + volWhere,
            Long.class);
        long failed = failedVol != null ? failedVol : 0;
        double errorPct = apiVolLong > 0 ? Math.round((failed * 1000.0) / apiVolLong) / 10.0 : 0.0;

        Long successVol = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status='success' AND " + volWhere,
            Long.class);
        long success = successVol != null ? successVol : 0;
        double slaHealth = apiVolLong > 0 ? Math.round((success * 1000.0) / apiVolLong) / 10.0 : 0.0;

        Long apiVolPrev = jdbc.queryForObject("SELECT COUNT(*) FROM api_requests WHERE " + volPriorWhere, Long.class);
        long prevVol = apiVolPrev != null ? apiVolPrev : 0;
        Long failedPrev = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status IN ('failed','partial') AND " + volPriorWhere,
            Long.class);
        long fp = failedPrev != null ? failedPrev : 0;
        double errorPrev = prevVol > 0 ? Math.round((fp * 1000.0) / prevVol) / 10.0 : 0.0;
        Long successPrev = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status='success' AND " + volPriorWhere,
            Long.class);
        long sp = successPrev != null ? successPrev : 0;
        double slaPrev = prevVol > 0 ? Math.round((sp * 1000.0) / prevVol) / 10.0 : 0.0;

        String batchWhere = datetimeRangePredicate("bj.uploaded_at", range, from, to);
        String batchPriorWhere = batchUploadedPriorWhere(range, from, to);
        Long bc = jdbc.queryForObject(
            "SELECT COUNT(*) FROM batch_jobs bj WHERE bj.total_records > 0 AND bj.success_rate IS NOT NULL AND "
                + batchWhere,
            Long.class);
        Double instDq = jdbc.queryForObject(
            "SELECT COALESCE(AVG(data_quality_score),0) FROM institutions WHERE is_deleted=0", Double.class);
        double dqFallback = instDq != null ? Math.round(instDq * 10.0) / 10.0 : 0.0;
        double dq;
        if (bc != null && bc > 0) {
            Double avgBatch = jdbc.queryForObject(
                "SELECT AVG(bj.success_rate) FROM batch_jobs bj WHERE bj.total_records > 0 AND bj.success_rate IS NOT NULL AND "
                    + batchWhere,
                Double.class);
            dq = avgBatch != null ? Math.round(avgBatch * 10.0) / 10.0 : dqFallback;
        } else {
            dq = dqFallback;
        }

        Long bcp = jdbc.queryForObject(
            "SELECT COUNT(*) FROM batch_jobs bj WHERE bj.total_records > 0 AND bj.success_rate IS NOT NULL AND "
                + batchPriorWhere,
            Long.class);
        double dqPrev = dqFallback;
        if (bcp != null && bcp > 0) {
            Double prevBatch = jdbc.queryForObject(
                "SELECT AVG(bj.success_rate) FROM batch_jobs bj WHERE bj.total_records > 0 AND bj.success_rate IS NOT NULL AND "
                    + batchPriorWhere,
                Double.class);
            if (prevBatch != null) {
                dqPrev = Math.round(prevBatch * 10.0) / 10.0;
            }
        }

        m.put("apiVolume24h", apiVolLong);
        m.put("apiVolumeChange", fmtPctChangeVol(apiVolLong, prevVol));
        m.put("errorRate", errorPct);
        m.put("errorRateChange", fmtDeltaPP(errorPct, errorPrev));
        m.put("slaHealth", slaHealth);
        m.put("slaHealthChange", fmtDeltaPP(slaHealth, slaPrev));
        m.put("dataQualityScore", dq);
        m.put("dataQuality", dq);
        m.put("dataQualityChange", fmtDeltaPP(dq, dqPrev));

        return ResponseEntity.ok(m);
    }

    @GetMapping("/charts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> charts(
        @RequestParam(defaultValue = "30d") String range,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        String volWhere = apiRequestTimeWhere(range, from, to);

        Map<String, Object> result = new LinkedHashMap<>();

        Long successCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status='success' AND " + volWhere,
            Long.class);
        Long failedCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status IN ('failed','partial') AND " + volWhere,
            Long.class);
        result.put("successFailure", Map.of(
            "success", successCount != null ? successCount : 0,
            "failure", failedCount != null ? failedCount : 0));

        List<Map<String, Object>> trendRows = jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', occurred_at) as day, COUNT(*) as volume FROM api_requests"
                + " WHERE " + volWhere + " GROUP BY day ORDER BY day");
        long sc = successCount != null ? successCount : 0;
        long fc = failedCount != null ? failedCount : 0;
        long trendTotal = sc + fc;
        double lineErrorPct = trendTotal > 0 ? Math.round((fc * 1000.0) / trendTotal) / 10.0 : 0.0;
        List<Map<String, Object>> trendWithErrors = new ArrayList<>();
        for (Map<String, Object> row : trendRows) {
            Map<String, Object> extended = new LinkedHashMap<>(row);
            extended.put("errors", lineErrorPct);
            trendWithErrors.add(extended);
        }
        result.put("apiUsageTrend", trendWithErrors);

        result.put("slaLatency", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', occurred_at) as day,"
                + " MAX(response_time_ms) as p95, MAX(response_time_ms) as p99"
                + " FROM api_requests WHERE " + volWhere
                + " GROUP BY day ORDER BY day"));

        // Leaderboard: enquiry (credit bureau inquiry) volume by requesting institution — same time window as charts
        String enqWhere = enquiryTimeWhere(range, from, to);
        result.put("topInstitutions", jdbc.queryForList(
            "SELECT i.name AS name,"
                + " COUNT(e.id) AS enquiryCount,"
                + " COUNT(e.id) AS requests,"
                + " COALESCE(i.data_quality_score, 0) AS quality,"
                + " COALESCE(i.sla_health_percent, 0) AS sla"
                + " FROM enquiries e"
                + " INNER JOIN institutions i ON i.id = e.requesting_institution_id AND NOT i.is_deleted"
                + " WHERE " + enqWhere
                + " GROUP BY i.id, i.name, i.data_quality_score, i.sla_health_percent"
                + " ORDER BY enquiryCount DESC LIMIT 5"));

        String batchWhere = datetimeRangePredicate("bj.uploaded_at", range, from, to);
        result.put("mappingAccuracy", jdbc.queryForList(
            "SELECT strftime('%G-W%V', bj.uploaded_at) AS week,"
                + " ROUND(AVG(bj.success_rate), 2) AS accuracy"
                + " FROM batch_jobs bj"
                + " WHERE bj.total_records > 0 AND bj.success_rate IS NOT NULL AND " + batchWhere
                + " GROUP BY week ORDER BY week LIMIT 24"));

        result.put("matchConfidence", jdbc.queryForList(
            "SELECT CASE"
                + " WHEN COALESCE(i.match_accuracy_score, 0) < 90 THEN '<90%'"
                + " WHEN i.match_accuracy_score < 95 THEN '90-94%'"
                + " WHEN i.match_accuracy_score < 98 THEN '95-97%'"
                + " ELSE '98%+'"
                + " END AS bucket, COUNT(*) AS count"
                + " FROM institutions i"
                + " WHERE NOT i.is_deleted AND i.is_data_submitter = 1"
                + " GROUP BY bucket"
                + " ORDER BY MIN(COALESCE(i.match_accuracy_score, 0))"));

        String reviewedWhere = datetimeRangePredicate("aq.reviewed_at", range, from, to);
        result.put("rejectionOverride", jdbc.queryForList(
            "SELECT strftime('%G-W%V', aq.reviewed_at) AS week,"
                + " SUM(CASE WHEN aq.approval_workflow_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,"
                + " SUM(CASE WHEN aq.approval_workflow_status IN ('approved','changes_requested') THEN 1 ELSE 0 END) AS overridden"
                + " FROM approval_queue aq"
                + " WHERE aq.reviewed_at IS NOT NULL AND " + reviewedWhere
                + " GROUP BY week ORDER BY week"));

        return ResponseEntity.ok(result);
    }

    /** Time filter for {@code enquiries} aliased as {@code e} (uses {@code e.enquired_at}). */
    private static String enquiryTimeWhere(String range, String from, String to) {
        if ("today".equalsIgnoreCase(range)) {
            return "date(e.enquired_at) = date('now')";
        }
        if ("custom".equalsIgnoreCase(range) && isIsoDate(from) && isIsoDate(to)) {
            return "date(e.enquired_at) BETWEEN date('" + from + "') AND date('" + to + "')";
        }
        int days = resolvePresetDays(range);
        return "e.enquired_at >= datetime('now', '-" + days + " days')";
    }

    /**
     * WHERE clause fragment for api_requests.occurred_at (column name must be {@code occurred_at}).
     */
    private static String apiRequestTimeWhere(String range, String from, String to) {
        if ("today".equalsIgnoreCase(range)) {
            return "date(occurred_at) = date('now')";
        }
        if ("custom".equalsIgnoreCase(range) && isIsoDate(from) && isIsoDate(to)) {
            return "date(occurred_at) BETWEEN date('" + from + "') AND date('" + to + "')";
        }
        int days = resolvePresetDays(range);
        return "occurred_at >= datetime('now', '-" + days + " days')";
    }

    /** Predicate on any DATETIME column (qualified name, e.g. {@code bj.uploaded_at}). */
    private static String datetimeRangePredicate(String column, String range, String from, String to) {
        if ("today".equalsIgnoreCase(range)) {
            return "date(" + column + ") = date('now')";
        }
        if ("custom".equalsIgnoreCase(range) && isIsoDate(from) && isIsoDate(to)) {
            return "date(" + column + ") BETWEEN date('" + from + "') AND date('" + to + "')";
        }
        int days = resolvePresetDays(range);
        return column + " >= datetime('now', '-" + days + " days')";
    }

    private static int resolvePresetDays(String range) {
        if (range == null) return 30;
        return switch (range.toLowerCase(Locale.ROOT)) {
            case "today" -> 1;
            case "7d" -> 7;
            case "30d" -> 30;
            case "90d" -> 90;
            case "14d" -> 14;
            default -> 30;
        };
    }

    private static boolean isIsoDate(String s) {
        return s != null && ISO_DATE.matcher(s).matches();
    }

    /** Previous period of equal length (sliding presets), full prior day (today), or aligned custom window. */
    private static String apiRequestPriorWhere(String range, String from, String to) {
        if ("today".equalsIgnoreCase(range)) {
            return "date(occurred_at) = date('now', '-1 day')";
        }
        if ("custom".equalsIgnoreCase(range) && isIsoDate(from) && isIsoDate(to)) {
            long len = customRangeDays(from, to);
            return "date(occurred_at) BETWEEN date('" + from + "', '-" + len + " days') AND date('" + from + "', '-1 day')";
        }
        int days = resolvePresetDays(range);
        return "occurred_at >= datetime('now', '-" + (days * 2) + " days') AND occurred_at < datetime('now', '-" + days + " days')";
    }

    private static String batchUploadedPriorWhere(String range, String from, String to) {
        if ("today".equalsIgnoreCase(range)) {
            return "date(bj.uploaded_at) = date('now', '-1 day')";
        }
        if ("custom".equalsIgnoreCase(range) && isIsoDate(from) && isIsoDate(to)) {
            long len = customRangeDays(from, to);
            return "date(bj.uploaded_at) BETWEEN date('" + from + "', '-" + len + " days') AND date('" + from + "', '-1 day')";
        }
        int days = resolvePresetDays(range);
        return "bj.uploaded_at >= datetime('now', '-" + (days * 2) + " days') AND bj.uploaded_at < datetime('now', '-" + days + " days')";
    }

    private static String fmtPctChangeVol(long curr, long prev) {
        if (prev <= 0) {
            return curr > 0 ? "+100%" : "0%";
        }
        double pct = (curr - prev) * 100.0 / prev;
        double r = Math.round(pct * 10.0) / 10.0;
        String sign = r > 0 ? "+" : "";
        return sign + r + "%";
    }

    private static String fmtDeltaPP(double curr, double prev) {
        double d = Math.round((curr - prev) * 10.0) / 10.0;
        if (d == 0.0) {
            return "0%";
        }
        String sign = d > 0 ? "+" : "";
        return sign + d + "%";
    }

    /**
     * GET /api/v1/dashboard/activity
     * Returns the 20 most recent audit log entries joined with user display names.
     */
    @GetMapping("/activity")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> activity() {
        String sql = """
            SELECT al.id, al.action_type, al.entity_type, al.entity_id,
                   al.description, al.audit_outcome, al.occurred_at,
                   u.display_name AS user_name, u.email AS user_email
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            ORDER BY al.occurred_at DESC
            LIMIT 20
            """;
        return ResponseEntity.ok(jdbc.queryForList(sql));
    }

    /**
     * GET /api/v1/dashboard/command-center
     * Ops counts plus dashboard panels: agents (catalog), batch pipeline, alert anomalies, member quality grid.
     *
     * @param range preset or custom window (same semantics as /charts) for member-quality bucketing
     */
    @GetMapping("/command-center")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> commandCenter(
        @RequestParam(defaultValue = "30d") String range,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        Map<String, Object> cc = new LinkedHashMap<>();

        Long pendingApprovals = jdbc.queryForObject(
            "SELECT COUNT(*) FROM approval_queue WHERE approval_workflow_status = 'pending'", Long.class);
        cc.put("pendingApprovals", pendingApprovals != null ? pendingApprovals : 0);

        Long activeAlerts = jdbc.queryForObject(
            "SELECT COUNT(*) FROM alert_incidents WHERE alert_incident_status IN ('active','acknowledged')", Long.class);
        cc.put("activeAlerts", activeAlerts != null ? activeAlerts : 0);

        Long pendingOnboarding = jdbc.queryForObject(
            "SELECT COUNT(*) FROM institutions WHERE institution_lifecycle_status = 'pending' AND NOT is_deleted",
            Long.class);
        cc.put("pendingOnboarding", pendingOnboarding != null ? pendingOnboarding : 0);

        Long activeInstitutions = jdbc.queryForObject(
            "SELECT COUNT(*) FROM institutions WHERE institution_lifecycle_status = 'active' AND NOT is_deleted",
            Long.class);
        cc.put("activeInstitutions", activeInstitutions != null ? activeInstitutions : 0);

        Long recentErrors = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status = 'failed' AND occurred_at >= datetime('now','-1 hour')",
            Long.class);
        cc.put("recentErrors1h", recentErrors != null ? recentErrors : 0);

        cc.put("agents", dashboardAgentsFleet());
        cc.put("batches", queryBatchPipelineRows());
        cc.put("anomalies", queryAnomalyFeed());
        cc.put("memberQuality", queryMemberQualityGrid(range, from, to));
        cc.put("memberQualitySubmitters", queryActiveDataSubmitterLabels());

        return ResponseEntity.ok(cc);
    }

    /**
     * Display labels for institutions that may submit batch/API data: active lifecycle + data submitter flag.
     * Drives dashboard Member Data Quality row axis (cells still come from batch aggregations in-window).
     */
    private List<String> queryActiveDataSubmitterLabels() {
        return jdbc.query(
            """
                SELECT COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name) AS label
                FROM institutions i
                WHERE NOT i.is_deleted
                  AND i.is_data_submitter = 1
                  AND i.institution_lifecycle_status = 'active'
                ORDER BY LOWER(COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name))
                """,
            (rs, rowNum) -> rs.getString("label"));
    }

    private List<Map<String, Object>> dashboardAgentsFleet() {
        List<Map<String, Object>> agents = new ArrayList<>();
        addAgent(agents, "pipeline-ingestion", "Ingestion", "ingestion", "Receiving and staging member data submissions (batch / API)", "active", 14, 98.1);
        addAgent(agents, "pipeline-schema-mapper", "Schema Mapper", "schema", "AI-assisted mapping to canonical bureau schema", "active", 11, 97.4);
        addAgent(agents, "pipeline-data-validation", "Data Validation", "quality", "Validation rules and field checks against submissions", "active", 9, 98.8);
        addAgent(agents, "pipeline-identity-resolution", "Identity Resolution", "orchestrator", "Entity matching and match review queue", "active", 18, 96.9);
        addAgent(agents, "banking", "Banking & Financial Services", "scoring", "Sector credit analysis and bureau workflows", "active", 22, 97.2);
        addAgent(agents, "bureau-operator", "Bureau Operations Intelligence", "orchestrator", "CRIF operations: SLA, alerts, submission health", "active", 16, 98.5);
        addAgent(agents, "loan-underwriter", "Loan Underwriting", "scoring", "Retail and SME underwriting assistance", "warning", 31, 95.8);
        addAgent(agents, "real-estate", "Real Estate & Housing", "scoring", "Home loans and LAP portfolio assessment", "idle", 0, 96.1);
        return agents;
    }

    private static void addAgent(List<Map<String, Object>> list, String id, String name, String type,
                                 String task, String status, int latencyMs, double accuracyPct) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("type", type);
        m.put("task", task);
        m.put("status", status);
        m.put("latencyMs", latencyMs);
        m.put("accuracyPct", accuracyPct);
        list.add(m);
    }

    private List<Map<String, Object>> queryBatchPipelineRows() {
        List<Map<String, Object>> rows = jdbc.queryForList(
            """
                SELECT bj.id, COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name) AS institution_label, bj.file_name AS file_name,
                       bj.batch_job_status AS batch_job_status, bj.total_records AS total_records,
                       bj.success_count AS success_count, bj.failed_count AS failed_count,
                       bj.success_rate AS success_rate, bj.uploaded_at AS uploaded_at
                FROM batch_jobs bj
                INNER JOIN institutions i ON i.id = bj.institution_id AND NOT i.is_deleted
                WHERE bj.batch_job_status IN ('queued','processing')
                ORDER BY CASE bj.batch_job_status
                    WHEN 'processing' THEN 0 WHEN 'queued' THEN 1
                    ELSE 2 END, bj.uploaded_at DESC
                LIMIT 20
                """);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            out.add(batchRowToPanel(row));
        }
        return out;
    }

    private static Map<String, Object> batchRowToPanel(Map<String, Object> row) {
        String statusDb = Objects.toString(row.get("batch_job_status"), "queued").toLowerCase(Locale.ROOT);
        String uiStatus = switch (statusDb) {
            case "failed" -> "error";
            case "completed" -> "completed";
            case "processing", "partial" -> "processing";
            default -> "queued";
        };
        long total = toLong(row.get("total_records"));
        long success = toLong(row.get("success_count"));
        int progress;
        if ("queued".equals(uiStatus) && total <= 0) {
            progress = 0;
        } else if (total <= 0) {
            progress = "error".equals(uiStatus) ? 0 : 0;
        } else {
            progress = (int) Math.min(100, Math.round((success * 100.0) / total));
        }
        Double quality = null;
        Object sr = row.get("success_rate");
        if (sr != null) {
            quality = toDouble(sr);
        } else if (total > 0 && !"queued".equals(uiStatus)) {
            quality = Math.round((success * 1000.0 / total)) / 10.0;
        }
        String priority = switch (uiStatus) {
            case "error" -> "critical";
            case "queued" -> "low";
            default -> "normal";
        };
        String fileName = Objects.toString(row.get("file_name"), "");
        String fmt = "TUDF";
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".json")) {
            fmt = "JSON";
        } else if (lower.endsWith(".csv")) {
            fmt = "CSV";
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", String.valueOf(row.get("id")));
        m.put("member", row.get("institution_label"));
        m.put("format", fmt);
        m.put("records", total);
        m.put("progress", progress);
        m.put("quality", quality);
        m.put("status", uiStatus);
        m.put("time", Objects.toString(row.get("uploaded_at"), ""));
        m.put("priority", priority);
        return m;
    }

    private List<Map<String, Object>> queryAnomalyFeed() {
        List<Map<String, Object>> rows = jdbc.queryForList(
            """
                SELECT ai.id, ar.rule_name AS rule_name, ar.alert_domain AS alert_domain, ar.severity_level AS severity_level,
                       ai.metric_name AS metric_name, ai.current_value_text AS current_value, ai.threshold_text AS threshold_text,
                       ai.alert_incident_status AS incident_status, ai.triggered_at AS triggered_at,
                       COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name) AS institution_name
                FROM alert_incidents ai
                INNER JOIN alert_rules ar ON ar.id = ai.alert_rule_id AND NOT ar.is_deleted
                LEFT JOIN institutions i ON i.id = ai.institution_id
                WHERE ai.alert_incident_status IN ('active','acknowledged')
                ORDER BY ai.triggered_at DESC
                LIMIT 10
                """);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            out.add(anomalyRowToPanel(row));
        }
        return out;
    }

    private static Map<String, Object> anomalyRowToPanel(Map<String, Object> row) {
        String sev = Objects.toString(row.get("severity_level"), "INFO").toUpperCase(Locale.ROOT);
        String severity = switch (sev) {
            case "CRITICAL" -> "critical";
            case "WARNING" -> "warning";
            default -> "info";
        };
        String title = Objects.toString(row.get("rule_name"), "Alert");
        String metric = Objects.toString(row.get("metric_name"), "");
        String cur = Objects.toString(row.get("current_value"), "");
        String thr = Objects.toString(row.get("threshold_text"), "");
        String inst = row.get("institution_name") != null ? Objects.toString(row.get("institution_name"), "") : "";
        StringBuilder desc = new StringBuilder();
        if (!metric.isEmpty()) {
            desc.append(metric).append(": ").append(cur);
        } else {
            desc.append(cur);
        }
        if (!thr.isEmpty()) {
            desc.append(" (threshold ").append(thr).append(")");
        }
        if (!inst.isEmpty()) {
            desc.append(" — ").append(inst);
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", "ANM-" + row.get("id"));
        m.put("severity", severity);
        m.put("title", title);
        m.put("description", desc.toString());
        m.put("time", Objects.toString(row.get("triggered_at"), ""));
        m.put("detectedBy", Objects.toString(row.get("alert_domain"), "Alert Engine"));
        m.put("ctaLabel", "Review");
        m.put("href", "/monitoring/alert-engine");
        return m;
    }

    private List<Map<String, Object>> queryMemberQualityGrid(String range, String from, String to) {
        String batchWhere = datetimeRangePredicate("bj.uploaded_at", range, from, to);
        boolean dayBuckets = "7d".equalsIgnoreCase(range)
            || ("custom".equalsIgnoreCase(range) && isIsoDate(from) && isIsoDate(to) && customRangeDays(from, to) <= 7);
        // Short windows: mm-dd; longer presets: 4-hour buckets (e.g. "04h").
        String periodExpr = dayBuckets
            ? "strftime('%m-%d', bj.uploaded_at)"
            : "printf('%02dh', (CAST(strftime('%H', bj.uploaded_at) AS INTEGER) / 4) * 4)";

        // SQLite 3.39+ reserves MEMBER (JSON); avoid AS member. anomalyFlag computed in Java.
        String sql = """
            SELECT institution_label, period,
                   ROUND(AVG(sr), 1) AS qualityScore,
                   SUM(tr) AS recordCount
            FROM (
                SELECT COALESCE(NULLIF(TRIM(i.name), ''), i.trading_name) AS institution_label,
            """
            + periodExpr
            + """
                 AS period,
                       bj.success_rate AS sr,
                       bj.total_records AS tr
                FROM batch_jobs bj
                INNER JOIN institutions i ON i.id = bj.institution_id AND NOT i.is_deleted AND i.is_data_submitter = 1
                    AND i.institution_lifecycle_status = 'active'
                WHERE bj.batch_job_status IN ('completed','partial','failed','processing')
                  AND bj.success_rate IS NOT NULL
                  AND """
            + " " + batchWhere
            + """
            ) t
            GROUP BY institution_label, period
            ORDER BY institution_label, period
            """;

        List<Map<String, Object>> raw = jdbc.queryForList(sql);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : raw) {
            double qs = toDouble(row.get("qualityScore"));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("member", row.get("institution_label"));
            m.put("period", row.get("period"));
            m.put("qualityScore", qs);
            m.put("recordCount", toLong(row.get("recordCount")));
            m.put("anomalyFlag", qs < 95.0);
            out.add(m);
        }
        return out;
    }

    private static long customRangeDays(String from, String to) {
        try {
            long a = java.time.LocalDate.parse(from).toEpochDay();
            long b = java.time.LocalDate.parse(to).toEpochDay();
            return Math.abs(b - a) + 1;
        } catch (Exception e) {
            return 30;
        }
    }

    private static long toLong(Object o) {
        if (o == null) {
            return 0;
        }
        if (o instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(o.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static double toDouble(Object o) {
        if (o == null) {
            return 0.0;
        }
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        if (o instanceof BigDecimal bd) {
            return bd.doubleValue();
        }
        try {
            return Double.parseDouble(o.toString());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }
}
