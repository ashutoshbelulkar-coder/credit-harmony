package com.hcb.platform;

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
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Captcha gate on login when {@code hcb.security.captcha.enabled=true}.
 */
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.datasource.url=jdbc:h2:mem:captcha_login;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "management.health.db.enabled=false",
        "management.endpoints.web.exposure.include=health",
        "management.endpoint.health.show-details=never",
        "hcb.schema-mapper.enabled=false",
        "hcb.security.captcha.enabled=true",
        "hcb.security.captcha.turnstile.secret-key=test-turnstile-secret"
    }
)
@AutoConfigureMockMvc
class AuthCaptchaLoginTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void seedUser() {
        if (!userRepository.existsByEmailAndIsDeletedFalse("admin@hcb.com")) {
            User admin = new User();
            admin.setEmail("admin@hcb.com");
            admin.setDisplayName("Test Admin");
            admin.setPasswordHash(passwordEncoder.encode("Admin@1234"));
            admin.setUserAccountStatus("active");
            admin.setMfaEnabled(false);
            admin.setDeleted(false);
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
        }
    }

    @Test
    @DisplayName("Login without captcha token when captcha required returns 400")
    void loginRequiresCaptchaToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"admin@hcb.com\",\"password\":\"Admin@1234\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("ERR_CAPTCHA_REQUIRED"));
    }
}
