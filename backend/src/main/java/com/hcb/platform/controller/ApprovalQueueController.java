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
 * Approval Queue Controller
 * - GET  /api/v1/approvals                     — paged list
 * - POST /api/v1/approvals/{id}/approve         — approve item
 * - POST /api/v1/approvals/{id}/reject          — reject item
 * - POST /api/v1/approvals/{id}/request-changes — send back for changes
 */
@RestController
@RequestMapping("/api/v1/approvals")
@RequiredArgsConstructor
public class ApprovalQueueController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE aq.is_deleted=0");
        List<Object> params = new ArrayList<>();
        if (type != null && !type.isBlank() && !"all".equalsIgnoreCase(type)) { where.append(" AND aq.entity_type=?"); params.add(type); }
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) { where.append(" AND aq.approval_status=?"); params.add(status); }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM approval_queue aq " + where, Long.class, params.toArray());
        String sql = "SELECT aq.id, aq.entity_type as type, aq.entity_name as name,"
            + " aq.description, u.email as submittedBy, aq.submitted_at as submittedAt,"
            + " aq.approval_status as status, rv.email as reviewedBy, aq.reviewed_at as reviewedAt,"
            + " aq.rejection_reason as rejectionReason"
            + " FROM approval_queue aq"
            + " LEFT JOIN users u ON u.id=aq.submitted_by_user_id"
            + " LEFT JOIN users rv ON rv.id=aq.reviewed_by_user_id"
            + " " + where + " ORDER BY aq.submitted_at DESC LIMIT ? OFFSET ?";
        List<Object> dp = new ArrayList<>(params); dp.add(size); dp.add(page * size);
        return ResponseEntity.ok(buildPage(jdbc.queryForList(sql, dp.toArray()), total != null ? total : 0, page, size));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> approve(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        String now = LocalDateTime.now().toString();
        jdbc.update("UPDATE approval_queue SET approval_status='approved', reviewed_by_user_id=?, reviewed_at=? WHERE id=?", currentUser.getId(), now, id);
        auditService.log(currentUser, "APPROVAL_APPROVED", "approval_queue", String.valueOf(id), "Item approved", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> reject(@PathVariable Long id, @RequestBody Map<String, Object> body, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        String now = LocalDateTime.now().toString();
        jdbc.update("UPDATE approval_queue SET approval_status='rejected', reviewed_by_user_id=?, reviewed_at=?, rejection_reason=? WHERE id=?",
            currentUser.getId(), now, body.get("reason"), id);
        auditService.log(currentUser, "APPROVAL_REJECTED", "approval_queue", String.valueOf(id), "Item rejected", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/request-changes")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> requestChanges(@PathVariable Long id, @RequestBody Map<String, Object> body, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        String now = LocalDateTime.now().toString();
        jdbc.update("UPDATE approval_queue SET approval_status='changes_requested', reviewed_by_user_id=?, reviewed_at=?, rejection_reason=? WHERE id=?",
            currentUser.getId(), now, body.get("comment"), id);
        auditService.log(currentUser, "APPROVAL_CHANGES_REQUESTED", "approval_queue", String.valueOf(id), "Changes requested", getIp(req));
        return ResponseEntity.ok().build();
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
