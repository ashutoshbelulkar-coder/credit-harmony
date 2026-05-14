package com.hcb.platform.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

/**
 * Login step-1 response: either full JWT session or MFA challenge metadata.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthLoginResponse {

    private boolean mfaRequired;
    private String mfaChallengeId;
    private String emailMasked;
    private Integer resendAvailableInSeconds;

    private String accessToken;
    private String refreshToken;
    private Long expiresIn;
    private AuthResponse.UserSummary user;
}
