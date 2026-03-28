package com.hcb.platform.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * AuditLog — Immutable business action log.
 * Append-only. No UPDATE, no DELETE ever performed on this table.
 * IP addresses stored as hash — never plain text.
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "action_type", nullable = false, length = 100)
    private String actionType;

    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    @Column(name = "entity_id", nullable = false, length = 100)
    private String entityId;

    @Column
    private String description;

    @Column(name = "ip_address_hash", length = 128)
    private String ipAddressHash;

    @Column(name = "audit_outcome", nullable = false, length = 20)
    private String auditOutcome;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @PrePersist
    protected void onCreate() {
        occurredAt = LocalDateTime.now();
    }
}
