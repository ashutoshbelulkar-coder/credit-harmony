package com.hcb.platform.controller;

import com.hcb.platform.model.entity.Institution;
import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.InstitutionRepository;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Institution Controller — Full CRUD + Action APIs
 * All mutations: update source-of-truth institutions table only
 * All mutations: generate audit_log entries
 */
@RestController
@RequestMapping("/api/v1/institutions")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionRepository institutionRepository;
    private final AuditService auditService;
    private final JdbcTemplate jdbc;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Page<Institution>> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String jurisdiction,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Page<Institution> result = institutionRepository.findAllActive(
            status, type, jurisdiction,
            PageRequest.of(page, size, Sort.by("name").ascending())
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Institution> get(@PathVariable Long id) {
        return institutionRepository.findByIdAndIsDeletedFalse(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Institution> create(
        @RequestBody Institution institution,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest request
    ) {
        institution.setInstitutionLifecycleStatus("draft");
        institution.setDeleted(false);
        Institution saved = institutionRepository.save(institution);
        auditService.log(currentUser, "INSTITUTION_CREATED", "institution",
            String.valueOf(saved.getId()),
            "Institution registered: " + saved.getName(),
            getClientIp(request));
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Institution> update(
        @PathVariable Long id,
        @RequestBody Institution updates,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest request
    ) {
        return institutionRepository.findByIdAndIsDeletedFalse(id).map(inst -> {
            inst.setName(updates.getName());
            inst.setTradingName(updates.getTradingName());
            inst.setContactEmail(updates.getContactEmail());
            inst.setContactPhone(updates.getContactPhone());
            inst.setBillingModel(updates.getBillingModel());
            inst.setCreditBalance(updates.getCreditBalance());
            Institution saved = institutionRepository.save(inst);
            auditService.log(currentUser, "INSTITUTION_UPDATED", "institution",
                String.valueOf(id), "Institution updated", getClientIp(request));
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest request
    ) {
        return institutionRepository.findByIdAndIsDeletedFalse(id).map(inst -> {
            inst.setDeleted(true);
            inst.setDeletedAt(LocalDateTime.now());
            institutionRepository.save(inst);
            auditService.log(currentUser, "INSTITUTION_DELETED", "institution",
                String.valueOf(id), "Institution soft-deleted", getClientIp(request));
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, String>> suspend(
        @PathVariable Long id,
        @RequestBody(required = false) Map<String, String> body,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest request
    ) {
        return institutionRepository.findByIdAndIsDeletedFalse(id).map(inst -> {
            if (!"active".equals(inst.getInstitutionLifecycleStatus())) {
                return ResponseEntity.badRequest()
                    .<Map<String, String>>body(Map.of("error", "Institution must be active to suspend"));
            }
            inst.setInstitutionLifecycleStatus("suspended");
            institutionRepository.save(inst);
            String reason = (body != null) ? body.getOrDefault("reason", "No reason provided") : "No reason provided";
            auditService.log(currentUser, "INSTITUTION_SUSPENDED", "institution",
                String.valueOf(id), "Suspended: " + reason, getClientIp(request));
            return ResponseEntity.ok(Map.of("status", "suspended"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, String>> reactivate(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest request
    ) {
        return institutionRepository.findByIdAndIsDeletedFalse(id).map(inst -> {
            if (!"suspended".equals(inst.getInstitutionLifecycleStatus())) {
                return ResponseEntity.badRequest()
                    .<Map<String, String>>body(Map.of("error", "Institution must be suspended to reactivate"));
            }
            inst.setInstitutionLifecycleStatus("active");
            institutionRepository.save(inst);
            auditService.log(currentUser, "INSTITUTION_REACTIVATED", "institution",
                String.valueOf(id), "Institution reactivated", getClientIp(request));
            return ResponseEntity.ok(Map.of("status", "active"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Institution-scoped sub-resource endpoints ────────────────────────────

    /**
     * GET /api/v1/institutions/{id}/consortium-memberships
     * Returns consortiums the institution belongs to via consortium_members JOIN consortiums.
     */
    @GetMapping("/{id}/consortium-memberships")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> consortiumMemberships(@PathVariable Long id) {
        String sql = """
            SELECT cm.id AS membership_id, cm.consortium_id,
                   c.consortium_name, c.consortium_type, c.consortium_status,
                   cm.member_role, cm.consortium_member_status, cm.joined_at
            FROM consortium_members cm
            JOIN consortiums c ON c.id = cm.consortium_id
            WHERE cm.institution_id = ?
            ORDER BY cm.joined_at DESC
            """;
        List<Map<String, Object>> rows = jdbc.queryForList(sql, id);
        return ResponseEntity.ok(rows);
    }

    /**
     * GET /api/v1/institutions/{id}/product-subscriptions
     * Returns data products the institution has subscribed to.
     */
    @GetMapping("/{id}/product-subscriptions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> productSubscriptions(@PathVariable Long id) {
        String sql = """
            SELECT ps.id AS subscription_id, ps.product_id,
                   p.product_name, p.product_status,
                   p.pricing_model, ps.subscribed_at, ps.subscription_status
            FROM product_subscriptions ps
            JOIN products p ON p.id = ps.product_id
            WHERE ps.institution_id = ?
            ORDER BY ps.subscribed_at DESC
            """;
        List<Map<String, Object>> rows = jdbc.queryForList(sql, id);
        return ResponseEntity.ok(rows);
    }

    /**
     * GET /api/v1/institutions/{id}/billing-summary
     * Aggregates billing information from institution and product_subscriptions.
     */
    @GetMapping("/{id}/billing-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> billingSummary(@PathVariable Long id) {
        Map<String, Object> summary = new LinkedHashMap<>();

        // Credit balance and billing model from institution
        List<Map<String, Object>> instRows = jdbc.queryForList(
            "SELECT billing_model, credit_balance FROM institutions WHERE id = ? AND is_deleted = 0", id);
        if (instRows.isEmpty()) return ResponseEntity.notFound().build();
        summary.putAll(instRows.get(0));

        // Active subscriptions count
        Long activeSubs = jdbc.queryForObject(
            "SELECT COUNT(*) FROM product_subscriptions WHERE institution_id = ? AND subscription_status = 'active'",
            Long.class, id);
        summary.put("activeSubscriptions", activeSubs != null ? activeSubs : 0);

        // API usage last 30 days
        Long apiCalls30d = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE institution_id = ? AND occurred_at >= datetime('now','-30 days')",
            Long.class, id);
        summary.put("apiCalls30d", apiCalls30d != null ? apiCalls30d : 0);

        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/v1/institutions/{id}/monitoring-summary
     * Aggregates monitoring KPIs from api_requests and batch_jobs for this institution.
     */
    @GetMapping("/{id}/monitoring-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> monitoringSummary(@PathVariable Long id) {
        Map<String, Object> summary = new LinkedHashMap<>();

        // API requests last 30 days
        Map<String, Object> apiStats = jdbc.queryForMap(
            "SELECT COUNT(*) AS total_requests, " +
            "SUM(CASE WHEN api_request_status='success' THEN 1 ELSE 0 END) AS successful_requests, " +
            "ROUND(AVG(response_time_ms),1) AS avg_latency_ms " +
            "FROM api_requests WHERE institution_id = ? AND occurred_at >= datetime('now','-30 days')", id);
        summary.putAll(apiStats);

        long total = apiStats.get("total_requests") instanceof Number n ? n.longValue() : 0L;
        long success = apiStats.get("successful_requests") instanceof Number n ? n.longValue() : 0L;
        summary.put("successRatePct", total > 0 ? Math.round((success * 1000.0) / total) / 10.0 : 0.0);

        // Batch jobs last 30 days
        Map<String, Object> batchStats = jdbc.queryForMap(
            "SELECT COUNT(*) AS total_batches, " +
            "SUM(CASE WHEN batch_job_status IN ('queued','processing') THEN 1 ELSE 0 END) AS active_batches, " +
            "COALESCE(SUM(total_records),0) AS total_records " +
            "FROM batch_jobs WHERE institution_id = ? AND uploaded_at >= datetime('now','-30 days')", id);
        summary.putAll(batchStats);

        return ResponseEntity.ok(summary);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        return (xff != null && !xff.isBlank()) ? xff.split(",")[0].trim() : request.getRemoteAddr();
    }
}
