package com.hcb.platform.service;

import com.hcb.platform.security.AuthUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Loads authentication principals via JDBC so SQLite is not subject to Hibernate join bugs on login.
 */
@Service
@RequiredArgsConstructor
public class AuthAccountService implements UserDetailsService {

    private final JdbcTemplate jdbc;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        return loadPrincipalByEmail(normalized);
    }

    public AuthUserPrincipal loadPrincipalByUserId(long userId) {
        Map<String, Object> row;
        try {
            row = jdbc.queryForMap(
                """
                    SELECT u.id, u.email, u.password_hash, u.display_name, u.user_account_status, u.is_deleted,
                           u.institution_id, i.name AS institution_name
                    FROM users u
                    LEFT JOIN institutions i ON i.id = u.institution_id
                    WHERE u.id = ? AND NOT u.is_deleted
                    """,
                userId
            );
        } catch (EmptyResultDataAccessException e) {
            throw new UsernameNotFoundException("User not found");
        }
        return mapRow(row);
    }

    private AuthUserPrincipal loadPrincipalByEmail(String normalizedEmail) {
        Map<String, Object> row;
        try {
            row = jdbc.queryForMap(
                """
                    SELECT u.id, u.email, u.password_hash, u.display_name, u.user_account_status, u.is_deleted,
                           u.institution_id, i.name AS institution_name
                    FROM users u
                    LEFT JOIN institutions i ON i.id = u.institution_id
                    WHERE lower(u.email) = lower(?) AND NOT u.is_deleted
                    """,
                normalizedEmail
            );
        } catch (EmptyResultDataAccessException e) {
            throw new UsernameNotFoundException("User not found");
        }
        return mapRow(row);
    }

    private AuthUserPrincipal mapRow(Map<String, Object> row) {
        long id = toLong(row.get("id"));
        String email = (String) row.get("email");
        String passwordHash = (String) row.get("password_hash");
        String displayName = (String) row.get("display_name");
        String status = (String) row.get("user_account_status");
        boolean deleted = toBoolean(row.get("is_deleted"));
        Long institutionId = row.get("institution_id") != null ? toLong(row.get("institution_id")) : null;
        String institutionName = (String) row.get("institution_name");

        List<GrantedAuthority> auths = jdbc.query(
            """
                SELECT r.role_name FROM user_role_assignments ura
                INNER JOIN roles r ON r.id = ura.role_id
                WHERE ura.user_id = ?
                """,
            (rs, i) -> {
                String rn = rs.getString(1);
                String code = "ROLE_" + rn.toUpperCase(Locale.ROOT).replace(" ", "_");
                return new SimpleGrantedAuthority(code);
            },
            id
        );

        return new AuthUserPrincipal(
            id, email, passwordHash, displayName, institutionId, institutionName, auths, status, deleted
        );
    }

    private static long toLong(Object v) {
        if (v instanceof Number n) {
            return n.longValue();
        }
        return Long.parseLong(String.valueOf(v));
    }

    private static boolean toBoolean(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        if (v instanceof Number n) {
            return n.intValue() != 0;
        }
        return Boolean.parseBoolean(String.valueOf(v));
    }
}
