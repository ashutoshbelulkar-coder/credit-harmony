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
 * API Key Controller
 * - GET  /api/v1/api-keys                  — list API keys (optional ?institutionId=)
 * - POST /api/v1/api-keys/{id}/regenerate  — regenerate key (returns new prefix)
 * - POST /api/v1/api-keys/{id}/revoke      — revoke key
 */
@RestController
@RequestMapping("/api/v1/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> list(
        @RequestParam(required = false) Long institutionId
    ) {
        String sql = "SELECT ak.id, ak.key_prefix as keyPrefix, ak.environment, ak.key_status as status,"
            + " ak.institution_id as institutionId, i.name as institutionName,"
            + " ak.created_at as createdAt, ak.last_used_at as lastUsedAt, ak.rate_limit_per_minute as rateLimit"
            + " FROM api_keys ak LEFT JOIN institutions i ON i.id=ak.institution_id"
            + " WHERE ak.is_deleted=0";
        if (institutionId != null) sql += " AND ak.institution_id=" + institutionId;
        sql += " ORDER BY ak.created_at DESC";
        return ResponseEntity.ok(jdbc.queryForList(sql));
    }

    @PostMapping("/{id}/regenerate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> regenerate(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        String newPrefix = "hcb_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        jdbc.update("UPDATE api_keys SET key_prefix=?, key_hash='REGENERATED', updated_at=? WHERE id=?",
            newPrefix, LocalDateTime.now().toString(), id);
        auditService.log(currentUser, "API_KEY_REGENERATED", "api_key", String.valueOf(id), "API key regenerated", getIp(req));
        return ResponseEntity.ok(Map.of("keyPrefix", newPrefix, "id", id));
    }

    @PostMapping("/{id}/revoke")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> revoke(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        jdbc.update("UPDATE api_keys SET key_status='revoked', updated_at=? WHERE id=?",
            LocalDateTime.now().toString(), id);
        auditService.log(currentUser, "API_KEY_REVOKED", "api_key", String.valueOf(id), "API key revoked", getIp(req));
        return ResponseEntity.ok().build();
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
