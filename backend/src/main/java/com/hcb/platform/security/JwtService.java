package com.hcb.platform.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * JWT Service — Access Token issuance, validation, and claims extraction.
 *
 * Security:
 * - HS256 signed with configurable secret (minimum 256-bit)
 * - Short-lived access tokens (15 min by default)
 * - Role claims embedded in JWT for stateless authorization
 * - No sensitive PII in JWT payload
 */
@Service
public class JwtService {

    @Value("${hcb.jwt.secret}")
    private String jwtSecret;

    @Value("${hcb.jwt.access-token-expiry-seconds:900}")
    private long accessTokenExpirySeconds;

    public String generateAccessToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        List<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());
        claims.put("roles", roles);
        return buildToken(claims, userDetails.getUsername(), accessTokenExpirySeconds * 1000L);
    }

    public String generateAccessToken(UserDetails userDetails, Map<String, Object> extraClaims) {
        extraClaims.put("roles", userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
        return buildToken(extraClaims, userDetails.getUsername(), accessTokenExpirySeconds * 1000L);
    }

    private String buildToken(Map<String, Object> claims, String subject, long expiryMs) {
        return Jwts.builder()
            .claims(claims)
            .subject(subject)
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + expiryMs))
            .signWith(getSigningKey())
            .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes();
        // Ensure minimum 256-bit key length for HS256
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 256 bits (32 bytes). Configure HCB_JWT_SECRET.");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
