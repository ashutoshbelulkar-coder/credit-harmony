package com.hcb.platform.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hcb.platform.model.entity.Institution;
import com.hcb.platform.repository.InstitutionRepository;
import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.ApprovalQueueService;
import com.hcb.platform.service.AuditService;
import com.hcb.platform.service.InstitutionRegisterFormService;
import com.hcb.platform.service.InstitutionRegistrationNumberGenerator;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
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

    private static final Logger log = LoggerFactory.getLogger(InstitutionController.class);

    private final InstitutionRepository institutionRepository;
    private final AuditService auditService;
    private final JdbcTemplate jdbc;
    private final InstitutionRegisterFormService registerFormService;
    private final ObjectMapper objectMapper;
    private final ApprovalQueueService approvalQueueService;

    /**
     * Register-member wizard configuration (SPA Step 1). Must stay ahead of /{id} routing.
     */
    @GetMapping("/form-metadata")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> formMetadata(@RequestParam(required = false) String geography) throws IOException {
        return ResponseEntity.ok(registerFormService.buildFormMetadata(geography));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Page<Institution>> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String jurisdiction,
        @RequestParam(required = false) String role,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        String roleParam = (role == null || role.isBlank() || "all".equalsIgnoreCase(role)) ? null : role.trim();
        Page<Institution> result = institutionRepository.findAllActive(
            status, type, jurisdiction, roleParam,
            PageRequest.of(page, size, Sort.by("name").ascending())
        );
        log.debug(
            "GET /institutions page={} size={} totalElements={} returnedIds={}",
            page,
            size,
            result.getTotalElements(),
            result.getContent().stream().map(Institution::getId).toList()
        );
        return ResponseEntity.ok(result);
    }

    /**
     * Member overview charts — last 30 days, scoped to this institution (API submissions + enquiries).
     */
    @GetMapping("/{id}/overview-charts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, List<Map<String, Object>>>> overviewCharts(@PathVariable Long id) {
        return institutionRepository.findByIdAndIsDeletedFalse(id)
            .map(i -> ResponseEntity.ok(buildInstitutionOverviewCharts(id)))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Register-member wizard: upload compliance file after POST /institutions (multipart: documentName, file).
     * Replaces any existing row with the same logical document_name for this institution.
     */
    @PostMapping("/{id}/documents")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadComplianceDocument(
        @PathVariable Long id,
        @RequestParam(value = "documentName", required = false) String documentName,
        @RequestParam("file") MultipartFile file,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) throws IOException {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "ERR_VALIDATION",
                "message", "File is required"));
        }
        String logicalName = documentName != null && !documentName.isBlank()
            ? documentName.trim()
            : "Document";
        String orig = file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank()
            ? file.getOriginalFilename()
            : "upload.bin";
        String mime = file.getContentType() != null && !file.getContentType().isBlank()
            ? file.getContentType()
            : "application/octet-stream";
        byte[] bytes = file.getBytes();
        if (bytes.length == 0) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "ERR_VALIDATION",
                "message", "File is required"));
        }

        jdbc.update("DELETE FROM compliance_documents WHERE institution_id = ? AND document_name = ?", id, logicalName);
        jdbc.update(
            """
                INSERT INTO compliance_documents (institution_id, document_name, document_status, original_file_name, mime_type, content_blob)
                VALUES (?, ?, 'pending', ?, ?, ?)
                """,
            id, logicalName, orig, mime, bytes);

        auditService.log(currentUser, "INSTITUTION_DOCUMENT_UPLOAD", "institution",
            String.valueOf(id), "Uploaded compliance document: " + logicalName, getClientIp(request));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("complianceDocs", complianceDocSummariesForInstitution(id));
        return ResponseEntity.status(201).body(body);
    }

    /**
     * Download stored compliance file (base64 JSON) — same contract as legacy Fastify.
     */
    @GetMapping("/{id}/documents/{documentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> getComplianceDocument(
        @PathVariable Long id,
        @PathVariable String documentId
    ) {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        long docPk;
        try {
            docPk = Long.parseLong(documentId.trim(), 10);
        } catch (NumberFormatException e) {
            return ResponseEntity.notFound().build();
        }
        List<Map<String, Object>> rows = jdbc.query(
            """
                SELECT document_name, original_file_name, mime_type, content_blob
                FROM compliance_documents
                WHERE institution_id = ? AND id = ?
                """,
            (rs, rowNum) -> {
                byte[] blob = rs.getBytes("content_blob");
                if (blob == null || blob.length == 0) {
                    return Collections.<String, Object>emptyMap();
                }
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name", rs.getString("document_name"));
                String fn = rs.getString("original_file_name");
                m.put("fileName", fn != null && !fn.isBlank() ? fn : "document");
                String mt = rs.getString("mime_type");
                m.put("mimeType", mt != null && !mt.isBlank() ? mt : "application/octet-stream");
                m.put("dataBase64", Base64.getEncoder().encodeToString(blob));
                return m;
            },
            id, docPk);
        if (rows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> payload = rows.get(0);
        if (!payload.containsKey("dataBase64")) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(payload);
    }

    private List<Map<String, Object>> complianceDocSummariesForInstitution(long institutionId) {
        return jdbc.query(
            """
                SELECT id, document_name, document_status, uploaded_at, original_file_name, mime_type
                FROM compliance_documents
                WHERE institution_id = ?
                ORDER BY id
                """,
            (rs, rowNum) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", String.valueOf(rs.getLong("id")));
                m.put("name", rs.getString("document_name"));
                m.put("status", rs.getString("document_status"));
                m.put("fileName", rs.getString("original_file_name"));
                m.put("mimeType", rs.getString("mime_type"));
                m.put("uploadedAt", rs.getString("uploaded_at"));
                return m;
            },
            institutionId);
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
    @Transactional
    public ResponseEntity<Institution> create(
        @RequestBody Institution institution,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        institution.setInstitutionLifecycleStatus("pending");
        institution.setDeleted(false);
        validateParticipationRoles(institution);

        // Non-blank registrationNumber from client is kept; omit/null/blank → assign after first save (uses id).
        boolean autoReg = InstitutionRegistrationNumberGenerator.shouldAutoAssign(institution.getRegistrationNumber());
        if (autoReg) {
            institution.setRegistrationNumber(InstitutionRegistrationNumberGenerator.placeholderRegistrationNumber());
        }

        Institution saved = institutionRepository.save(institution);

        if (autoReg) {
            String finalReg = InstitutionRegistrationNumberGenerator.buildFinalRegistrationNumber(
                saved.getInstitutionType(),
                saved.getName(),
                saved.getId()
            );
            if (!finalReg.equals(saved.getRegistrationNumber())) {
                saved.setRegistrationNumber(finalReg);
                saved = institutionRepository.save(saved);
            }
        }

        approvalQueueService.enqueue(
            "institution",
            String.valueOf(saved.getId()),
            institutionDisplayLabelForApproval(saved),
            buildInstitutionRegistrationDescription(saved),
            currentUser != null ? currentUser.getId() : null
        );
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
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
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

    /**
     * Partial update — SPA uses PATCH; aligns with Fastify contract.
     */
    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Institution> patch(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        return institutionRepository.findByIdAndIsDeletedFalse(id).map(inst -> {
            applyInstitutionPatch(inst, body);
            validateParticipationRoles(inst);
            Institution saved = institutionRepository.save(inst);
            auditService.log(currentUser, "INSTITUTION_UPDATED", "institution",
                String.valueOf(id), "Institution patched", getClientIp(request));
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
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
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
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
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
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

    @GetMapping("/{id}/consortium-memberships")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> consortiumMemberships(@PathVariable Long id) {
        return ResponseEntity.ok(listConsortiumMembershipRowsCamel(id));
    }

    @PostMapping("/{id}/consortium-memberships")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<?> createConsortiumMembership(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        String consortiumIdRaw = Objects.toString(body.get("consortiumId"), "").trim();
        if (consortiumIdRaw.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "ERR_VALIDATION", "message", "consortiumId is required"));
        }
        long consortiumPk;
        try {
            consortiumPk = Long.parseLong(consortiumIdRaw, 10);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ERR_VALIDATION", "message", "consortiumId must be numeric"));
        }
        List<Map<String, Object>> cRows = jdbc.queryForList(
            "SELECT id, consortium_status FROM consortiums WHERE id = ? AND NOT is_deleted", consortiumPk);
        if (cRows.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "ERR_NOT_FOUND", "message", "Consortium not found"));
        }
        String cStatus = Objects.toString(cRows.get(0).get("consortium_status"), "").toLowerCase(Locale.ROOT);
        if (!"active".equals(cStatus)) {
            return ResponseEntity.badRequest().body(Map.of("error", "ERR_VALIDATION", "message", "Consortium is not active"));
        }
        Integer dup = jdbc.queryForObject(
            "SELECT COUNT(*) FROM consortium_members WHERE institution_id = ? AND consortium_id = ?",
            Integer.class, id, consortiumPk);
        if (dup != null && dup > 0) {
            return ResponseEntity.status(409).body(Map.of("error", "ERR_CONFLICT", "message", "Institution is already a member of this consortium"));
        }
        String memberRole = normalizeConsortiumMemberRole(Objects.toString(body.get("memberRole"), "Consumer"));
        String memberStatus = Objects.toString(body.get("consortiumMemberStatus"), "pending");
        jdbc.update(
            """
                INSERT INTO consortium_members (consortium_id, institution_id, member_role, consortium_member_status, joined_at)
                VALUES (?, ?, ?, ?, datetime('now'))
                """,
            consortiumPk, id, memberRole, memberStatus);
        auditService.log(currentUser, "INSTITUTION_CONSORTIUM_JOIN", "institution",
            String.valueOf(id), "Added consortium membership " + consortiumPk, getClientIp(request));
        Long newRowId = jdbc.queryForObject(
            "SELECT id FROM consortium_members WHERE institution_id = ? AND consortium_id = ? ORDER BY id DESC LIMIT 1",
            Long.class, id, consortiumPk);
        Map<String, Object> row = newRowId != null ? findConsortiumMembershipRowCamel(id, newRowId) : null;
        if (row == null) {
            return ResponseEntity.status(500).body(Map.of("error", "ERR_INTERNAL", "message", "Could not load new membership"));
        }
        String memberStatusNorm = memberStatus.trim().toLowerCase(Locale.ROOT);
        if ("pending".equals(memberStatusNorm) && newRowId != null) {
            String instLabel = jdbc.queryForObject(
                """
                    SELECT COALESCE(NULLIF(TRIM(name), ''), NULLIF(TRIM(trading_name), ''), 'Institution ' || id)
                    FROM institutions WHERE id = ? AND is_deleted = 0
                    """,
                String.class,
                id
            );
            String consLabel = jdbc.queryForObject(
                """
                    SELECT COALESCE(NULLIF(TRIM(consortium_name), ''), 'Consortium ' || id)
                    FROM consortiums WHERE id = ? AND NOT is_deleted
                    """,
                String.class,
                consortiumPk
            );
            String snapshot = (instLabel != null ? instLabel : "Member") + " · " + (consLabel != null ? consLabel : "Consortium");
            approvalQueueService.enqueue(
                "consortium_membership",
                String.valueOf(newRowId),
                snapshot,
                "Consortium membership pending approval",
                currentUser != null ? currentUser.getId() : null
            );
        }
        return ResponseEntity.status(201).body(row);
    }

    @DeleteMapping("/{id}/consortium-memberships/{membershipId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> deleteConsortiumMembership(
        @PathVariable Long id,
        @PathVariable Long membershipId,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        int n = jdbc.update("DELETE FROM consortium_members WHERE id = ? AND institution_id = ?", membershipId, id);
        if (n == 0) return ResponseEntity.notFound().build();
        auditService.log(currentUser, "INSTITUTION_CONSORTIUM_LEAVE", "institution",
            String.valueOf(id), "Removed consortium membership " + membershipId, getClientIp(request));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/product-subscriptions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> productSubscriptions(@PathVariable Long id) {
        return ResponseEntity.ok(listProductSubscriptionRowsCamel(id));
    }

    @PostMapping("/{id}/product-subscriptions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<?> addProductSubscriptions(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Object rawIds = body.get("productIds");
        if (!(rawIds instanceof List<?> list) || list.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        List<String> createdCodes = new ArrayList<>();
        for (Object x : list) {
            String pid = String.valueOf(x).trim();
            if (pid.isEmpty()) continue;
            Long productPk = resolveProductId(pid);
            if (productPk == null) {
                return ResponseEntity.notFound().build();
            }
            Integer exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM product_subscriptions WHERE institution_id = ? AND product_id = ?",
                Integer.class, id, productPk);
            if (exists != null && exists > 0) continue;
            jdbc.update(
                "INSERT INTO product_subscriptions (institution_id, product_id, subscription_status, subscribed_at) VALUES (?, ?, 'active', datetime('now'))",
                id, productPk);
            createdCodes.add(pid);
        }
        if (!createdCodes.isEmpty()) {
            auditService.log(currentUser, "INSTITUTION_PRODUCT_SUBSCRIBE", "institution",
                String.valueOf(id), "Subscribed to product(s): " + String.join(", ", createdCodes), getClientIp(request));
        }
        return ResponseEntity.ok(listProductSubscriptionRowsCamel(id));
    }

    @PatchMapping("/{id}/product-subscriptions/{subscriptionId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> patchProductSubscription(
        @PathVariable Long id,
        @PathVariable Long subscriptionId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Integer ok = jdbc.queryForObject(
            "SELECT COUNT(*) FROM product_subscriptions WHERE id = ? AND institution_id = ?",
            Integer.class, subscriptionId, id);
        if (ok == null || ok == 0) return ResponseEntity.notFound().build();
        String st = Objects.toString(body.get("subscriptionStatus"), "").trim().toLowerCase(Locale.ROOT);
        if (!List.of("active", "suspended", "trial", "expired").contains(st)) {
            return ResponseEntity.badRequest().body(Map.of("error", "ERR_VALIDATION", "message", "subscriptionStatus must be active, suspended, trial, or expired"));
        }
        jdbc.update("UPDATE product_subscriptions SET subscription_status = ? WHERE id = ? AND institution_id = ?", st, subscriptionId, id);
        auditService.log(currentUser, "INSTITUTION_PRODUCT_SUBSCRIPTION_UPDATE", "institution",
            String.valueOf(id), "Subscription " + subscriptionId + " status → " + st, getClientIp(request));
        Map<String, Object> row = jdbc.query(
            """
                SELECT ps.id AS subscription_id, ps.product_id, p.product_code,
                       p.product_name, p.product_status, p.pricing_model, ps.subscribed_at, ps.subscription_status
                FROM product_subscriptions ps
                JOIN products p ON p.id = ps.product_id
                WHERE ps.id = ? AND ps.institution_id = ?
                """,
            rs -> {
                if (!rs.next()) return null;
                return mapProductSubscriptionRow(rs);
            },
            subscriptionId, id);
        return row == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(row);
    }

    @PatchMapping("/{id}/billing")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> patchBilling(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        Optional<Institution> opt = institutionRepository.findByIdAndIsDeletedFalse(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Institution inst = opt.get();
        if (body.containsKey("billingModel") && body.get("billingModel") != null) {
            inst.setBillingModel(String.valueOf(body.get("billingModel")));
        }
        if (body.containsKey("lowCreditAlertThreshold") && body.get("lowCreditAlertThreshold") instanceof Number n) {
            jdbc.update("UPDATE institutions SET low_credit_alert_threshold = ? WHERE id = ? AND NOT is_deleted",
                n.doubleValue(), id);
        }
        if (body.get("memberRateOverrides") instanceof Map<?, ?> mo) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> merged = mergeMemberRateOverrides(id, (Map<String, Object>) mo);
                jdbc.update("UPDATE institutions SET member_rate_overrides = ? WHERE id = ? AND NOT is_deleted",
                    objectMapper.writeValueAsString(merged), id);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", "ERR_VALIDATION", "message", "Invalid member rate overrides"));
            }
        }
        institutionRepository.save(inst);
        auditService.log(currentUser, "INSTITUTION_BILLING_UPDATE", "institution",
            String.valueOf(id), "Updated billing settings", getClientIp(request));
        return ResponseEntity.ok(buildBillingPatchResult(id, inst));
    }

    @GetMapping("/{id}/api-access")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> getApiAccess(@PathVariable Long id) {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(apiAccessPayloadForInstitution(id));
    }

    @PatchMapping("/{id}/api-access")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> patchApiAccess(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        try {
            ObjectNode root = (ObjectNode) objectMapper.valueToTree(apiAccessPayloadForInstitution(id));
            mergeApiAccessSection(root, "dataSubmission", body.get("dataSubmission"));
            mergeApiAccessSection(root, "enquiry", body.get("enquiry"));
            jdbc.update("UPDATE institutions SET api_access_json = ?, updated_at = datetime('now') WHERE id = ? AND NOT is_deleted",
                objectMapper.writeValueAsString(root), id);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
        auditService.log(currentUser, "INSTITUTION_API_ACCESS_UPDATE", "institution",
            String.valueOf(id), "Updated API access (data submission / enquiry)", getClientIp(request));
        return ResponseEntity.ok(apiAccessPayloadForInstitution(id));
    }

    @GetMapping("/{id}/consent")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> getConsent(@PathVariable Long id) {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(consentPayloadForInstitution(id));
    }

    @PatchMapping("/{id}/consent")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> patchConsent(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        if (!institutionRepository.findByIdAndIsDeletedFalse(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        try {
            ObjectNode cfg = (ObjectNode) objectMapper.valueToTree(readConsentConfigObject(id));
            if (body.containsKey("policy")) {
                String p = String.valueOf(body.get("policy"));
                if (List.of("explicit", "deemed", "per-enquiry").contains(p)) cfg.put("policy", p);
            }
            if (body.get("expiryDays") instanceof Number n) {
                int ex = Math.min(365, Math.max(1, n.intValue()));
                cfg.put("expiryDays", ex);
            }
            if (body.containsKey("scopeCreditReport")) {
                cfg.put("scopeCreditReport", Boolean.TRUE.equals(body.get("scopeCreditReport")) || "true".equalsIgnoreCase(String.valueOf(body.get("scopeCreditReport"))));
            }
            if (body.containsKey("scopeAlternateData")) {
                cfg.put("scopeAlternateData", Boolean.TRUE.equals(body.get("scopeAlternateData")));
            }
            if (body.containsKey("captureMode")) {
                String m = String.valueOf(body.get("captureMode"));
                if (List.of("api-header", "upload-artifact", "account-aggregator").contains(m)) {
                    cfg.put("captureMode", m);
                }
            }
            if (body.get("failureMetrics") instanceof List<?> fm) {
                ArrayNode arr = objectMapper.createArrayNode();
                for (Object x : fm) {
                    if (x instanceof Map<?, ?> row) {
                        ObjectNode o = objectMapper.createObjectNode();
                        o.put("day", Objects.toString(row.get("day"), ""));
                        int failures = 0;
                        if (row.get("failures") instanceof Number num) failures = Math.max(0, num.intValue());
                        o.put("failures", failures);
                        arr.add(o);
                    }
                }
                jdbc.update("UPDATE institutions SET consent_failure_metrics_json = ?, updated_at = datetime('now') WHERE id = ? AND NOT is_deleted",
                    objectMapper.writeValueAsString(arr), id);
            }
            jdbc.update("UPDATE institutions SET consent_config_json = ?, updated_at = datetime('now') WHERE id = ? AND NOT is_deleted",
                objectMapper.writeValueAsString(cfg), id);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
        auditService.log(currentUser, "INSTITUTION_CONSENT_UPDATE", "institution",
            String.valueOf(id), "Updated consent configuration", getClientIp(request));
        return ResponseEntity.ok(consentPayloadForInstitution(id));
    }

    @GetMapping("/{id}/billing-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> billingSummary(@PathVariable Long id) {
        List<Map<String, Object>> instRows = jdbc.queryForList(
            "SELECT billing_model, credit_balance, low_credit_alert_threshold FROM institutions WHERE id = ? AND NOT is_deleted", id);
        if (instRows.isEmpty()) return ResponseEntity.notFound().build();
        Map<String, Object> src = instRows.get(0);
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("billingModel", src.get("billing_model"));
        summary.put("creditBalance", toDouble(src.get("credit_balance")));
        Object lct = src.get("low_credit_alert_threshold");
        summary.put("lowCreditAlertThreshold", lct instanceof Number n ? n.doubleValue() : 5000.0);
        Long activeSubs = jdbc.queryForObject(
            "SELECT COUNT(*) FROM product_subscriptions WHERE institution_id = ? AND subscription_status IN ('active','trial')",
            Long.class, id);
        summary.put("activeSubscriptions", activeSubs != null ? activeSubs : 0);
        Long apiCalls30d = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE institution_id = ? AND occurred_at >= datetime('now','-30 days')",
            Long.class, id);
        summary.put("apiCalls30d", apiCalls30d != null ? apiCalls30d : 0);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/{id}/monitoring-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> monitoringSummary(@PathVariable Long id) {
        Map<String, Object> apiStats = jdbc.queryForMap(
            "SELECT COUNT(*) AS total_requests, " +
            "SUM(CASE WHEN api_request_status='success' THEN 1 ELSE 0 END) AS successful_requests, " +
            "ROUND(AVG(response_time_ms),1) AS avg_latency_ms " +
            "FROM api_requests WHERE institution_id = ? AND occurred_at >= datetime('now','-30 days')", id);
        Map<String, Object> summary = new LinkedHashMap<>();
        long total = apiStats.get("total_requests") instanceof Number n ? n.longValue() : 0L;
        long success = apiStats.get("successful_requests") instanceof Number n ? n.longValue() : 0L;
        double avgLat = apiStats.get("avg_latency_ms") instanceof Number n ? n.doubleValue() : 0.0;
        summary.put("totalRequests", total);
        summary.put("successfulRequests", success);
        summary.put("avgLatencyMs", avgLat);
        summary.put("successRatePct", total > 0 ? Math.round((success * 1000.0) / total) / 10.0 : 0.0);
        Map<String, Object> batchStats = jdbc.queryForMap(
            "SELECT COUNT(*) AS total_batches, " +
            "SUM(CASE WHEN batch_job_status IN ('queued','processing') THEN 1 ELSE 0 END) AS active_batches, " +
            "COALESCE(SUM(total_records),0) AS total_records " +
            "FROM batch_jobs WHERE institution_id = ? AND uploaded_at >= datetime('now','-30 days')", id);
        summary.put("totalBatches", batchStats.get("total_batches") instanceof Number n ? n.longValue() : 0L);
        summary.put("activeBatches", batchStats.get("active_batches") instanceof Number n ? n.longValue() : 0L);
        summary.put("totalRecords", batchStats.get("total_records") instanceof Number n ? n.longValue() : 0L);
        return ResponseEntity.ok(summary);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        return (xff != null && !xff.isBlank()) ? xff.split(",")[0].trim() : request.getRemoteAddr();
    }

    private Map<String, List<Map<String, Object>>> buildInstitutionOverviewCharts(Long institutionId) {
        Map<String, List<Map<String, Object>>> m = new LinkedHashMap<>();
        String window = "datetime('now', '-30 days')";

        m.put("submissionVolumeData", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', occurred_at) AS day, COUNT(*) AS volume FROM api_requests"
                + " WHERE institution_id = ? AND occurred_at >= " + window
                + " GROUP BY day ORDER BY day",
            institutionId));

        m.put("successVsRejectedData", jdbc.queryForList(
            "SELECT CASE WHEN api_request_status = 'success' THEN 'Success' ELSE 'Rejected' END AS name,"
                + " COUNT(*) AS value FROM api_requests WHERE institution_id = ? AND occurred_at >= " + window
                + " GROUP BY name",
            institutionId));

        m.put("rejectionReasonsData", jdbc.queryForList(
            "SELECT error_code AS reason, COUNT(*) AS count FROM api_requests"
                + " WHERE institution_id = ? AND api_request_status IN ('failed','partial') AND error_code IS NOT NULL"
                + " AND occurred_at >= " + window
                + " GROUP BY error_code ORDER BY count DESC LIMIT 10",
            institutionId));

        m.put("processingTimeData", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', occurred_at) AS day, ROUND(AVG(response_time_ms), 1) AS avgMs"
                + " FROM api_requests WHERE institution_id = ? AND occurred_at >= " + window
                + " GROUP BY day ORDER BY day",
            institutionId));

        m.put("enquiryVolumeData", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', enquired_at) AS day, COUNT(*) AS volume FROM enquiries"
                + " WHERE requesting_institution_id = ? AND enquired_at >= " + window
                + " GROUP BY day ORDER BY day",
            institutionId));

        m.put("successVsFailedData", jdbc.queryForList(
            "SELECT CASE WHEN enquiry_status = 'success' THEN 'Success' ELSE 'Failed' END AS name,"
                + " COUNT(*) AS value FROM enquiries WHERE requesting_institution_id = ? AND enquired_at >= " + window
                + " GROUP BY name",
            institutionId));

        m.put("responseTimeData", jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', enquired_at) AS day, ROUND(AVG(response_time_ms), 1) AS latency"
                + " FROM enquiries WHERE requesting_institution_id = ? AND enquired_at >= " + window
                + " GROUP BY day ORDER BY day",
            institutionId));

        return m;
    }

    private List<Map<String, Object>> listConsortiumMembershipRowsCamel(long institutionId) {
        return jdbc.query(
            """
                SELECT cm.id AS membership_id, cm.consortium_id AS consortium_id,
                       c.consortium_name AS consortium_name, c.consortium_status AS consortium_status,
                       cm.member_role AS member_role, cm.consortium_member_status AS consortium_member_status,
                       cm.joined_at AS joined_at
                FROM consortium_members cm
                JOIN consortiums c ON c.id = cm.consortium_id
                WHERE cm.institution_id = ?
                ORDER BY cm.joined_at DESC
                """,
            (rs, rowNum) -> mapConsortiumMembershipRow(rs),
            institutionId);
    }

    private Map<String, Object> findConsortiumMembershipRowCamel(long institutionId, long membershipRowId) {
        List<Map<String, Object>> rows = jdbc.query(
            """
                SELECT cm.id AS membership_id, cm.consortium_id AS consortium_id,
                       c.consortium_name AS consortium_name, c.consortium_status AS consortium_status,
                       cm.member_role AS member_role, cm.consortium_member_status AS consortium_member_status,
                       cm.joined_at AS joined_at
                FROM consortium_members cm
                JOIN consortiums c ON c.id = cm.consortium_id
                WHERE cm.institution_id = ? AND cm.id = ?
                """,
            (rs, rowNum) -> mapConsortiumMembershipRow(rs),
            institutionId, membershipRowId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private static Map<String, Object> mapConsortiumMembershipRow(ResultSet rs) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("membershipId", rs.getLong("membership_id"));
        m.put("consortiumId", String.valueOf(rs.getLong("consortium_id")));
        m.put("consortiumName", rs.getString("consortium_name"));
        m.put("consortiumStatus", rs.getString("consortium_status"));
        m.put("memberRole", rs.getString("member_role"));
        m.put("consortiumMemberStatus", rs.getString("consortium_member_status"));
        m.put("joinedAt", rs.getString("joined_at"));
        return m;
    }

    private static String normalizeConsortiumMemberRole(String raw) {
        String s = raw == null ? "" : raw.toLowerCase(Locale.ROOT);
        if (s.contains("contributor")) return "Contributor";
        if (s.contains("observer")) return "Observer";
        return "Consumer";
    }

    private Long resolveProductId(String pid) {
        try {
            long n = Long.parseLong(pid.trim(), 10);
            Integer c = jdbc.queryForObject(
                "SELECT COUNT(*) FROM products WHERE id = ? AND is_deleted = 0", Integer.class, n);
            if (c != null && c > 0) return n;
        } catch (NumberFormatException ignored) {
            // try product_code
        }
        List<Long> ids = jdbc.query(
            "SELECT id FROM products WHERE product_code = ? AND is_deleted = 0 LIMIT 1",
            (rs, rowNum) -> rs.getLong(1),
            pid.trim());
        return ids.isEmpty() ? null : ids.get(0);
    }

    private List<Map<String, Object>> listProductSubscriptionRowsCamel(long institutionId) {
        return jdbc.query(
            """
                SELECT ps.id AS subscription_id, ps.product_id, p.product_code,
                       p.product_name, p.product_status, p.pricing_model, ps.subscribed_at, ps.subscription_status
                FROM product_subscriptions ps
                JOIN products p ON p.id = ps.product_id
                WHERE ps.institution_id = ?
                ORDER BY ps.subscribed_at DESC
                """,
            (rs, rowNum) -> mapProductSubscriptionRow(rs),
            institutionId);
    }

    private static Map<String, Object> mapProductSubscriptionRow(ResultSet rs) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("subscriptionId", rs.getLong("subscription_id"));
        String code = rs.getString("product_code");
        m.put("productId", code != null && !code.isBlank() ? code : String.valueOf(rs.getLong("product_id")));
        m.put("productName", rs.getString("product_name"));
        m.put("productStatus", rs.getString("product_status"));
        m.put("pricingModel", rs.getString("pricing_model"));
        m.put("subscribedAt", rs.getString("subscribed_at"));
        m.put("subscriptionStatus", rs.getString("subscription_status"));
        return m;
    }

    private Map<String, Object> mergeMemberRateOverrides(long id, Map<String, Object> patch) throws IOException {
        String raw = jdbc.query(
            "SELECT member_rate_overrides FROM institutions WHERE id = ? AND NOT is_deleted",
            rs -> rs.next() ? rs.getString(1) : null,
            id);
        Map<String, Object> base = new LinkedHashMap<>();
        if (raw != null && !raw.isBlank()) {
            base.putAll(objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() { }));
        }
        base.putAll(patch);
        return base;
    }

    private Map<String, Object> buildBillingPatchResult(long id, Institution inst) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("billingModel", inst.getBillingModel() != null ? inst.getBillingModel() : "postpaid");
        m.put("creditBalance", inst.getCreditBalance() != null ? inst.getCreditBalance().doubleValue() : 0.0);
        try {
            Double lct = jdbc.queryForObject(
                "SELECT low_credit_alert_threshold FROM institutions WHERE id = ? AND NOT is_deleted",
                Double.class, id);
            m.put("lowCreditAlertThreshold", lct != null ? lct : 5000.0);
            String mr = jdbc.query(
                "SELECT member_rate_overrides FROM institutions WHERE id = ? AND NOT is_deleted",
                rs -> rs.next() ? rs.getString(1) : null,
                id);
            Map<String, Object> overrides = new LinkedHashMap<>();
            if (mr != null && !mr.isBlank()) {
                overrides.putAll(objectMapper.readValue(mr, new TypeReference<Map<String, Object>>() { }));
            }
            m.put("memberRateOverrides", overrides);
        } catch (Exception e) {
            m.put("lowCreditAlertThreshold", 5000.0);
            m.put("memberRateOverrides", Map.of());
        }
        return m;
    }

    private Map<String, Object> apiAccessPayloadForInstitution(long id) {
        try {
            String raw = jdbc.query(
                "SELECT api_access_json FROM institutions WHERE id = ? AND NOT is_deleted",
                rs -> rs.next() ? rs.getString(1) : null,
                id);
            ObjectNode base = defaultApiAccessNode();
            if (raw != null && !raw.isBlank()) {
                JsonNode n = objectMapper.readTree(raw);
                if (n.isObject()) {
                    mergeObjectDeep(base, (ObjectNode) n);
                }
            }
            return objectMapper.convertValue(base, new TypeReference<Map<String, Object>>() { });
        } catch (Exception e) {
            return objectMapper.convertValue(defaultApiAccessNode(), new TypeReference<Map<String, Object>>() { });
        }
    }

    private ObjectNode defaultApiAccessNode() {
        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode ds = objectMapper.createObjectNode();
        ds.put("enabled", true);
        ds.put("rateLimitPerMin", 200);
        ds.set("ipWhitelist", objectMapper.createArrayNode());
        ObjectNode en = objectMapper.createObjectNode();
        en.put("enabled", true);
        en.put("rateLimitPerMin", 100);
        en.set("ipWhitelist", objectMapper.createArrayNode());
        en.put("concurrentLimit", 50);
        root.set("dataSubmission", ds);
        root.set("enquiry", en);
        return root;
    }

    private static void mergeObjectDeep(ObjectNode target, ObjectNode patch) {
        Iterator<Map.Entry<String, JsonNode>> it = patch.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> e = it.next();
            String k = e.getKey();
            JsonNode v = e.getValue();
            if (v.isObject() && target.has(k) && target.get(k).isObject()) {
                mergeObjectDeep((ObjectNode) target.get(k), (ObjectNode) v);
            } else {
                target.set(k, v);
            }
        }
    }

    private void mergeApiAccessSection(ObjectNode root, String key, Object patch) {
        if (!(patch instanceof Map<?, ?>)) return;
        ObjectNode target = (ObjectNode) root.get(key);
        ObjectNode p = objectMapper.valueToTree(patch);
        Iterator<String> fn = p.fieldNames();
        while (fn.hasNext()) {
            String f = fn.next();
            target.set(f, p.get(f));
        }
    }

    private ObjectNode readConsentConfigObject(long id) {
        try {
            String raw = jdbc.query(
                "SELECT consent_config_json FROM institutions WHERE id = ? AND NOT is_deleted",
                rs -> rs.next() ? rs.getString(1) : null,
                id);
            ObjectNode d = defaultConsentConfigNode();
            if (raw != null && !raw.isBlank()) {
                JsonNode n = objectMapper.readTree(raw);
                if (n.isObject()) {
                    mergeObjectDeep(d, (ObjectNode) n);
                }
            }
            return d;
        } catch (Exception e) {
            return defaultConsentConfigNode();
        }
    }

    private ObjectNode defaultConsentConfigNode() {
        ObjectNode o = objectMapper.createObjectNode();
        o.put("policy", "explicit");
        o.put("expiryDays", 90);
        o.put("scopeCreditReport", true);
        o.put("scopeAlternateData", false);
        o.put("captureMode", "api-header");
        return o;
    }

    private Map<String, Object> consentPayloadForInstitution(long id) {
        try {
            ObjectNode cfg = readConsentConfigObject(id);
            String fmRaw = jdbc.query(
                "SELECT consent_failure_metrics_json FROM institutions WHERE id = ? AND NOT is_deleted",
                rs -> rs.next() ? rs.getString(1) : null,
                id);
            List<Map<String, Object>> metrics = new ArrayList<>();
            if (fmRaw != null && !fmRaw.isBlank()) {
                JsonNode arr = objectMapper.readTree(fmRaw);
                if (arr.isArray()) {
                    for (JsonNode x : arr) {
                        if (x.isObject()) {
                            Map<String, Object> row = new LinkedHashMap<>();
                            row.put("day", x.path("day").asText(""));
                            row.put("failures", x.path("failures").asInt(0));
                            metrics.add(row);
                        }
                    }
                }
            }
            Map<String, Object> out = objectMapper.convertValue(cfg, new TypeReference<Map<String, Object>>() { });
            out.put("failureMetrics", metrics);
            return out;
        } catch (Exception e) {
            Map<String, Object> out = objectMapper.convertValue(defaultConsentConfigNode(), new TypeReference<Map<String, Object>>() { });
            out.put("failureMetrics", List.of());
            return out;
        }
    }

    private static double toDouble(Object o) {
        if (o == null) return 0.0;
        if (o instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(o));
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    /** BRD: at least one participation role; also avoids members invisible to role-filtered pickers. */
    private static void validateParticipationRoles(Institution inst) {
        if (!inst.isDataSubmitter() && !inst.isSubscriber()) {
            throw new IllegalArgumentException(
                "At least one of isDataSubmitter or isSubscriber must be true");
        }
    }

    private static void applyInstitutionPatch(Institution inst, Map<String, Object> body) {
        if (body == null || body.isEmpty()) return;
        if (body.containsKey("name") && body.get("name") != null) {
            inst.setName(String.valueOf(body.get("name")));
        }
        if (body.containsKey("tradingName")) {
            inst.setTradingName(body.get("tradingName") != null ? String.valueOf(body.get("tradingName")) : null);
        }
        if (body.containsKey("institutionType") && body.get("institutionType") != null) {
            inst.setInstitutionType(String.valueOf(body.get("institutionType")));
        }
        if (body.containsKey("institutionLifecycleStatus") && body.get("institutionLifecycleStatus") != null) {
            inst.setInstitutionLifecycleStatus(String.valueOf(body.get("institutionLifecycleStatus")));
        }
        if (body.containsKey("registrationNumber") && body.get("registrationNumber") != null) {
            inst.setRegistrationNumber(String.valueOf(body.get("registrationNumber")));
        }
        if (body.containsKey("jurisdiction") && body.get("jurisdiction") != null) {
            inst.setJurisdiction(String.valueOf(body.get("jurisdiction")));
        }
        if (body.containsKey("licenseType")) {
            inst.setLicenseType(body.get("licenseType") != null ? String.valueOf(body.get("licenseType")) : null);
        }
        if (body.containsKey("licenseNumber")) {
            inst.setLicenseNumber(body.get("licenseNumber") != null ? String.valueOf(body.get("licenseNumber")) : null);
        }
        if (body.containsKey("contactEmail")) {
            inst.setContactEmail(body.get("contactEmail") != null ? String.valueOf(body.get("contactEmail")) : null);
        }
        if (body.containsKey("contactPhone")) {
            inst.setContactPhone(body.get("contactPhone") != null ? String.valueOf(body.get("contactPhone")) : null);
        }
        if (body.containsKey("billingModel")) {
            inst.setBillingModel(body.get("billingModel") != null ? String.valueOf(body.get("billingModel")) : null);
        }
        if (body.containsKey("creditBalance")) {
            Object v = body.get("creditBalance");
            if (v == null) {
                inst.setCreditBalance(null);
            } else if (v instanceof Number n) {
                inst.setCreditBalance(BigDecimal.valueOf(n.doubleValue()));
            } else {
                inst.setCreditBalance(new BigDecimal(String.valueOf(v)));
            }
        }
        if (body.containsKey("isDataSubmitter")) {
            inst.setDataSubmitter(parseBoolean(body.get("isDataSubmitter")));
        }
        if (body.containsKey("isSubscriber")) {
            inst.setSubscriber(parseBoolean(body.get("isSubscriber")));
        }
        if (body.containsKey("dataQualityScore")) {
            inst.setDataQualityScore(toBigDecimal(body.get("dataQualityScore")));
        }
        if (body.containsKey("matchAccuracyScore")) {
            inst.setMatchAccuracyScore(toBigDecimal(body.get("matchAccuracyScore")));
        }
        if (body.containsKey("slaHealthPercent")) {
            inst.setSlaHealthPercent(toBigDecimal(body.get("slaHealthPercent")));
        }
        if (body.containsKey("apisEnabledCount") && body.get("apisEnabledCount") instanceof Number n) {
            inst.setApisEnabledCount(n.intValue());
        }
    }

    private static boolean parseBoolean(Object v) {
        if (v instanceof Boolean b) return b;
        return Boolean.parseBoolean(String.valueOf(v));
    }

    private static BigDecimal toBigDecimal(Object v) {
        if (v == null) return null;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(String.valueOf(v));
    }

    /** Legal name first, else trading name — aligns with SPA `institutionDisplayLabel`. */
    private static String institutionDisplayLabelForApproval(Institution i) {
        String n = i.getName();
        if (n != null && !n.isBlank()) {
            return n.trim();
        }
        String t = i.getTradingName();
        if (t != null && !t.isBlank()) {
            return t.trim();
        }
        return "Institution " + i.getId();
    }

    private static String buildInstitutionRegistrationDescription(Institution i) {
        boolean ds = i.isDataSubmitter();
        boolean sub = i.isSubscriber();
        String part;
        if (ds && sub) {
            part = "Data Submission & Subscriber";
        } else if (ds) {
            part = "Data Submission only";
        } else if (sub) {
            part = "Subscriber only";
        } else {
            part = "No participation selected";
        }
        return "New institution registration — " + part;
    }
}
