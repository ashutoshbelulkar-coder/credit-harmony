package com.hcb.platform.controller;

import com.hcb.platform.model.entity.User;
import com.hcb.platform.model.entity.Institution;
import com.hcb.platform.repository.UserRepository;
import com.hcb.platform.repository.InstitutionRepository;
import com.hcb.platform.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
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
 * - DELETE /api/v1/users/{id}   — soft-delete user
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final InstitutionRepository institutionRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Page<User>> list(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Long institutionId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("displayName").ascending());
        List<User> all = userRepository.findAll();
        List<User> filtered = all.stream()
            .filter(u -> !u.isDeleted())
            .filter(u -> status == null || status.isBlank() || status.equalsIgnoreCase(u.getUserAccountStatus()))
            .filter(u -> search == null || search.isBlank()
                || u.getEmail().toLowerCase().contains(search.toLowerCase())
                || (u.getDisplayName() != null && u.getDisplayName().toLowerCase().contains(search.toLowerCase())))
            .filter(u -> institutionId == null
                || (u.getInstitution() != null && institutionId.equals(u.getInstitution().getId())))
            .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<User> pageContent = start >= filtered.size() ? Collections.emptyList() : filtered.subList(start, end);
        return ResponseEntity.ok(new PageImpl<>(pageContent, pageable, filtered.size()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<User> get(@PathVariable Long id) {
        return userRepository.findById(id)
            .filter(u -> !u.isDeleted())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/invitations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<User> invite(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal User currentUser,
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
        user.setUserAccountStatus("Invited");
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setDeleted(false);
        user.setCreatedAt(LocalDateTime.now());

        if (body.containsKey("institutionId")) {
            Long instId = ((Number) body.get("institutionId")).longValue();
            institutionRepository.findById(instId).ifPresent(user::setInstitution);
        }

        User saved = userRepository.save(user);
        auditService.log(currentUser, "USER_INVITED", "user", String.valueOf(saved.getId()),
            "User invited: " + email, getClientIp(request));
        return ResponseEntity.status(201).body(saved);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<User> update(
        @PathVariable Long id,
        @RequestBody Map<String, Object> updates,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest request
    ) {
        return userRepository.findById(id).map(u -> {
            if (updates.containsKey("displayName")) u.setDisplayName((String) updates.get("displayName"));
            if (updates.containsKey("userAccountStatus")) u.setUserAccountStatus((String) updates.get("userAccountStatus"));
            User saved = userRepository.save(u);
            auditService.log(currentUser, "USER_UPDATED", "user", String.valueOf(id),
                "User updated", getClientIp(request));
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN')")
    public ResponseEntity<Void> suspend(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest request
    ) {
        return userRepository.findById(id).map(u -> {
            u.setUserAccountStatus("Suspended");
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
        @AuthenticationPrincipal User currentUser,
        HttpServletRequest request
    ) {
        return userRepository.findById(id).map(u -> {
            u.setUserAccountStatus("Active");
            userRepository.save(u);
            auditService.log(currentUser, "USER_ACTIVATED", "user", String.valueOf(id),
                "User activated", getClientIp(request));
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser,
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

    private String getClientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        return (fwd != null && !fwd.isEmpty()) ? fwd.split(",")[0].trim() : req.getRemoteAddr();
    }
}
