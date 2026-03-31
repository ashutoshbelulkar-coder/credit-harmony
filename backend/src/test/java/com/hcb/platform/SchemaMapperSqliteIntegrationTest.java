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
 * Schema Mapper API on Spring — SQLite + full DDL + seed (same as dev-style integration tests).
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.MOCK,
    properties = {
        "spring.profiles.active=test-sqlite-schema-mapper",
        "spring.datasource.url=jdbc:sqlite:file:mem_schema_mapper?mode=memory&cache=shared",
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
class SchemaMapperSqliteIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Schema mapper GET /schemas returns 401 without JWT")
    void schemasRequireAuth() throws Exception {
        mockMvc.perform(get("/api/v1/schema-mapper/schemas"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Login + Bearer: wizard-metadata, schemas, source-type-fields, ingest, mapping job completes")
    void schemaMapperHappyPathWithJwt() throws Exception {
        String token = loginAccessToken();

        mockMvc.perform(get("/api/v1/schema-mapper/wizard-metadata")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sourceTypeOptions").isArray())
            .andExpect(jsonPath("$.dataCategoryOptions").isArray());

        mockMvc.perform(get("/api/v1/schema-mapper/schemas")
                .param("sourceType", "bank")
                .param("page", "0")
                .param("size", "50")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").exists());

        mockMvc.perform(get("/api/v1/schema-mapper/schemas/source-type-fields")
                .param("sourceType", "bank")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.fields").isArray());

        mockMvc.perform(get("/api/v1/schema-mapper/schemas/source-type-fields")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());

        String ingestBody = """
            {"sourceName":"Test Source Co","sourceType":"telecom","versionNumber":"v0.1"}
            """;
        MvcResult ingestRes = mockMvc.perform(post("/api/v1/schema-mapper/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingestBody)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.schemaVersionId").exists())
            .andReturn();
        JsonNode ingestJson = objectMapper.readTree(ingestRes.getResponse().getContentAsString());
        String verId = ingestJson.get("schemaVersionId").asText();

        MvcResult mapRes = mockMvc.perform(post("/api/v1/schema-mapper/mappings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"schemaVersionId\":\"" + verId + "\"}")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.mappingId").exists())
            .andReturn();
        String mappingId = objectMapper.readTree(mapRes.getResponse().getContentAsString())
            .get("mappingId").asText();

        String terminal = null;
        for (int i = 0; i < 40; i++) {
            Thread.sleep(150);
            MvcResult mr = mockMvc.perform(get("/api/v1/schema-mapper/mappings/" + mappingId)
                    .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
            terminal = objectMapper.readTree(mr.getResponse().getContentAsString()).get("status").asText();
            if ("needs_review".equals(terminal)) break;
        }
        assertThat(terminal).isEqualTo("needs_review");
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
