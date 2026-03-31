package com.hcb.platform.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * UserDetails built from plain JDBC — avoids Hibernate 6 + SQLite generating invalid SQL
 * ({@code ra1_0.id}) when loading {@link com.hcb.platform.model.entity.User} with role graphs.
 */
@Getter
public class AuthUserPrincipal implements UserDetails {

    private final long id;
    private final String email;
    private final String encodedPassword;
    private final String displayName;
    private final Long institutionId;
    private final String institutionName;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean enabled;
    private final boolean accountNonLocked;

    public AuthUserPrincipal(
        long id,
        String email,
        String encodedPassword,
        String displayName,
        Long institutionId,
        String institutionName,
        Collection<? extends GrantedAuthority> authorities,
        String userAccountStatus,
        boolean deleted
    ) {
        this.id = id;
        this.email = email;
        this.encodedPassword = encodedPassword;
        this.displayName = displayName;
        this.institutionId = institutionId;
        this.institutionName = institutionName;
        this.authorities = authorities;
        this.enabled = !deleted && "active".equalsIgnoreCase(userAccountStatus);
        this.accountNonLocked = !"suspended".equalsIgnoreCase(userAccountStatus)
            && !"deactivated".equalsIgnoreCase(userAccountStatus);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return encodedPassword;
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
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
