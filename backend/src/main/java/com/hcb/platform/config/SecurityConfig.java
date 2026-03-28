package com.hcb.platform.config;

import com.hcb.platform.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Enterprise-grade Spring Security Configuration
 *
 * Security Model:
 * - Stateless JWT-based authentication (access + refresh tokens)
 * - Role-based authorization (deny-by-default)
 * - No sensitive data in error responses
 * - H2 console enabled in dev profile only
 * - CORS configured per environment
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;

    @Value("${hcb.security.cors-allowed-origins:http://localhost:5173}")
    private String corsAllowedOrigins;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF (stateless JWT API)
            .csrf(AbstractHttpConfigurer::disable)

            // CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Session management: stateless
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Authorization rules — deny by default
            .authorizeHttpRequests(auth -> {
                // Public endpoints
                auth.requestMatchers("/api/v1/auth/login").permitAll();
                auth.requestMatchers("/api/v1/auth/refresh").permitAll();
                auth.requestMatchers("/actuator/health").permitAll();

                // H2 console: dev only
                if ("dev".equalsIgnoreCase(activeProfile)) {
                    auth.requestMatchers("/h2-console/**").permitAll();
                }

                // Role-based access
                auth.requestMatchers(HttpMethod.DELETE, "/api/v1/**")
                    .hasAnyRole("SUPER_ADMIN");
                auth.requestMatchers("/api/v1/users/**")
                    .hasAnyRole("SUPER_ADMIN");
                auth.requestMatchers("/api/v1/institutions/**")
                    .hasAnyRole("SUPER_ADMIN", "BUREAU_ADMIN");
                auth.requestMatchers(HttpMethod.GET, "/api/v1/monitoring/**")
                    .hasAnyRole("SUPER_ADMIN", "BUREAU_ADMIN", "ANALYST");
                auth.requestMatchers(HttpMethod.GET, "/api/v1/reports/**")
                    .hasAnyRole("SUPER_ADMIN", "BUREAU_ADMIN", "ANALYST");
                auth.requestMatchers(HttpMethod.POST, "/api/v1/reports/**")
                    .hasAnyRole("SUPER_ADMIN", "BUREAU_ADMIN", "ANALYST");
                auth.requestMatchers("/api/v1/submission/**")
                    .hasAnyRole("SUPER_ADMIN", "API_USER");
                auth.requestMatchers("/api/v1/inquiry/**")
                    .hasAnyRole("SUPER_ADMIN", "API_USER");
                auth.requestMatchers("/api/v1/approvals/**")
                    .hasAnyRole("SUPER_ADMIN", "BUREAU_ADMIN");
                auth.requestMatchers("/api/v1/governance/**")
                    .hasAnyRole("SUPER_ADMIN", "BUREAU_ADMIN");
                auth.requestMatchers("/api/v1/audit-logs/**")
                    .hasAnyRole("SUPER_ADMIN", "BUREAU_ADMIN", "ANALYST", "API_USER");

                // All other requests require authentication
                auth.anyRequest().authenticated();
            })

            // Security headers (no CSP in dev — H2 console uses inline scripts blocked by default-src 'self')
            .headers(headers -> {
                headers.frameOptions(frame -> {
                    if ("dev".equalsIgnoreCase(activeProfile)) {
                        frame.sameOrigin(); // Allow H2 console frame in dev
                    } else {
                        frame.deny();
                    }
                });
                if (!"dev".equalsIgnoreCase(activeProfile)) {
                    headers.contentSecurityPolicy(csp ->
                        csp.policyDirectives("default-src 'self'; frame-ancestors 'self'"));
                }
                headers.referrerPolicy(referrer ->
                    referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
            })

            // Error handling — no internal details exposed
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"ERR_AUTH_REQUIRED\",\"message\":\"Authentication required\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"ERR_ACCESS_DENIED\",\"message\":\"Insufficient permissions\"}");
                })
            )

            // Add JWT filter before standard auth filter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

            // Authentication provider
            .authenticationProvider(authenticationProvider());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(corsAllowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-API-Key", "X-Request-ID"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
