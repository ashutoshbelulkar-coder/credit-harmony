package com.hcb.platform.common;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Standardized API error response.
 * Never exposes internal stack traces, DB errors, or sensitive system paths.
 */
@Data
@Builder
public class ApiError {

    private String error;
    private String message;
    private LocalDateTime timestamp;
    private String path;
    /** Present for ERR_MFA_RESEND_COOLDOWN (HTTP 429). */
    private Integer retryAfterSeconds;

    public static ApiError of(String errorCode, String message, String path) {
        return ApiError.builder()
            .error(errorCode)
            .message(message)
            .timestamp(LocalDateTime.now())
            .path(path)
            .build();
    }

    public static ApiError of(String errorCode, String message, String path, Integer retryAfterSeconds) {
        return ApiError.builder()
            .error(errorCode)
            .message(message)
            .timestamp(LocalDateTime.now())
            .path(path)
            .retryAfterSeconds(retryAfterSeconds)
            .build();
    }
}
