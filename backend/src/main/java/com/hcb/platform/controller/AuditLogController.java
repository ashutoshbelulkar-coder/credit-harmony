package com.hcb.platform.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Audit log list — flat rows (userId, userEmail) for SPA contract; filters match query params.
 */
@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final JdbcTemplate jdbc;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','API_USER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) Long userId,
        @RequestParam(required = false) String actionType,
        @RequestParam(required = false) String entityType,
        @RequestParam(required = false) String entityId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE 1=1 ");
        List<Object> params = new ArrayList<>();
        if (userId != null) {
            where.append(" AND a.user_id=? ");
            params.add(userId);
        }
        if (actionType != null && !actionType.isBlank()) {
            where.append(" AND a.action_type=? ");
            params.add(actionType);
        }
        if (entityType != null && !entityType.isBlank()) {
            where.append(" AND a.entity_type=? ");
            params.add(entityType);
        }
        if (entityId != null && !entityId.isBlank()) {
            where.append(" AND a.entity_id=? ");
            params.add(entityId);
        }
        if (from != null) {
            where.append(" AND a.occurred_at>=? ");
            params.add(from);
        }
        if (to != null) {
            where.append(" AND a.occurred_at<=? ");
            params.add(to);
        }

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs a " + where, Long.class, params.toArray());
        String sql = "SELECT a.id, a.user_id as userId, u.email as userEmail, a.action_type as actionType,"
            + " a.entity_type as entityType, a.entity_id as entityId, a.description as description,"
            + " a.ip_address_hash as ipAddressHash, a.audit_outcome as auditOutcome, a.occurred_at as occurredAt"
            + " FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id "
            + where
            + " ORDER BY a.occurred_at DESC LIMIT ? OFFSET ?";
        List<Object> q = new ArrayList<>(params);
        q.add(size);
        q.add(page * size);
        List<Map<String, Object>> content = jdbc.queryForList(sql, q.toArray());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", content);
        body.put("totalElements", total != null ? total : 0);
        body.put("totalPages", size > 0 ? (int) Math.ceil((double) (total != null ? total : 0) / size) : 1);
        body.put("page", page);
        body.put("size", size);
        return ResponseEntity.ok(body);
    }
}
