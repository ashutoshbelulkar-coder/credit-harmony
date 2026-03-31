package com.hcb.platform.schemamapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "hcb.schema-mapper", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SchemaMapperJdbcRepository {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public long countRegistryRows() {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM schema_mapper_registry", Long.class);
        return n != null ? n : 0;
    }

    public void upsertMetrics(JsonNode payload) {
        String json = toJsonString(payload);
        jdbc.update(
            "INSERT INTO schema_mapper_metrics (id, payload) VALUES (1, ?) "
                + "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
            json
        );
    }

    public JsonNode loadMetrics() {
        List<String> rows = jdbc.query("SELECT payload FROM schema_mapper_metrics WHERE id = 1",
            (rs, i) -> rs.getString(1));
        if (rows.isEmpty()) return null;
        return parseJson(rows.get(0));
    }

    private JsonNode parseJson(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Invalid JSON in schema_mapper table", e);
        }
    }

    private String toJsonString(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize schema_mapper JSON", e);
        }
    }

    public void upsertRegistry(String registryId, JsonNode payload) {
        jdbc.update(
            "INSERT INTO schema_mapper_registry (registry_id, payload) VALUES (?, ?) "
                + "ON CONFLICT(registry_id) DO UPDATE SET payload = excluded.payload",
            registryId, toJsonString(payload)
        );
    }

    public void deleteRegistry(String registryId) {
        jdbc.update("DELETE FROM schema_mapper_registry WHERE registry_id = ?", registryId);
    }

    public List<JsonNode> loadAllRegistry() {
        return jdbc.query("SELECT payload FROM schema_mapper_registry ORDER BY registry_id",
            (rs, i) -> parseJson(rs.getString(1)));
    }

    public void upsertRaw(String rawId, JsonNode payload) {
        jdbc.update(
            "INSERT INTO schema_mapper_raw_data (raw_id, payload) VALUES (?, ?) "
                + "ON CONFLICT(raw_id) DO UPDATE SET payload = excluded.payload",
            rawId, toJsonString(payload)
        );
    }

    public List<JsonNode> loadAllRaw() {
        return jdbc.query("SELECT payload FROM schema_mapper_raw_data ORDER BY raw_id",
            (rs, i) -> parseJson(rs.getString(1)));
    }

    public void upsertVersion(String versionId, String registryId, JsonNode payload) {
        jdbc.update(
            "INSERT INTO schema_mapper_schema_version (version_id, registry_id, payload) VALUES (?, ?, ?) "
                + "ON CONFLICT(version_id) DO UPDATE SET registry_id = excluded.registry_id, payload = excluded.payload",
            versionId, registryId, toJsonString(payload)
        );
    }

    public void deleteVersion(String versionId) {
        jdbc.update("DELETE FROM schema_mapper_schema_version WHERE version_id = ?", versionId);
    }

    public List<JsonNode> loadAllVersions() {
        return jdbc.query("SELECT payload FROM schema_mapper_schema_version ORDER BY version_id",
            (rs, i) -> parseJson(rs.getString(1)));
    }

    public void upsertMapping(String mappingId, JsonNode payload) {
        jdbc.update(
            "INSERT INTO schema_mapper_mapping (mapping_id, payload) VALUES (?, ?) "
                + "ON CONFLICT(mapping_id) DO UPDATE SET payload = excluded.payload",
            mappingId, toJsonString(payload)
        );
    }

    public void deleteMapping(String mappingId) {
        jdbc.update("DELETE FROM schema_mapper_mapping WHERE mapping_id = ?", mappingId);
    }

    public List<JsonNode> loadAllMappings() {
        return jdbc.query("SELECT payload FROM schema_mapper_mapping ORDER BY mapping_id",
            (rs, i) -> parseJson(rs.getString(1)));
    }

    public void upsertRule(String ruleId, String mappingId, JsonNode payload) {
        jdbc.update(
            "INSERT INTO schema_mapper_validation_rule (rule_id, mapping_id, payload) VALUES (?, ?, ?) "
                + "ON CONFLICT(rule_id) DO UPDATE SET mapping_id = excluded.mapping_id, payload = excluded.payload",
            ruleId, mappingId, toJsonString(payload)
        );
    }

    public void deleteRule(String ruleId) {
        jdbc.update("DELETE FROM schema_mapper_validation_rule WHERE rule_id = ?", ruleId);
    }

    public List<JsonNode> loadAllRules() {
        return jdbc.query("SELECT payload FROM schema_mapper_validation_rule ORDER BY rule_id",
            (rs, i) -> parseJson(rs.getString(1)));
    }

    public void upsertDrift(String driftId, JsonNode payload) {
        jdbc.update(
            "INSERT INTO schema_mapper_drift_log (drift_id, payload) VALUES (?, ?) "
                + "ON CONFLICT(drift_id) DO UPDATE SET payload = excluded.payload",
            driftId, toJsonString(payload)
        );
    }

    public List<JsonNode> loadAllDrift() {
        return jdbc.query("SELECT payload FROM schema_mapper_drift_log ORDER BY drift_id DESC",
            (rs, i) -> parseJson(rs.getString(1)));
    }

    @Transactional
    public void persistFullState(
        JsonNode metrics,
        List<JsonNode> registry,
        List<JsonNode> raw,
        List<JsonNode> versions,
        List<JsonNode> mappings,
        List<JsonNode> rules,
        List<JsonNode> drift
    ) {
        upsertMetrics(metrics);
        jdbc.update("DELETE FROM schema_mapper_validation_rule");
        jdbc.update("DELETE FROM schema_mapper_mapping");
        jdbc.update("DELETE FROM schema_mapper_schema_version");
        jdbc.update("DELETE FROM schema_mapper_raw_data");
        jdbc.update("DELETE FROM schema_mapper_registry");
        jdbc.update("DELETE FROM schema_mapper_drift_log");
        for (JsonNode r : registry) {
            upsertRegistry(r.path("id").asText(), r);
        }
        for (JsonNode r : raw) {
            upsertRaw(r.path("_id").asText(), r);
        }
        for (JsonNode v : versions) {
            upsertVersion(v.path("_id").asText(), v.path("schemaRegistryId").asText(), v);
        }
        for (JsonNode m : mappings) {
            upsertMapping(m.path("_id").asText(), m);
        }
        for (JsonNode rule : rules) {
            upsertRule(rule.path("_id").asText(), rule.path("mappingId").asText(), rule);
        }
        for (JsonNode d : drift) {
            upsertDrift(d.path("_id").asText(), d);
        }
    }
}
