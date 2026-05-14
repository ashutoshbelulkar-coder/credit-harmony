package com.hcb.platform.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Data Policy Controller — Product-level masking policy configuration.
 *
 * Routes:
 * - GET  /api/v1/data-policy?institutionId=&productId=
 * - POST /api/v1/data-policy
 *
 * Persistence: data_policies.fields_json stores the fields array.
 */
@RestController
@RequestMapping("/api/v1/data-policy")
@RequiredArgsConstructor
public class DataPolicyController {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    private static Map<String, Object> defaultField(String fieldName, String dataType) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fieldName", fieldName);
        m.put("isMasked", true);
        m.put("isUnmasked", false);
        m.put("unmaskType", null);
        m.put("partialConfig", null);
        m.put("dataType", dataType);
        return m;
    }

    private static final List<Map<String, Object>> DEFAULT_MASKED_FIELDS = List.of(
        defaultField("PAN", "string"),
        defaultField("NationalId", "string"),
        defaultField("DateOfBirth", "date"),
        defaultField("Phone", "string"),
        defaultField("Email", "string"),
        defaultField("Name", "string"),
        defaultField("AddressLine1", "string")
    );

    private static Map<String, Object> inferPartialTemplate(String fieldName) {
        if (fieldName == null) return null;
        String f = fieldName.toLowerCase();
        if (f.contains("pan") || f.contains("card_number") || f.contains("cardnumber")) return Map.of("type", "LAST_N", "value", 4);
        if (f.contains("phone") || f.contains("msisdn") || f.contains("mobile")) return Map.of("type", "LAST_N", "value", 2);
        if (f.contains("email")) return Map.of("type", "MASK_DOMAIN", "value", 0);
        if (f.contains("name") && !f.contains("company")) return Map.of("type", "FIRST_N", "value", 1);
        return null;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    @Transactional
    public ResponseEntity<Map<String, Object>> getOrCreate(
        @RequestParam String institutionId,
        @RequestParam String productId,
        @AuthenticationPrincipal AuthUserPrincipal principal
    ) throws Exception {
        String inst = institutionId != null ? institutionId.trim() : "";
        String pid = productId != null ? productId.trim() : "";
        if (inst.isBlank() || pid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", Map.of("code", "ERR_VALIDATION", "message", "institutionId and productId are required")));
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT id, fields_json as fieldsJson, updated_by as updatedBy, updated_at as updatedAt FROM data_policies WHERE institution_id=? AND product_id=?",
            inst, pid
        );
        if (!rows.isEmpty()) {
            Map<String, Object> r = rows.get(0);
            String fieldsJson = String.valueOf(r.get("fieldsJson"));
            List<Map<String, Object>> fields = objectMapper.readValue(fieldsJson, new TypeReference<>() {});
            return ResponseEntity.ok(Map.of(
                "id", String.valueOf(r.get("id")),
                "institutionId", inst,
                "productId", pid,
                "fields", fields,
                "updatedBy", r.get("updatedBy") != null ? String.valueOf(r.get("updatedBy")) : "system",
                "updatedAt", r.get("updatedAt") != null ? String.valueOf(r.get("updatedAt")) : LocalDateTime.now().toString()
            ));
        }

        // Create default policy row so subsequent reads are consistent.
        String fieldsJson = objectMapper.writeValueAsString(DEFAULT_MASKED_FIELDS);
        String updatedBy = principal != null ? principal.getEmail() : "system";
        jdbc.update(
            "INSERT INTO data_policies(institution_id, product_id, fields_json, updated_by, updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)",
            inst, pid, fieldsJson, updatedBy
        );
        Long id = jdbc.queryForObject("SELECT id FROM data_policies WHERE institution_id=? AND product_id=?", Long.class, inst, pid);
        return ResponseEntity.ok(Map.of(
            "id", id != null ? String.valueOf(id) : "0",
            "institutionId", inst,
            "productId", pid,
            "fields", DEFAULT_MASKED_FIELDS,
            "updatedBy", updatedBy,
            "updatedAt", LocalDateTime.now().toString()
        ));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    @Transactional
    public ResponseEntity<?> upsert(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal principal,
        HttpServletRequest request
    ) throws Exception {
        String inst = body.get("institutionId") != null ? String.valueOf(body.get("institutionId")).trim() : "";
        String pid = body.get("productId") != null ? String.valueOf(body.get("productId")).trim() : "";
        if (inst.isBlank() || pid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", Map.of("code", "ERR_VALIDATION", "message", "institutionId and productId are required")));
        }

        Object rawFields = body.get("fields");
        if (!(rawFields instanceof List<?> inList)) {
            return ResponseEntity.badRequest().body(Map.of("error", Map.of("code", "ERR_VALIDATION", "message", "fields must be an array")));
        }

        List<Map<String, Object>> nextFields = new ArrayList<>();
        for (Object o : inList) {
            if (!(o instanceof Map<?, ?> m)) continue;
            String fieldName = m.get("fieldName") != null ? String.valueOf(m.get("fieldName")).trim() : "";
            if (fieldName.isBlank()) continue;

            boolean isMasked = true;
            boolean isUnmasked = m.get("isUnmasked") instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(m.get("isUnmasked")));
            String unmaskType = m.get("unmaskType") != null ? String.valueOf(m.get("unmaskType")).trim().toUpperCase(Locale.ROOT) : null;
            if (!isUnmasked) unmaskType = null;
            if (unmaskType != null && !(unmaskType.equals("FULL") || unmaskType.equals("PARTIAL"))) unmaskType = null;

            Map<String, Object> partialConfig = null;
            if ("PARTIAL".equals(unmaskType)) {
                partialConfig = inferPartialTemplate(fieldName);
                if (partialConfig == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", Map.of("code", "ERR_VALIDATION", "message", "Partial masking template not available for " + fieldName)));
                }
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("fieldName", fieldName);
            row.put("isMasked", isMasked);
            row.put("isUnmasked", isUnmasked);
            row.put("unmaskType", unmaskType);
            if (partialConfig != null) row.put("partialConfig", partialConfig);
            if (m.get("dataType") != null) row.put("dataType", String.valueOf(m.get("dataType")));
            nextFields.add(row);
        }

        // Validation: at least one masked field remains masked.
        boolean anyRemainMasked = nextFields.stream().anyMatch(f -> !(f.get("isUnmasked") instanceof Boolean b && b));
        if (!anyRemainMasked) {
            return ResponseEntity.badRequest().body(Map.of("error", Map.of("code", "ERR_VALIDATION", "message", "At least 1 field must remain masked")));
        }

        // Compute changed field names for audit (compare to existing).
        List<String> changedFields = new ArrayList<>();
        List<Map<String, Object>> existing = jdbc.queryForList(
            "SELECT fields_json as fieldsJson FROM data_policies WHERE institution_id=? AND product_id=?",
            inst, pid
        );
        if (!existing.isEmpty()) {
            String existingJson = String.valueOf(existing.get(0).get("fieldsJson"));
            List<Map<String, Object>> prevFields = objectMapper.readValue(existingJson, new TypeReference<>() {});
            Map<String, Map<String, Object>> prevByName = new HashMap<>();
            for (Map<String, Object> f : prevFields) {
                Object fn = f.get("fieldName");
                if (fn != null) prevByName.put(String.valueOf(fn), f);
            }
            for (Map<String, Object> f : nextFields) {
                String fn = String.valueOf(f.get("fieldName"));
                Map<String, Object> before = prevByName.get(fn);
                if (before == null) continue;
                String beforeType = before.get("unmaskType") != null ? String.valueOf(before.get("unmaskType")) : "";
                String afterType = f.get("unmaskType") != null ? String.valueOf(f.get("unmaskType")) : "";
                boolean beforeUnmasked = before.get("isUnmasked") instanceof Boolean b ? b : false;
                boolean afterUnmasked = f.get("isUnmasked") instanceof Boolean b ? b : false;
                String beforePartial = objectMapper.writeValueAsString(before.getOrDefault("partialConfig", null));
                String afterPartial = objectMapper.writeValueAsString(f.getOrDefault("partialConfig", null));
                if (beforeUnmasked != afterUnmasked || !beforeType.equals(afterType) || !beforePartial.equals(afterPartial)) {
                    changedFields.add(fn);
                }
            }
        }

        String fieldsJson = objectMapper.writeValueAsString(nextFields);
        String updatedBy = principal != null ? principal.getEmail() : "system";
        jdbc.update(
            "INSERT INTO data_policies(institution_id, product_id, fields_json, updated_by, updated_at) " +
                "VALUES(?,?,?,?,CURRENT_TIMESTAMP) " +
                "ON CONFLICT(institution_id, product_id) DO UPDATE SET " +
                "fields_json=excluded.fields_json, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP",
            inst, pid, fieldsJson, updatedBy
        );

        String nowIso = LocalDateTime.now().toString();
        // Mandatory audit log: entityType=GOVERNANCE so it appears in Governance Audit Logs.
        auditService.log(
            principal,
            "DATA_POLICY_UPDATED",
            "GOVERNANCE",
            pid,
            objectMapper.writeValueAsString(Map.of(
                "action", "DATA_POLICY_UPDATED",
                "entity", "Data Policy",
                "product", pid,
                "changedFields", changedFields,
                "user", updatedBy,
                "timestamp", nowIso
            )),
            request != null ? request.getRemoteAddr() : null
        );

        Long id = jdbc.queryForObject("SELECT id FROM data_policies WHERE institution_id=? AND product_id=?", Long.class, inst, pid);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", id != null ? String.valueOf(id) : "0");
        resp.put("institutionId", inst);
        resp.put("productId", pid);
        resp.put("fields", nextFields);
        resp.put("updatedBy", updatedBy);
        resp.put("updatedAt", nowIso);
        return ResponseEntity.ok(resp);
    }
}

