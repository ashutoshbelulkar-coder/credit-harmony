package com.hcb.platform.controller;

import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.UserRepository;
import com.hcb.platform.schemamapper.SchemaMapperStateService;
import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
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
    private final UserRepository userRepository;
    private final ObjectProvider<SchemaMapperStateService> schemaMapperState;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (type != null && !type.isBlank() && !"all".equalsIgnoreCase(type)) {
            where.append(" AND aq.approval_item_type=?");
            params.add(type);
        }
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND aq.approval_workflow_status=?");
            params.add(status);
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM approval_queue aq " + where, Long.class, params.toArray());
        String sql = "SELECT aq.id, aq.approval_item_type as type, aq.entity_ref_id as entityRefId, aq.entity_name_snapshot as name,"
            + " aq.description, u.email as submittedBy, aq.submitted_at as submittedAt,"
            + " aq.approval_workflow_status as status, rv.email as reviewedBy, aq.reviewed_at as reviewedAt,"
            + " aq.rejection_reason as rejectionReason"
            + " FROM approval_queue aq"
            + " LEFT JOIN users u ON u.id=aq.submitted_by_user_id"
            + " LEFT JOIN users rv ON rv.id=aq.reviewed_by_user_id"
            + " " + where + " ORDER BY aq.submitted_at DESC LIMIT ? OFFSET ?";
        List<Object> dp = new ArrayList<>(params);
        dp.add(size);
        dp.add(page * size);
        List<Map<String, Object>> raw = jdbc.queryForList(sql, dp.toArray());
        Map<String, long[]> membershipInstConsortium = loadMembershipInstitutionConsortiumIds(raw);
        List<Map<String, Object>> content = new ArrayList<>(raw.size());
        for (Map<String, Object> row : raw) {
            Map<String, Object> out = new LinkedHashMap<>(row);
            Object ido = out.get("id");
            out.put("id", ido != null ? String.valueOf(ido) : "");
            String itemType = out.get("type") != null ? out.get("type").toString() : "";
            Object refObj = out.remove("entityRefId");
            String ref = refObj != null ? refObj.toString().trim() : "";
            Map<String, String> metadata = buildMetadata(itemType, ref);
            long[] ic = membershipInstConsortium.get(ref);
            if ("consortium_membership".equals(itemType) && ic != null) {
                metadata.put("institutionId", String.valueOf(ic[0]));
                metadata.put("consortiumId", String.valueOf(ic[1]));
            }
            out.put("metadata", metadata);
            content.add(out);
        }
        return ResponseEntity.ok(buildPage(content, total != null ? total : 0, page, size));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> approve(
        @PathVariable Long id,
        @RequestBody(required = false) Map<String, Object> body,
        @AuthenticationPrincipal Object principal,
        HttpServletRequest req
    ) {
        User actor = resolveUserForAudit(principal);
        ApprovalRow row = loadApprovalRow(id);
        String now = LocalDateTime.now().toString();
        jdbc.update(
            "UPDATE approval_queue SET approval_workflow_status='approved', reviewed_by_user_id=?, reviewed_at=? WHERE id=?",
            actor.getId(), now, id
        );
        auditService.log(actor, "APPROVAL_APPROVED", "approval_queue", String.valueOf(id), "Item approved", getIp(req));
        syncSchemaMappingIfNeeded(row, "approved");
        syncInstitutionApprovalOutcome(row, "approved");
        syncProductApprovalOutcome(row, "approved");
        syncConsortiumApprovalOutcome(row, "approved");
        syncConsortiumMembershipApprovalOutcome(row, "approved");
        syncAlertRuleApprovalOutcome(row, "approved");
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> reject(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Object principal,
        HttpServletRequest req
    ) {
        User actor = resolveUserForAudit(principal);
        ApprovalRow row = loadApprovalRow(id);
        String now = LocalDateTime.now().toString();
        jdbc.update(
            "UPDATE approval_queue SET approval_workflow_status='rejected', reviewed_by_user_id=?, reviewed_at=?, rejection_reason=? WHERE id=?",
            actor.getId(), now, body.get("reason"), id
        );
        auditService.log(actor, "APPROVAL_REJECTED", "approval_queue", String.valueOf(id), "Item rejected", getIp(req));
        syncSchemaMappingIfNeeded(row, "rejected");
        syncProductApprovalOutcome(row, "rejected");
        syncConsortiumApprovalOutcome(row, "rejected");
        syncConsortiumMembershipApprovalOutcome(row, "rejected");
        syncAlertRuleApprovalOutcome(row, "rejected");
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/request-changes")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> requestChanges(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal Object principal,
        HttpServletRequest req
    ) {
        User actor = resolveUserForAudit(principal);
        ApprovalRow row = loadApprovalRow(id);
        String now = LocalDateTime.now().toString();
        jdbc.update(
            "UPDATE approval_queue SET approval_workflow_status='changes_requested', reviewed_by_user_id=?, reviewed_at=?, rejection_reason=? WHERE id=?",
            actor.getId(), now, body.get("comment"), id
        );
        auditService.log(actor, "APPROVAL_CHANGES_REQUESTED", "approval_queue", String.valueOf(id), "Changes requested", getIp(req));
        syncSchemaMappingIfNeeded(row, "changes_requested");
        syncProductApprovalOutcome(row, "changes_requested");
        syncConsortiumApprovalOutcome(row, "changes_requested");
        syncConsortiumMembershipApprovalOutcome(row, "changes_requested");
        syncAlertRuleApprovalOutcome(row, "changes_requested");
        return ResponseEntity.noContent().build();
    }

    private Map<String, long[]> loadMembershipInstitutionConsortiumIds(List<Map<String, Object>> raw) {
        LinkedHashSet<Long> idSet = new LinkedHashSet<>();
        for (Map<String, Object> row : raw) {
            String t = row.get("type") != null ? row.get("type").toString() : "";
            if (!"consortium_membership".equals(t)) {
                continue;
            }
            Object ref = row.get("entityRefId");
            if (ref == null) {
                continue;
            }
            try {
                idSet.add(Long.parseLong(ref.toString().trim(), 10));
            } catch (NumberFormatException ignored) {
            }
        }
        if (idSet.isEmpty()) {
            return Map.of();
        }
        StringBuilder in = new StringBuilder();
        int i = 0;
        for (Long id : idSet) {
            if (i++ > 0) {
                in.append(',');
            }
            in.append(id);
        }
        List<Map<String, Object>> mrows = jdbc.queryForList(
            "SELECT id, institution_id, consortium_id FROM consortium_members WHERE id IN (" + in + ")");
        Map<String, long[]> out = new HashMap<>();
        for (Map<String, Object> m : mrows) {
            Object ido = m.get("id");
            Object iid = m.get("institution_id");
            Object cid = m.get("consortium_id");
            if (ido == null || iid == null || cid == null) {
                continue;
            }
            long inst = ((Number) iid).longValue();
            long cons = ((Number) cid).longValue();
            out.put(String.valueOf(((Number) ido).longValue()), new long[] { inst, cons });
        }
        return out;
    }

    private static Map<String, String> buildMetadata(String itemType, String entityRefId) {
        Map<String, String> m = new LinkedHashMap<>();
        if (entityRefId == null || entityRefId.isBlank()) {
            return m;
        }
        switch (itemType) {
            case "institution" -> m.put("institutionId", entityRefId);
            case "schema_mapping" -> m.put("mappingId", entityRefId);
            case "product" -> m.put("productId", entityRefId);
            case "consortium" -> m.put("consortiumId", entityRefId);
            case "consortium_membership" -> m.put("membershipId", entityRefId);
            case "alert_rule" -> m.put("alertRuleId", entityRefId);
            default -> {
            }
        }
        return m;
    }

    private ApprovalRow loadApprovalRow(long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT approval_item_type, entity_ref_id FROM approval_queue WHERE id=?", id
        );
        if (rows.isEmpty()) {
            return new ApprovalRow(null, null);
        }
        Map<String, Object> m = rows.get(0);
        return new ApprovalRow(
            m.get("approval_item_type") != null ? m.get("approval_item_type").toString() : null,
            m.get("entity_ref_id") != null ? m.get("entity_ref_id").toString() : null
        );
    }

    private void syncSchemaMappingIfNeeded(ApprovalRow row, String decision) {
        if (!"schema_mapping".equals(row.type()) || row.entityRefId() == null || row.entityRefId().isBlank()) {
            return;
        }
        SchemaMapperStateService sm = schemaMapperState.getIfAvailable();
        if (sm != null) {
            sm.applyExternalApprovalDecision(row.entityRefId(), decision);
        }
    }

    /** When an institution registration is approved, activate the member (legacy Fastify parity). */
    private void syncInstitutionApprovalOutcome(ApprovalRow row, String decision) {
        if (!"institution".equals(row.type()) || row.entityRefId() == null || row.entityRefId().isBlank()) {
            return;
        }
        if (!"approved".equals(decision)) {
            return;
        }
        long instId;
        try {
            instId = Long.parseLong(row.entityRefId().trim(), 10);
        } catch (NumberFormatException e) {
            return;
        }
        jdbc.update(
            """
                UPDATE institutions
                SET institution_lifecycle_status='active',
                    onboarded_at=COALESCE(onboarded_at, datetime('now')),
                    updated_at=datetime('now')
                WHERE id=? AND is_deleted=0
                """,
            instId
        );
    }

    private void syncProductApprovalOutcome(ApprovalRow row, String decision) {
        if (!"product".equals(row.type()) || row.entityRefId() == null || row.entityRefId().isBlank()) {
            return;
        }
        long pid;
        try {
            pid = Long.parseLong(row.entityRefId().trim(), 10);
        } catch (NumberFormatException e) {
            return;
        }
        String now = LocalDateTime.now().toString();
        if ("approved".equals(decision)) {
            jdbc.update(
                "UPDATE products SET product_status='active', updated_at=? WHERE id=? AND is_deleted=0",
                now,
                pid
            );
        } else if ("rejected".equals(decision) || "changes_requested".equals(decision)) {
            jdbc.update(
                "UPDATE products SET product_status='draft', updated_at=? WHERE id=? AND is_deleted=0",
                now,
                pid
            );
        }
    }

    /**
     * Pending join via {@code POST /institutions/{id}/consortium-memberships}: {@code entity_ref_id} is
     * {@code consortium_members.id}. Approve activates the row; reject/request-changes removes it.
     */
    private void syncConsortiumMembershipApprovalOutcome(ApprovalRow row, String decision) {
        if (!"consortium_membership".equals(row.type()) || row.entityRefId() == null || row.entityRefId().isBlank()) {
            return;
        }
        long mid;
        try {
            mid = Long.parseLong(row.entityRefId().trim(), 10);
        } catch (NumberFormatException e) {
            return;
        }
        if ("approved".equals(decision)) {
            jdbc.update(
                "UPDATE consortium_members SET consortium_member_status='active' WHERE id=?",
                mid
            );
        } else if ("rejected".equals(decision) || "changes_requested".equals(decision)) {
            jdbc.update("DELETE FROM consortium_members WHERE id=?", mid);
        }
    }

    private void syncConsortiumApprovalOutcome(ApprovalRow row, String decision) {
        if (!"consortium".equals(row.type()) || row.entityRefId() == null || row.entityRefId().isBlank()) {
            return;
        }
        long cid;
        try {
            cid = Long.parseLong(row.entityRefId().trim(), 10);
        } catch (NumberFormatException e) {
            return;
        }
        String now = LocalDateTime.now().toString();
        if ("approved".equals(decision)) {
            jdbc.update(
                "UPDATE consortiums SET consortium_status='active', updated_at=? WHERE id=? AND is_deleted=0",
                now,
                cid
            );
        } else if ("rejected".equals(decision) || "changes_requested".equals(decision)) {
            jdbc.update(
                "UPDATE consortiums SET consortium_status='pending', updated_at=? WHERE id=? AND is_deleted=0",
                now,
                cid
            );
        }
    }

    private void syncAlertRuleApprovalOutcome(ApprovalRow row, String decision) {
        if (!"alert_rule".equals(row.type()) || row.entityRefId() == null || row.entityRefId().isBlank()) {
            return;
        }
        long rid;
        try {
            rid = Long.parseLong(row.entityRefId().trim(), 10);
        } catch (NumberFormatException e) {
            return;
        }
        String now = LocalDateTime.now().toString();
        if ("approved".equals(decision)) {
            jdbc.update(
                "UPDATE alert_rules SET alert_rule_status='enabled', updated_at=? WHERE id=? AND is_deleted=0",
                now,
                rid
            );
        } else if ("rejected".equals(decision) || "changes_requested".equals(decision)) {
            jdbc.update(
                "UPDATE alert_rules SET alert_rule_status='disabled', updated_at=? WHERE id=? AND is_deleted=0",
                now,
                rid
            );
        }
    }

    private record ApprovalRow(String type, String entityRefId) {
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

    /**
     * JWT filter sets {@link AuthUserPrincipal}; tests may use {@link User} directly.
     */
    private User resolveUserForAudit(Object principal) {
        if (principal instanceof User u) {
            return u;
        }
        if (principal instanceof AuthUserPrincipal a) {
            return userRepository.getReferenceById(a.getId());
        }
        throw new IllegalStateException("Unsupported authentication principal");
    }
}
