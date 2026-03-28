package com.hcb.platform.controller;

import com.hcb.platform.model.entity.AuditLog;
import com.hcb.platform.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','API_USER')")
    public ResponseEntity<Page<AuditLog>> list(
        @RequestParam(required = false) Long userId,
        @RequestParam(required = false) String actionType,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        Page<AuditLog> logs = auditLogRepository.findWithFilters(
            userId, actionType, from, to,
            PageRequest.of(page, size, Sort.by("occurredAt").descending())
        );
        return ResponseEntity.ok(logs);
    }
}
