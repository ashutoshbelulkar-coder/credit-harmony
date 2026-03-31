package com.hcb.platform.controller;

import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.ApprovalQueueService;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Alert Rule Controller
 * - GET    /api/v1/alert-rules              — list all rules
 * - POST   /api/v1/alert-rules              — create rule (pending approval + approval_queue)
 * - PATCH  /api/v1/alert-rules/{id}         — update rule
 * - DELETE /api/v1/alert-rules/{id}         — delete rule
 * - POST   /api/v1/alert-rules/{id}/activate
 * - POST   /api/v1/alert-rules/{id}/deactivate
 */
@RestController
@RequestMapping("/api/v1/alert-rules")
@RequiredArgsConstructor
public class AlertRuleController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;
    private final ApprovalQueueService approvalQueueService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> list() {
        List<Map<String, Object>> raw = jdbc.queryForList(
            """
                SELECT id, rule_name, alert_domain, condition_expression, severity_level, alert_rule_status, last_triggered_at
                FROM alert_rules WHERE is_deleted=0 ORDER BY rule_name
                """
        );
        List<Map<String, Object>> out = new ArrayList<>(raw.size());
        for (Map<String, Object> row : raw) {
            out.add(mapRuleToApi(row));
        }
        return ResponseEntity.ok(out);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        String now = LocalDateTime.now().toString();
        String name = body.get("name") != null ? String.valueOf(body.get("name")).trim() : "Alert rule";
        String domain = body.get("domain") != null ? String.valueOf(body.get("domain")) : "Submission API";
        String condition = body.get("condition") != null ? String.valueOf(body.get("condition")) : "";
        String severityDb = mapSeverityToDb(body.get("severity"));
        jdbc.update(
            "INSERT INTO alert_rules(rule_name,alert_domain,condition_expression,severity_level,alert_rule_status,"
                + "created_at,updated_at,is_deleted)"
                + " VALUES(?,?,?,?,?,?,?,0)",
            name,
            domain,
            condition,
            severityDb,
            "pending_approval",
            now,
            now
        );
        Long newId = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        String desc = !condition.isBlank()
            ? domain + " · " + condition
            : "New alert rule — " + domain;
        approvalQueueService.enqueue(
            "alert_rule",
            String.valueOf(newId),
            name,
            desc,
            currentUser != null ? currentUser.getId() : null
        );
        auditService.log(currentUser, "ALERT_RULE_CREATED", "alert_rule", String.valueOf(newId),
            "Alert rule created: " + name, getIp(req));
        Map<String, Object> row = jdbc.queryForMap(
            """
                SELECT id, rule_name, alert_domain, condition_expression, severity_level, alert_rule_status, last_triggered_at
                FROM alert_rules WHERE id=?
                """,
            newId
        );
        return ResponseEntity.status(201).body(mapRuleToApi(row));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> update(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        Object sev = body.get("severity");
        String severityDb = sev != null ? mapSeverityToDb(sev) : null;
        jdbc.update(
            "UPDATE alert_rules SET rule_name=COALESCE(?,rule_name), severity_level=COALESCE(?,severity_level),"
                + " condition_expression=COALESCE(?,condition_expression), updated_at=? WHERE id=?",
            body.get("name"),
            severityDb,
            body.get("condition"),
            LocalDateTime.now().toString(),
            id
        );
        auditService.log(currentUser, "ALERT_RULE_UPDATED", "alert_rule", String.valueOf(id), "Alert rule updated", getIp(req));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        jdbc.update(
            "UPDATE alert_rules SET is_deleted=1, deleted_at=? WHERE id=?",
            LocalDateTime.now().toString(),
            id
        );
        auditService.log(currentUser, "ALERT_RULE_DELETED", "alert_rule", String.valueOf(id), "Alert rule deleted", getIp(req));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<?> activate(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        List<Map<String, Object>> stRows = jdbc.queryForList(
            "SELECT alert_rule_status FROM alert_rules WHERE id=? AND is_deleted=0",
            id
        );
        if (stRows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String st = Objects.toString(stRows.get(0).get("alert_rule_status"), "");
        if ("pending_approval".equalsIgnoreCase(st)) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "ERR_INVALID_STATE",
                "message", "Rule must be approved in the queue before it can be enabled"
            ));
        }
        jdbc.update(
            "UPDATE alert_rules SET alert_rule_status='enabled', updated_at=? WHERE id=?",
            LocalDateTime.now().toString(),
            id
        );
        auditService.log(currentUser, "ALERT_RULE_ACTIVATED", "alert_rule", String.valueOf(id), "Alert rule activated", getIp(req));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> deactivate(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        jdbc.update(
            "UPDATE alert_rules SET alert_rule_status='disabled', updated_at=? WHERE id=?",
            LocalDateTime.now().toString(),
            id
        );
        auditService.log(currentUser, "ALERT_RULE_DEACTIVATED", "alert_rule", String.valueOf(id), "Alert rule deactivated", getIp(req));
        return ResponseEntity.noContent().build();
    }

    private static String mapSeverityToDb(Object severity) {
        if (severity == null) {
            return "WARNING";
        }
        String s = String.valueOf(severity).trim().toUpperCase(Locale.ROOT).replace(' ', '_');
        if (s.equals("WARNING") || s.contains("WARN")) {
            return "WARNING";
        }
        if (s.equals("CRITICAL") || s.contains("CRIT")) {
            return "CRITICAL";
        }
        if (s.equals("INFO")) {
            return "INFO";
        }
        return "WARNING";
    }

    private static String mapSeverityToApi(Object dbSeverity) {
        if (dbSeverity == null) {
            return "Warning";
        }
        return switch (String.valueOf(dbSeverity).trim().toUpperCase(Locale.ROOT)) {
            case "CRITICAL" -> "Critical";
            case "INFO" -> "Info";
            default -> "Warning";
        };
    }

    private static String mapStatusToApi(Object dbStatus) {
        if (dbStatus == null) {
            return "Disabled";
        }
        return switch (String.valueOf(dbStatus).trim().toLowerCase(Locale.ROOT)) {
            case "enabled" -> "Enabled";
            case "pending_approval" -> "Pending approval";
            default -> "Disabled";
        };
    }

    private static Map<String, Object> mapRuleToApi(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        Object id = row.get("id");
        m.put("id", id != null ? String.valueOf(id) : "");
        m.put("name", Objects.toString(row.get("rule_name"), ""));
        m.put("domain", Objects.toString(row.get("alert_domain"), ""));
        m.put("condition", Objects.toString(row.get("condition_expression"), ""));
        m.put("severity", mapSeverityToApi(row.get("severity_level")));
        m.put("status", mapStatusToApi(row.get("alert_rule_status")));
        Object lt = row.get("last_triggered_at");
        m.put("lastTriggered", lt != null ? String.valueOf(lt) : null);
        return m;
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
