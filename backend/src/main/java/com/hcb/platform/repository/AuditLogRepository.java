package com.hcb.platform.repository;

import com.hcb.platform.model.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:userId IS NULL OR a.user.id = :userId) AND " +
           "(:actionType IS NULL OR a.actionType = :actionType) AND " +
           "(:from IS NULL OR a.occurredAt >= :from) AND " +
           "(:to IS NULL OR a.occurredAt <= :to) " +
           "ORDER BY a.occurredAt DESC")
    Page<AuditLog> findWithFilters(
        @Param("userId") Long userId,
        @Param("actionType") String actionType,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        Pageable pageable
    );
}
