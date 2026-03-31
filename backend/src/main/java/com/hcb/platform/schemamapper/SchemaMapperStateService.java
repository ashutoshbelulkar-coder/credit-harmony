package com.hcb.platform.schemamapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hcb.platform.service.AuditService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "hcb.schema-mapper", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SchemaMapperStateService {

    private static final String TENANT = "hcb-dev";
    private static final int MAX_PAGE_SIZE = 500;

    private final ObjectMapper mapper;
    private final SchemaMapperJdbcRepository jdbcRepository;
    private final SchemaMapperSeedLoader seedLoader;
    private final SchemaMapperMappingJobService mappingJobService;
    private final SchemaMapperApprovalSyncService approvalSyncService;
    private final AuditService auditService;

    private final Object lock = new Object();
    private ObjectNode state;
    @PostConstruct
    public void init() {
        synchronized (lock) {
            try {
                if (jdbcRepository.countRegistryRows() == 0) {
                    state = seedLoader.buildFreshState();
                    persistFullStateFromMemory();
                } else {
                    loadStateFromDatabase();
                }
            } catch (Exception e) {
                throw new IllegalStateException("Schema mapper bootstrap failed", e);
            }
        }
    }

    private void loadStateFromDatabase() throws Exception {
        state = mapper.createObjectNode();
        state.put("tenantId", TENANT);
        state.set("schemaRegistry", toArray(jdbcRepository.loadAllRegistry()));
        state.set("schemaVersions", toArray(jdbcRepository.loadAllVersions()));
        state.set("rawDataStore", toArray(jdbcRepository.loadAllRaw()));
        state.set("mappingRegistry", toArray(jdbcRepository.loadAllMappings()));
        state.set("validationRules", toArray(jdbcRepository.loadAllRules()));
        state.set("driftLogs", toArray(jdbcRepository.loadAllDrift()));
        JsonNode m = jdbcRepository.loadMetrics();
        if (m == null || m.isNull()) {
            ObjectNode metrics = mapper.createObjectNode();
            metrics.put("mappingJobsCompleted", 0);
            metrics.put("lastJobLatencyMs", 0);
            metrics.put("llmCalls", 0);
            metrics.put("llmFailures", 0);
            metrics.put("overridesRecorded", 0);
            state.set("metrics", metrics);
        } else {
            state.set("metrics", m);
        }
        ObjectNode seed = seedLoader.buildFreshState();
        state.set("masterSchemaTree", seed.get("masterSchemaTree").deepCopy());
        state.set("masterSchemaVersions", seed.get("masterSchemaVersions").deepCopy());
        state.set("canonicalRegistry", seed.get("canonicalRegistry").deepCopy());
        state.set("wizardSourceTypeOptions", seed.get("wizardSourceTypeOptions").deepCopy());
        state.set("wizardDataCategoryOptions", seed.get("wizardDataCategoryOptions").deepCopy());
    }

    private ArrayNode toArray(List<JsonNode> nodes) {
        ArrayNode a = mapper.createArrayNode();
        for (JsonNode n : nodes) a.add(n);
        return a;
    }

    private void persistFullStateFromMemory() throws Exception {
        jdbcRepository.persistFullState(
            state.get("metrics"),
            arrayToList(state.get("schemaRegistry")),
            arrayToList(state.get("rawDataStore")),
            arrayToList(state.get("schemaVersions")),
            arrayToList(state.get("mappingRegistry")),
            arrayToList(state.get("validationRules")),
            arrayToList(state.get("driftLogs"))
        );
    }

    private List<JsonNode> arrayToList(JsonNode arr) {
        List<JsonNode> out = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode n : arr) out.add(n);
        }
        return out;
    }

    private void persistMetrics() throws Exception {
        jdbcRepository.upsertMetrics(state.get("metrics"));
    }

    private String rid() {
        return UUID.randomUUID().toString();
    }

    public ObjectNode metricsResponse() throws Exception {
        synchronized (lock) {
            ObjectNode o = (ObjectNode) state.get("metrics").deepCopy();
            o.put("requestId", rid());
            return o;
        }
    }

    public ObjectNode canonicalResponse() {
        synchronized (lock) {
            ObjectNode o = mapper.createObjectNode();
            o.set("versions", state.get("masterSchemaVersions").deepCopy());
            o.set("tree", state.get("masterSchemaTree").deepCopy());
            o.put("requestId", rid());
            return o;
        }
    }

    public ObjectNode wizardMetadataResponse() {
        synchronized (lock) {
            ObjectNode o = mapper.createObjectNode();
            o.set("sourceTypeOptions", state.get("wizardSourceTypeOptions").deepCopy());
            o.set("dataCategoryOptions", state.get("wizardDataCategoryOptions").deepCopy());
            o.put("requestId", rid());
            return o;
        }
    }

    public ObjectNode listSchemas(Integer page, Integer size, String sourceType, String status) {
        synchronized (lock) {
            ArrayNode list = filterRegistry(sourceType, status);
            return pageSliceResponse(list, page, size);
        }
    }

    public ObjectNode sourceTypesResponse() {
        synchronized (lock) {
            Set<String> types = new HashSet<>();
            for (JsonNode r : iterable(state.get("schemaRegistry"))) {
                String t = r.path("sourceType").asText("").trim();
                if (!t.isEmpty()) types.add(t);
            }
            List<String> sorted = new ArrayList<>(types);
            sorted.sort(String::compareTo);
            ArrayNode arr = mapper.createArrayNode();
            for (String t : sorted) arr.add(t);
            ObjectNode o = mapper.createObjectNode();
            o.set("sourceTypes", arr);
            o.put("requestId", rid());
            return o;
        }
    }

    public ObjectNode sourceTypeFields(String sourceType) {
        String st = sourceType == null ? "" : sourceType.trim();
        if (st.isEmpty() || "all".equalsIgnoreCase(st)) {
            throw new SchemaMapperApiException(HttpStatus.BAD_REQUEST, "ERR_VALIDATION", "sourceType query parameter is required");
        }
        synchronized (lock) {
            Map<String, ObjectNode> byPath = new HashMap<>();
            for (JsonNode reg : iterable(state.get("schemaRegistry"))) {
                if (!st.equals(reg.path("sourceType").asText())) continue;
                String verId = reg.path("currentVersionId").asText();
                JsonNode ver = findVersion(verId);
                if (ver == null) continue;
                JsonNode parsed = ver.path("parsedFields");
                for (ObjectNode f : flattenParsedFieldsForSourceType(parsed)) {
                    String p = f.path("path").asText();
                    if (!p.isEmpty() && !byPath.containsKey(p)) byPath.put(p, f);
                }
            }
            List<ObjectNode> fields = new ArrayList<>(byPath.values());
            fields.sort(Comparator.comparing(f -> f.path("path").asText()));
            ArrayNode arr = mapper.createArrayNode();
            fields.forEach(arr::add);
            ObjectNode o = mapper.createObjectNode();
            o.put("sourceType", st);
            o.set("fields", arr);
            o.put("requestId", rid());
            return o;
        }
    }

    public ObjectNode ingest(JsonNode body, String userEmail) throws Exception {
        String sourceType = body.path("sourceType").asText("telecom");
        String sourceName = body.path("sourceName").asText("").trim();
        if (sourceName.isEmpty()) {
            throw new SchemaMapperApiException(HttpStatus.BAD_REQUEST, "ERR_VALIDATION", "sourceName is required");
        }
        synchronized (lock) {
            JsonNode seedData;
            try (var in = new org.springframework.core.io.ClassPathResource("config/schema-mapper.json").getInputStream()) {
                seedData = mapper.readTree(in);
            }
            ArrayNode parsedFields;
            JsonNode fieldStats;
            if (body.has("parsedFields") && body.get("parsedFields").isArray() && body.get("parsedFields").size() > 0) {
                parsedFields = (ArrayNode) body.get("parsedFields");
                fieldStats = body.has("fieldStats") ? body.get("fieldStats") : mapper.createObjectNode();
            } else {
                ObjectNode tmpl = sampleTemplateFromSeed(seedData, sourceType);
                parsedFields = (ArrayNode) tmpl.get("parsedFields");
                fieldStats = tmpl.get("fieldStats");
            }

            String regId = "reg-" + UUID.randomUUID().toString().substring(0, 8);
            String rawId = "raw_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            String verId = "ver_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            String now = Instant.now().toString();
            String user = userEmail != null ? userEmail : "unknown";

            ObjectNode raw = mapper.createObjectNode();
            raw.put("_id", rawId);
            raw.put("tenantId", TENANT);
            if (body.hasNonNull("institutionId")) raw.put("institutionId", body.get("institutionId").asText());
            else raw.putNull("institutionId");
            raw.put("sourceType", sourceType);
            raw.put("contentType", body.path("contentType").asText("json_schema"));
            raw.putNull("storageUri");
            raw.set("inlinePayload", body.get("inlineSchema"));
            ObjectNode summary = mapper.createObjectNode();
            summary.put("fieldCount", parsedFields.size());
            summary.put("maxDepth", 1);
            raw.set("parsedSummary", summary);
            raw.set("piiFlagsDetected", mapper.createArrayNode());
            raw.put("checksumSha256", sha256Hex(mapper.writeValueAsString(parsedFields)));
            raw.put("ingestedBy", user);
            raw.put("ingestedAt", now);
            raw.put("schemaRegistryId", regId);
            ((ArrayNode) state.get("rawDataStore")).insert(0, raw);

            ObjectNode reg = mapper.createObjectNode();
            reg.put("id", regId);
            reg.put("sourceName", sourceName);
            reg.put("sourceType", sourceType);
            if (body.has("dataCategory") && !body.get("dataCategory").asText("").isBlank()) {
                reg.put("dataCategory", body.get("dataCategory").asText());
            }
            reg.put("masterSchemaVersion", "HCB Master v1.1");
            reg.put("mappingCoverage", 0);
            reg.put("unmappedFields", parsedFields.size());
            reg.put("ruleCount", 0);
            reg.put("status", "draft");
            reg.put("version", body.path("versionNumber").asText("v0.1"));
            reg.put("createdBy", user);
            reg.put("createdAt", now);
            reg.put("lastModifiedBy", user);
            reg.put("lastModifiedAt", now);
            reg.put("tenantId", TENANT);
            reg.put("currentVersionId", verId);
            reg.set("institutionScope", body.has("institutionScope") && body.get("institutionScope").isArray()
                ? (ArrayNode) body.get("institutionScope") : mapper.createArrayNode());
            ((ArrayNode) state.get("schemaRegistry")).insert(0, reg);

            ObjectNode ver = mapper.createObjectNode();
            ver.put("_id", verId);
            ver.put("schemaRegistryId", regId);
            ver.put("rawDataId", rawId);
            ver.put("versionLabel", body.path("versionNumber").asText("v0.1"));
            ver.put("status", "draft");
            ver.put("fieldTreeRef", "inline");
            ver.set("parsedFields", parsedFields);
            ver.set("fieldStats", fieldStats);
            ver.put("createdAt", now);
            ((ArrayNode) state.get("schemaVersions")).add(ver);

            jdbcRepository.upsertRaw(rawId, raw);
            jdbcRepository.upsertRegistry(regId, reg);
            jdbcRepository.upsertVersion(verId, regId, ver);

            ObjectNode res = mapper.createObjectNode();
            res.put("rawDataId", rawId);
            res.put("schemaVersionId", verId);
            res.put("schemaRegistryId", regId);
            res.put("duplicate", false);
            res.set("parsedFields", parsedFields.deepCopy());
            res.set("fieldStats", fieldStats.deepCopy());
            res.put("requestId", rid());
            auditService.logSystemEvent("SCHEMA_INGEST", "SCHEMA_VERSION", verId,
                "Ingested schema " + sourceName + " (" + sourceType + ")");
            return res;
        }
    }

    private ObjectNode sampleTemplateFromSeed(JsonNode data, String sourceType) {
        JsonNode telecomFields = data.path("telecomParsedFields");
        JsonNode telecomStats = data.path("telecomFieldStatistics");
        if (!telecomFields.isArray()) telecomFields = mapper.createArrayNode();
        if (telecomStats.isNull() || telecomStats.isMissingNode()) telecomStats = mapper.createObjectNode();
        return switch (sourceType) {
            case "utility" -> tmpl(data, "utilityParsedFields", "utilityFieldStatistics", telecomFields, telecomStats);
            case "bank" -> tmpl(data, "bankParsedFields", "bankFieldStatistics", telecomFields, telecomStats);
            case "gst" -> tmpl(data, "gstParsedFields", "gstFieldStatistics", telecomFields, telecomStats);
            case "custom" -> tmpl(data, "customParsedFields", "customFieldStatistics", telecomFields, telecomStats);
            default -> {
                ObjectNode o = mapper.createObjectNode();
                o.set("parsedFields", telecomFields);
                o.set("fieldStats", telecomStats);
                yield o;
            }
        };
    }

    private ObjectNode tmpl(JsonNode data, String pfKey, String fsKey, JsonNode fbFields, JsonNode fbStats) {
        ObjectNode o = mapper.createObjectNode();
        JsonNode pf = data.get(pfKey);
        o.set("parsedFields", pf != null && pf.isArray() && pf.size() > 0 ? pf : fbFields);
        JsonNode fs = data.get(fsKey);
        o.set("fieldStats", fs != null && !fs.isNull() ? fs : fbStats);
        return o;
    }

    public ObjectNode createMappingJob(String schemaVersionId, String userEmail) throws Exception {
        synchronized (lock) {
            JsonNode ver = findVersion(schemaVersionId);
            if (ver == null) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "SCHEMA_VERSION_NOT_FOUND", "Schema version not found");
            }
            for (JsonNode m : iterable(state.get("mappingRegistry"))) {
                if (!schemaVersionId.equals(m.path("schemaVersionId").asText())) continue;
                String st = m.path("status").asText();
                if ("queued".equals(st) || "processing".equals(st)) {
                    throw new SchemaMapperApiException(HttpStatus.CONFLICT, "MAPPING_IN_PROGRESS", "Mapping already running for this version");
                }
            }
            String mapId = "map_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            String jobId = "job_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            String now = Instant.now().toString();
            JsonNode canon = state.get("canonicalRegistry").get(0);
            ObjectNode row = mapper.createObjectNode();
            row.put("_id", mapId);
            row.put("tenantId", TENANT);
            row.put("schemaRegistryId", ver.path("schemaRegistryId").asText());
            row.put("schemaVersionId", schemaVersionId);
            row.put("canonicalVersionId", canon != null ? canon.path("_id").asText("canon_v1_1") : "canon_v1_1");
            row.put("status", "queued");
            row.set("fieldMappings", mapper.createArrayNode());
            row.set("derivedFields", mapper.createArrayNode());
            row.putNull("approvalRefId");
            row.put("jobId", jobId);
            row.put("createdAt", now);
            row.put("updatedAt", now);
            ((ArrayNode) state.get("mappingRegistry")).insert(0, row);
            jdbcRepository.upsertMapping(mapId, row);

            ObjectNode res = mapper.createObjectNode();
            res.put("mappingId", mapId);
            res.put("jobId", jobId);
            res.put("status", "queued");
            res.put("requestId", rid());
            mappingJobService.scheduleJob(mapId);
            auditService.logSystemEvent("MAPPING_JOB_QUEUED", "SCHEMA_MAPPING", mapId,
                "Queued mapping for version " + schemaVersionId);
            return res;
        }
    }

    public ObjectNode getMapping(String id) throws Exception {
        synchronized (lock) {
            JsonNode m = findMapping(id);
            if (m == null) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "MAPPING_NOT_FOUND", "Mapping not found");
            }
            ObjectNode o = (ObjectNode) m.deepCopy();
            o.put("requestId", rid());
            return o;
        }
    }

    public ObjectNode patchMapping(String id, JsonNode patch) throws Exception {
        synchronized (lock) {
            ObjectNode m = findMappingObj(id);
            if (m == null) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "MAPPING_NOT_FOUND", "Mapping not found");
            }
            String st = m.path("status").asText();
            if ("under_review".equals(st) || "active".equals(st)) {
                throw new SchemaMapperApiException(HttpStatus.UNPROCESSABLE_ENTITY, "MAPPING_LOCKED", "Cannot edit mapping in this status");
            }
            List<SchemaMapperHeuristics.FlatMasterField> flat = flattenMasterFields((ArrayNode) state.get("masterSchemaTree"));
            Set<String> allowed = new HashSet<>();
            for (SchemaMapperHeuristics.FlatMasterField f : flat) allowed.add(f.path());

            if (patch.has("fieldMappings") && patch.get("fieldMappings").isArray()) {
                for (JsonNode fm : patch.get("fieldMappings")) {
                    String cp = fm.path("canonicalPath").asText("");
                    if (!cp.isEmpty() && !allowed.contains(cp)) {
                        throw new SchemaMapperApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CANONICAL_PATH_INVALID",
                            "Unknown canonical path: " + cp);
                    }
                }
                m.set("fieldMappings", patch.get("fieldMappings").deepCopy());
            }
            if (patch.has("derivedFields") && patch.get("derivedFields").isArray()) {
                m.set("derivedFields", patch.get("derivedFields").deepCopy());
            }
            m.put("updatedAt", Instant.now().toString());
            updateRegistryFromMapping(m);
            bumpOverridesMetric();
            jdbcRepository.upsertMapping(id, m);
            persistMetrics();
            ObjectNode o = (ObjectNode) m.deepCopy();
            o.put("requestId", rid());
            auditService.logSystemEvent("MAPPING_EDIT", "SCHEMA_MAPPING", id, "Updated field mappings");
            return o;
        }
    }

    public ObjectNode listRules(String mappingId) {
        synchronized (lock) {
            if (findMapping(mappingId) == null) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "MAPPING_NOT_FOUND", "Mapping not found");
            }
            ArrayNode content = mapper.createArrayNode();
            for (JsonNode r : iterable(state.get("validationRules"))) {
                if (mappingId.equals(r.path("mappingId").asText())) content.add(r.deepCopy());
            }
            ObjectNode o = mapper.createObjectNode();
            o.set("content", content);
            o.put("requestId", rid());
            return o;
        }
    }

    public ObjectNode createRule(String mappingId, JsonNode body) throws Exception {
        synchronized (lock) {
            JsonNode m = findMapping(mappingId);
            if (m == null) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "MAPPING_NOT_FOUND", "Mapping not found");
            }
            String ruleRowId = "vr_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            ObjectNode row = mapper.createObjectNode();
            row.put("_id", ruleRowId);
            row.put("tenantId", TENANT);
            row.put("mappingId", mappingId);
            row.put("targetPath", body.path("targetPath").asText(""));
            row.put("ruleType", body.path("ruleType").asText("regex"));
            row.put("severity", body.path("severity").asText("warning"));
            row.set("config", body.has("config") ? body.get("config") : mapper.createObjectNode());
            row.put("enabled", !body.has("enabled") || body.get("enabled").asBoolean(true));
            ((ArrayNode) state.get("validationRules")).add(row);
            jdbcRepository.upsertRule(ruleRowId, mappingId, row);
            updateRegistryFromMapping((ObjectNode) m);
            jdbcRepository.upsertRegistry(m.path("schemaRegistryId").asText(), findRegistry(m.path("schemaRegistryId").asText()));
            ObjectNode o = (ObjectNode) row.deepCopy();
            o.put("requestId", rid());
            return o;
        }
    }

    public ObjectNode patchRule(String mappingId, String ruleId, JsonNode patch) throws Exception {
        synchronized (lock) {
            JsonNode rule = findRule(mappingId, ruleId);
            if (rule == null) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "RULE_NOT_FOUND", "Rule not found");
            }
            ObjectNode r = (ObjectNode) rule;
            patch.properties().forEach(e -> {
                if (!"_id".equals(e.getKey()) && !"mappingId".equals(e.getKey())) {
                    r.set(e.getKey(), e.getValue().deepCopy());
                }
            });
            jdbcRepository.upsertRule(ruleId, mappingId, r);
            ObjectNode o = (ObjectNode) r.deepCopy();
            o.put("requestId", rid());
            return o;
        }
    }

    public void deleteRule(String mappingId, String ruleId) throws Exception {
        synchronized (lock) {
            ArrayNode rules = (ArrayNode) state.get("validationRules");
            boolean removed = false;
            for (int i = 0; i < rules.size(); i++) {
                JsonNode r = rules.get(i);
                if (ruleId.equals(r.path("_id").asText()) && mappingId.equals(r.path("mappingId").asText())) {
                    rules.remove(i);
                    removed = true;
                    break;
                }
            }
            if (!removed) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "RULE_NOT_FOUND", "Rule not found");
            }
            jdbcRepository.deleteRule(ruleId);
        }
    }

    public ObjectNode submitApproval(String mappingId, String userEmail, long userId) throws Exception {
        synchronized (lock) {
            ObjectNode m = findMappingObj(mappingId);
            if (m == null) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "MAPPING_NOT_FOUND", "Mapping not found");
            }
            String st = m.path("status").asText();
            if (!"needs_review".equals(st) && !"draft".equals(st)) {
                throw new SchemaMapperApiException(HttpStatus.UNPROCESSABLE_ENTITY, "MAPPING_INVALID_STATE",
                    "Mapping must be in needs_review or draft to submit");
            }
            JsonNode regNode = findRegistry(m.path("schemaRegistryId").asText());
            String name = regNode != null
                ? regNode.path("sourceName").asText() + " → HCB Master"
                : "Mapping " + mappingId;
            int coverage = regNode != null ? regNode.path("mappingCoverage").asInt(0) : 0;
            String now = Instant.now().toString();
            m.put("status", "under_review");
            m.put("updatedAt", now);
            if (regNode instanceof ObjectNode reg) {
                reg.put("status", "under_review");
                reg.put("lastModifiedAt", now);
                jdbcRepository.upsertRegistry(reg.path("id").asText(), reg);
            }
            jdbcRepository.upsertMapping(mappingId, m);

            long apId = approvalSyncService.insertSchemaMappingApproval(mappingId, name,
                "Schema mapping submission — coverage " + coverage + "%", userId);
            m.put("approvalRefId", String.valueOf(apId));

            jdbcRepository.upsertMapping(mappingId, m);
            ObjectNode res = mapper.createObjectNode();
            res.put("approvalId", String.valueOf(apId));
            res.put("requestId", rid());
            auditService.logSystemEvent("MAPPING_SUBMIT_APPROVAL", "SCHEMA_MAPPING", mappingId,
                "Submitted mapping for approval " + apId);
            return res;
        }
    }

    public ObjectNode driftScan(String versionId) throws Exception {
        synchronized (lock) {
            if (findVersion(versionId) == null) {
                throw new SchemaMapperApiException(HttpStatus.NOT_FOUND, "SCHEMA_VERSION_NOT_FOUND", "Schema version not found");
            }
            String driftId = "drift_" + UUID.randomUUID().toString().substring(0, 8);
            ObjectNode log = mapper.createObjectNode();
            log.put("_id", driftId);
            log.put("tenantId", TENANT);
            log.put("schemaVersionId", versionId);
            log.putNull("previousVersionId");
            ArrayNode changes = mapper.createArrayNode();
            ObjectNode ch = mapper.createObjectNode();
            ch.put("path", "_meta");
            ch.put("changeType", "modified");
            ch.put("detail", "Manual drift scan (dev stub)");
            changes.add(ch);
            log.set("changes", changes);
            log.put("severity", "low");
            log.put("detectedAt", Instant.now().toString());
            log.putNull("remediationJobId");
            ((ArrayNode) state.get("driftLogs")).insert(0, log);
            jdbcRepository.upsertDrift(driftId, log);
            ObjectNode res = mapper.createObjectNode();
            res.put("driftJobId", driftId);
            res.put("requestId", rid());
            return res;
        }
    }

    public ObjectNode listDrift(Integer page, Integer size, String schemaVersionId) {
        synchronized (lock) {
            ArrayNode list = mapper.createArrayNode();
            for (JsonNode d : iterable(state.get("driftLogs"))) {
                if (schemaVersionId != null && !schemaVersionId.isBlank()
                    && !schemaVersionId.equals(d.path("schemaVersionId").asText())) {
                    continue;
                }
                list.add(d);
            }
            return pageSliceResponse(list, page, size);
        }
    }

    public void applyExternalApprovalDecision(String mappingId, String decision) {
        if (mappingId == null || mappingId.isBlank()) return;
        synchronized (lock) {
            ObjectNode m = findMappingObj(mappingId);
            if (m == null) return;
            ObjectNode reg = findRegistryObj(m.path("schemaRegistryId").asText());
            String now = Instant.now().toString();
            switch (decision) {
                case "approved" -> {
                    m.put("status", "active");
                    m.put("updatedAt", now);
                    if (reg != null) {
                        reg.put("status", "active");
                        reg.put("lastModifiedAt", now);
                    }
                }
                case "rejected" -> {
                    m.put("status", "rejected");
                    m.put("updatedAt", now);
                    if (reg != null) {
                        reg.put("status", "draft");
                        reg.put("lastModifiedAt", now);
                    }
                }
                case "changes_requested" -> {
                    m.put("status", "needs_review");
                    m.put("updatedAt", now);
                    if (reg != null) {
                        reg.put("status", "draft");
                        reg.put("lastModifiedAt", now);
                    }
                }
                default -> {
                    return;
                }
            }
            try {
                jdbcRepository.upsertMapping(mappingId, m);
                if (reg != null) jdbcRepository.upsertRegistry(reg.path("id").asText(), reg);
            } catch (Exception e) {
                log.error("Failed to persist approval decision for mapping {}", mappingId, e);
            }
        }
    }

    public void runMappingJobCompletion(String mappingId, SchemaMapperLlmClient llmClient) throws Exception {
        long started = System.currentTimeMillis();
        ObjectNode mapping;
        ArrayNode masterTree;
        synchronized (lock) {
            mapping = findMappingObj(mappingId);
            if (mapping == null || "cancelled".equals(mapping.path("status").asText())) return;
            mapping.put("status", "processing");
            jdbcRepository.upsertMapping(mappingId, mapping);
            masterTree = (ArrayNode) state.get("masterSchemaTree").deepCopy();
        }

        JsonNode ver;
        synchronized (lock) {
            ver = findVersion(mapping.path("schemaVersionId").asText());
        }
        List<SchemaMapperHeuristics.FlatMasterField> flat = flattenMasterFields(masterTree);
        JsonNode parsed = ver != null ? ver.path("parsedFields") : mapper.createArrayNode();
        ArrayNode fieldMappings = SchemaMapperHeuristics.heuristicFieldMappings(mapper, parsed, flat);

        String system = "You are a credit-bureau schema mapper. Reply with JSON: {\"mappings\":[{\"sourcePath\":\"string\",\"canonicalPath\":\"string|null\",\"matchType\":\"exact|semantic|contextual|derived\",\"confidence\":0-1,\"llmRationale\":\"short\"}]}. Only use canonical paths from the provided list.";
        String canonList = flat.stream().map(f -> f.path() + " (" + f.dataType() + ")").reduce((a, b) -> a + "\n" + b).orElse("");
        StringBuilder srcListSb = new StringBuilder();
        if (parsed.isArray()) {
            for (JsonNode p : parsed) {
                srcListSb.append(p.path("path").asText()).append(" (").append(p.path("dataType").asText("string")).append(")\n");
            }
        }
        String srcList = srcListSb.toString();
        synchronized (lock) {
            bumpLlmCallMetric();
            persistMetrics();
        }
        Optional<JsonNode> llm = llmClient.callStructuredMapping(system, "CANONICAL:\n" + canonList + "\n\nSOURCE:\n" + srcList);
        Set<String> allowed = new HashSet<>();
        for (SchemaMapperHeuristics.FlatMasterField f : flat) allowed.add(f.path());
        if (llm.isPresent() && llm.get().has("mappings") && llm.get().get("mappings").isArray()) {
            Map<String, ObjectNode> bySource = new HashMap<>();
            for (JsonNode fm : fieldMappings) {
                bySource.put(fm.path("sourcePath").asText(), (ObjectNode) fm.deepCopy());
            }
            for (JsonNode row : llm.get().get("mappings")) {
                String sp = row.path("sourcePath").asText("");
                if (sp.isEmpty()) continue;
                String cp = row.path("canonicalPath").asText("");
                String useCp = cp != null && allowed.contains(cp) ? cp : null;
                ObjectNode base = bySource.get(sp);
                String fid = null;
                if (useCp != null) {
                    for (SchemaMapperHeuristics.FlatMasterField f : flat) {
                        if (useCp.equals(f.path())) {
                            fid = f.id();
                            break;
                        }
                    }
                }
                ObjectNode merged = mapper.createObjectNode();
                merged.put("sourcePath", sp);
                if (base != null && base.has("sourceFieldId")) merged.set("sourceFieldId", base.get("sourceFieldId"));
                if (useCp != null) merged.put("canonicalPath", useCp);
                else merged.putNull("canonicalPath");
                if (fid != null) merged.put("canonicalFieldId", fid);
                else merged.putNull("canonicalFieldId");
                merged.put("matchType", row.path("matchType").asText("semantic"));
                merged.put("confidence", row.path("confidence").isNumber() ? row.get("confidence").asDouble() : 0.7);
                merged.put("reviewStatus", "pending");
                merged.put("llmRationale", row.path("llmRationale").asText("LLM proposal"));
                merged.put("containsPii", base != null && base.path("containsPii").asBoolean(false));
                bySource.put(sp, merged);
            }
            fieldMappings = mapper.createArrayNode();
            bySource.values().forEach(fieldMappings::add);
        } else {
            synchronized (lock) {
                bumpLlmFailureMetric();
                persistMetrics();
            }
        }

        synchronized (lock) {
            ObjectNode m = findMappingObj(mappingId);
            if (m == null) return;
            m.set("fieldMappings", fieldMappings);
            m.put("status", "needs_review");
            m.put("updatedAt", Instant.now().toString());
            updateRegistryFromMapping(m);
            long elapsed = System.currentTimeMillis() - started;
            ObjectNode metrics = (ObjectNode) state.get("metrics");
            metrics.put("lastJobLatencyMs", elapsed);
            metrics.put("mappingJobsCompleted", metrics.path("mappingJobsCompleted").asInt(0) + 1);
            jdbcRepository.upsertMapping(mappingId, m);
            JsonNode regNode = findRegistry(m.path("schemaRegistryId").asText());
            if (regNode != null) {
                jdbcRepository.upsertRegistry(regNode.path("id").asText(), regNode);
            }
            persistMetrics();
            auditService.logSystemEvent("MAPPING_LLM_COMPLETED", "SCHEMA_MAPPING", mappingId,
                "Mapping job completed in " + elapsed + "ms");
        }
    }

    private void bumpLlmCallMetric() throws Exception {
        ObjectNode metrics = (ObjectNode) state.get("metrics");
        metrics.put("llmCalls", metrics.path("llmCalls").asInt(0) + 1);
    }

    private void bumpLlmFailureMetric() throws Exception {
        ObjectNode metrics = (ObjectNode) state.get("metrics");
        metrics.put("llmFailures", metrics.path("llmFailures").asInt(0) + 1);
    }

    private void bumpOverridesMetric() throws Exception {
        ObjectNode metrics = (ObjectNode) state.get("metrics");
        metrics.put("overridesRecorded", metrics.path("overridesRecorded").asInt(0) + 1);
    }

    private JsonNode findRule(String mappingId, String ruleId) {
        for (JsonNode r : iterable(state.get("validationRules"))) {
            if (ruleId.equals(r.path("_id").asText()) && mappingId.equals(r.path("mappingId").asText())) return r;
        }
        return null;
    }

    private JsonNode findRegistry(String id) {
        for (JsonNode r : iterable(state.get("schemaRegistry"))) {
            if (id.equals(r.path("id").asText())) return r;
        }
        return null;
    }

    private ObjectNode findRegistryObj(String id) {
        JsonNode n = findRegistry(id);
        return n instanceof ObjectNode o ? o : null;
    }

    private JsonNode findVersion(String id) {
        for (JsonNode v : iterable(state.get("schemaVersions"))) {
            if (id.equals(v.path("_id").asText())) return v;
        }
        return null;
    }

    private JsonNode findMapping(String id) {
        for (JsonNode m : iterable(state.get("mappingRegistry"))) {
            if (id.equals(m.path("_id").asText())) return m;
        }
        return null;
    }

    private ObjectNode findMappingObj(String id) {
        JsonNode m = findMapping(id);
        return m instanceof ObjectNode o ? o : null;
    }

    private void updateRegistryFromMapping(ObjectNode mapping) {
        String regId = mapping.path("schemaRegistryId").asText();
        ObjectNode reg = findRegistryObj(regId);
        if (reg == null) return;
        JsonNode fields = mapping.path("fieldMappings");
        int total = Math.max(1, fields.isArray() ? fields.size() : 0);
        int mapped = 0;
        int unmapped = 0;
        if (fields.isArray()) {
            for (JsonNode f : fields) {
                if (f.hasNonNull("canonicalPath") && !f.get("canonicalPath").asText("").isEmpty()) mapped++;
                else unmapped++;
            }
        }
        reg.put("mappingCoverage", Math.round((mapped * 100.0) / total));
        reg.put("unmappedFields", unmapped);
        int ruleCount = 0;
        for (JsonNode r : iterable(state.get("validationRules"))) {
            if (mapping.get("_id").asText().equals(r.path("mappingId").asText()) && r.path("enabled").asBoolean(true)) {
                ruleCount++;
            }
        }
        reg.put("ruleCount", ruleCount);
        reg.put("lastModifiedAt", Instant.now().toString());
    }

    private List<ObjectNode> flattenParsedFieldsForSourceType(JsonNode nodes) {
        List<ObjectNode> out = new ArrayList<>();
        walkParsed(nodes, out);
        return out;
    }

    private void walkParsed(JsonNode nodes, List<ObjectNode> out) {
        if (nodes == null || !nodes.isArray()) return;
        for (JsonNode n : nodes) {
            if (n == null || !n.isObject()) continue;
            String path = n.path("path").asText("").trim();
            String name = n.path("name").asText(path).trim();
            String id = n.path("id").asText("").trim();
            if (id.isEmpty()) id = path.isEmpty() ? name : path;
            String dataType = n.path("dataType").asText("string");
            if (!path.isEmpty()) {
                ObjectNode o = mapper.createObjectNode();
                o.put("id", id);
                o.put("path", path);
                o.put("name", name);
                o.put("dataType", dataType);
                out.add(o);
            }
            if (n.has("children") && n.get("children").isArray()) {
                walkParsed(n.get("children"), out);
            }
        }
    }

    private List<SchemaMapperHeuristics.FlatMasterField> flattenMasterFields(ArrayNode nodes) {
        List<SchemaMapperHeuristics.FlatMasterField> acc = new ArrayList<>();
        walkMaster(nodes, acc);
        return acc;
    }

    private void walkMaster(JsonNode nodes, List<SchemaMapperHeuristics.FlatMasterField> acc) {
        if (nodes == null || !nodes.isArray()) return;
        for (JsonNode n : nodes) {
            String path = n.path("path").asText("").trim();
            String name = n.path("name").asText(path).trim();
            String id = n.path("id").asText("").trim();
            String dataType = n.path("dataType").asText("string");
            String desc = n.path("description").asText("");
            if (!path.isEmpty()) {
                acc.add(new SchemaMapperHeuristics.FlatMasterField(path, id, name, dataType, desc));
            }
            if (n.has("children") && n.get("children").isArray()) {
                walkMaster(n.get("children"), acc);
            }
        }
    }

    private ArrayNode filterRegistry(String sourceType, String status) {
        ArrayNode list = mapper.createArrayNode();
        for (JsonNode r : iterable(state.get("schemaRegistry"))) {
            if (sourceType != null && !sourceType.isBlank() && !"all".equalsIgnoreCase(sourceType)
                && !sourceType.equals(r.path("sourceType").asText())) {
                continue;
            }
            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)
                && !status.equals(r.path("status").asText())) {
                continue;
            }
            list.add(r);
        }
        return list;
    }

    private ObjectNode pageSliceResponse(ArrayNode list, Integer page, Integer size) {
        int p = Math.max(0, page != null ? page : 0);
        int s = Math.min(MAX_PAGE_SIZE, Math.max(1, size != null ? size : 20));
        int from = p * s;
        int to = Math.min(list.size(), from + s);
        ArrayNode content = mapper.createArrayNode();
        for (int i = from; i < to; i++) content.add(list.get(i));
        ObjectNode o = mapper.createObjectNode();
        o.set("content", content);
        o.put("totalElements", list.size());
        o.put("totalPages", Math.max(1, (int) Math.ceil(list.size() / (double) s)));
        o.put("page", p);
        o.put("size", s);
        o.put("requestId", rid());
        return o;
    }

    private Iterable<JsonNode> iterable(JsonNode arr) {
        List<JsonNode> l = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode n : arr) l.add(n);
        }
        return l;
    }

    private static String sha256Hex(String s) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] h = md.digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : h) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
