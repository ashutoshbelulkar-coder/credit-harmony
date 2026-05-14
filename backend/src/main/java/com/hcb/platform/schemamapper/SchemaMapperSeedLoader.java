package com.hcb.platform.schemamapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds initial schema-mapper state from classpath config/schema-mapper.json
 * (mirrors server/src/schemaMapper.ts createSchemaMapperSlice).
 */
@Component
@ConditionalOnProperty(prefix = "hcb.schema-mapper", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SchemaMapperSeedLoader {

    private static final String TENANT = "hcb-dev";
    private static final String RESOURCE = "config/schema-mapper.json";

    private final ObjectMapper mapper;

    public SchemaMapperSeedLoader(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public ObjectNode buildFreshState() throws Exception {
        JsonNode data;
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            data = mapper.readTree(in);
        }

        ArrayNode wizardSource = normaliseWizardOptions(
            data.get("wizardSourceTypeOptions"), defaultSourceTypes());
        ArrayNode wizardData = normaliseWizardOptions(
            data.get("wizardDataCategoryOptions"), defaultDataCategories());

        ArrayNode entries = data.has("schemaRegistryEntries") && data.get("schemaRegistryEntries").isArray()
            ? (ArrayNode) data.get("schemaRegistryEntries")
            : mapper.createArrayNode();
        ArrayNode masterTree = data.has("masterSchemaTree") && data.get("masterSchemaTree").isArray()
            ? (ArrayNode) data.get("masterSchemaTree")
            : mapper.createArrayNode();
        ArrayNode masterVersions = data.has("masterSchemaVersions") && data.get("masterSchemaVersions").isArray()
            ? (ArrayNode) data.get("masterSchemaVersions")
            : mapper.createArrayNode();

        List<SchemaMapperHeuristics.FlatMasterField> flat = flattenMasterFields(masterTree);
        String canonicalId = "canon_v1_1";
        ArrayNode fieldsArr = mapper.createArrayNode();
        for (SchemaMapperHeuristics.FlatMasterField f : flat) {
            ObjectNode fo = mapper.createObjectNode();
            fo.put("path", f.path());
            fo.put("id", f.id());
            fo.put("name", f.name());
            fo.put("dataType", f.dataType());
            fo.put("description", f.description() != null ? f.description() : "");
            fieldsArr.add(fo);
        }
        ArrayNode canonicalRegistry = mapper.createArrayNode();
        ObjectNode canon = mapper.createObjectNode();
        canon.put("_id", canonicalId);
        canon.put("tenantId", TENANT);
        canon.put("version", "1.1.0");
        canon.put("label", "HCB Master v1.1");
        canon.put("effectiveFrom", "2025-12-15");
        canon.set("fields", fieldsArr);
        canon.put("hash", sha256Hex(mapper.writeValueAsString(fieldsArr)));
        canonicalRegistry.add(canon);

        ArrayNode schemaVersions = mapper.createArrayNode();
        ArrayNode schemaRegistry = mapper.createArrayNode();
        ArrayNode rawDataStore = mapper.createArrayNode();

        for (JsonNode e : entries) {
            String regId = e.path("id").asText();
            String verId = "ver_" + regId + "_1";
            String sourceType = e.path("sourceType").asText("telecom");
            SampleTemplate tmpl = sampleParsedFieldsTemplate(data, sourceType);
            String rawId = "raw_" + regId + "_1";
            String now = e.path("createdAt").asText("2025-11-10T09:00:00Z");

            ObjectNode ver = mapper.createObjectNode();
            ver.put("_id", verId);
            ver.put("schemaRegistryId", regId);
            ver.put("rawDataId", rawId);
            ver.put("versionLabel", e.path("version").asText("v1"));
            String st = e.path("status").asText("draft");
            ver.put("status", "archived".equals(st) ? "superseded" : "active");
            ver.put("fieldTreeRef", "inline");
            ver.set("parsedFields", tmpl.parsedFields());
            ver.set("fieldStats", tmpl.fieldStats());
            ver.put("createdAt", now);
            schemaVersions.add(ver);

            ObjectNode reg = (ObjectNode) e.deepCopy();
            reg.put("tenantId", TENANT);
            reg.put("currentVersionId", verId);
            reg.set("institutionScope", mapper.createArrayNode());
            schemaRegistry.add(reg);

            int fieldCount = tmpl.parsedFields().isArray() ? tmpl.parsedFields().size() : 0;
            ObjectNode raw = mapper.createObjectNode();
            raw.put("_id", rawId);
            raw.put("tenantId", TENANT);
            raw.putNull("institutionId");
            raw.put("sourceType", sourceType);
            raw.put("contentType", "json_schema");
            raw.putNull("storageUri");
            raw.putNull("inlinePayload");
            ObjectNode summary = mapper.createObjectNode();
            summary.put("fieldCount", fieldCount);
            summary.put("maxDepth", 1);
            raw.set("parsedSummary", summary);
            raw.set("piiFlagsDetected", mapper.createArrayNode());
            raw.put("checksumSha256", sha256Hex(regId));
            raw.put("ingestedBy", e.path("createdBy").asText("system"));
            raw.put("ingestedAt", now);
            raw.put("schemaRegistryId", regId);
            rawDataStore.add(raw);
        }

        ObjectNode metrics = mapper.createObjectNode();
        metrics.put("mappingJobsCompleted", 0);
        metrics.put("lastJobLatencyMs", 0);
        metrics.put("llmCalls", 0);
        metrics.put("llmFailures", 0);
        metrics.put("overridesRecorded", 0);

        ObjectNode root = mapper.createObjectNode();
        root.put("tenantId", TENANT);
        root.set("rawDataStore", rawDataStore);
        root.set("schemaRegistry", schemaRegistry);
        root.set("schemaVersions", schemaVersions);
        root.set("canonicalRegistry", canonicalRegistry);
        root.set("mappingRegistry", mapper.createArrayNode());
        root.set("validationRules", mapper.createArrayNode());
        root.set("driftLogs", mapper.createArrayNode());
        root.set("masterSchemaTree", masterTree);
        root.set("masterSchemaVersions", masterVersions);
        root.set("metrics", metrics);
        root.set("wizardSourceTypeOptions", wizardSource);
        root.set("wizardDataCategoryOptions", wizardData);
        return root;
    }

    private record SampleTemplate(JsonNode parsedFields, JsonNode fieldStats) {
    }

    private SampleTemplate sampleParsedFieldsTemplate(JsonNode data, String sourceType) {
        JsonNode telecomFields = data.path("telecomParsedFields");
        JsonNode telecomStats = data.path("telecomFieldStatistics");
        if (!telecomFields.isArray() || telecomFields.isEmpty()) {
            telecomFields = mapper.createArrayNode();
        }
        if (telecomStats.isMissingNode() || telecomStats.isNull()) {
            telecomStats = mapper.createObjectNode();
        }
        return switch (sourceType) {
            case "utility" -> new SampleTemplate(
                pickArray(data, "utilityParsedFields", telecomFields),
                pickNode(data, "utilityFieldStatistics", telecomStats));
            case "telecom" -> new SampleTemplate(telecomFields, telecomStats);
            case "bank" -> new SampleTemplate(
                pickArray(data, "bankParsedFields", telecomFields),
                pickNode(data, "bankFieldStatistics", telecomStats));
            case "gst" -> new SampleTemplate(
                pickArray(data, "gstParsedFields", telecomFields),
                pickNode(data, "gstFieldStatistics", telecomStats));
            case "custom" -> new SampleTemplate(
                pickArray(data, "customParsedFields", telecomFields),
                pickNode(data, "customFieldStatistics", telecomStats));
            default -> new SampleTemplate(telecomFields, telecomStats);
        };
    }

    private JsonNode pickArray(JsonNode data, String key, JsonNode fallback) {
        JsonNode n = data.get(key);
        return n != null && n.isArray() && !n.isEmpty() ? n : fallback;
    }

    private JsonNode pickNode(JsonNode data, String key, JsonNode fallback) {
        JsonNode n = data.get(key);
        return n != null && !n.isNull() ? n : fallback;
    }

    private ArrayNode normaliseWizardOptions(JsonNode raw, ArrayNode fallback) {
        if (raw == null || !raw.isArray() || raw.isEmpty()) {
            return fallback;
        }
        ArrayNode out = mapper.createArrayNode();
        for (JsonNode row : raw) {
            if (row == null || !row.isObject()) continue;
            String value = row.path("value").asText("").trim();
            if (value.isEmpty()) value = row.path("id").asText("").trim();
            String label = row.path("label").asText("").trim();
            if (label.isEmpty()) label = row.path("name").asText(value).trim();
            if (value.isEmpty() || label.isEmpty()) continue;
            ObjectNode o = mapper.createObjectNode();
            o.put("value", value);
            o.put("label", label);
            out.add(o);
        }
        return out.isEmpty() ? fallback : out;
    }

    private ArrayNode defaultSourceTypes() {
        ArrayNode a = mapper.createArrayNode();
        a.add(opt("telecom", "Telecom"));
        a.add(opt("utility", "Utility"));
        a.add(opt("bank", "Bank"));
        a.add(opt("gst", "GST"));
        a.add(opt("custom", "Custom"));
        return a;
    }

    private ArrayNode defaultDataCategories() {
        ArrayNode a = mapper.createArrayNode();
        a.add(opt("Financial Data", "Financial Data"));
        a.add(opt("Business Data", "Business Data"));
        a.add(opt("Behavioral Data", "Behavioral Data"));
        a.add(opt("Consortium Data", "Consortium Data"));
        a.add(opt("Fraud Signals", "Fraud Signals"));
        a.add(opt("Synthetic / Test", "Synthetic / Test"));
        return a;
    }

    private ObjectNode opt(String v, String l) {
        ObjectNode o = mapper.createObjectNode();
        o.put("value", v);
        o.put("label", l);
        return o;
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
                walkMaster((ArrayNode) n.get("children"), acc);
            }
        }
    }

    private static String sha256Hex(String s) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] h = md.digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : h) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
