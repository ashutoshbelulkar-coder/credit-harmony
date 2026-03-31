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
 * SLA Configuration Controller
 * - GET   /api/v1/sla-configs         — list all SLA configs
 * - PATCH /api/v1/sla-configs/{id}    — update an SLA config
 */
@RestController
@RequestMapping("/api/v1/sla-configs")
@RequiredArgsConstructor
public class SlaConfigController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(jdbc.queryForList(
            "SELECT * FROM sla_configs WHERE is_active=1 ORDER BY sla_domain, metric_name"
        ));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> update(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        if (body.containsKey("thresholdValue")) {
            jdbc.update(
                "UPDATE sla_configs SET threshold_value=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                body.get("thresholdValue"),
                id
            );
        }
        auditService.log(currentUser, "SLA_CONFIG_UPDATED", "sla_config", String.valueOf(id), "SLA config updated", getIp(req));
        return ResponseEntity.ok().build();
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
