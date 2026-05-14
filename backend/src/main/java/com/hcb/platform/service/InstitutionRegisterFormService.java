package com.hcb.platform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds {@code GET /api/v1/institutions/form-metadata} payloads from classpath JSON
 * plus live institution types and active consortiums (same contract as Fastify
 * {@code institutionRegisterForm.ts}).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InstitutionRegisterFormService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public JsonNode buildFormMetadata(String requestedGeography) throws IOException {
        JsonNode root = readJson("config/institution-register-form.json");
        String defaultGeo = root.path("defaultGeography").asText("default");
        String geoKey = (requestedGeography == null || requestedGeography.isBlank()) ? defaultGeo : requestedGeography.trim();
        JsonNode geographies = root.get("geographies");
        if (geographies == null || !geographies.has(geoKey)) {
            geoKey = defaultGeo;
        }
        JsonNode geo = geographies.get(geoKey);

        List<String> institutionTypes = queryDistinctInstitutionTypes();
        List<Map<String, String>> activeConsortiums = queryActiveConsortiums();

        ArrayNode sectionsOut = objectMapper.createArrayNode();
        for (JsonNode section : geo.path("sections")) {
            ObjectNode sec = objectMapper.createObjectNode();
            sec.put("id", section.path("id").asText());
            sec.put("legend", section.path("legend").asText());
            String layout = section.path("layout").asText("grid2");
            if ("grid2".equals(layout) || "checkboxCards".equals(layout) || "full".equals(layout)) {
                sec.put("layout", layout);
            } else {
                sec.put("layout", "grid2");
            }
            if (section.has("visibleWhen") && section.get("visibleWhen").isObject()) {
                sec.set("visibleWhen", section.get("visibleWhen"));
            }
            if (section.has("refineAtLeastOne") && section.get("refineAtLeastOne").isArray()) {
                sec.set("refineAtLeastOne", section.get("refineAtLeastOne"));
            }
            ArrayNode fieldsOut = objectMapper.createArrayNode();
            for (JsonNode field : section.path("fields")) {
                fieldsOut.add(normaliseField(field, institutionTypes, activeConsortiums));
            }
            sec.set("fields", fieldsOut);
            sectionsOut.add(sec);
        }

        ObjectNode registerForm = objectMapper.createObjectNode();
        registerForm.put("geographyId", geoKey);
        if (geo.hasNonNull("label")) {
            registerForm.put("geographyLabel", geo.get("label").asText());
        }
        if (geo.hasNonNull("description")) {
            registerForm.put("geographyDescription", geo.get("description").asText());
        }
        registerForm.set("sections", sectionsOut);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("geographyId", geoKey);
        if (geo.hasNonNull("label")) {
            payload.put("geographyLabel", geo.get("label").asText());
        }
        if (geo.hasNonNull("description")) {
            payload.put("geographyDescription", geo.get("description").asText());
        }
        payload.set("registerForm", registerForm);
        payload.set("institutionTypes", objectMapper.valueToTree(institutionTypes));
        payload.set("activeConsortiums", objectMapper.valueToTree(activeConsortiums));
        JsonNode compliance = readJsonIfPresent("config/required-compliance-documents.json");
        if (compliance != null && compliance.isArray()) {
            payload.set("requiredComplianceDocuments", compliance);
        } else {
            payload.putNull("requiredComplianceDocuments");
        }

        return payload;
    }

    /**
     * {@code is_deleted = 0} matches SQLite integer flags but H2 maps the column as BOOLEAN and rejects {@code = 0}.
     * {@code NOT is_deleted} works for both (and for NULL-safe behaviour on boolean false / 0).
     */
    private List<String> queryDistinctInstitutionTypes() {
        try {
            return jdbc.query(
                "SELECT DISTINCT institution_type FROM institutions WHERE NOT is_deleted ORDER BY institution_type",
                (rs, rowNum) -> rs.getString(1)
            );
        } catch (DataAccessException e) {
            log.debug("institution types query failed: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * {@code CAST(id AS TEXT)} is SQLite-specific; H2 rejects it. IDs are formatted in Java.
     * Hibernate test DDL has no {@code consortiums} table — return empty list (SPA still gets form shape).
     */
    private List<Map<String, String>> queryActiveConsortiums() {
        try {
            return jdbc.query(
                "SELECT id, consortium_name AS name FROM consortiums "
                    + "WHERE consortium_status = 'active' AND NOT is_deleted ORDER BY consortium_name",
                (rs, rowNum) -> {
                    Map<String, String> row = new LinkedHashMap<>();
                    row.put("id", String.valueOf(rs.getLong("id")));
                    row.put("name", rs.getString("name"));
                    return row;
                }
            );
        } catch (DataAccessException e) {
            log.debug("active consortiums query skipped or failed: {}", e.getMessage());
            return List.of();
        }
    }

    private JsonNode readJson(String classpath) throws IOException {
        ClassPathResource res = new ClassPathResource(classpath.startsWith("/") ? classpath.substring(1) : classpath);
        try (InputStream in = res.getInputStream()) {
            return objectMapper.readTree(in);
        }
    }

    private JsonNode readJsonIfPresent(String classpath) {
        try {
            String p = classpath.startsWith("/") ? classpath.substring(1) : classpath;
            ClassPathResource res = new ClassPathResource(p);
            if (!res.exists()) return null;
            try (InputStream in = res.getInputStream()) {
                return objectMapper.readTree(in);
            }
        } catch (IOException e) {
            return null;
        }
    }

    private ObjectNode normaliseField(
        JsonNode f,
        List<String> institutionTypes,
        List<Map<String, String>> activeConsortiums
    ) {
        ObjectNode out = objectMapper.createObjectNode();
        out.put("name", f.path("name").asText());
        if (f.hasNonNull("apiKey")) {
            out.put("apiKey", f.get("apiKey").asText());
        }
        out.put("label", f.path("label").asText());
        if (f.hasNonNull("description")) {
            out.put("description", f.get("description").asText());
        }
        if (f.hasNonNull("placeholder")) {
            out.put("placeholder", f.get("placeholder").asText());
        }
        String inputType = f.path("inputType").asText("text");
        out.put("inputType", inputType);

        String selectionMode = f.path("selectionMode").asText("");
        if ("multiple".equals(selectionMode) || "single".equals(selectionMode)) {
            out.put("selectionMode", selectionMode);
        } else if ("multiselect".equals(inputType)) {
            out.put("selectionMode", "multiple");
        } else if ("select".equals(inputType)) {
            out.put("selectionMode", "single");
        }

        out.put("required", f.path("required").asBoolean(false));
        if (f.has("readOnly") && f.get("readOnly").isBoolean()) {
            out.put("readOnly", f.get("readOnly").asBoolean());
        }
        if (f.hasNonNull("description")) {
            out.put("description", f.get("description").asText());
        }
        if (f.has("maxLength") && f.get("maxLength").isNumber()) {
            out.put("maxLength", f.get("maxLength").asInt());
        }
        if (f.has("minLength") && f.get("minLength").isNumber()) {
            out.put("minLength", f.get("minLength").asInt());
        }
        if (f.hasNonNull("pattern")) {
            out.put("pattern", f.get("pattern").asText());
        }

        ArrayNode options = objectMapper.createArrayNode();
        if (f.has("options") && f.get("options").isArray()) {
            for (JsonNode o : f.get("options")) {
                ObjectNode opt = objectMapper.createObjectNode();
                opt.put("value", o.path("value").asText());
                opt.put("label", o.path("label").asText(o.path("value").asText()));
                options.add(opt);
            }
        } else {
            String optionSource = f.path("optionSource").asText("");
            if ("institutionTypes".equals(optionSource)) {
                for (String t : institutionTypes) {
                    ObjectNode opt = objectMapper.createObjectNode();
                    opt.put("value", t);
                    opt.put("label", t);
                    options.add(opt);
                }
            } else if ("activeConsortiums".equals(optionSource)) {
                for (Map<String, String> c : activeConsortiums) {
                    ObjectNode opt = objectMapper.createObjectNode();
                    opt.put("value", c.get("id"));
                    opt.put("label", c.get("name"));
                    options.add(opt);
                }
            }
        }
        out.set("options", options);
        return out;
    }
}
