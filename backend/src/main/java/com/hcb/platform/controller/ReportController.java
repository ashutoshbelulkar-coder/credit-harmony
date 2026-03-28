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
 * Report Controller
 * - GET    /api/v1/reports               — paged report list
 * - POST   /api/v1/reports               — create a report request
 * - DELETE /api/v1/reports/{id}          — delete report
 * - POST   /api/v1/reports/{id}/cancel   — cancel pending report
 * - POST   /api/v1/reports/{id}/retry    — retry failed report
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE r.is_deleted=0");
        List<Object> params = new ArrayList<>();
        if (type != null && !type.isBlank()) { where.append(" AND r.report_type=?"); params.add(type); }
        if (status != null && !status.isBlank()) { where.append(" AND r.report_status=?"); params.add(status); }
        if (dateFrom != null && !dateFrom.isBlank()) { where.append(" AND date(r.requested_at)>=?"); params.add(dateFrom); }
        if (dateTo != null && !dateTo.isBlank()) { where.append(" AND date(r.requested_at)<=?"); params.add(dateTo); }

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM reports r " + where, Long.class, params.toArray());
        String sql = "SELECT r.id, r.report_type as type, r.report_name as name,"
            + " r.report_status as status, r.period_start as dateFrom, r.period_end as dateTo,"
            + " u.email as requestedBy, r.requested_at as requestedAt, r.completed_at as completedAt"
            + " FROM reports r LEFT JOIN users u ON u.id=r.requested_by_user_id"
            + " " + where + " ORDER BY r.requested_at DESC LIMIT ? OFFSET ?";
        List<Object> dp = new ArrayList<>(params); dp.add(size); dp.add(page * size);
        return ResponseEntity.ok(buildPage(jdbc.queryForList(sql, dp.toArray()), total != null ? total : 0, page, size));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        String now = LocalDateTime.now().toString();
        jdbc.update(
            "INSERT INTO reports(report_type,report_name,period_start,period_end,report_status,requested_by_user_id,requested_at,is_deleted)"
            + " VALUES(?,?,?,?,?,?,?,0)",
            body.get("type"), body.get("name"), body.get("dateFrom"), body.get("dateTo"),
            "Queued", currentUser.getId(), now
        );
        Long id = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        auditService.log(currentUser, "REPORT_REQUESTED", "report", String.valueOf(id), "Report requested: " + body.get("name"), getIp(req));
        return ResponseEntity.status(201).body(Map.of("id", id, "status", "Queued"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE reports SET is_deleted=1 WHERE id=?", id);
        auditService.log(currentUser, "REPORT_DELETED", "report", String.valueOf(id), "Report deleted", getIp(req));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> cancel(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE reports SET report_status='Cancelled' WHERE id=? AND report_status IN ('Queued','Processing')", id);
        auditService.log(currentUser, "REPORT_CANCELLED", "report", String.valueOf(id), "Report cancelled", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> retry(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE reports SET report_status='Queued' WHERE id=? AND report_status='Failed'", id);
        auditService.log(currentUser, "REPORT_RETRIED", "report", String.valueOf(id), "Report retried", getIp(req));
        return ResponseEntity.ok().build();
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
