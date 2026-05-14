package com.hcb.platform.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Liveness probe aligned with the former Fastify dev API for Playwright / ops.
 * Public — must stay unauthenticated (see SecurityConfig).
 */
@RestController
@RequestMapping("/api/v1")
public class ApiHealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "service", "hcb-spring-api"
        ));
    }
}
