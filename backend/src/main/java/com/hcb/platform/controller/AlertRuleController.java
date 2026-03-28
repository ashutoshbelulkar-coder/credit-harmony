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

import java.time.LocalDateTime;
import java.util.*;

/**
 * Alert Rule Controller
 * - GET    /api/v1/alert-rules              — list all rules
 * - POST   /api/v1/alert-rules              — create rule
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

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(jdbc.queryForList("SELECT * FROM alert_rules WHERE is_deleted=0 ORDER BY name"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        jdbc.update(
            "INSERT INTO alert_rules(name,domain,condition_expression,severity,rule_status,created_by_user_id,created_at)"
            + " VALUES(?,?,?,?,?,?,?)",
            body.get("name"), body.get("domain"), body.get("condition"),
            body.get("severity"), "Active",
            currentUser.getId(), LocalDateTime.now().toString()
        );
        Long id = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        auditService.log(currentUser, "ALERT_RULE_CREATED", "alert_rule", String.valueOf(id), "Alert rule created: " + body.get("name"), getIp(req));
        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> update(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        jdbc.update("UPDATE alert_rules SET name=COALESCE(?,name), severity=COALESCE(?,severity), condition_expression=COALESCE(?,condition_expression) WHERE id=?",
            body.get("name"), body.get("severity"), body.get("condition"), id);
        auditService.log(currentUser, "ALERT_RULE_UPDATED", "alert_rule", String.valueOf(id), "Alert rule updated", getIp(req));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE alert_rules SET is_deleted=1 WHERE id=?", id);
        auditService.log(currentUser, "ALERT_RULE_DELETED", "alert_rule", String.valueOf(id), "Alert rule deleted", getIp(req));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> activate(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE alert_rules SET rule_status='Active' WHERE id=?", id);
        auditService.log(currentUser, "ALERT_RULE_ACTIVATED", "alert_rule", String.valueOf(id), "Alert rule activated", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE alert_rules SET rule_status='Inactive' WHERE id=?", id);
        auditService.log(currentUser, "ALERT_RULE_DEACTIVATED", "alert_rule", String.valueOf(id), "Alert rule deactivated", getIp(req));
        return ResponseEntity.ok().build();
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
