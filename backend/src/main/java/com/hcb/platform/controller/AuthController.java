package com.hcb.platform.controller;

import com.hcb.platform.model.dto.AuthLoginResponse;
import com.hcb.platform.model.dto.AuthResponse;
import com.hcb.platform.model.dto.LoginRequest;
import com.hcb.platform.model.dto.MfaResendRequest;
import com.hcb.platform.model.dto.MfaVerifyRequest;
import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Auth Controller — Login, Refresh, Logout
 *
 * Security:
 * - Rate limiting enforced at security layer (5 req/min per IP for login)
 * - Passwords never logged, never in responses
 * - Generic error messages only (no credential hints)
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthLoginResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = getClientIp(httpRequest);
        AuthLoginResponse response = authService.login(request, ipAddress);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<AuthResponse> verifyMfa(
        @Valid @RequestBody MfaVerifyRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = getClientIp(httpRequest);
        AuthResponse response = authService.verifyMfaLogin(request, ipAddress);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mfa/resend")
    public ResponseEntity<Void> resendMfa(
        @Valid @RequestBody MfaResendRequest request,
        HttpServletRequest httpRequest
    ) {
        authService.resendMfaOtp(request.getMfaChallengeId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
        @RequestBody Map<String, String> body,
        HttpServletRequest httpRequest
    ) {
        String refreshToken = body.get("refresh_token");
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        AuthResponse response = authService.refresh(refreshToken, getClientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AuthUserPrincipal user,
        HttpServletRequest httpRequest
    ) {
        String refreshToken = body.get("refresh_token");
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken, user, getClientIp(httpRequest));
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserSummary> me(@AuthenticationPrincipal AuthUserPrincipal user) {
        if (user == null) return ResponseEntity.status(401).build();
        var roles = user.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .toList();
        AuthResponse.UserSummary summary = AuthResponse.UserSummary.builder()
            .id(user.getId())
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .roles(roles)
            .institutionId(user.getInstitutionId())
            .institutionName(user.getInstitutionName())
            .build();
        return ResponseEntity.ok(summary);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        return (xff != null && !xff.isBlank()) ? xff.split(",")[0].trim() : request.getRemoteAddr();
    }
}
