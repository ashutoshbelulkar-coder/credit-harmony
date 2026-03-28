package com.hcb.platform.service;

import com.hcb.platform.model.dto.AuthResponse;
import com.hcb.platform.model.dto.LoginRequest;
import com.hcb.platform.model.entity.RefreshToken;
import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.RefreshTokenRepository;
import com.hcb.platform.repository.UserRepository;
import com.hcb.platform.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${hcb.jwt.refresh-token-expiry-seconds:604800}")
    private long refreshTokenExpirySeconds;

    @Value("${hcb.jwt.access-token-expiry-seconds:900}")
    private long accessTokenExpirySeconds;

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            User user = (User) authentication.getPrincipal();

            // Update last login timestamp
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);

            String accessToken = jwtService.generateAccessToken(user);
            String rawRefreshToken = generateSecureToken();
            String refreshTokenHash = hashToken(rawRefreshToken);

            RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(refreshTokenHash)
                .issuedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpirySeconds))
                .isRevoked(false)
                .ipAddress(ipAddress)
                .build();
            refreshTokenRepository.save(refreshToken);

            auditService.log(user, "AUTH_LOGIN", "user",
                String.valueOf(user.getId()), "Successful login", ipAddress);

            return buildAuthResponse(user, accessToken, rawRefreshToken);

        } catch (BadCredentialsException e) {
            // Log failed attempt without exposing reason in exception
            userRepository.findByEmailAndIsDeletedFalse(request.getEmail())
                .ifPresent(u -> auditService.log(u, "AUTH_LOGIN", "user",
                    String.valueOf(u.getId()), "Login failed — invalid credentials", ipAddress, "failure"));
            throw new BadCredentialsException("Invalid credentials");
        }
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken, String ipAddress) {
        String tokenHash = hashToken(rawRefreshToken);

        RefreshToken storedToken = refreshTokenRepository.findByTokenHashAndIsRevokedFalse(tokenHash)
            .orElseThrow(() -> new BadCredentialsException("Invalid or expired refresh token"));

        if (!storedToken.isValid()) {
            throw new BadCredentialsException("Refresh token expired");
        }

        // Revoke old token (rotation)
        refreshTokenRepository.revokeByTokenHash(tokenHash);

        User user = storedToken.getUser();
        String newAccessToken = jwtService.generateAccessToken(user);
        String newRawRefreshToken = generateSecureToken();
        String newRefreshTokenHash = hashToken(newRawRefreshToken);

        RefreshToken newRefreshToken = RefreshToken.builder()
            .user(user)
            .tokenHash(newRefreshTokenHash)
            .issuedAt(LocalDateTime.now())
            .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpirySeconds))
            .isRevoked(false)
            .ipAddress(ipAddress)
            .build();
        refreshTokenRepository.save(newRefreshToken);

        auditService.log(user, "AUTH_TOKEN_REFRESH", "user",
            String.valueOf(user.getId()), "Access token refreshed", ipAddress);

        return buildAuthResponse(user, newAccessToken, newRawRefreshToken);
    }

    @Transactional
    public void logout(String rawRefreshToken, User user, String ipAddress) {
        String tokenHash = hashToken(rawRefreshToken);
        refreshTokenRepository.revokeByTokenHash(tokenHash);
        auditService.log(user, "AUTH_LOGOUT", "user",
            String.valueOf(user.getId()), "User logged out", ipAddress);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String rawRefreshToken) {
        List<String> roles = user.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

        AuthResponse.UserSummary summary = AuthResponse.UserSummary.builder()
            .id(user.getId())
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .roles(roles)
            .institutionId(user.getInstitution() != null ? user.getInstitution().getId() : null)
            .institutionName(user.getInstitution() != null ? user.getInstitution().getName() : null)
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
}
