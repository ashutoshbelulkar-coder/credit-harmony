package com.hcb.platform.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Inserts pending rows into {@code approval_queue} for workflows that mirror legacy Fastify.
 */
@Service
@RequiredArgsConstructor
public class ApprovalQueueService {

    private final JdbcTemplate jdbc;

    public void enqueue(
        String itemType,
        String entityRefId,
        String entityNameSnapshot,
        String description,
        Long submittedByUserId
    ) {
        String now = LocalDateTime.now().toString();
        jdbc.update(
            """
                INSERT INTO approval_queue (approval_item_type, entity_ref_id, entity_name_snapshot, description,
                    submitted_by_user_id, reviewed_by_user_id, approval_workflow_status, rejection_reason, submitted_at, reviewed_at)
                VALUES (?, ?, ?, ?, ?, NULL, 'pending', NULL, ?, NULL)
                """,
            itemType,
            entityRefId,
            entityNameSnapshot,
            description,
            submittedByUserId,
            now
        );
    }
}
