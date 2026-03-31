package com.hcb.platform.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * After SQL init, re-encodes known dev passwords with the live {@link PasswordEncoder} bean so login
 * always matches Spring Security even if the SQLite file was copied from another machine, partially
 * migrated, or seed bcrypt strings drifted.
 *
 * <p>Runs only for {@code dev} — never {@code prod}.</p>
 */
@Component
@Profile("dev")
@ConditionalOnProperty(prefix = "hcb.dev", name = "sync-seed-passwords", havingValue = "true", matchIfMissing = true)
@Order(1000)
@Slf4j
@RequiredArgsConstructor
public class DevAuthDataBootstrap implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) {
        String url = environment.getProperty("spring.datasource.url", "");
        if (url.contains("sqlite")) {
            log.info("SQLite JDBC URL (set HCB_DB_PATH to override file location): {}", url);
        }

        int n = jdbc.update(
            "UPDATE users SET password_hash = ? WHERE lower(email) = lower(?) AND NOT is_deleted",
            passwordEncoder.encode("Admin@1234"),
            "admin@hcb.com"
        );
        if (n == 0) {
            log.warn("Dev auth bootstrap: no row updated for admin@hcb.com — check seed data and DB path");
        }
    }
}
