package com.hcb.platform.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Hibernate + SQLite often persists {@code LocalDateTime} as INTEGER (epoch ms) while SQL seed uses
 * TEXT datetimes. Mixed {@code typeof()} in the same column can break JPA hydration and yield 500 on
 * {@code GET /api/v1/institutions}. Normalise dev SQLite rows on startup.
 */
@Component
@Profile("dev")
@Order(1001)
@Slf4j
@RequiredArgsConstructor
public class SqliteInstitutionDatetimeSanitizer implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final Environment environment;

    @Override
    public void run(ApplicationArguments args) {
        String url = environment.getProperty("spring.datasource.url", "");
        if (!url.contains("jdbc:sqlite")) {
            return;
        }
        try {
            int n1 = jdbc.update(
                """
                    UPDATE institutions
                    SET created_at = datetime(CAST(created_at AS INTEGER) / 1000, 'unixepoch')
                    WHERE typeof(created_at) = 'integer'
                    """
            );
            int n2 = jdbc.update(
                """
                    UPDATE institutions
                    SET updated_at = datetime(CAST(updated_at AS INTEGER) / 1000, 'unixepoch')
                    WHERE typeof(updated_at) = 'integer'
                    """
            );
            int n3 = jdbc.update(
                """
                    UPDATE institutions
                    SET onboarded_at = REPLACE(SUBSTR(onboarded_at, 1, 19), 'T', ' ')
                    WHERE typeof(onboarded_at) = 'text' AND onboarded_at LIKE '%T%'
                    """
            );
            if (n1 > 0 || n2 > 0 || n3 > 0) {
                log.info(
                    "SQLite institution datetime sanitizer: created_at rows={}, updated_at rows={}, onboarded_at rows={}",
                    n1,
                    n2,
                    n3
                );
            }
        } catch (Exception e) {
            log.warn("SQLite institution datetime sanitizer failed: {}", e.getMessage());
        }
    }
}
