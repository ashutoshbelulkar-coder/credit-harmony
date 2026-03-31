package com.hcb.platform.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Data ingestion / drift — mirrors SPA {@code GET /v1/data-ingestion/drift-alerts}.
 */
@RestController
@RequestMapping("/api/v1/data-ingestion")
@RequiredArgsConstructor
public class DataIngestionController {

    private static final DateTimeFormatter SQLITE_DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    @GetMapping("/drift-alerts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> driftAlerts(
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo,
        @RequestParam(required = false) String sourceType
    ) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT id, alert_type, source, message, severity, detected_at, source_type FROM ingestion_drift_alerts ORDER BY detected_at DESC"
        );
        Set<String> namesForFilter = sourceNamesForSourceType(sourceType);
        List<Map<String, Object>> alerts = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String detectedAt = Objects.toString(row.get("detected_at"), "");
            if (!withinDateRange(detectedAt, dateFrom, dateTo)) continue;
            if (namesForFilter != null && !namesForFilter.isEmpty()) {
                String src = Objects.toString(row.get("source"), "");
                if (!matchesSourceNames(src, namesForFilter)) continue;
            }
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("id", Objects.toString(row.get("id"), ""));
            out.put("type", row.get("alert_type"));
            out.put("source", row.get("source"));
            out.put("message", row.get("message"));
            out.put("severity", row.get("severity"));
            out.put("timestamp", toIsoTimestamp(detectedAt));
            alerts.add(out);
        }
        return ResponseEntity.ok(Map.of(
            "alerts", alerts,
            "requestId", UUID.randomUUID().toString()
        ));
    }

    private Set<String> sourceNamesForSourceType(String sourceType) {
        if (sourceType == null || sourceType.isBlank() || "all".equalsIgnoreCase(sourceType)) {
            return null;
        }
        List<String> payloads = jdbc.queryForList("SELECT payload FROM schema_mapper_registry", String.class);
        Set<String> names = new HashSet<>();
        for (String p : payloads) {
            if (p == null || p.isBlank()) continue;
            try {
                JsonNode n = objectMapper.readTree(p);
                if (!sourceType.equalsIgnoreCase(n.path("sourceType").asText(""))) continue;
                String sn = n.path("sourceName").asText("").trim();
                if (!sn.isEmpty()) names.add(sn.toLowerCase(Locale.ROOT));
            } catch (Exception ignored) {
                // skip malformed row
            }
        }
        return names;
    }

    private static boolean matchesSourceNames(String sourceLabel, Set<String> namesLower) {
        String src = sourceLabel.toLowerCase(Locale.ROOT);
        for (String n : namesLower) {
            if (src.contains(n) || n.contains(src)) return true;
        }
        return false;
    }

    private static boolean withinDateRange(String detectedAt, String dateFrom, String dateTo) {
        ZonedDateTime d = parseDetectedAt(detectedAt);
        if (d == null) return false;
        String from = dateFrom == null ? "" : dateFrom.trim();
        String to = dateTo == null ? "" : dateTo.trim();
        if (!from.isEmpty() && !to.isEmpty() && from.compareTo(to) > 0) return false;
        ZoneId z = ZoneId.systemDefault();
        if (!from.isEmpty()) {
            try {
                LocalDate fd = LocalDate.parse(from);
                ZonedDateTime lower = fd.atStartOfDay(z);
                if (d.isBefore(lower)) return false;
            } catch (DateTimeParseException e) {
                return false;
            }
        }
        if (!to.isEmpty()) {
            try {
                LocalDate td = LocalDate.parse(to);
                ZonedDateTime upper = td.atTime(23, 59, 59, 999_000_000).atZone(z);
                if (d.isAfter(upper)) return false;
            } catch (DateTimeParseException e) {
                return false;
            }
        }
        return true;
    }

    private static ZonedDateTime parseDetectedAt(String detectedAt) {
        if (detectedAt == null || detectedAt.isBlank()) return null;
        String s = detectedAt.trim().replace(" ", "T");
        try {
            if (s.length() <= 10) {
                LocalDate ld = LocalDate.parse(s);
                return ld.atStartOfDay(ZoneId.systemDefault());
            }
            if (s.contains("T") && (s.endsWith("Z") || s.contains("+") || s.length() > 19 && s.charAt(19) == '.')) {
                return ZonedDateTime.parse(s.replace(" ", "T"));
            }
            LocalDateTime ldt = LocalDateTime.parse(detectedAt.trim(), SQLITE_DT);
            return ldt.atZone(ZoneId.systemDefault());
        } catch (DateTimeParseException e) {
            try {
                LocalDateTime ldt = LocalDateTime.parse(s);
                return ldt.atZone(ZoneId.systemDefault());
            } catch (DateTimeParseException e2) {
                return null;
            }
        }
    }

    private static String toIsoTimestamp(String detectedAt) {
        ZonedDateTime z = parseDetectedAt(detectedAt);
        if (z == null) return detectedAt;
        return z.toOffsetDateTime().toString();
    }
}
