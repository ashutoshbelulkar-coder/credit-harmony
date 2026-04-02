package com.hcb.platform.controller;

import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.ApprovalQueueService;
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
import java.util.Locale;

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
    private final ApprovalQueueService approvalQueueService;

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
        if (search != null && !search.isBlank()) {
            where.append(" AND c.consortium_name LIKE ?");
            params.add("%" + search + "%");
        }
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND lower(c.consortium_status)=lower(?)");
            params.add(status);
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM consortiums c " + where, Long.class, params.toArray());
        String sql = "SELECT c.id, c.consortium_name as name, c.consortium_type as type, c.consortium_status as status,"
            + " c.description as description, c.governance_model as governanceModel,"
            + " c.data_visibility as dataVisibility,"
            + " (SELECT COUNT(*) FROM consortium_members cm WHERE cm.consortium_id=c.id) as membersCount,"
            + " c.created_at as createdAt"
            + " FROM consortiums c " + where + " ORDER BY c.consortium_name LIMIT ? OFFSET ?";
        List<Object> dp = new ArrayList<>(params);
        dp.add(size);
        dp.add(page * size);
        return ResponseEntity.ok(buildPage(jdbc.queryForList(sql, dp.toArray()), total != null ? total : 0, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT c.id, c.consortium_name as name, c.consortium_type as type, c.consortium_status as status,"
                + " c.description as description, c.governance_model as governanceModel,"
                + " c.data_visibility as dataVisibility,"
                + " (SELECT COUNT(*) FROM consortium_members cm WHERE cm.consortium_id=c.id) as membersCount,"
                + " c.created_at as createdAt"
                + " FROM consortiums c WHERE c.id=? AND c.is_deleted=0",
            id
        );
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> members(@PathVariable Long id) {
        return ResponseEntity.ok(jdbc.queryForList(
            "SELECT cm.id, i.id as institutionId, i.name as institutionName,"
                + " cm.joined_at as joinedAt"
                + " FROM consortium_members cm JOIN institutions i ON i.id=cm.institution_id"
                + " WHERE cm.consortium_id=?",
            id
        ));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        String name = body.get("name") != null ? String.valueOf(body.get("name")) : "";
        String code = body.get("code") != null && !String.valueOf(body.get("code")).isBlank()
            ? String.valueOf(body.get("code"))
            : "CONS_" + System.currentTimeMillis();
        String type = body.get("type") != null ? String.valueOf(body.get("type")) : "Closed";
        String purpose = body.get("purpose") != null ? String.valueOf(body.get("purpose")) : null;
        String description = body.get("description") != null ? String.valueOf(body.get("description")) : null;
        Object gov = body.get("governanceModel");
        String governanceModel = gov != null ? String.valueOf(gov) : null;
        String statusRaw = body.get("status") != null
            ? String.valueOf(body.get("status")).trim().toLowerCase(Locale.ROOT) : "";
        boolean skipApprovalQueue = "active".equals(statusRaw);
        String consortiumStatus = skipApprovalQueue ? "active" : "pending";
        String dataVisibility = extractDataVisibility(body.get("dataPolicy"));
        String now = LocalDateTime.now().toString();
        jdbc.update(
            "INSERT INTO consortiums(consortium_code,consortium_name,consortium_type,consortium_status,"
                + "purpose,governance_model,description,data_visibility,created_at,updated_at,"
                + "share_loan_data,share_repayment_history,allow_aggregation,is_deleted)"
                + " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0)",
            code,
            name,
            type,
            consortiumStatus,
            purpose,
            governanceModel,
            description,
            dataVisibility,
            now,
            now,
            0,
            0,
            0
        );
        Long newId = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        int memberCount = 0;
        Object membersObj = body.get("members");
        if (membersObj instanceof List<?> list) {
            for (Object o : list) {
                if (!(o instanceof Map<?, ?> m)) {
                    continue;
                }
                Object iid = m.get("institutionId");
                if (iid == null) {
                    continue;
                }
                long institutionPk;
                try {
                    institutionPk = Long.parseLong(String.valueOf(iid).trim(), 10);
                } catch (NumberFormatException e) {
                    continue;
                }
                jdbc.update(
                    """
                        INSERT INTO consortium_members (consortium_id, institution_id, member_role, consortium_member_status, joined_at)
                        VALUES (?, ?, 'Consumer', 'pending', ?)
                        """,
                    newId,
                    institutionPk,
                    now
                );
                memberCount++;
            }
        }
        if (!skipApprovalQueue) {
            String desc = description != null && !description.isBlank()
                ? description.trim()
                : "New consortium · " + memberCount + " member(s)";
            approvalQueueService.enqueue(
                "consortium",
                String.valueOf(newId),
                name,
                desc,
                currentUser != null ? currentUser.getId() : null
            );
        }
        auditService.log(currentUser, "CONSORTIUM_CREATED", "consortium", String.valueOf(newId),
            "Consortium created: " + name, getIp(req));
        Integer totalMembers = jdbc.queryForObject(
            "SELECT COUNT(*) FROM consortium_members WHERE consortium_id=?",
            Integer.class,
            newId
        );
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", String.valueOf(newId));
        out.put("name", name);
        out.put("status", consortiumStatus);
        out.put("membersCount", totalMembers != null ? totalMembers : memberCount);
        out.put("description", description);
        out.put("dataVisibility", dataVisibility);
        out.put("createdAt", now);
        return ResponseEntity.status(201).body(out);
    }

    private static String extractDataVisibility(Object dataPolicy) {
        if (!(dataPolicy instanceof Map<?, ?> dp)) {
            return null;
        }
        Object v = dp.get("dataVisibility");
        if (v == null) {
            return null;
        }
        String s = String.valueOf(v).trim();
        if ("full".equals(s) || "masked_pii".equals(s) || "derived".equals(s)) {
            return s;
        }
        return null;
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> update(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        String dataVisibility = extractDataVisibility(body.get("dataPolicy"));
        String description = body.get("description") != null ? String.valueOf(body.get("description")) : null;
        Object gov = body.get("governanceModel");
        String governanceModel = gov != null ? String.valueOf(gov) : null;
        jdbc.update(
            "UPDATE consortiums SET consortium_name=COALESCE(?,consortium_name),"
                + " consortium_status=COALESCE(?,consortium_status),"
                + " data_visibility=COALESCE(?,data_visibility),"
                + " governance_model=COALESCE(?,governance_model),"
                + " description=COALESCE(?,description),"
                + " updated_at=? WHERE id=?",
            body.get("name") != null ? String.valueOf(body.get("name")) : null,
            body.get("status") != null ? String.valueOf(body.get("status")) : null,
            dataVisibility,
            governanceModel,
            description,
            LocalDateTime.now().toString(),
            id
        );

        // Replace members when provided (wizard edit flow).
        Object membersObj = body.get("members");
        if (membersObj instanceof List<?> list) {
            jdbc.update("DELETE FROM consortium_members WHERE consortium_id=?", id);
            String now = LocalDateTime.now().toString();
            for (Object o : list) {
                if (!(o instanceof Map<?, ?> m)) continue;
                Object iid = m.get("institutionId");
                if (iid == null) continue;
                long institutionPk;
                try {
                    institutionPk = Long.parseLong(String.valueOf(iid).trim(), 10);
                } catch (NumberFormatException e) {
                    continue;
                }
                jdbc.update(
                    """
                        INSERT INTO consortium_members (consortium_id, institution_id, member_role, consortium_member_status, joined_at)
                        VALUES (?, ?, 'Consumer', 'active', ?)
                        """,
                    id,
                    institutionPk,
                    now
                );
            }
        }

        auditService.log(currentUser, "CONSORTIUM_UPDATED", "consortium", String.valueOf(id), "Consortium updated", getIp(req));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        jdbc.update(
            "UPDATE consortiums SET is_deleted=1, deleted_at=? WHERE id=?",
            LocalDateTime.now().toString(),
            id
        );
        auditService.log(currentUser, "CONSORTIUM_DELETED", "consortium", String.valueOf(id), "Consortium deleted", getIp(req));
        return ResponseEntity.noContent().build();
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
