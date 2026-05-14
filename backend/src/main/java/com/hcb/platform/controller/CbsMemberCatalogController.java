package com.hcb.platform.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Master catalog of Core Banking System member codes (admin-seeded).
 * The consortium wizard selects from this list; operators do not create new codes in the UI.
 */
@RestController
@RequestMapping("/api/v1/cbs-member-catalog")
@RequiredArgsConstructor
public class CbsMemberCatalogController {

    private final JdbcTemplate jdbc;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(jdbc.queryForList(
            "SELECT CAST(id AS TEXT) AS id, member_code AS memberId, display_label AS displayName, created_at AS createdAt"
                + " FROM cbs_member_catalog ORDER BY member_code"
        ));
    }
}
