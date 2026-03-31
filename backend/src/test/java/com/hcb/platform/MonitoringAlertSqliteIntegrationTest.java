package com.hcb.platform;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SQLite + seed JDBC coverage for monitoring and alert-incidents (schema parity with {@code create_tables.sql}).
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = {
        "spring.profiles.active=test-sqlite-dashboard",
        "spring.datasource.url=jdbc:sqlite:file:mem_monitoring?mode=memory&cache=shared",
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
class MonitoringAlertSqliteIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/monitoring/kpis returns 200 with KPI keys")
    @WithMockUser(roles = "SUPER_ADMIN")
    void monitoringKpisOk() throws Exception {
        mockMvc.perform(get("/api/v1/monitoring/kpis"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCallsToday").exists())
            .andExpect(jsonPath("$.successRatePercent").exists())
            .andExpect(jsonPath("$.activeApiKeys").exists());
    }

    @Test
    @DisplayName("GET /api/v1/monitoring/charts returns chart arrays")
    @WithMockUser(roles = "SUPER_ADMIN")
    void monitoringChartsOk() throws Exception {
        mockMvc.perform(get("/api/v1/monitoring/charts"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apiCallVolume30Days").isArray())
            .andExpect(jsonPath("$.latencyTrendData").isArray())
            .andExpect(jsonPath("$.successVsFailureData").isArray())
            .andExpect(jsonPath("$.topRejectionReasonsData").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/monitoring/api-requests returns paged content")
    @WithMockUser(roles = "SUPER_ADMIN")
    void monitoringApiRequestsOk() throws Exception {
        mockMvc.perform(get("/api/v1/monitoring/api-requests").param("page", "0").param("size", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").exists());
    }

    @Test
    @DisplayName("GET /api/v1/monitoring/enquiries returns paged content")
    @WithMockUser(roles = "SUPER_ADMIN")
    void monitoringEnquiriesOk() throws Exception {
        mockMvc.perform(get("/api/v1/monitoring/enquiries").param("page", "0").param("size", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(0)));
    }

    @Test
    @DisplayName("GET /api/v1/alert-incidents returns seeded rows")
    @WithMockUser(roles = "SUPER_ADMIN")
    void alertIncidentsOk() throws Exception {
        mockMvc.perform(get("/api/v1/alert-incidents").param("page", "0").param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(1)));
    }

    @Test
    @DisplayName("GET /api/v1/alert-incidents/charts returns aggregations")
    @WithMockUser(roles = "SUPER_ADMIN")
    void alertChartsOk() throws Exception {
        mockMvc.perform(get("/api/v1/alert-incidents/charts"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.triggeredOverTime").isArray())
            .andExpect(jsonPath("$.byDomain").isArray())
            .andExpect(jsonPath("$.severityDistribution").isArray())
            .andExpect(jsonPath("$.mttrTrend").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/alert-incidents/breach-history returns SLA breach rows")
    @WithMockUser(roles = "SUPER_ADMIN")
    void breachHistoryOk() throws Exception {
        mockMvc.perform(get("/api/v1/alert-incidents/breach-history"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].slaType").exists())
            .andExpect(jsonPath("$[0].metric").exists());
    }

    @Test
    @DisplayName("GET /api/v1/institutions/{id}/overview-charts returns series keys")
    @WithMockUser(roles = "SUPER_ADMIN")
    void institutionOverviewChartsOk() throws Exception {
        mockMvc.perform(get("/api/v1/institutions/1/overview-charts"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.submissionVolumeData").isArray())
            .andExpect(jsonPath("$.enquiryVolumeData").isArray())
            .andExpect(jsonPath("$.successVsRejectedData").isArray());
    }
}
