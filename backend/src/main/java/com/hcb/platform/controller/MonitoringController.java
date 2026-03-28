package com.hcb.platform.controller;

import com.hcb.platform.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Monitoring Controller
 * Provides read-only API views over the api_requests and enquiry_logs tables.
 *
 * Endpoints:
 * - GET /api/v1/monitoring/kpis              — precomputed KPI snapshot
 * - GET /api/v1/monitoring/api-requests      — paged list with filters
 * - GET /api/v1/monitoring/enquiries         — paged enquiry log
 * - GET /api/v1/monitoring/charts            — chart aggregations
 */
@RestController
@RequestMapping("/api/v1/monitoring")
@RequiredArgsConstructor
public class MonitoringController {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    // ─── KPIs ──────────────────────────────────────────────────────────────────

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> kpis() {
        Map<String, Object> kpis = new LinkedHashMap<>();

        // Total calls in the last 24 hours
        Long totalToday = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE timestamp >= datetime('now','-1 day')", Long.class);
        kpis.put("totalCallsToday", totalToday != null ? totalToday : 0);

        // Success rate
        Long successCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE status='Success' AND timestamp >= datetime('now','-1 day')", Long.class);
        long total = totalToday != null && totalToday > 0 ? totalToday : 1;
        long success = successCount != null ? successCount : 0;
        kpis.put("successRatePercent", Math.round((success * 1000.0) / total) / 10.0);

        // P95 latency — computed by sorting and picking the 95th percentile row
        List<Integer> latencies = jdbc.queryForList(
            "SELECT response_time_ms FROM api_requests WHERE timestamp >= datetime('now','-1 day') ORDER BY response_time_ms",
            Integer.class);
        kpis.put("p95LatencyMs", latencies.isEmpty() ? 0 : latencies.get((int) Math.ceil(0.95 * latencies.size()) - 1));
        int sumLatency = latencies.stream().mapToInt(Integer::intValue).sum();
        kpis.put("avgProcessingTimeMs", latencies.isEmpty() ? 0 : sumLatency / latencies.size());

        // Rejection rate
        Long failedCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM api_requests WHERE status IN ('Failed','Partial') AND timestamp >= datetime('now','-1 day')", Long.class);
        long failed = failedCount != null ? failedCount : 0;
        kpis.put("rejectionRatePercent", Math.round((failed * 1000.0) / total) / 10.0);

        // Active API keys
        Long activeKeys = jdbc.queryForObject(
            "SELECT COUNT(DISTINCT ak.id) FROM api_keys ak WHERE ak.status='active'", Long.class);
        kpis.put("activeApiKeys", activeKeys != null ? activeKeys : 0);

        return ResponseEntity.ok(kpis);
    }

    // ─── API Requests ─────────────────────────────────────────────────────────

    @GetMapping("/api-requests")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> apiRequests(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND r.status = ?");
            params.add(status);
        }
        if (dateFrom != null && !dateFrom.isBlank()) {
            where.append(" AND date(r.timestamp) >= ?");
            params.add(dateFrom);
        }
        if (dateTo != null && !dateTo.isBlank()) {
            where.append(" AND date(r.timestamp) <= ?");
            params.add(dateTo);
        }

        String countSql = "SELECT COUNT(*) FROM api_requests r " + where;
        Long total = jdbc.queryForObject(countSql, Long.class, params.toArray());

        String dataSql = "SELECT r.id as requestId, ak.key_prefix as apiKey, r.endpoint, r.status,"
            + " r.response_time_ms as responseTimeMs, r.record_count as records, r.error_code as errorCode,"
            + " r.timestamp FROM api_requests r"
            + " LEFT JOIN api_keys ak ON ak.id = r.api_key_id"
            + " " + where + " ORDER BY r.timestamp DESC LIMIT ? OFFSET ?";

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(size);
        dataParams.add(page * size);

        List<Map<String, Object>> content = jdbc.queryForList(dataSql, dataParams.toArray());
        return ResponseEntity.ok(buildPage(content, total != null ? total : 0, page, size));
    }

    // ─── Enquiries ────────────────────────────────────────────────────────────

    @GetMapping("/enquiries")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> enquiries(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        StringBuilder where = new StringBuilder("WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            where.append(" AND e.enquiry_status = ?");
            params.add(status);
        }
        if (dateFrom != null && !dateFrom.isBlank()) {
            where.append(" AND date(e.requested_at) >= ?");
            params.add(dateFrom);
        }
        if (dateTo != null && !dateTo.isBlank()) {
            where.append(" AND date(e.requested_at) <= ?");
            params.add(dateTo);
        }

        String countSql = "SELECT COUNT(*) FROM enquiry_logs e " + where;
        Long total = jdbc.queryForObject(countSql, Long.class, params.toArray());

        String dataSql = "SELECT e.id as enquiryId, i.name as institution, e.enquiry_status as status,"
            + " e.response_time_ms as responseTimeMs, p.product_name as enquiryType, e.requested_at as timestamp"
            + " FROM enquiry_logs e"
            + " LEFT JOIN institutions i ON i.id = e.subscriber_institution_id"
            + " LEFT JOIN products p ON p.id = e.product_id"
            + " " + where + " ORDER BY e.requested_at DESC LIMIT ? OFFSET ?";

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(size);
        dataParams.add(page * size);

        List<Map<String, Object>> content = jdbc.queryForList(dataSql, dataParams.toArray());
        return ResponseEntity.ok(buildPage(content, total != null ? total : 0, page, size));
    }

    // ─── Charts ───────────────────────────────────────────────────────────────

    @GetMapping("/charts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<Map<String, Object>> charts() {
        Map<String, Object> result = new LinkedHashMap<>();

        // API call volume — last 30 days
        List<Map<String, Object>> volume30d = jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', timestamp) as day, COUNT(*) as volume FROM api_requests"
            + " WHERE timestamp >= datetime('now','-30 days')"
            + " GROUP BY day ORDER BY day");
        result.put("apiCallVolume30Days", volume30d);

        // Latency trend — last 30 days (P95 per day approximated)
        List<Map<String, Object>> latencyTrend = jdbc.queryForList(
            "SELECT strftime('%Y-%m-%d', timestamp) as day,"
            + " MAX(response_time_ms) as p95, MAX(response_time_ms) as p99"
            + " FROM api_requests WHERE timestamp >= datetime('now','-30 days')"
            + " GROUP BY day ORDER BY day");
        result.put("latencyTrendData", latencyTrend);

        // Success vs failure
        List<Map<String, Object>> successFail = jdbc.queryForList(
            "SELECT status as name, COUNT(*) as value FROM api_requests"
            + " WHERE timestamp >= datetime('now','-7 days') GROUP BY status");
        result.put("successVsFailureData", successFail);

        // Top rejection reasons
        List<Map<String, Object>> rejections = jdbc.queryForList(
            "SELECT error_code as reason, COUNT(*) as count FROM api_requests"
            + " WHERE status IN ('Failed','Partial') AND error_code IS NOT NULL"
            + " GROUP BY error_code ORDER BY count DESC LIMIT 5");
        result.put("topRejectionReasonsData", rejections);

        return ResponseEntity.ok(result);
    }

    // ─── Util ─────────────────────────────────────────────────────────────────

    private Map<String, Object> buildPage(List<Map<String, Object>> content, long total, int page, int size) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("content", content);
        p.put("totalElements", total);
        p.put("totalPages", size > 0 ? (int) Math.ceil((double) total / size) : 1);
        p.put("page", page);
        p.put("size", size);
        return p;
    }
}
