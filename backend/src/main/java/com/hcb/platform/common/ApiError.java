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

    public static ApiError of(String errorCode, String message, String path) {
        return ApiError.builder()
            .error(errorCode)
            .message(message)
            .timestamp(LocalDateTime.now())
            .path(path)
            .build();
    }
}
