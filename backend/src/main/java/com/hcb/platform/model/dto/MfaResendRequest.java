package com.hcb.platform.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MfaResendRequest {

    @NotBlank(message = "Challenge id is required")
    private String mfaChallengeId;
}
