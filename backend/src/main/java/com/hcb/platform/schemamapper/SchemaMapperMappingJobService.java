package com.hcb.platform.schemamapper;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Async mapping worker (~400ms delay, then heuristic + optional LLM) — mirrors scheduleMappingJob in Fastify.
 */
@Service
@Slf4j
@ConditionalOnProperty(prefix = "hcb.schema-mapper", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SchemaMapperMappingJobService {

    private final SchemaMapperStateService stateService;
    private final SchemaMapperLlmClient llmClient;

    public SchemaMapperMappingJobService(@Lazy SchemaMapperStateService stateService, SchemaMapperLlmClient llmClient) {
        this.stateService = stateService;
        this.llmClient = llmClient;
    }

    @Async
    public void scheduleJob(String mappingId) {
        try {
            Thread.sleep(400);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
        try {
            stateService.runMappingJobCompletion(mappingId, llmClient);
        } catch (Exception e) {
            log.error("Schema mapping job failed for {}", mappingId, e);
        }
    }
}
