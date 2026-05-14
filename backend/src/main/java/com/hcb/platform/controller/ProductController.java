package com.hcb.platform.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.ApprovalQueueService;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Product Controller — Data Products / Credit Packages
 * - GET    /api/v1/products
 * - GET    /api/v1/products/packet-catalog
 * - GET    /api/v1/products/{id}
 * - POST   /api/v1/products
 * - PATCH  /api/v1/products/{id}
 * - DELETE /api/v1/products/{id}
 */
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final ApprovalQueueService approvalQueueService;

    private static List<String> asStringList(Object v) {
        if (v == null) return List.of();
        if (v instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object o : list) {
                if (o == null) continue;
                String s = String.valueOf(o).trim();
                if (!s.isEmpty()) out.add(s);
            }
            return out;
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asObjectMapList(Object v) {
        if (v == null) return List.of();
        if (v instanceof List<?> list) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object o : list) {
                if (o instanceof Map<?, ?> m) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (Map.Entry<?, ?> e : m.entrySet()) {
                        row.put(String.valueOf(e.getKey()), e.getValue());
                    }
                    out.add(row);
                }
            }
            return out;
        }
        return List.of();
    }

    private void replaceProductPacketConfig(long productId, List<String> packetIds, List<Map<String, Object>> packetConfigs) {
        // Replace-all semantics for simplicity (dev-scale), kept in a transaction by caller.
        jdbc.update("DELETE FROM product_packet_raw_fields WHERE product_id=?", productId);
        jdbc.update("DELETE FROM product_packets WHERE product_id=?", productId);

        for (int i = 0; i < packetIds.size(); i++) {
            jdbc.update(
                "INSERT INTO product_packets(product_id, packet_id, sort_order) VALUES(?,?,?)",
                productId,
                packetIds.get(i),
                i
            );
        }

        // Index configs by packetId for quick lookups; if absent, treat as empty.
        Map<String, Map<String, Object>> cfgByPacketId = new HashMap<>();
        for (Map<String, Object> cfg : packetConfigs) {
            String pid = cfg.get("packetId") != null ? String.valueOf(cfg.get("packetId")).trim() : "";
            if (!pid.isEmpty()) {
                cfgByPacketId.put(pid, cfg);
            }
        }

        for (String pid : packetIds) {
            Map<String, Object> cfg = cfgByPacketId.getOrDefault(pid, Map.of());
            List<String> selectedFields = asStringList(cfg.get("selectedFields"));
            Set<String> selectedSet = new HashSet<>(selectedFields);
            Set<String> disabledSet = new HashSet<>(asStringList(cfg.get("disabledFields")));
            for (String f : selectedFields) {
                boolean enabled = !disabledSet.contains(f);
                jdbc.update(
                    "INSERT INTO product_packet_raw_fields(product_id, packet_id, field_path, is_enabled) VALUES(?,?,?,?)",
                    productId,
                    pid,
                    f,
                    enabled ? 1 : 0
                );
            }
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> list(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String type,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE p.is_deleted=0");
        List<Object> params = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            where.append(" AND p.product_name LIKE ?");
            params.add("%" + search + "%");
        }
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND lower(p.product_status)=lower(?)");
            params.add(status);
        }
        if (type != null && !type.isBlank()) {
            where.append(" AND (p.product_code = ? OR p.coverage_scope = ?)");
            params.add(type);
            params.add(type);
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM products p " + where, Long.class, params.toArray());
        String sql = "SELECT p.id, p.product_code as productCode, p.product_name as name, p.coverage_scope as type,"
            + " p.product_status as status, p.description, p.updated_at as lastUpdated, p.pricing_model as pricingModel"
            + " FROM products p " + where + " ORDER BY p.product_name LIMIT ? OFFSET ?";
        List<Object> dp = new ArrayList<>(params);
        dp.add(size);
        dp.add(page * size);
        List<Map<String, Object>> raw = jdbc.queryForList(sql, dp.toArray());
        List<Map<String, Object>> normalized = new ArrayList<>(raw.size());
        for (Map<String, Object> row : raw) {
            normalized.add(normalizeProductListRow(row));
        }
        return ResponseEntity.ok(buildPage(normalized, total != null ? total : 0, page, size));
    }

    /**
     * Packet catalogue for the data-product form — keep {@code catalog/product-packet-catalog.json}
     * aligned with {@code src/data/data-products.json} {@code productCatalogPacketOptions} on the SPA repo.
     */
    @GetMapping("/packet-catalog")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> getPacketCatalog() throws IOException {
        ClassPathResource resource = new ClassPathResource("catalog/product-packet-catalog.json");
        try (InputStream in = resource.getInputStream()) {
            Map<String, Object> body = objectMapper.readValue(in, new TypeReference<Map<String, Object>>() {});
            return ResponseEntity.ok(body);
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT p.id, p.product_code as productCode, p.product_name as name, p.coverage_scope as type,"
                + " p.product_status as status, p.description, p.updated_at as lastUpdated, p.pricing_model as pricingModel,"
                + " p.enquiry_impact as enquiryImpact, p.data_mode as dataMode"
                + " FROM products p WHERE p.id=? AND p.is_deleted=0",
            id
        );
        if (rows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> out = normalizeProductDetailRow(rows.get(0));

        List<Map<String, Object>> packetRows = jdbc.queryForList(
            "SELECT packet_id as packetId FROM product_packets WHERE product_id=? ORDER BY sort_order ASC",
            id
        );
        List<String> packetIds = new ArrayList<>();
        for (Map<String, Object> r : packetRows) {
            Object v = jdbcGetCi(r, "packetId");
            if (v != null) {
                String s = String.valueOf(v).trim();
                if (!s.isEmpty()) packetIds.add(s);
            }
        }
        out.put("packetIds", packetIds);

        List<Map<String, Object>> rawRows = jdbc.queryForList(
            "SELECT packet_id as packetId, field_path as fieldPath, is_enabled as isEnabled"
                + " FROM product_packet_raw_fields WHERE product_id=?",
            id
        );
        Map<String, List<String>> selectedByPacket = new HashMap<>();
        Map<String, List<String>> disabledByPacket = new HashMap<>();
        for (Map<String, Object> r : rawRows) {
            String pid = jdbcString(jdbcGetCi(r, "packetId"));
            String path = jdbcString(jdbcGetCi(r, "fieldPath"));
            Object en = jdbcGetCi(r, "isEnabled");
            if (pid == null || pid.isBlank() || path == null || path.isBlank()) continue;
            selectedByPacket.computeIfAbsent(pid, __ -> new ArrayList<>()).add(path);
            boolean enabled = true;
            if (en instanceof Number n) {
                enabled = n.intValue() != 0;
            } else if (en != null) {
                enabled = !"0".equals(String.valueOf(en));
            }
            if (!enabled) {
                disabledByPacket.computeIfAbsent(pid, __ -> new ArrayList<>()).add(path);
            }
        }

        List<Map<String, Object>> packetConfigs = new ArrayList<>();
        for (String pid : packetIds) {
            Map<String, Object> cfg = new LinkedHashMap<>();
            cfg.put("packetId", pid);
            cfg.put("selectedFields", selectedByPacket.getOrDefault(pid, List.of()));
            cfg.put("disabledFields", disabledByPacket.getOrDefault(pid, List.of()));
            cfg.put("selectedDerivedFields", List.of());
            packetConfigs.add(cfg);
        }
        out.put("packetConfigs", packetConfigs);

        return ResponseEntity.ok(out);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> create(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        String now = LocalDateTime.now().toString();
        String code = body.get("code") != null && !String.valueOf(body.get("code")).isBlank()
            ? String.valueOf(body.get("code"))
            : "PRD_" + System.currentTimeMillis();
        String name = body.get("name") != null ? String.valueOf(body.get("name")) : code;
        String coverageScope = body.get("type") != null ? String.valueOf(body.get("type")) : "SELF";
        String rawStatus = body.get("status") != null
            ? String.valueOf(body.get("status")).trim().toLowerCase(Locale.ROOT) : "";
        boolean needsApproval = "approval_pending".equals(rawStatus)
            || "pending".equals(rawStatus)
            || "pending_approval".equals(rawStatus);
        String productStatus;
        if ("active".equals(rawStatus)) {
            productStatus = "active";
        } else if (needsApproval) {
            productStatus = "pending_approval";
        } else {
            productStatus = "draft";
        }
        jdbc.update(
            "INSERT INTO products(product_code,product_name,description,enquiry_impact,coverage_scope,data_mode,"
                + "pricing_model,product_status,created_at,updated_at,is_deleted)"
                + " VALUES(?,?,?,?,?,?,?,?,?,?,0)",
            code,
            name,
            body.get("description"),
            "HARD",
            coverageScope,
            "LIVE",
            body.get("pricingModel") != null ? String.valueOf(body.get("pricingModel")) : "PER_HIT",
            productStatus,
            now,
            now
        );
        Long newId = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);

        // Persist packet selection + raw field enablement (if provided by SPA).
        List<String> packetIds = asStringList(body.get("packetIds"));
        List<Map<String, Object>> packetConfigs = asObjectMapList(body.get("packetConfigs"));
        if (newId != null && !packetIds.isEmpty()) {
            replaceProductPacketConfig(newId, packetIds, packetConfigs);
        }

        if (needsApproval) {
            String desc = body.get("description") != null && !String.valueOf(body.get("description")).isBlank()
                ? String.valueOf(body.get("description")).trim()
                : "New data product — pending catalogue approval";
            approvalQueueService.enqueue(
                "product",
                String.valueOf(newId),
                name,
                desc,
                currentUser != null ? currentUser.getId() : null
            );
        }
        auditService.log(currentUser, "PRODUCT_CREATED", "product", String.valueOf(newId),
            "Product created: " + name, getIp(req));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", String.valueOf(newId));
        out.put("name", name);
        out.put("type", coverageScope);
        out.put("status", productStatus);
        out.put("lastUpdated", now);
        return ResponseEntity.status(201).body(out);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    @Transactional
    public ResponseEntity<Void> update(
        @PathVariable Long id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        jdbc.update(
            "UPDATE products SET product_name=COALESCE(?,product_name), product_status=COALESCE(?,product_status),"
                + " updated_at=? WHERE id=?",
            body.get("name") != null ? String.valueOf(body.get("name")) : null,
            body.get("status") != null ? String.valueOf(body.get("status")) : null,
            LocalDateTime.now().toString(),
            id
        );

        List<String> packetIds = asStringList(body.get("packetIds"));
        List<Map<String, Object>> packetConfigs = asObjectMapList(body.get("packetConfigs"));
        if (!packetIds.isEmpty() || body.containsKey("packetConfigs") || body.containsKey("packetIds")) {
            replaceProductPacketConfig(id, packetIds, packetConfigs);
        }

        auditService.log(currentUser, "PRODUCT_UPDATED", "product", String.valueOf(id), "Product updated", getIp(req));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest req
    ) {
        jdbc.update("UPDATE products SET is_deleted=1, deleted_at=? WHERE id=?", LocalDateTime.now().toString(), id);
        auditService.log(currentUser, "PRODUCT_DELETED", "product", String.valueOf(id), "Product deleted", getIp(req));
        return ResponseEntity.noContent().build();
    }

    /**
     * SQLite / JDBC may lower-case column labels ({@code productcode} vs {@code productCode}), which breaks SPA
     * catalogue merge keyed on {@code productCode}. Emit stable camelCase JSON keys.
     */
    private static String jdbcKeyNorm(String k) {
        if (k == null) {
            return "";
        }
        return k.toLowerCase(Locale.ROOT).replace("_", "");
    }

    private static Object jdbcGetCi(Map<String, Object> row, String logicalKey) {
        String target = jdbcKeyNorm(logicalKey);
        for (Map.Entry<String, Object> e : row.entrySet()) {
            if (jdbcKeyNorm(e.getKey()).equals(target)) {
                return e.getValue();
            }
        }
        return null;
    }

    private static String jdbcString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static String jdbcIdString(Object id) {
        if (id == null) {
            return "";
        }
        if (id instanceof Number n) {
            return String.valueOf(n.longValue());
        }
        return String.valueOf(id);
    }

    private Map<String, Object> normalizeProductListRow(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", jdbcIdString(jdbcGetCi(row, "id")));
        m.put("productCode", jdbcString(jdbcGetCi(row, "productCode")));
        m.put("name", jdbcString(jdbcGetCi(row, "name")));
        m.put("type", jdbcString(jdbcGetCi(row, "type")));
        m.put("status", jdbcString(jdbcGetCi(row, "status")));
        m.put("description", jdbcString(jdbcGetCi(row, "description")));
        m.put("lastUpdated", jdbcString(jdbcGetCi(row, "lastUpdated")));
        m.put("pricingModel", jdbcString(jdbcGetCi(row, "pricingModel")));
        return m;
    }

    private Map<String, Object> normalizeProductDetailRow(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>(normalizeProductListRow(row));
        m.put("enquiryImpact", jdbcString(jdbcGetCi(row, "enquiryImpact")));
        m.put("dataMode", jdbcString(jdbcGetCi(row, "dataMode")));
        return m;
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
