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
 * Consortium Controller
 * - GET    /api/v1/consortiums              — paged list
 * - GET    /api/v1/consortiums/{id}         — single
 * - GET    /api/v1/consortiums/{id}/members — members
 * - POST   /api/v1/consortiums              — create
 * - PATCH  /api/v1/consortiums/{id}         — update
 * - DELETE /api/v1/consortiums/{id}         — soft-delete
 */
@RestController
@RequestMapping("/api/v1/consortiums")
@RequiredArgsConstructor
public class ConsortiumController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE c.is_deleted=0");
        List<Object> params = new ArrayList<>();
        if (search != null && !search.isBlank()) { where.append(" AND c.name LIKE ?"); params.add("%" + search + "%"); }
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) { where.append(" AND c.consortium_status=?"); params.add(status); }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM consortiums c " + where, Long.class, params.toArray());
        String sql = "SELECT c.id, c.name, c.consortium_type as type, c.consortium_status as status,"
            + " c.purpose_description as description, c.governance_model as governanceModel,"
            + " (SELECT COUNT(*) FROM consortium_members cm WHERE cm.consortium_id=c.id AND cm.is_deleted=0) as membersCount"
            + " FROM consortiums c " + where + " ORDER BY c.name LIMIT ? OFFSET ?";
        List<Object> dp = new ArrayList<>(params); dp.add(size); dp.add(page * size);
        return ResponseEntity.ok(buildPage(jdbc.queryForList(sql, dp.toArray()), total != null ? total : 0, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT * FROM consortiums WHERE id=? AND is_deleted=0", id);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> members(@PathVariable Long id) {
        return ResponseEntity.ok(jdbc.queryForList(
            "SELECT cm.id, i.id as institutionId, i.name as institutionName,"
            + " cm.member_role as role, cm.joined_at as joinedAt"
            + " FROM consortium_members cm JOIN institutions i ON i.id=cm.institution_id"
            + " WHERE cm.consortium_id=? AND cm.is_deleted=0", id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        jdbc.update("INSERT INTO consortiums(name,consortium_type,consortium_status,purpose_description,governance_model,created_by_user_id,created_at,is_deleted) VALUES(?,?,?,?,?,?,?,0)",
            body.get("name"), body.get("type"), "Forming",
            body.get("description"), body.get("governanceModel"),
            currentUser.getId(), LocalDateTime.now().toString());
        Long id = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        auditService.log(currentUser, "CONSORTIUM_CREATED", "consortium", String.valueOf(id), "Consortium created: " + body.get("name"), getIp(req));
        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> update(@PathVariable Long id, @RequestBody Map<String, Object> body, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE consortiums SET name=COALESCE(?,name), consortium_status=COALESCE(?,consortium_status) WHERE id=?",
            body.get("name"), body.get("status"), id);
        auditService.log(currentUser, "CONSORTIUM_UPDATED", "consortium", String.valueOf(id), "Consortium updated", getIp(req));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE consortiums SET is_deleted=1 WHERE id=?", id);
        auditService.log(currentUser, "CONSORTIUM_DELETED", "consortium", String.valueOf(id), "Consortium deleted", getIp(req));
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> buildPage(List<Map<String, Object>> content, long total, int page, int size) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("content", content); p.put("totalElements", total);
        p.put("totalPages", size > 0 ? (int) Math.ceil((double) total / size) : 1);
        p.put("page", page); p.put("size", size); return p;
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
