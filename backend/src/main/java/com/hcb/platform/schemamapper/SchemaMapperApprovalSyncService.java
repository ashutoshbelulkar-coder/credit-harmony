package com.hcb.platform.schemamapper;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;

import java.sql.Statement;
import java.time.LocalDateTime;

/**
 * Inserts approval_queue rows for schema_mapping submissions.
 */
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "hcb.schema-mapper", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SchemaMapperApprovalSyncService {

    private final JdbcTemplate jdbc;

    public long insertSchemaMappingApproval(String mappingId, String entityName, String description, long submittedByUserId) {
        String now = LocalDateTime.now().toString();
        GeneratedKeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement(
                """
                    INSERT INTO approval_queue (approval_item_type, entity_ref_id, entity_name_snapshot, description,
                        submitted_by_user_id, reviewed_by_user_id, approval_workflow_status, rejection_reason, submitted_at, reviewed_at)
                    VALUES (?, ?, ?, ?, ?, NULL, 'pending', NULL, ?, NULL)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, "schema_mapping");
            ps.setString(2, mappingId);
            ps.setString(3, entityName);
            ps.setString(4, description);
            ps.setLong(5, submittedByUserId);
            ps.setString(6, now);
            return ps;
        }, kh);
        Number key = kh.getKey();
        return key != null ? key.longValue() : 0L;
    }
}
