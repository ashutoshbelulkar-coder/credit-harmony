package com.hcb.platform.controller;

import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

/**
 * API Key Controller
 * - GET  /api/v1/api-keys                  — list API keys (optional ?institutionId=)
 * - POST /api/v1/api-keys                  — create key (body: institutionId, environment)
 * - POST /api/v1/api-keys/{id}/regenerate  — regenerate key (returns row shape aligned with list)
 * - POST /api/v1/api-keys/{id}/revoke      — revoke key
 */
@RestController
@RequestMapping("/api/v1/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> list(
        @RequestParam(required = false) Long institutionId
    ) {
        String sql = "SELECT ak.id, ak.key_prefix AS keyPrefix, ak.environment, ak.api_key_status AS status,"
            + " ak.institution_id AS institutionId, i.name AS institutionName,"
            + " ak.created_at AS createdAt, ak.last_used_at AS lastUsedAt, ak.rate_limit_per_minute AS rateLimit"
            + " FROM api_keys ak LEFT JOIN institutions i ON i.id=ak.institution_id"
            + " WHERE ak.is_deleted=0";
        if (institutionId != null) sql += " AND ak.institution_id=" + institutionId;
        sql += " ORDER BY ak.created_at DESC";
        return ResponseEntity.ok(jdbc.queryForList(sql));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        Object instObj = body.get("institutionId");
        if (!(instObj instanceof Number)) {
            return ResponseEntity.badRequest().build();
        }
        long instId = ((Number) instObj).longValue();
        Integer exists = jdbc.queryForObject(
            "SELECT COUNT(*) FROM institutions WHERE id=? AND is_deleted=0",
            Integer.class,
            instId
        );
        if (exists == null || exists == 0) {
            return ResponseEntity.notFound().build();
        }
        String environment = normalizeEnvironment(body.get("environment"));
        String keyName = environmentLabel(environment) + " Key";
        String prefix = "hcb_" + instId + "_" + randomHex(4) + "_";
        String hash = randomHex(64);
        String now = LocalDateTime.now().toString();
        jdbc.update(
            "INSERT INTO api_keys (institution_id, key_name, key_prefix, key_hash, api_key_status, environment, rate_limit_per_minute, created_at, updated_at) "
                + "VALUES (?,?,?,?, 'active', ?, 1000, ?, ?)",
            instId, keyName, prefix, hash, environment, now, now
        );
        Long newId = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        auditService.log(currentUser, "API_KEY_CREATED", "api_key", String.valueOf(newId),
            "API key created for institution " + instId, getIp(req));
        Map<String, Object> row = fetchKeyRow(newId);
        return ResponseEntity.status(HttpStatus.CREATED).body(row);
    }

    @PostMapping("/{id}/regenerate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> regenerate(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        Integer exists = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_keys WHERE id=? AND is_deleted=0",
            Integer.class,
            id
        );
        if (exists == null || exists == 0) {
            return ResponseEntity.notFound().build();
        }
        Long instId = jdbc.queryForObject(
            "SELECT institution_id FROM api_keys WHERE id=?",
            Long.class,
            id
        );
        String newPrefix = "hcb_" + (instId != null ? instId : 0) + "_" + randomHex(4) + "_";
        String now = LocalDateTime.now().toString();
        jdbc.update(
            "UPDATE api_keys SET key_prefix=?, key_hash=?, updated_at=?, last_used_at=? WHERE id=?",
            newPrefix, "REGENERATED_" + randomHex(32), now, now, id
        );
        auditService.log(currentUser, "API_KEY_REGENERATED", "api_key", String.valueOf(id), "API key regenerated", getIp(req));
        return ResponseEntity.ok(Objects.requireNonNull(fetchKeyRow(id)));
    }

    @PostMapping("/{id}/revoke")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> revoke(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        String now = LocalDateTime.now().toString();
        int n = jdbc.update(
            "UPDATE api_keys SET api_key_status='revoked', revoked_at=?, updated_at=? WHERE id=? AND is_deleted=0",
            now, now, id
        );
        if (n == 0) {
            return ResponseEntity.notFound().build();
        }
        auditService.log(currentUser, "API_KEY_REVOKED", "api_key", String.valueOf(id), "API key revoked", getIp(req));
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> fetchKeyRow(Long id) {
        String sql = "SELECT ak.id, ak.key_prefix AS keyPrefix, ak.environment, ak.api_key_status AS status,"
            + " ak.institution_id AS institutionId, i.name AS institutionName,"
            + " ak.created_at AS createdAt, ak.last_used_at AS lastUsedAt, ak.rate_limit_per_minute AS rateLimit"
            + " FROM api_keys ak LEFT JOIN institutions i ON i.id=ak.institution_id"
            + " WHERE ak.id=? AND ak.is_deleted=0";
        List<Map<String, Object>> rows = jdbc.queryForList(sql, id);
        return rows.isEmpty() ? Map.of() : rows.get(0);
    }

    private static String normalizeEnvironment(Object raw) {
        String r = raw == null ? "sandbox" : String.valueOf(raw).trim().toLowerCase();
        if (r.isEmpty()) return "sandbox";
        if ("prod".equals(r) || "production".equals(r)) return "production";
        if ("uat".equals(r)) return "uat";
        return "sandbox";
    }

    private static String environmentLabel(String normalized) {
        return switch (normalized) {
            case "production" -> "Production";
            case "uat" -> "UAT";
            default -> "Sandbox";
        };
    }

    private static String randomHex(int byteLen) {
        byte[] b = new byte[byteLen];
        RANDOM.nextBytes(b);
        StringBuilder sb = new StringBuilder(byteLen * 2);
        for (byte x : b) {
            sb.append(String.format("%02x", x));
        }
        return sb.toString();
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
