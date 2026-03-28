package com.hcb.platform.controller;

import com.hcb.platform.model.entity.Role;
import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.RoleRepository;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Role Controller
 * - GET    /api/v1/roles        — list all roles
 * - POST   /api/v1/roles        — create role (Super Admin only)
 * - PATCH  /api/v1/roles/{id}   — update role
 * - DELETE /api/v1/roles/{id}   — soft-delete role
 */
@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleRepository roleRepository;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<List<Role>> list() {
        return ResponseEntity.ok(roleRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Role> create(
        @RequestBody Role role,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        Role saved = roleRepository.save(role);
        auditService.log(currentUser, "ROLE_CREATED", "role", String.valueOf(saved.getId()),
            "Role created: " + saved.getRoleName(), getIp(req));
        return ResponseEntity.status(201).body(saved);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Role> update(
        @PathVariable Long id,
        @RequestBody Role updates,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        return roleRepository.findById(id).map(r -> {
            if (updates.getRoleName() != null) r.setRoleName(updates.getRoleName());
            if (updates.getDescription() != null) r.setDescription(updates.getDescription());
            Role saved = roleRepository.save(r);
            auditService.log(currentUser, "ROLE_UPDATED", "role", String.valueOf(id), "Role updated", getIp(req));
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest req
    ) {
        roleRepository.deleteById(id);
        auditService.log(currentUser, "ROLE_DELETED", "role", String.valueOf(id), "Role deleted", getIp(req));
        return ResponseEntity.noContent().build();
    }

    private String getIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
