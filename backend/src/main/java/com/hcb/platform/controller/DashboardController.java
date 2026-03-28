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
        String countSql = "SELECT COUNT(*) FROM api_requests WHERE " + volWhere;

        Long apiVol = jdbc.queryForObject(countSql, Long.class);
        m.put("apiVolume24h", apiVol != null ? apiVol : 0);

        Long failedVol = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status IN ('failed','partial') AND " + volWhere,
            Long.class);
        long total = apiVol != null && apiVol > 0 ? apiVol : 1;
        long failed = failedVol != null ? failedVol : 0;
        double errorPct = Math.round((failed * 1000.0) / total) / 10.0;
        m.put("errorRate", errorPct);
        m.put("apiVolumeChange", "+12%");

        Double avgQuality = jdbc.queryForObject("SELECT COALESCE(AVG(data_quality_score),0) FROM institutions WHERE is_deleted=0", Double.class);
        double dq = avgQuality != null ? Math.round(avgQuality * 10.0) / 10.0 : 0.0;
        m.put("dataQualityScore", dq);
        m.put("dataQuality", dq);

        Double avgSla = jdbc.queryForObject("SELECT COALESCE(AVG(sla_health_percent),0) FROM institutions WHERE is_deleted=0", Double.class);
        m.put("slaHealth", avgSla != null ? Math.round(avgSla * 10.0) / 10.0 : 0.0);

        m.put("errorRateChange", errorPct < 2 ? "-0.3%" : "+0.5%");
        m.put("slaHealthChange", "+0.2%");
        m.put("dataQualityChange", "+1.1%");

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
                + " INNER JOIN institutions i ON i.id = e.requesting_institution_id AND i.is_deleted = 0"
                + " WHERE " + enqWhere
                + " GROUP BY i.id, i.name, i.data_quality_score, i.sla_health_percent"
                + " ORDER BY enquiryCount DESC LIMIT 5"));

        String batchWhere = datetimeRangePredicate("bj.uploaded_at", range, from, to);
        result.put("mappingAccuracy", jdbc.queryForList(
            "SELECT strftime('%G-W%V', bj.uploaded_at) AS week,"
                + " ROUND(AVG(bj.success_rate), 2) AS accuracy"
                + " FROM batch_jobs bj"
                + " WHERE bj.total_records > 0 AND bj.success_rate IS NOT NULL AND " + batchWhere
                + " GROUP BY week ORDER BY week LIMIT 16"));

        result.put("matchConfidence", jdbc.queryForList(
            "SELECT CASE"
                + " WHEN COALESCE(i.match_accuracy_score, 0) < 90 THEN '<90%'"
                + " WHEN i.match_accuracy_score < 95 THEN '90-94%'"
                + " WHEN i.match_accuracy_score < 98 THEN '95-97%'"
                + " ELSE '98%+'"
                + " END AS bucket, COUNT(*) AS count"
                + " FROM institutions i"
                + " WHERE i.is_deleted = 0 AND i.is_data_submitter = 1"
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
            "SELECT COUNT(*) FROM institutions WHERE institution_lifecycle_status = 'Pending Approval' AND is_deleted = 0",
            Long.class);
        cc.put("pendingOnboarding", pendingOnboarding != null ? pendingOnboarding : 0);

        Long activeInstitutions = jdbc.queryForObject(
            "SELECT COUNT(*) FROM institutions WHERE institution_lifecycle_status = 'active' AND is_deleted = 0",
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

        return ResponseEntity.ok(cc);
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
                SELECT bj.id, COALESCE(i.trading_name, i.name) AS member, bj.file_name AS file_name,
                       bj.batch_job_status AS batch_job_status, bj.total_records AS total_records,
                       bj.success_count AS success_count, bj.failed_count AS failed_count,
                       bj.success_rate AS success_rate, bj.uploaded_at AS uploaded_at
                FROM batch_jobs bj
                INNER JOIN institutions i ON i.id = bj.institution_id AND i.is_deleted = 0
                WHERE bj.batch_job_status IN ('queued','processing','failed','partial')
                ORDER BY CASE bj.batch_job_status
                    WHEN 'processing' THEN 0 WHEN 'failed' THEN 1 WHEN 'partial' THEN 2 WHEN 'queued' THEN 3
                    ELSE 4 END, bj.uploaded_at DESC
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
        m.put("member", row.get("member"));
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
                       COALESCE(i.trading_name, i.name) AS institution_name
                FROM alert_incidents ai
                INNER JOIN alert_rules ar ON ar.id = ai.alert_rule_id AND ar.is_deleted = 0
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
        String periodExpr = dayBuckets
            ? "strftime('%m-%d', bj.uploaded_at)"
            : "printf('%02dh', (CAST(strftime('%H', bj.uploaded_at) AS INTEGER) / 4) * 4)";

        String sql = """
            SELECT member, period,
                   ROUND(AVG(sr), 1) AS qualityScore,
                   SUM(tr) AS recordCount,
                   CASE WHEN AVG(sr) < 95 THEN 1 ELSE 0 END AS anomalyFlag
            FROM (
                SELECT COALESCE(i.trading_name, i.name) AS member,
            """
            + periodExpr
            + """
                 AS period,
                       bj.success_rate AS sr,
                       bj.total_records AS tr
                FROM batch_jobs bj
                INNER JOIN institutions i ON i.id = bj.institution_id AND i.is_deleted = 0 AND i.is_data_submitter = 1
                WHERE bj.batch_job_status IN ('completed','partial','failed','processing')
                  AND bj.success_rate IS NOT NULL
                  AND """
            + batchWhere
            + """
            ) t
            GROUP BY member, period
            ORDER BY member, period
            """;

        List<Map<String, Object>> raw = jdbc.queryForList(sql);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : raw) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("member", row.get("member"));
            m.put("period", row.get("period"));
            m.put("qualityScore", toDouble(row.get("qualityScore")));
            m.put("recordCount", toLong(row.get("recordCount")));
            m.put("anomalyFlag", toLong(row.get("anomalyFlag")) != 0);
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
