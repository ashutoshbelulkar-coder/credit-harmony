package com.hcb.platform;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SQLite + seed coverage for Spring–SPA route parity (API keys create, drift alerts, user deactivate).
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = {
        "spring.profiles.active=test-sqlite-route-parity",
        "spring.datasource.url=jdbc:sqlite:file:mem_route_parity?mode=memory&cache=shared",
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
        "hcb.dev.sync-seed-passwords=false",
        "hcb.schema-mapper.enabled=true",
        "hcb.schema-mapper.llm-enabled=false"
    }
)
@AutoConfigureMockMvc
class RouteParitySqliteIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/data-ingestion/drift-alerts returns alerts array")
    @WithMockUser(roles = "ANALYST")
    void driftAlertsOk() throws Exception {
        mockMvc.perform(get("/api/v1/data-ingestion/drift-alerts"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.alerts").isArray())
            .andExpect(jsonPath("$.alerts.length()").value(greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("POST /api/v1/api-keys creates key for institution 1")
    @WithMockUser(roles = "BUREAU_ADMIN")
    void createApiKeyCreated() throws Exception {
        mockMvc.perform(post("/api/v1/api-keys")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"institutionId\":1,\"environment\":\"sandbox\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.keyPrefix").exists())
            .andExpect(jsonPath("$.environment").value("sandbox"));
    }

    @Test
    @DisplayName("POST /api/v1/users/12/deactivate returns 204")
    @WithMockUser(roles = "BUREAU_ADMIN")
    void deactivateUserNoContent() throws Exception {
        mockMvc.perform(post("/api/v1/users/12/deactivate"))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("GET consortiums, products, reports, sla-configs, alert-rules, users, audit-logs return 200 (schema-aligned JDBC)")
    @WithMockUser(roles = "ANALYST")
    void coreSchemaAlignedGetRoutesOk() throws Exception {
        mockMvc.perform(get("/api/v1/consortiums"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").exists());

        mockMvc.perform(get("/api/v1/products").param("size", "100"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());

        mockMvc.perform(get("/api/v1/reports").param("size", "100"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());

        mockMvc.perform(get("/api/v1/sla-configs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/v1/alert-rules"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/v1/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.content[0].roles").isArray());

        mockMvc.perform(get("/api/v1/audit-logs").param("entityType", "GOVERNANCE").param("size", "50"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());

        mockMvc.perform(get("/api/v1/audit-logs").param("page", "0").param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").exists());
    }
}
