package com.hcb.platform.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Valid email required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    /** Cloudflare Turnstile token; required when {@code hcb.security.captcha.enabled=true}. */
    private String captchaToken;
}
