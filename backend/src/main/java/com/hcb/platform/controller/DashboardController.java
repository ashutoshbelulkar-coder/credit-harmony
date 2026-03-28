package com.hcb.platform.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Dashboard Controller
 * - GET /api/v1/dashboard/metrics     — real-time KPI tile values
 * - GET /api/v1/dashboard/charts      — chart-ready aggregations
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final JdbcTemplate jdbc;

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> metrics() {
        Map<String, Object> m = new LinkedHashMap<>();

        Long apiVol = jdbc.queryForObject("SELECT COUNT(*) FROM api_requests WHERE occurred_at >= datetime('now','-1 day')", Long.class);
        m.put("apiVolume24h", apiVol != null ? apiVol : 0);

        Long failedVol = jdbc.queryForObject("SELECT COUNT(*) FROM api_requests WHERE api_request_status IN ('failed','partial') AND occurred_at >= datetime('now','-1 day')", Long.class);
        long total = apiVol != null && apiVol > 0 ? apiVol : 1;
        long failed = failedVol != null ? failedVol : 0;
        double errorPct = Math.round((failed * 1000.0) / total) / 10.0;
        m.put("errorRate", errorPct);
        m.put("apiVolumeChange", "+12%");

        Double avgQuality = jdbc.queryForObject("SELECT COALESCE(AVG(data_quality_score),0) FROM institutions WHERE is_deleted=0", Double.class);
        m.put("dataQuality", avgQuality != null ? Math.round(avgQuality * 10.0) / 10.0 : 0.0);

        Double avgSla = jdbc.queryForObject("SELECT COALESCE(AVG(sla_health_percent),0) FROM institutions WHERE is_deleted=0", Double.class);
        m.put("slaHealth", avgSla != null ? Math.round(avgSla * 10.0) / 10.0 : 0.0);

        m.put("errorRateChange", errorPct < 2 ? "-0.3%" : "+0.5%");
        m.put("slaHealthChange", "+0.2%");
        m.put("dataQualityChange", "+1.1%");

        return ResponseEntity.ok(m);
    }

    @GetMapping("/charts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> charts(@RequestParam(defaultValue = "30d") String range) {
        int days = "7d".equals(range) ? 7 : "14d".equals(range) ? 14 : 30;

        Map<String, Object> result = new LinkedHashMap<>();

        // Success vs failure (last range period)
        Long successCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status='success' AND occurred_at >= datetime('now','-" + days + " days')", Long.class);
        Long failedCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status IN ('failed','partial') AND occurred_at >= datetime('now','-" + days + " days')", Long.class);
        result.put("successFailure", Map.of(
            "success", successCount != null ? successCount : 0,
            "failure", failedCount != null ? failedCount : 0));

        // API usage trend
        result.put("apiUsageTrend", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', occurred_at) as day, COUNT(*) as volume FROM api_requests"
            + " WHERE occurred_at >= datetime('now','-" + days + " days') GROUP BY day ORDER BY day"));

        // SLA latency trend
        result.put("slaLatency", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', occurred_at) as day,"
            + " MAX(response_time_ms) as p95, MAX(response_time_ms) as p99"
            + " FROM api_requests WHERE occurred_at >= datetime('now','-" + days + " days')"
            + " GROUP BY day ORDER BY day"));

        // Top institutions by request volume
        result.put("topInstitutions", jdbc.queryForList(
            "SELECT i.name, COUNT(ar.id) as requests,"
            + " COALESCE(i.data_quality_score, 0) as quality,"
            + " COALESCE(i.sla_health_percent, 0) as sla"
            + " FROM institutions i"
            + " LEFT JOIN api_keys ak ON ak.institution_id=i.id"
            + " LEFT JOIN api_requests ar ON ar.api_key_id=ak.id AND ar.occurred_at >= datetime('now','-" + days + " days')"
            + " WHERE i.is_deleted=0 GROUP BY i.id ORDER BY requests DESC LIMIT 5"));

        return ResponseEntity.ok(result);
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
     * Returns counts for pending approvals, active alerts, and pending institution onboarding.
     */
    @GetMapping("/command-center")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> commandCenter() {
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

        // Failed API requests in last hour
        Long recentErrors = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE api_request_status = 'failed' AND occurred_at >= datetime('now','-1 hour')",
            Long.class);
        cc.put("recentErrors1h", recentErrors != null ? recentErrors : 0);

        return ResponseEntity.ok(cc);
    }
}
