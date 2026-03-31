package com.hcb.platform.controller;

import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.UserRepository;
import com.hcb.platform.repository.InstitutionRepository;
import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * User Management Controller
 * - GET /api/v1/users           — paged user list with optional filters
 * - GET /api/v1/users/{id}      — single user
 * - POST /api/v1/users/invitations — invite new user
 * - PATCH /api/v1/users/{id}    — update user attributes
 * - POST /api/v1/users/{id}/suspend   — suspend user account
 * - POST /api/v1/users/{id}/activate  — reactivate user account
 * - POST /api/v1/users/{id}/deactivate — set account status to deactivated (Bureau Admin+)
 * - DELETE /api/v1/users/{id}   — soft-delete user (Super Admin only)
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private static final String USER_ROW_SELECT = ""
        + "SELECT u.id, u.email, u.display_name as displayName, u.given_name as givenName, u.family_name as familyName, "
        + "u.user_account_status as userAccountStatus, u.mfa_enabled as mfaEnabled, u.institution_id as institutionId, "
        + "i.name as institutionName, u.created_at as createdAt, u.last_login_at as lastLoginAt, "
        + "(SELECT group_concat(r.role_name, ',') FROM user_role_assignments ura "
        + "INNER JOIN roles r ON r.id=ura.role_id WHERE ura.user_id=u.id) as rolesCsv "
        + "FROM users u LEFT JOIN institutions i ON i.id=u.institution_id ";

    private final UserRepository userRepository;
    private final InstitutionRepository institutionRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Page<Map<String, Object>>> list(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Long institutionId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE u.is_deleted=0 ");
        List<Object> params = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            String q = "%" + search.trim() + "%";
            where.append(" AND (lower(u.email) LIKE lower(?) OR lower(u.display_name) LIKE lower(?)) ");
            params.add(q);
            params.add(q);
        }
        if (status != null && !status.isBlank()) {
            where.append(" AND lower(u.user_account_status)=lower(?) ");
            params.add(status);
        }
        if (institutionId != null) {
            where.append(" AND u.institution_id=? ");
            params.add(institutionId);
        }

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM users u " + where, Long.class, params.toArray());
        Pageable pageable = PageRequest.of(page, size);
        String sql = USER_ROW_SELECT + where + " ORDER BY u.display_name ASC LIMIT ? OFFSET ?";
        List<Object> qparams = new ArrayList<>(params);
        qparams.add(size);
        qparams.add(page * size);
        List<Map<String, Object>> raw = jdbc.queryForList(sql, qparams.toArray());
        List<Map<String, Object>> content = new ArrayList<>();
        for (Map<String, Object> row : raw) {
            content.add(normalizeUserRow(new LinkedHashMap<>(row)));
        }
        return ResponseEntity.ok(new PageImpl<>(content, pageable, total != null ? total : 0));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            USER_ROW_SELECT + " WHERE u.id=? AND NOT u.is_deleted",
            id
        );
        if (rows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(normalizeUserRow(new LinkedHashMap<>(rows.get(0))));
    }

    @PostMapping("/invitations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> invite(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        String email = (String) body.get("email");
        if (email == null || email.isBlank()) return ResponseEntity.badRequest().build();
        if (userRepository.existsByEmailAndIsDeletedFalse(email)) {
            return ResponseEntity.status(409).build();
        }

        User user = new User();
        user.setEmail(email);
        user.setDisplayName(email.split("@")[0]);
        user.setUserAccountStatus("invited");
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setDeleted(false);
        user.setCreatedAt(LocalDateTime.now());

        if (body.containsKey("institutionId")) {
            Long instId = ((Number) body.get("institutionId")).longValue();
            institutionRepository.findById(instId).ifPresent(user::setInstitution);
        }

        User saved = userRepository.save(user);
        userRepository.flush();
        auditService.log(currentUser, "USER_INVITED", "user", String.valueOf(saved.getId()),
            "User invited: " + email, getClientIp(request));
        return ResponseEntity.status(201).body(Objects.requireNonNull(loadUserRow(saved.getId())));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Map<String, Object>> update(
        @PathVariable Long id,
        @RequestBody Map<String, Object> updates,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        return userRepository.findById(id).map(u -> {
            if (updates.containsKey("displayName")) u.setDisplayName((String) updates.get("displayName"));
            if (updates.containsKey("userAccountStatus")) u.setUserAccountStatus((String) updates.get("userAccountStatus"));
            userRepository.save(u);
            userRepository.flush();
            auditService.log(currentUser, "USER_UPDATED", "user", String.valueOf(id),
                "User updated", getClientIp(request));
            return ResponseEntity.ok(Objects.requireNonNull(loadUserRow(id)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> suspend(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        return userRepository.findById(id).map(u -> {
            u.setUserAccountStatus("suspended");
            userRepository.save(u);
            auditService.log(currentUser, "USER_SUSPENDED", "user", String.valueOf(id),
                "User suspended", getClientIp(request));
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> activate(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        return userRepository.findById(id).map(u -> {
            u.setUserAccountStatus("active");
            userRepository.save(u);
            auditService.log(currentUser, "USER_ACTIVATED", "user", String.valueOf(id),
                "User activated", getClientIp(request));
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> deactivate(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        User u = opt.get();
        if (u.isDeleted()) return ResponseEntity.notFound().build();
        u.setUserAccountStatus("deactivated");
        userRepository.save(u);
        auditService.log(currentUser, "USER_DEACTIVATE", "user", String.valueOf(id),
            "User deactivated: " + u.getEmail(), getClientIp(request));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal AuthUserPrincipal currentUser,
        HttpServletRequest request
    ) {
        return userRepository.findById(id).map(u -> {
            u.setDeleted(true);
            u.setDeletedAt(LocalDateTime.now());
            userRepository.save(u);
            auditService.log(currentUser, "USER_DELETED", "user", String.valueOf(id),
                "User soft-deleted", getClientIp(request));
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> normalizeUserRow(Map<String, Object> row) {
        Object csvObj = row.remove("rolesCsv");
        String csv = csvObj != null ? String.valueOf(csvObj) : "";
        List<String> roles = csv.isBlank() ? List.of() : Arrays.asList(csv.split(","));
        row.put("roles", roles);
        Object mfa = row.get("mfaEnabled");
        row.put("mfaEnabled", mfa instanceof Number n ? n.intValue() != 0 : Boolean.TRUE.equals(mfa));
        return row;
    }

    private Map<String, Object> loadUserRow(long userId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            USER_ROW_SELECT + " WHERE u.id=? AND NOT u.is_deleted",
            userId
        );
        if (rows.isEmpty()) return null;
        return normalizeUserRow(new LinkedHashMap<>(rows.get(0)));
    }

    private String getClientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
