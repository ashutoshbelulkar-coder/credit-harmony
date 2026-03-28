package com.hcb.platform.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/**
 * User entity — Single source of truth for user identity, credentials, and status.
 *
 * Normalization rules applied:
 * - email owned here ONLY (no copies in other tables)
 * - password_hash stored here ONLY (bcrypt, never plain text)
 * - display_name owned here ONLY (activity logs reference user_id FK)
 * - roles resolved via user_role_assignments (not stored here)
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 150)
    private String displayName;

    @Column(name = "given_name", length = 100)
    private String givenName;

    @Column(name = "family_name", length = 100)
    private String familyName;

    @Column(name = "user_account_status", nullable = false, length = 20)
    private String userAccountStatus;

    @Column(name = "mfa_enabled", nullable = false)
    private boolean mfaEnabled;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id")
    private Institution institution;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<UserRoleAssignment> roleAssignments;

    // --- UserDetails implementation ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (roleAssignments == null) return List.of();
        return roleAssignments.stream()
            .map(ura -> new SimpleGrantedAuthority("ROLE_" + ura.getRole().getRoleName()
                .toUpperCase().replace(" ", "_")))
            .collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !"suspended".equalsIgnoreCase(userAccountStatus)
            && !"deactivated".equalsIgnoreCase(userAccountStatus);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return !isDeleted && "active".equalsIgnoreCase(userAccountStatus);
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
