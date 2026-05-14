package com.hcb.platform.service;

import com.hcb.platform.model.entity.AuditLog;
import com.hcb.platform.model.entity.User;
import com.hcb.platform.repository.AuditLogRepository;
import com.hcb.platform.repository.UserRepository;
import com.hcb.platform.security.AuthUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;

/**
 * Audit Service — Mandatory side-effect for every business action.
 *
 * Rules:
 * - Every business action must call log() after completion
 * - IP addresses hashed with SHA-256 before storage
 * - PII never written to audit log description or entity fields
 * - audit_logs is append-only (no updates or deletes)
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /**
     * Log a business action to the immutable audit trail.
     *
     * @param user       Acting user (null for system-generated events)
     * @param actionType Action type constant (e.g., "INSTITUTION_CREATED")
     * @param entityType Entity domain (e.g., "institution")
     * @param entityId   Entity ID as string
     * @param description Human-readable description (no PII)
     * @param ipAddress  Raw IP (hashed before storage)
     * @param outcome    "success" | "failure" | "partial"
     */
    @Async
    public void log(User user, String actionType, String entityType,
                    String entityId, String description, String ipAddress, String outcome) {
        AuditLog log = AuditLog.builder()
            .user(user)
            .actionType(actionType)
            .entityType(entityType)
            .entityId(entityId)
            .description(description)
            .ipAddressHash(hashIpAddress(ipAddress))
            .auditOutcome(outcome != null ? outcome : "success")
            .occurredAt(LocalDateTime.now())
            .build();
        auditLogRepository.save(log);
    }

    public void log(User user, String actionType, String entityType,
                    String entityId, String description, String ipAddress) {
        log(user, actionType, entityType, entityId, description, ipAddress, "success");
    }

    /**
     * Audit entry for the authenticated API principal (JDBC-loaded; avoids passing JPA {@link User} from controllers).
     */
    public void log(AuthUserPrincipal principal, String actionType, String entityType,
                    String entityId, String description, String ipAddress) {
        if (principal == null) {
            logSystemEvent(actionType, entityType, entityId, description);
            return;
        }
        log(userRepository.getReferenceById(principal.getId()), actionType, entityType, entityId, description, ipAddress);
    }

    public void logSystemEvent(String actionType, String entityType,
                               String entityId, String description) {
        log(null, actionType, entityType, entityId, description, null, "success");
    }

    /**
     * Hash IP address with SHA-256 before storage.
     * Raw IP addresses are never persisted.
     */
    private String hashIpAddress(String ipAddress) {
        if (ipAddress == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(ipAddress.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }
}
