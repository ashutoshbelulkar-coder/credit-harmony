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

import java.util.*;

/**
 * Batch Job Controller
 * - GET /api/v1/batch-jobs                 — paged batch job list
 * - GET /api/v1/batch-jobs/kpis            — batch KPI aggregates
 * - GET /api/v1/batch-jobs/{id}            — single job detail
 * - GET /api/v1/batch-jobs/{id}/detail     — job with stage details
 * - POST /api/v1/batch-jobs/{id}/retry     — requeue a failed job
 * - POST /api/v1/batch-jobs/{id}/cancel    — cancel a queued/running job
 */
@RestController
@RequestMapping("/api/v1/batch-jobs")
@RequiredArgsConstructor
public class BatchJobController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String institutionId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE bj.is_deleted = 0");
        List<Object> params = new ArrayList<>();
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND bj.batch_status = ?"); params.add(status);
        }
        if (institutionId != null && !institutionId.isBlank() && !"all".equalsIgnoreCase(institutionId)) {
            where.append(" AND bj.institution_id = ?"); params.add(Long.parseLong(institutionId));
        }

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM batch_jobs bj " + where, Long.class, params.toArray());

        String sql = "SELECT bj.id as batchId, bj.file_name as fileName, bj.batch_status as status,"
            + " bj.total_records as totalRecords, bj.success_records as successRecords,"
            + " bj.failed_records as failedRecords, bj.success_rate as successRate,"
            + " bj.duration_seconds as durationSeconds, bj.uploaded_at as uploadedAt,"
            + " u.email as uploadedBy"
            + " FROM batch_jobs bj LEFT JOIN users u ON u.id = bj.uploaded_by_user_id"
            + " " + where + " ORDER BY bj.uploaded_at DESC LIMIT ? OFFSET ?";
        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(size); dataParams.add(page * size);

        List<Map<String, Object>> content = jdbc.queryForList(sql, dataParams.toArray());
        return ResponseEntity.ok(buildPage(content, total != null ? total : 0, page, size));
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> kpis() {
        Map<String, Object> k = new LinkedHashMap<>();
        Long totalBatches = jdbc.queryForObject("SELECT COUNT(*) FROM batch_jobs WHERE is_deleted=0", Long.class);
        Long totalRecords = jdbc.queryForObject("SELECT COALESCE(SUM(total_records),0) FROM batch_jobs WHERE is_deleted=0", Long.class);
        Double avgRate = jdbc.queryForObject("SELECT COALESCE(AVG(success_rate),0) FROM batch_jobs WHERE is_deleted=0", Double.class);
        Long failedBatches = jdbc.queryForObject("SELECT COUNT(*) FROM batch_jobs WHERE is_deleted=0 AND success_rate < 95", Long.class);
        k.put("totalBatches", totalBatches != null ? totalBatches : 0);
        k.put("totalRecordsProcessed", totalRecords != null ? totalRecords : 0);
        k.put("avgBatchSuccessRate", avgRate != null ? Math.round(avgRate * 10.0) / 10.0 : 0.0);
        k.put("failedBatchesCount", failedBatches != null ? failedBatches : 0);
        return ResponseEntity.ok(k);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT bj.*, u.email as uploadedBy FROM batch_jobs bj LEFT JOIN users u ON u.id = bj.uploaded_by_user_id WHERE bj.id=? AND bj.is_deleted=0", id);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Long id) {
        List<Map<String, Object>> stages = jdbc.queryForList(
            "SELECT * FROM batch_stage_logs WHERE batch_job_id=? ORDER BY stage_order", id);
        List<Map<String, Object>> errors = jdbc.queryForList(
            "SELECT * FROM batch_error_samples WHERE batch_job_id=? LIMIT 20", id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("stages", stages);
        result.put("errorSamples", errors);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> retry(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        int updated = jdbc.update("UPDATE batch_jobs SET batch_status='Queued' WHERE id=? AND batch_status='Failed'", id);
        if (updated == 0) return ResponseEntity.badRequest().build();
        auditService.log(currentUser, "BATCH_RETRIED", "batch_job", String.valueOf(id), "Batch job queued for retry", getIp(req));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> cancel(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        int updated = jdbc.update("UPDATE batch_jobs SET batch_status='Cancelled' WHERE id=? AND batch_status IN ('Queued','Processing')", id);
        if (updated == 0) return ResponseEntity.badRequest().build();
        auditService.log(currentUser, "BATCH_CANCELLED", "batch_job", String.valueOf(id), "Batch job cancelled", getIp(req));
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
