package com.hcb.platform.controller;

import com.hcb.platform.model.entity.User;
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
 * Alert Incident Controller
 * - GET  /api/v1/alert-incidents                  — paged active alerts
 * - POST /api/v1/alert-incidents/{id}/acknowledge
 * - POST /api/v1/alert-incidents/{id}/resolve
 * - GET  /api/v1/alert-incidents/charts            — chart aggregations
 * - GET  /api/v1/alert-incidents/breach-history    — SLA breach records
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
        StringBuilder where = new StringBuilder("WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND ai.incident_status = ?"); params.add(status);
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM alert_incidents ai " + where, Long.class, params.toArray());
        String sql = "SELECT ai.id as alertId, ar.domain, ar.name as metric,"
            + " ai.current_value as currentValue, ar.condition_expression as threshold,"
            + " ai.severity, ai.triggered_at as triggeredAt, ai.incident_status as status"
            + " FROM alert_incidents ai JOIN alert_rules ar ON ar.id = ai.alert_rule_id"
            + " " + where + " ORDER BY ai.triggered_at DESC LIMIT ? OFFSET ?";
        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(size); dataParams.add(page * size);
        List<Map<String, Object>> content = jdbc.queryForList(sql, dataParams.toArray());
        return ResponseEntity.ok(buildPage(content, total != null ? total : 0, page, size));
    }

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> acknowledge(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE alert_incidents SET incident_status='Acknowledged' WHERE id=?", id);
        auditService.log(currentUser, "ALERT_ACKNOWLEDGED", "alert_incident", String.valueOf(id), "Alert acknowledged", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> resolve(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE alert_incidents SET incident_status='Resolved', resolved_at=datetime('now') WHERE id=?", id);
        auditService.log(currentUser, "ALERT_RESOLVED", "alert_incident", String.valueOf(id), "Alert resolved", getIp(req));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/charts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> charts() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("triggeredOverTime", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', triggered_at) as day, COUNT(*) as count FROM alert_incidents"
            + " WHERE triggered_at >= datetime('now','-30 days') GROUP BY day ORDER BY day"));
        result.put("byDomain", jdbc.queryForList(
            "SELECT ar.domain, COUNT(*) as count FROM alert_incidents ai JOIN alert_rules ar ON ar.id=ai.alert_rule_id GROUP BY ar.domain ORDER BY count DESC"));
        result.put("severityDistribution", jdbc.queryForList(
            "SELECT severity as name, COUNT(*) as value FROM alert_incidents GROUP BY severity"));
        result.put("mttrTrend", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', triggered_at) as day,"
            + " COALESCE(AVG((JULIANDAY(COALESCE(resolved_at, datetime('now'))) - JULIANDAY(triggered_at)) * 1440), 0) as minutes"
            + " FROM alert_incidents WHERE triggered_at >= datetime('now','-30 days') GROUP BY day ORDER BY day"));
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
        if (domain != null && !domain.isBlank()) { where.append(" AND ar.domain = ?"); params.add(domain); }
        if (severity != null && !severity.isBlank()) { where.append(" AND ai.severity = ?"); params.add(severity); }
        String sql = "SELECT ai.id, 'SLA' as slaType, ar.name as metric,"
            + " ar.condition_expression as threshold, ai.current_value as breachValue,"
            + " CAST(ROUND((JULIANDAY(COALESCE(ai.resolved_at, datetime('now'))) - JULIANDAY(ai.triggered_at)) * 1440) AS INTEGER) || ' min' as duration,"
            + " ai.triggered_at as detectedAt, ai.resolved_at as resolvedAt, ai.incident_status as status, ai.severity"
            + " FROM alert_incidents ai JOIN alert_rules ar ON ar.id=ai.alert_rule_id"
            + " " + where + " ORDER BY ai.triggered_at DESC LIMIT 100";
        return ResponseEntity.ok(jdbc.queryForList(sql, params.toArray()));
    }

    private Map<String, Object> buildPage(List<Map<String, Object>> content, long total, int page, int size) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("content", content); p.put("totalElements", total);
        p.put("totalPages", size > 0 ? (int) Math.ceil((double) total / size) : 1);
        p.put("page", page); p.put("size", size);
        return p;
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
