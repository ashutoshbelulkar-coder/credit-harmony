package com.hcb.platform.schemamapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Ports heuristic mapping from server/src/schemaMapper.ts (PATH_SYNONYMS + heuristicFieldMappings).
 */
public final class SchemaMapperHeuristics {

    private record CanonRef(String path, String id) {}

    private static final Map<String, CanonRef> PATH_SYNONYMS = Map.ofEntries(
        Map.entry("subscriber_id", new CanonRef("consumer_id", "ms-1")),
        Map.entry("customer_name", new CanonRef("full_name", "ms-2")),
        Map.entry("name", new CanonRef("full_name", "ms-2")),
        Map.entry("dob", new CanonRef("date_of_birth", "ms-3")),
        Map.entry("date_of_birth", new CanonRef("date_of_birth", "ms-3")),
        Map.entry("mobile_no", new CanonRef("phone_number", "ms-5")),
        Map.entry("mobile", new CanonRef("phone_number", "ms-5")),
        Map.entry("phone", new CanonRef("phone_number", "ms-5")),
        Map.entry("utility_customer_id", new CanonRef("consumer_id", "ms-1")),
        Map.entry("payment_delay_days", new CanonRef("accounts.dpd", "ms-6-4")),
        Map.entry("last_payment_status", new CanonRef("accounts.account_status", "ms-6-5")),
        Map.entry("payment_status", new CanonRef("accounts.account_status", "ms-6-5")),
        Map.entry("avg_monthly_bill", new CanonRef("accounts.current_balance", "ms-6-3")),
        Map.entry("monthly_bill_amount", new CanonRef("accounts.current_balance", "ms-6-3")),
        Map.entry("outstanding_amount", new CanonRef("accounts.current_balance", "ms-6-3"))
    );

    private SchemaMapperHeuristics() {
    }

    public static String norm(String s) {
        if (s == null) return "";
        return s.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
    }

    public static ArrayNode heuristicFieldMappings(
        com.fasterxml.jackson.databind.ObjectMapper mapper,
        JsonNode parsedFields,
        List<FlatMasterField> flatMaster
    ) {
        Map<String, FlatMasterField> byPath = new HashMap<>();
        for (FlatMasterField f : flatMaster) {
            byPath.put(f.path(), f);
        }
        ArrayNode out = mapper.createArrayNode();
        if (!parsedFields.isArray()) return out;
        for (JsonNode pf : parsedFields) {
            String name = text(pf, "name");
            String path = text(pf, "path");
            String key = norm(name.isEmpty() ? path : name);
            CanonRef syn = PATH_SYNONYMS.get(name);
            if (syn == null) syn = PATH_SYNONYMS.get(key);
            String canonicalPath = syn != null ? syn.path() : null;
            String canonicalFieldId = syn != null ? syn.id() : null;
            String matchType = syn != null ? "semantic" : "contextual";
            double confidence = syn != null ? 0.82 : 0.45;
            if (canonicalPath == null) {
                FlatMasterField fuzzy = null;
                for (FlatMasterField f : flatMaster) {
                    if (norm(f.name()).equals(key) || norm(f.path()).equals(key)
                        || f.path().endsWith("." + name)) {
                        fuzzy = f;
                        break;
                    }
                }
                if (fuzzy != null) {
                    canonicalPath = fuzzy.path();
                    canonicalFieldId = fuzzy.id();
                    matchType = "exact";
                    confidence = 0.91;
                }
            }
            FlatMasterField master = canonicalPath != null ? byPath.get(canonicalPath) : null;
            String sp = !path.isEmpty() ? path : name;
            ObjectNode row = mapper.createObjectNode();
            row.put("sourcePath", sp);
            if (pf.hasNonNull("id")) row.set("sourceFieldId", pf.get("id"));
            if (canonicalPath != null) {
                row.put("canonicalPath", canonicalPath);
                row.put("canonicalFieldId", canonicalFieldId);
                row.put("matchType", matchType);
                row.put("confidence", confidence);
                row.put("reviewStatus", "pending");
                row.put("llmRationale", "Heuristic alignment to " + canonicalPath
                    + (master != null && master.description() != null && !master.description().isEmpty()
                    ? ": " + master.description() : ""));
            } else {
                row.putNull("canonicalPath");
                row.putNull("canonicalFieldId");
                row.put("matchType", "derived");
                row.putNull("confidence");
                row.put("reviewStatus", "pending");
                row.put("llmRationale", "No confident match — needs human review");
            }
            row.put("containsPii", false);
            out.add(row);
        }
        return out;
    }

    private static String text(JsonNode n, String field) {
        if (n == null || !n.has(field) || n.get(field).isNull()) return "";
        return n.get(field).asText("").trim();
    }

    public record FlatMasterField(String path, String id, String name, String dataType, String description) {
    }
}
