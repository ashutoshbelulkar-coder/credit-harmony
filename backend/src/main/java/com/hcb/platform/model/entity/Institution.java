package com.hcb.platform.model.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Institution entity — Single source of truth for all institution identity,
 * regulatory, billing, and operational attributes.
 *
 * Normalization rules applied:
 * - name and trading_name owned ONLY here
 * - No institution names in consortium_members, api_requests, or users
 * - All references via institution_id FK
 */
@Entity
@Table(name = "institutions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "trading_name", length = 100)
    private String tradingName;

    @Column(name = "institution_type", nullable = false, length = 50)
    private String institutionType;

    @Column(name = "institution_lifecycle_status", nullable = false, length = 20)
    private String institutionLifecycleStatus;

    @Column(name = "registration_number", nullable = false, unique = true, length = 100)
    private String registrationNumber;

    @Column(nullable = false, length = 100)
    private String jurisdiction;

    @Column(name = "license_type", length = 100)
    private String licenseType;

    @Column(name = "license_number", length = 100)
    private String licenseNumber;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Column(name = "onboarded_at")
    private LocalDateTime onboardedAt;

    /** Lombok {@code setDataSubmitter} alone maps JSON {@code dataSubmitter}, not {@code isDataSubmitter}. */
    @Column(name = "is_data_submitter", nullable = false)
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isDataSubmitter;

    @Column(name = "is_subscriber", nullable = false)
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isSubscriber;

    @JsonProperty("isDataSubmitter")
    public boolean isDataSubmitter() {
        return isDataSubmitter;
    }

    @JsonProperty("isDataSubmitter")
    public void setDataSubmitter(boolean isDataSubmitter) {
        this.isDataSubmitter = isDataSubmitter;
    }

    @JsonProperty("isSubscriber")
    public boolean isSubscriber() {
        return isSubscriber;
    }

    @JsonProperty("isSubscriber")
    public void setSubscriber(boolean isSubscriber) {
        this.isSubscriber = isSubscriber;
    }

    @Column(name = "billing_model", length = 20)
    private String billingModel;

    @Column(name = "credit_balance", precision = 15, scale = 2)
    private BigDecimal creditBalance;

    @Column(name = "data_quality_score", precision = 5, scale = 2)
    private BigDecimal dataQualityScore;

    @Column(name = "match_accuracy_score", precision = 5, scale = 2)
    private BigDecimal matchAccuracyScore;

    @Column(name = "sla_health_percent", precision = 5, scale = 2)
    private BigDecimal slaHealthPercent;

    @Column(name = "apis_enabled_count", nullable = false)
    private int apisEnabledCount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    @JsonProperty("isDeleted")
    private boolean isDeleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
