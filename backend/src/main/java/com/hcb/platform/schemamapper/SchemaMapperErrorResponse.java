package com.hcb.platform.schemamapper;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Fastify-shaped error body for schema-mapper routes.
 */
@Value
@Builder
public class SchemaMapperErrorResponse {
    ErrorBody error;
    String requestId;

    @Value
    @Builder
    public static class ErrorBody {
        String code;
        String message;
        List<Object> details;
    }

    public static SchemaMapperErrorResponse of(String code, String message) {
        return SchemaMapperErrorResponse.builder()
            .error(ErrorBody.builder()
                .code(code)
                .message(message)
                .details(List.of())
                .build())
            .requestId(UUID.randomUUID().toString())
            .build();
    }

    public Map<String, Object> toMap() {
        return Map.of(
            "error", Map.of(
                "code", error.getCode(),
                "message", error.getMessage(),
                "details", error.getDetails()
            ),
            "requestId", requestId
        );
    }
}
