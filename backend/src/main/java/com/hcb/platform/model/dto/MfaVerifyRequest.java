package com.hcb.platform.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MfaVerifyRequest {

    @NotBlank(message = "Challenge id is required")
    private String mfaChallengeId;

    @NotBlank(message = "Code is required")
    private String code;
}
