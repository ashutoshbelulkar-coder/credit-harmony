package com.hcb.platform.service;

import com.hcb.platform.model.dto.AuthLoginResponse;
import com.hcb.platform.model.dto.AuthResponse;
import com.hcb.platform.model.dto.LoginRequest;
import com.hcb.platform.model.dto.MfaVerifyRequest;
import com.hcb.platform.model.entity.RefreshToken;
import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.RefreshTokenRepository;
import com.hcb.platform.repository.UserRepository;
import com.hcb.platform.security.AuthUserPrincipal;
import com.hcb.platform.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Authentication Service — Login, Refresh, Logout
 *
 * Security:
 * - Passwords never logged
 * - Refresh tokens stored as SHA-256 hash
 * - Token rotation on every refresh (old token revoked)
 * - Account status checked before token issuance
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService auditService;
    private final JdbcTemplate jdbc;
    private final AuthAccountService authAccountService;
    private final TurnstileVerificationService turnstileVerificationService;
    private final MfaLoginChallengeService mfaLoginChallengeService;

    @Value("${hcb.jwt.refresh-token-expiry-seconds:604800}")
    private long refreshTokenExpirySeconds;

    @Value("${hcb.jwt.access-token-expiry-seconds:900}")
    private long accessTokenExpirySeconds;

    @Transactional
    public AuthLoginResponse login(LoginRequest request, String ipAddress) {
        turnstileVerificationService.verifyIfRequired(request.getCaptchaToken());

        // Match Fastify / typical UX: emails are case-insensitive; trim accidental whitespace.
        String email = request.getEmail() == null
            ? ""
            : request.getEmail().trim().toLowerCase(Locale.ROOT);
        String rawPassword = request.getPassword() == null ? "" : request.getPassword().trim();
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, rawPassword)
            );

            AuthUserPrincipal principal = (AuthUserPrincipal) authentication.getPrincipal();

            // Use JDBC for mfa + email to avoid JPA hydrating User (SQLite timestamp / dialect edge cases in some test DBs).
            MfaGate mfaGate = loadMfaGate(principal.getId());
            if (mfaGate == null) {
                throw new BadCredentialsException("Invalid credentials");
            }

            if (mfaGate.mfaEnabled()) {
                MfaLoginChallengeService.IssuedChallenge issued = mfaLoginChallengeService.createChallenge(
                    principal.getId(),
                    mfaGate.email()
                );
                User userRef = userRepository.getReferenceById(principal.getId());
                auditService.log(userRef, "AUTH_MFA_CHALLENGE_ISSUED", "user",
                    String.valueOf(principal.getId()), "MFA challenge issued after password verification", ipAddress);

                return AuthLoginResponse.builder()
                    .mfaRequired(true)
                    .mfaChallengeId(issued.id())
                    .emailMasked(issued.emailMasked())
                    .resendAvailableInSeconds(issued.resendAvailableInSeconds())
                    .build();
            }

            AuthResponse session = issueSessionAfterAuth(principal, ipAddress);
            return toLoginResponse(session);

        } catch (BadCredentialsException e) {
            logFailedLoginAudit(email, ipAddress);
            throw new BadCredentialsException("Invalid credentials");
        }
    }

    @Transactional
    public AuthResponse verifyMfaLogin(MfaVerifyRequest request, String ipAddress) {
        long userId = mfaLoginChallengeService.verifyCodeAndConsume(
            request.getMfaChallengeId(),
            request.getCode()
        );
        AuthUserPrincipal principal = authAccountService.loadPrincipalByUserId(userId);
        return issueSessionAfterAuth(principal, ipAddress);
    }

    @Transactional
    public void resendMfaOtp(String mfaChallengeId) {
        mfaLoginChallengeService.resend(mfaChallengeId);
    }

    private AuthLoginResponse toLoginResponse(AuthResponse session) {
        return AuthLoginResponse.builder()
            .mfaRequired(false)
            .accessToken(session.getAccessToken())
            .refreshToken(session.getRefreshToken())
            .expiresIn(session.getExpiresIn())
            .user(session.getUser())
            .build();
    }

    /**
     * Issues refresh + access tokens, updates last_login_at, writes successful login audit.
     */
    private AuthResponse issueSessionAfterAuth(AuthUserPrincipal principal, String ipAddress) {
        // SQLite + Hibernate: avoid sub-millisecond precision in stored datetimes (parse errors on re-read).
        LocalDateTime loginStamp = LocalDateTime.now().withNano(0);
        jdbc.update("UPDATE users SET last_login_at = ? WHERE id = ?",
            loginStamp, principal.getId());

        String accessToken = jwtService.generateAccessToken(principal);
        String rawRefreshToken = generateSecureToken();
        String refreshTokenHash = hashToken(rawRefreshToken);

        User userRef = userRepository.getReferenceById(principal.getId());
        LocalDateTime issued = LocalDateTime.now().withNano(0);
        RefreshToken refreshToken = RefreshToken.builder()
            .user(userRef)
            .tokenHash(refreshTokenHash)
            .issuedAt(issued)
            .expiresAt(issued.plusSeconds(refreshTokenExpirySeconds))
            .isRevoked(false)
            .ipAddress(ipAddress)
            .build();
        refreshTokenRepository.save(refreshToken);

        auditService.log(userRef, "AUTH_LOGIN", "user",
            String.valueOf(principal.getId()), "Successful login", ipAddress);

        return buildAuthResponse(principal, accessToken, rawRefreshToken);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken, String ipAddress) {
        String tokenHash = hashToken(rawRefreshToken);

        RefreshToken storedToken = refreshTokenRepository.findByTokenHashAndIsRevokedFalse(tokenHash)
            .orElseThrow(() -> new BadCredentialsException("Invalid or expired refresh token"));

        if (!storedToken.isValid()) {
            throw new BadCredentialsException("Refresh token expired");
        }

        Long userId = storedToken.getUser().getId();

        // Revoke old token (rotation)
        refreshTokenRepository.revokeByTokenHash(tokenHash);

        AuthUserPrincipal principal = authAccountService.loadPrincipalByUserId(userId);
        User userRef = userRepository.getReferenceById(userId);

        String newAccessToken = jwtService.generateAccessToken(principal);
        String newRawRefreshToken = generateSecureToken();
        String newRefreshTokenHash = hashToken(newRawRefreshToken);

        LocalDateTime rotated = LocalDateTime.now().withNano(0);
        RefreshToken newRefreshToken = RefreshToken.builder()
            .user(userRef)
            .tokenHash(newRefreshTokenHash)
            .issuedAt(rotated)
            .expiresAt(rotated.plusSeconds(refreshTokenExpirySeconds))
            .isRevoked(false)
            .ipAddress(ipAddress)
            .build();
        refreshTokenRepository.save(newRefreshToken);

        auditService.log(userRef, "AUTH_TOKEN_REFRESH", "user",
            String.valueOf(userId), "Access token refreshed", ipAddress);

        return buildAuthResponse(principal, newAccessToken, newRawRefreshToken);
    }

    @Transactional
    public void logout(String rawRefreshToken, AuthUserPrincipal principal, String ipAddress) {
        String tokenHash = hashToken(rawRefreshToken);
        refreshTokenRepository.revokeByTokenHash(tokenHash);
        if (principal != null) {
            auditService.log(principal, "AUTH_LOGOUT", "user",
                String.valueOf(principal.getId()), "User logged out", ipAddress);
        }
    }

    private void logFailedLoginAudit(String email, String ipAddress) {
        try {
            Long uid = jdbc.queryForObject(
                "SELECT id FROM users WHERE lower(email) = lower(?) AND NOT is_deleted",
                Long.class,
                email
            );
            auditService.log(userRepository.getReferenceById(uid), "AUTH_LOGIN", "user",
                String.valueOf(uid), "Login failed — invalid credentials", ipAddress, "failure");
        } catch (EmptyResultDataAccessException ignored) {
            // Unknown email — no row to attach audit to
        }
    }

    private AuthResponse buildAuthResponse(AuthUserPrincipal principal, String accessToken, String rawRefreshToken) {
        List<String> roles = principal.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

        AuthResponse.UserSummary summary = AuthResponse.UserSummary.builder()
            .id(principal.getId())
            .email(principal.getEmail())
            .displayName(principal.getDisplayName())
            .roles(roles)
            .institutionId(principal.getInstitutionId())
            .institutionName(principal.getInstitutionName())
            .build();

        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(rawRefreshToken)
            .expiresIn(accessTokenExpirySeconds)
            .user(summary)
            .build();
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[64];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Token hashing failed", e);
        }
    }

    private record MfaGate(boolean mfaEnabled, String email) {}

    private MfaGate loadMfaGate(long userId) {
        try {
            return jdbc.queryForObject(
                "SELECT mfa_enabled, email FROM users WHERE id = ? AND NOT is_deleted",
                (rs, rowNum) -> new MfaGate(rs.getInt("mfa_enabled") != 0, rs.getString("email")),
                userId
            );
        } catch (IncorrectResultSizeDataAccessException e) {
            return null;
        }
    }
}
