package com.hcb.platform.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private long expiresIn;

    private UserSummary user;

    @Data
    @Builder
    public static class UserSummary {
        private Long id;
        private String email;
        private String displayName;
        private List<String> roles;
        private Long institutionId;
        private String institutionName;
    }
}
