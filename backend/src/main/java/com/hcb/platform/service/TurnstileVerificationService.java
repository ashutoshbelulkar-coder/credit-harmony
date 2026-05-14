package com.hcb.platform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hcb.platform.common.AuthOperationException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

/**
 * Verifies Cloudflare Turnstile tokens server-side.
 */
@Service
@RequiredArgsConstructor
public class TurnstileVerificationService {

    private static final String SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.create();

    @Value("${hcb.security.captcha.enabled:false}")
    private boolean captchaEnabled;

    @Value("${hcb.security.captcha.turnstile.secret-key:}")
    private String turnstileSecretKey;

    public void verifyIfRequired(String captchaToken) {
        if (!captchaEnabled) {
            return;
        }
        if (!StringUtils.hasText(turnstileSecretKey)) {
            throw new IllegalStateException("hcb.security.captcha.enabled is true but turnstile secret key is empty");
        }
        if (!StringUtils.hasText(captchaToken)) {
            throw new AuthOperationException(
                "ERR_CAPTCHA_REQUIRED",
                "Captcha verification is required",
                HttpStatus.BAD_REQUEST
            );
        }
        String form = "secret=" + urlEncode(turnstileSecretKey) + "&response=" + urlEncode(captchaToken.trim());
        String raw;
        try {
            raw = restClient.post()
                .uri(SITEVERIFY_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(String.class);
        } catch (Exception e) {
            throw new AuthOperationException(
                "ERR_CAPTCHA_VERIFY_FAILED",
                "Captcha verification could not be completed",
                HttpStatus.BAD_GATEWAY
            );
        }
        if (raw == null || raw.isBlank()) {
            throw new AuthOperationException(
                "ERR_CAPTCHA_INVALID",
                "Captcha verification failed",
                HttpStatus.BAD_REQUEST
            );
        }
        try {
            JsonNode root = objectMapper.readTree(raw);
            if (root.path("success").asBoolean(false)) {
                return;
            }
        } catch (Exception e) {
            throw new AuthOperationException(
                "ERR_CAPTCHA_INVALID",
                "Captcha verification failed",
                HttpStatus.BAD_REQUEST
            );
        }
        throw new AuthOperationException(
            "ERR_CAPTCHA_INVALID",
            "Captcha verification failed",
            HttpStatus.BAD_REQUEST
        );
    }

    private static String urlEncode(String s) {
        return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8);
    }
}
