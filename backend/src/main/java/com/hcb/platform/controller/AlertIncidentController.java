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

import java.util.*;

/**
 * Alert Incident Controller — aligned with {@code alert_incidents}, {@code alert_rules}, {@code sla_breaches}.
 */
@RestController
@RequestMapping("/api/v1/alert-incidents")
@RequiredArgsConstructor
public class AlertIncidentController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE NOT ar.is_deleted");
        List<Object> params = new ArrayList<>();
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            String db = mapUiIncidentStatusToDb(status.trim());
            if (db != null) {
                where.append(" AND ai.alert_incident_status = ?");
                params.add(db);
            }
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM alert_incidents ai JOIN alert_rules ar ON ar.id = ai.alert_rule_id " + where, Long.class, params.toArray());
        String sql = """
            SELECT CAST(ai.id AS TEXT) AS alertId,
                   ar.alert_domain AS domain,
                   ar.rule_name AS metric,
                   COALESCE(ai.current_value_text, '') AS currentValue,
                   COALESCE(ar.condition_expression, '') AS threshold,
                   CASE ar.severity_level
                       WHEN 'CRITICAL' THEN 'Critical'
                       WHEN 'WARNING' THEN 'Warning'
                       ELSE 'Info'
                   END AS severity,
                   ai.triggered_at AS triggeredAt,
                   CASE ai.alert_incident_status
                       WHEN 'active' THEN 'Active'
                       WHEN 'acknowledged' THEN 'Acknowledged'
                       WHEN 'resolved' THEN 'Resolved'
                       ELSE ai.alert_incident_status
                   END AS status
            FROM alert_incidents ai
            JOIN alert_rules ar ON ar.id = ai.alert_rule_id
            """
            + where
            + " ORDER BY ai.triggered_at DESC LIMIT ? OFFSET ?";
        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(size);
        dataParams.add(page * size);
        List<Map<String, Object>> content = jdbc.queryForList(sql, dataParams.toArray());
        return ResponseEntity.ok(buildPage(content, total != null ? total : 0, page, size));
    }

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> acknowledge(@PathVariable Long id, @AuthenticationPrincipal AuthUserPrincipal currentUser, HttpServletRequest req) {
        jdbc.update(
            "UPDATE alert_incidents SET alert_incident_status = 'acknowledged', acknowledged_at = datetime('now') WHERE id = ?",
            id);
        auditService.log(currentUser, "ALERT_ACKNOWLEDGED", "alert_incident", String.valueOf(id), "Alert acknowledged", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> resolve(@PathVariable Long id, @AuthenticationPrincipal AuthUserPrincipal currentUser, HttpServletRequest req) {
        jdbc.update(
            "UPDATE alert_incidents SET alert_incident_status = 'resolved', resolved_at = datetime('now') WHERE id = ?",
            id);
        auditService.log(currentUser, "ALERT_RESOLVED", "alert_incident", String.valueOf(id), "Alert resolved", getIp(req));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/charts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> charts() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("triggeredOverTime", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', ai.triggered_at) AS day, COUNT(*) AS count FROM alert_incidents ai"
                + " WHERE ai.triggered_at >= datetime('now','-30 days') GROUP BY day ORDER BY day"));
        result.put("byDomain", jdbc.queryForList(
            "SELECT ar.alert_domain AS domain, COUNT(*) AS count FROM alert_incidents ai"
                + " JOIN alert_rules ar ON ar.id = ai.alert_rule_id AND NOT ar.is_deleted"
                + " GROUP BY ar.alert_domain ORDER BY count DESC"));
        result.put("severityDistribution", jdbc.queryForList(
            """
                SELECT CASE ar.severity_level
                    WHEN 'CRITICAL' THEN 'Critical'
                    WHEN 'WARNING' THEN 'Warning'
                    ELSE 'Info'
                END AS name, COUNT(*) AS value
                FROM alert_incidents ai
                JOIN alert_rules ar ON ar.id = ai.alert_rule_id AND NOT ar.is_deleted
                GROUP BY ar.severity_level
                ORDER BY value DESC
                """));
        result.put("mttrTrend", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', ai.triggered_at) AS day,"
                + " COALESCE(AVG((JULIANDAY(COALESCE(ai.resolved_at, datetime('now'))) - JULIANDAY(ai.triggered_at)) * 1440), 0) AS minutes"
                + " FROM alert_incidents ai WHERE ai.triggered_at >= datetime('now','-30 days')"
                + " GROUP BY day ORDER BY day"));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/breach-history")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> breachHistory(
        @RequestParam(required = false) String domain,
        @RequestParam(required = false) String severity
    ) {
        StringBuilder where = new StringBuilder("WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (domain != null && !domain.isBlank()) {
            where.append(" AND sc.sla_domain = ?");
            params.add(domain.trim());
        }
        if (severity != null && !severity.isBlank()) {
            String level = mapUiSeverityToDb(severity.trim());
            if (level != null) {
                where.append(" AND sc.severity_level = ?");
                params.add(level);
            }
        }
        String sql = """
            SELECT CAST(sb.id AS TEXT) AS id,
                   sc.sla_domain AS slaType,
                   sc.metric_name AS metric,
                   sc.threshold_operator || ' ' || CAST(sc.threshold_value AS TEXT) || CASE WHEN sc.threshold_unit IS NOT NULL AND sc.threshold_unit != '' THEN ' ' || sc.threshold_unit ELSE '' END AS threshold,
                   COALESCE(sb.breach_value_text, '') AS breachValue,
                   CASE
                       WHEN sb.breach_duration_seconds IS NOT NULL THEN CAST(sb.breach_duration_seconds / 60 AS TEXT) || ' min'
                       ELSE '-'
                   END AS duration,
                   sb.detected_at AS detectedAt,
                   sb.resolved_at AS resolvedAt,
                   CASE sb.breach_incident_status
                       WHEN 'open' THEN 'Open'
                       WHEN 'acknowledged' THEN 'Acknowledged'
                       ELSE 'Resolved'
                   END AS status,
                   CASE sc.severity_level
                       WHEN 'CRITICAL' THEN 'Critical'
                       WHEN 'WARNING' THEN 'Warning'
                       ELSE 'Info'
                   END AS severity,
                   CAST(sb.institution_id AS TEXT) AS institution_id
            FROM sla_breaches sb
            JOIN sla_configs sc ON sc.id = sb.sla_config_id
            """
            + where
            + " ORDER BY sb.detected_at DESC LIMIT 100";
        return ResponseEntity.ok(jdbc.queryForList(sql, params.toArray()));
    }

    /** Maps UI status (Active, active, etc.) to DB {@code alert_incident_status}. */
    private static String mapUiIncidentStatusToDb(String status) {
        String s = status.toLowerCase(Locale.ROOT);
        return switch (s) {
            case "active" -> "active";
            case "acknowledged" -> "acknowledged";
            case "resolved" -> "resolved";
            default -> null;
        };
    }

    private static String mapUiSeverityToDb(String severity) {
        String s = severity.toLowerCase(Locale.ROOT);
        return switch (s) {
            case "critical" -> "CRITICAL";
            case "warning" -> "WARNING";
            case "info" -> "INFO";
            default -> null;
        };
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
