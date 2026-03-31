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
        StringBuilder where = new StringBuilder("WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (type != null && !type.isBlank()) {
            where.append(" AND r.report_type=?");
            params.add(type);
        }
        if (status != null && !status.isBlank()) {
            where.append(" AND lower(r.report_status)=lower(?)");
            params.add(status);
        }
        if (dateFrom != null && !dateFrom.isBlank()) {
            where.append(" AND date(r.requested_at)>=date(?)");
            params.add(dateFrom);
        }
        if (dateTo != null && !dateTo.isBlank()) {
            where.append(" AND date(r.requested_at)<=date(?)");
            params.add(dateTo);
        }

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM reports r " + where, Long.class, params.toArray());
        String sql = "SELECT r.id, r.report_type as type, r.report_type as name,"
            + " r.report_status as status, r.date_range_start as dateFrom, r.date_range_end as dateTo,"
            + " u.email as requestedBy, r.requested_at as requestedAt, r.completed_at as completedAt"
            + " FROM reports r LEFT JOIN users u ON u.id=r.requested_by_user_id"
            + " " + where + " ORDER BY r.requested_at DESC LIMIT ? OFFSET ?";
        List<Object> dp = new ArrayList<>(params);
        dp.add(size);
        dp.add(page * size);
        return ResponseEntity.ok(buildPage(jdbc.queryForList(sql, dp.toArray()), total != null ? total : 0, page, size));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        String now = LocalDateTime.now().toString();
        Object nameObj = body.get("name");
        Object typeObj = body.get("type");
        String reportType = nameObj != null && !String.valueOf(nameObj).isBlank()
            ? String.valueOf(nameObj)
            : (typeObj != null ? String.valueOf(typeObj) : "Report");
        jdbc.update(
            "INSERT INTO reports(report_type,date_range_start,date_range_end,report_status,requested_by_user_id,requested_at)"
                + " VALUES(?,?,?,?,?,?)",
            reportType,
            body.get("dateFrom"),
            body.get("dateTo"),
            "queued",
            currentUser.getId(),
            now
        );
        Long newId = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        auditService.log(currentUser, "REPORT_REQUESTED", "report", String.valueOf(newId),
            "Report requested: " + reportType, getIp(req));
        return ResponseEntity.status(201).body(Map.of("id", newId, "status", "queued"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        jdbc.update("DELETE FROM reports WHERE id=?", id);
        auditService.log(currentUser, "REPORT_DELETED", "report", String.valueOf(id), "Report deleted", getIp(req));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> cancel(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        // Schema CHECK allows only queued|processing|completed|failed — map cancel to failed
        jdbc.update(
            "UPDATE reports SET report_status='failed' WHERE id=? AND report_status IN ('queued','processing')",
            id
        );
        auditService.log(currentUser, "REPORT_CANCELLED", "report", String.valueOf(id), "Report cancelled", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> retry(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        jdbc.update("UPDATE reports SET report_status='queued' WHERE id=? AND report_status='failed'", id);
        auditService.log(currentUser, "REPORT_RETRIED", "report", String.valueOf(id), "Report retried", getIp(req));
        return ResponseEntity.ok().build();
    }

    private Map<String, Object> buildPage(List<Map<String, Object>> content, long total, int page, int size) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("content", content);
        p.put("totalElements", total);
        p.put("totalPages", size > 0 ? (int) Math.ceil((double) total / size) : 1);
        p.put("page", page);
        p.put("size", size);
        return p;
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
