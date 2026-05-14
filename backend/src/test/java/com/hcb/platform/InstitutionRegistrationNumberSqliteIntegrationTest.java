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

import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * POST /institutions without registrationNumber → server assigns {@code PREFIX-Slug3-YYYY-id}.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = {
        "spring.profiles.active=test-sqlite-dashboard",
        "spring.datasource.url=jdbc:sqlite:file:mem_inst_reg_num?mode=memory&cache=shared",
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
class InstitutionRegistrationNumberSqliteIntegrationTest {

    private static final Pattern AUTO_REG_PATTERN = Pattern.compile("^BK-ITA-\\d{4}-\\d{5}$");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST institutions without registrationNumber assigns final BK-Slug-YYYY-id")
    void postWithoutRegistrationNumber_assignsFormattedNumber() throws Exception {
        String token = loginAccessToken();

        String body = """
            {
              "name": "Ita Registration Test Bank",
              "tradingName": "ITA Trade",
              "institutionType": "Commercial Bank",
              "jurisdiction": "Kenya",
              "licenseNumber": "LIC-ITA-1",
              "contactEmail": "ita@example.com",
              "contactPhone": "+254700000001",
              "isDataSubmitter": true,
              "isSubscriber": false
            }
            """;

        MvcResult res = mockMvc.perform(post("/api/v1/institutions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.registrationNumber").exists())
            .andReturn();

        JsonNode node = objectMapper.readTree(res.getResponse().getContentAsString());
        String reg = node.path("registrationNumber").asText();
        String id = node.path("id").asText();
        assertThat(reg).doesNotStartWith("AUTO-");
        assertThat(AUTO_REG_PATTERN.matcher(reg).matches()).isTrue();
        assertThat(reg).endsWith("-" + String.format("%05d", Integer.parseInt(id)));

        mockMvc.perform(get("/api/v1/institutions/" + id)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.registrationNumber").value(reg));
    }

    @Test
    @DisplayName("POST institutions with explicit registrationNumber preserves client value")
    void postWithRegistrationNumber_keepsClientValue() throws Exception {
        String token = loginAccessToken();
        String custom = "MANUAL-REG-IT-99999";

        String body = """
            {
              "name": "Manual Reg Name Bank",
              "tradingName": "MRB",
              "institutionType": "Fintech",
              "jurisdiction": "Kenya",
              "licenseNumber": "LIC-MR-1",
              "registrationNumber": "%s",
              "contactEmail": "mr@example.com",
              "contactPhone": "+254700000002",
              "isDataSubmitter": true,
              "isSubscriber": false
            }
            """.formatted(custom);

        mockMvc.perform(post("/api/v1/institutions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.registrationNumber").value(custom));
    }

    private String loginAccessToken() throws Exception {
        MvcResult r = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"super@hcb.com\",\"password\":\"Super@1234\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andReturn();
        return objectMapper.readTree(r.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
