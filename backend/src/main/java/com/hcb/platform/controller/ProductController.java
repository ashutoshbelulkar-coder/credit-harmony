package com.hcb.platform.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hcb.platform.model.entity.User;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
        if (search != null && !search.isBlank()) { where.append(" AND p.product_name LIKE ?"); params.add("%" + search + "%"); }
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) { where.append(" AND p.product_status=?"); params.add(status); }
        if (type != null && !type.isBlank()) { where.append(" AND p.product_type=?"); params.add(type); }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM products p " + where, Long.class, params.toArray());
        String sql = "SELECT p.id, p.product_name as name, p.product_type as type,"
            + " p.product_status as status, p.description, p.updated_at as lastUpdated"
            + " FROM products p " + where + " ORDER BY p.product_name LIMIT ? OFFSET ?";
        List<Object> dp = new ArrayList<>(params); dp.add(size); dp.add(page * size);
        return ResponseEntity.ok(buildPage(jdbc.queryForList(sql, dp.toArray()), total != null ? total : 0, page, size));
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
            "SELECT p.*, pc.category_name FROM products p"
            + " LEFT JOIN product_categories pc ON pc.id=p.category_id WHERE p.id=? AND p.is_deleted=0", id);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        String now = LocalDateTime.now().toString();
        jdbc.update("INSERT INTO products(product_name,product_type,product_status,description,created_by_user_id,created_at,updated_at,is_deleted) VALUES(?,?,?,?,?,?,?,0)",
            body.get("name"), body.get("type"), "draft", body.get("description"), currentUser.getId(), now, now);
        Long id = jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
        auditService.log(currentUser, "PRODUCT_CREATED", "product", String.valueOf(id), "Product created: " + body.get("name"), getIp(req));
        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> update(@PathVariable Long id, @RequestBody Map<String, Object> body, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE products SET product_name=COALESCE(?,product_name), product_status=COALESCE(?,product_status), updated_at=? WHERE id=?",
            body.get("name"), body.get("status"), LocalDateTime.now().toString(), id);
        auditService.log(currentUser, "PRODUCT_UPDATED", "product", String.valueOf(id), "Product updated", getIp(req));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User currentUser, HttpServletRequest req) {
        jdbc.update("UPDATE products SET is_deleted=1 WHERE id=?", id);
        auditService.log(currentUser, "PRODUCT_DELETED", "product", String.valueOf(id), "Product deleted", getIp(req));
        return ResponseEntity.noContent().build();
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
