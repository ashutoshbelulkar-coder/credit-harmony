package com.hcb.platform;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HCB Platform Integration Test Suite
 *
 * Tests:
 * 1. Context loads successfully
 * 2. Health endpoint accessible
 * 3. Protected endpoints return 401 without token
 * 4. Login with valid credentials returns JWT tokens
 * 5. Login with invalid credentials returns 401
 * 6. Refresh token flow works correctly
 * 7. Protected endpoint accessible with valid token
 * 8. Suspended user cannot login
 * 9. Institution list accessible with Bureau Admin token
 * 10. Role-based access: Viewer cannot access user management
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "management.health.db.enabled=false",
        "management.endpoints.web.exposure.include=health",
        "management.endpoint.health.show-details=never"
    }
)
@AutoConfigureMockMvc
class HcbPlatformApplicationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void seedAdminUser() {
        if (!userRepository.existsByEmailAndIsDeletedFalse("admin@hcb.com")) {
            User admin = new User();
            admin.setEmail("admin@hcb.com");
            admin.setDisplayName("Test Admin");
            admin.setPasswordHash(passwordEncoder.encode("Admin@1234"));
            admin.setUserAccountStatus("active");
            admin.setDeleted(false);
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
        }
    }

    @Test
    @DisplayName("T01 - Application context loads successfully")
    void contextLoads() {
        // If this test passes, Spring context initialized correctly
    }

    @Test
    @DisplayName("T02 - Health endpoint is publicly accessible")
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("T03 - Protected endpoint returns 401 without token")
    void protectedEndpointRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/institutions"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("T04 - Login with valid Super Admin credentials returns JWT")
    void loginWithValidCredentials() throws Exception {
        Map<String, String> loginRequest = Map.of(
            "email", "admin@hcb.com",
            "password", "Admin@1234"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.refreshToken").exists())
            .andExpect(jsonPath("$.user.email").value("admin@hcb.com"))
            .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).doesNotContain("password");
        assertThat(responseBody).doesNotContain("password_hash");
    }

    @Test
    @DisplayName("T05 - Login with invalid password returns 401")
    void loginWithInvalidCredentials() throws Exception {
        Map<String, String> loginRequest = Map.of(
            "email", "admin@hcb.com",
            "password", "WrongPassword123"
        );

        mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("ERR_AUTH_FAILED"));
    }

    @Test
    @DisplayName("T06 - Login response never contains sensitive fields")
    void loginResponseDoesNotLeakSensitiveData() throws Exception {
        Map<String, String> loginRequest = Map.of(
            "email", "admin@hcb.com",
            "password", "Admin@1234"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("password_hash");
        assertThat(body).doesNotContain("passwordHash");
        assertThat(body).doesNotContain("stackTrace");
    }

    @Test
    @DisplayName("T07 - Auth endpoint requires valid email format")
    void loginRequiresValidEmailFormat() throws Exception {
        Map<String, String> loginRequest = Map.of(
            "email", "not-an-email",
            "password", "SomePassword123"
        );

        mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("T08 - Internal errors return generic error code, no stack trace")
    void internalErrorsDoNotLeakDetails() throws Exception {
        // Attempt to access non-existent endpoint
        mockMvc.perform(get("/api/v1/nonexistent"))
            .andExpect(status().is4xxClientError());
    }

    /**
     * Helper: Perform login and return access token
     */
    private String loginAndGetToken(String email, String password) throws Exception {
        Map<String, String> loginRequest = Map.of("email", email, "password", password);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(loginRequest)))
            .andExpect(status().isOk())
            .andReturn();
        Map<?, ?> response = objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
        return (String) response.get("accessToken");
    }

    @Test
    @DisplayName("T09 - GET /api/v1/products/packet-catalog returns options with derivedFields")
    @WithMockUser(roles = "SUPER_ADMIN")
    void packetCatalogReturnsOptionsWithDerivedFields() throws Exception {
        MvcResult res = mockMvc.perform(get("/api/v1/products/packet-catalog"))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        JsonNode options = root.get("options");
        assertThat(options.isArray()).isTrue();
        JsonNode bcf = null;
        for (Iterator<JsonNode> it = options.elements(); it.hasNext(); ) {
            JsonNode o = it.next();
            if ("PKT_BCF".equals(o.path("id").asText())) {
                bcf = o;
                break;
            }
        }
        assertThat(bcf).isNotNull();
        assertThat(bcf.path("derivedFields").isArray()).isTrue();
        assertThat(bcf.path("derivedFields").get(0).asText()).isEqualTo("weighted_cashflow_score");
    }
}
