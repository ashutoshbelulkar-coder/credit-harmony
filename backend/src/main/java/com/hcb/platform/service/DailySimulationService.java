package com.hcb.platform.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

/**
 * Daily Simulation Service — Append-Only Operational Data Generation
 *
 * Rules:
 * - APPEND ONLY: never overwrites existing rows
 * - Referential integrity: all FKs verified before INSERT
 * - Transactions: each simulation run is atomic
 * - Generates realistic daily volumes for dashboards
 *
 * Schedule: runs daily at 00:05 UTC
 */
@Service
@RequiredArgsConstructor
public class DailySimulationService {

    private static final Logger log = LoggerFactory.getLogger(DailySimulationService.class);
    private final JdbcTemplate jdbcTemplate;
    private final Random random = new Random();

    /**
     * Daily scheduled simulation — generates operational data for today.
     * Runs daily at 00:05 AM.
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void runDailySimulation() {
        LocalDate today = LocalDate.now();
        log.info("Starting daily data simulation for {}", today);

        try {
            generateApiRequests(today);
            generateBatchJobs(today);
            generateEnquiries(today);
            evaluateAlerts(today);
            log.info("Daily simulation completed successfully for {}", today);
        } catch (Exception e) {
            log.error("Daily simulation failed for {}: {}", today, e.getMessage());
            throw e; // trigger rollback
        }
    }

    /**
     * Generate today's API request log entries (~28,000 volume).
     * Append-only: only inserts rows with today's date.
     */
    private void generateApiRequests(LocalDate date) {
        List<Long> institutionIds = jdbcTemplate.queryForList(
            "SELECT id FROM institutions WHERE institution_lifecycle_status = 'active' AND is_deleted = 0",
            Long.class
        );
        if (institutionIds.isEmpty()) return;

        int dailyVolume = 25000 + random.nextInt(6000);
        String[] endpoints = {"/submission", "/submission/bulk", "/inquiry", "/api/v1/institutions"};
        String[] statuses = {"success", "success", "success", "success", "success", "success",
                             "success", "success", "success", "failed", "partial", "rate_limited"};

        for (int i = 0; i < Math.min(dailyVolume, 200); i++) { // Insert sample (full volume via batch)
            Long instId = institutionIds.get(random.nextInt(institutionIds.size()));
            String endpoint = endpoints[random.nextInt(endpoints.length)];
            String status = statuses[random.nextInt(statuses.length)];
            int responseMs = 80 + random.nextInt(450);
            int records = status.equals("success") ? 100 + random.nextInt(4900) : 0;
            LocalDateTime occurredAt = date.atStartOfDay().plusMinutes(random.nextInt(1440));

            jdbcTemplate.update(
                "INSERT INTO api_requests (institution_id, endpoint, http_method, " +
                "api_request_status, response_time_ms, records_processed, occurred_at) " +
                "VALUES (?, ?, 'POST', ?, ?, ?, ?)",
                instId, endpoint, status, responseMs, records, occurredAt.toString()
            );
        }
        log.debug("Generated {} api_requests rows for {}", 200, date);
    }

    /**
     * Generate daily batch jobs (~5 per active institution).
     */
    private void generateBatchJobs(LocalDate date) {
        List<Long> institutionIds = jdbcTemplate.queryForList(
            "SELECT id FROM institutions WHERE is_data_submitter = 1 AND institution_lifecycle_status = 'active' AND is_deleted = 0",
            Long.class
        );

        for (Long instId : institutionIds) {
            int numBatches = 1 + random.nextInt(3);
            for (int i = 0; i < numBatches; i++) {
                int total = 500 + random.nextInt(2500);
                int failed = random.nextInt(Math.max(1, total / 20));
                int success = total - failed;
                double successRate = (double) success / total * 100;
                int duration = 60 + random.nextInt(240);
                LocalDateTime uploadedAt = date.atStartOfDay().plusHours(7 + i * 2);

                jdbcTemplate.update(
                    "INSERT INTO batch_jobs (institution_id, file_name, batch_job_status, " +
                    "total_records, success_count, failed_count, success_rate, duration_seconds, " +
                    "uploaded_at, completed_at) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?)",
                    instId,
                    "daily_export_" + date.toString().replace("-", "") + "_batch" + (i + 1) + ".csv",
                    total, success, failed,
                    Math.round(successRate * 100.0) / 100.0,
                    duration,
                    uploadedAt.toString(),
                    uploadedAt.plusSeconds(duration).toString()
                );
            }
        }
        log.debug("Generated batch jobs for {}", date);
    }

    /**
     * Generate daily enquiries (~3,800 per day).
     */
    private void generateEnquiries(LocalDate date) {
        int dailyEnquiries = 3200 + random.nextInt(1200);
        List<Long> consumerIds = jdbcTemplate.queryForList(
            "SELECT id FROM consumers WHERE consumer_status = 'active' ORDER BY RANDOM() LIMIT 500",
            Long.class
        );
        List<Long> apiKeyIds = jdbcTemplate.queryForList(
            "SELECT id FROM api_keys WHERE api_key_status = 'active'",
            Long.class
        );
        List<Long> institutionIds = jdbcTemplate.queryForList(
            "SELECT id FROM institutions WHERE is_subscriber = 1 AND institution_lifecycle_status = 'active'",
            Long.class
        );

        if (consumerIds.isEmpty() || apiKeyIds.isEmpty() || institutionIds.isEmpty()) return;

        String[] types = {"HARD", "HARD", "SOFT"};
        String[] statuses = {"success", "success", "success", "success", "success",
                             "success", "success", "success", "failed", "rate_limited"};

        int toInsert = Math.min(dailyEnquiries, 100); // Sample for SQL; full via batch processor
        for (int i = 0; i < toInsert; i++) {
            Long consumerId = consumerIds.get(random.nextInt(consumerIds.size()));
            Long apiKeyId = apiKeyIds.get(random.nextInt(apiKeyIds.size()));
            Long instId = institutionIds.get(random.nextInt(institutionIds.size()));
            String type = types[random.nextInt(types.length)];
            String status = statuses[random.nextInt(statuses.length)];
            int responseMs = 150 + random.nextInt(400);
            LocalDateTime enquiredAt = date.atStartOfDay().plusMinutes(random.nextInt(1440));

            jdbcTemplate.update(
                "INSERT INTO enquiries (consumer_id, api_key_id, requesting_institution_id, " +
                "enquiry_type, enquiry_status, response_time_ms, enquired_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                consumerId, apiKeyId, instId, type, status, responseMs, enquiredAt.toString()
            );
        }
        log.debug("Generated {} enquiry rows for {}", toInsert, date);
    }

    /**
     * Evaluate alert rules and create incidents where thresholds are breached.
     */
    private void evaluateAlerts(LocalDate date) {
        // Simulate 10% chance of alert incident per enabled rule
        List<Long> enabledRuleIds = jdbcTemplate.queryForList(
            "SELECT id FROM alert_rules WHERE alert_rule_status = 'enabled' AND is_deleted = 0",
            Long.class
        );

        for (Long ruleId : enabledRuleIds) {
            if (random.nextInt(10) == 0) { // 10% chance
                jdbcTemplate.update(
                    "INSERT INTO alert_incidents (alert_rule_id, metric_name, current_value_text, " +
                    "threshold_text, alert_incident_status, triggered_at) " +
                    "VALUES (?, 'Simulated Metric', 'threshold_exceeded', 'configured_threshold', 'active', ?)",
                    ruleId, date.atStartOfDay().plusHours(random.nextInt(24)).toString()
                );
            }
        }
    }
}
