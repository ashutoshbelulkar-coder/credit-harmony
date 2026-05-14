package com.hcb.platform;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Runs the same JDBC + SQLite SQL paths as dev (create_tables.sql + seed_data.sql).
 * Catches SQLite + JDBC issues that H2-only tests miss (e.g. keyword aliases, dynamic SQL joins).
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = {
        "spring.profiles.active=test-sqlite-dashboard",
        "spring.datasource.url=jdbc:sqlite:file:mem_dashboard?mode=memory&cache=shared",
        "spring.datasource.driver-class-name=org.sqlite.JDBC",
        "spring.datasource.hikari.maximum-pool-size=5",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.database-platform=org.hibernate.community.dialect.SQLiteDialect",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:db/create_tables.sql",
        "spring.sql.init.data-locations=classpath:db/seed_data.sql",
        "management.health.db.enabled=false",
        "management.endpoints.web.exposure.include=health",
        "management.endpoint.health.show-details=never",
        "hcb.jwt.secret=test-secret-key-minimum-32-bytes-long!!",
        "hcb.dev.sync-seed-passwords=false"
    }
)
@AutoConfigureMockMvc
class DashboardCommandCenterSqliteIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/dashboard/command-center works on SQLite + seed schema")
    @WithMockUser(roles = "SUPER_ADMIN")
    void commandCenterReturns200OnSqlite() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/command-center").param("range", "30d"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pendingApprovals").exists())
            .andExpect(jsonPath("$.activeAlerts").exists())
            .andExpect(jsonPath("$.agents").isArray())
            .andExpect(jsonPath("$.batches").isArray())
            .andExpect(jsonPath("$.anomalies").isArray())
            .andExpect(jsonPath("$.memberQuality").isArray());
    }
}
