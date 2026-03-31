package com.hcb.platform;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Approval queue: enqueue on create, GET list {@code metadata}, POST approve/reject → 204 No Content, domain sync.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = {
        "spring.profiles.active=test-sqlite-dashboard",
        "spring.datasource.url=jdbc:sqlite:file:mem_approval_queue?mode=memory&cache=shared",
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
        "hcb.schema-mapper.enabled=false"
    }
)
@AutoConfigureMockMvc
class ApprovalQueueSqliteIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST product with approval_pending enqueues row; GET approvals includes metadata.productId; approve → 204 and product active")
    void productApprovalFlow() throws Exception {
        String token = loginAccessToken();

        MvcResult create = mockMvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"ApprovalQueue IT Product\",\"status\":\"approval_pending\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("pending_approval"))
            .andReturn();

        String productId = objectMapper.readTree(create.getResponse().getContentAsString()).get("id").asText();

        MvcResult listRes = mockMvc.perform(get("/api/v1/approvals")
                .param("type", "product")
                .param("status", "pending")
                .param("page", "0")
                .param("size", "50")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andReturn();

        JsonNode content = objectMapper.readTree(listRes.getResponse().getContentAsString()).get("content");
        String approvalId = null;
        for (JsonNode item : content) {
            if (productId.equals(item.path("metadata").path("productId").asText())) {
                approvalId = item.get("id").asText();
                assertThat(item.get("id").isTextual()).isTrue();
                break;
            }
        }
        assertThat(approvalId).as("pending product approval for created product").isNotNull();

        mockMvc.perform(post("/api/v1/approvals/" + approvalId + "/approve")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/products/" + productId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    @DisplayName("POST alert-rules creates pending_approval rule and enqueues alert_rule with metadata.alertRuleId")
    void alertRuleApprovalFlow() throws Exception {
        String token = loginAccessToken();

        MvcResult create = mockMvc.perform(post("/api/v1/alert-rules")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"IT Alert Rule","domain":"Submission API","condition":"x > 1","severity":"Warning"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("Pending approval"))
            .andReturn();

        String ruleId = objectMapper.readTree(create.getResponse().getContentAsString()).get("id").asText();

        MvcResult listRes = mockMvc.perform(get("/api/v1/approvals")
                .param("type", "alert_rule")
                .param("status", "pending")
                .param("page", "0")
                .param("size", "50")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode content = objectMapper.readTree(listRes.getResponse().getContentAsString()).get("content");
        boolean found = false;
        for (JsonNode item : content) {
            if (ruleId.equals(item.path("metadata").path("alertRuleId").asText())) {
                found = true;
                break;
            }
        }
        assertThat(found).isTrue();
    }

    @Test
    @DisplayName("POST institutions/:id/consortium-memberships with pending enqueues consortium_membership; approve activates member row")
    void consortiumMembershipJoinEnqueuesApproval() throws Exception {
        String token = loginAccessToken();
        // Seed: institution 5 not in consortium 1
        mockMvc.perform(post("/api/v1/institutions/5/consortium-memberships")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"consortiumId\":\"1\",\"consortiumMemberStatus\":\"pending\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.consortiumMemberStatus").value("pending"));

        MvcResult listRes = mockMvc.perform(get("/api/v1/approvals")
                .param("type", "consortium_membership")
                .param("status", "pending")
                .param("page", "0")
                .param("size", "50")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode content = objectMapper.readTree(listRes.getResponse().getContentAsString()).get("content");
        String approvalId = null;
        String membershipId = null;
        for (JsonNode item : content) {
            if ("consortium_membership".equals(item.path("type").asText())) {
                membershipId = item.path("metadata").path("membershipId").asText();
                if (!membershipId.isEmpty()) {
                    approvalId = item.get("id").asText();
                    assertThat(item.path("metadata").path("institutionId").asText()).isEqualTo("5");
                    assertThat(item.path("metadata").path("consortiumId").asText()).isEqualTo("1");
                    break;
                }
            }
        }
        assertThat(approvalId).as("pending consortium_membership approval").isNotNull();
        assertThat(membershipId).isNotBlank();

        mockMvc.perform(post("/api/v1/approvals/" + approvalId + "/approve")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isNoContent());

        MvcResult memRes = mockMvc.perform(get("/api/v1/institutions/5/consortium-memberships")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode memberships = objectMapper.readTree(memRes.getResponse().getContentAsString());
        long mid = Long.parseLong(membershipId);
        boolean foundActive = false;
        for (JsonNode n : memberships) {
            if (n.path("membershipId").asLong() == mid && "active".equals(n.path("consortiumMemberStatus").asText())) {
                foundActive = true;
                break;
            }
        }
        assertThat(foundActive).as("membership row should be active after approval").isTrue();
    }

    @Test
    @DisplayName("POST approvals/:id/reject returns 204 No Content")
    void rejectReturnsNoContent() throws Exception {
        String token = loginAccessToken();
        mockMvc.perform(post("/api/v1/approvals/1/reject")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"integration test reject\"}"))
            .andExpect(status().isNoContent());
    }

    private String loginAccessToken() throws Exception {
        MvcResult r = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@hcb.com\",\"password\":\"Admin@1234\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
