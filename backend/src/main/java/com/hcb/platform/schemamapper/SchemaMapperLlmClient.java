package com.hcb.platform.schemamapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;

/**
 * Optional OpenAI structured mapping — mirrors server/src/schemaMapper.ts callOpenAiStructured.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "hcb.schema-mapper", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SchemaMapperLlmClient {

    private final ObjectMapper objectMapper;

    @Value("${hcb.schema-mapper.llm-enabled:true}")
    private boolean llmEnabled;

    @Value("${OPENAI_API_KEY:}")
    private String openAiKey;

    @Value("${hcb.schema-mapper.openai-model:gpt-4o-mini}")
    private String openAiModel;

    public Optional<JsonNode> callStructuredMapping(String system, String userPayload) {
        if (!llmEnabled || openAiKey == null || openAiKey.isBlank()) {
            return Optional.empty();
        }
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", openAiModel);
            body.put("temperature", 0.15);
            body.set("response_format", objectMapper.createObjectNode().put("type", "json_object"));
            ArrayNode messages = objectMapper.createArrayNode();
            messages.add(objectMapper.createObjectNode().put("role", "system").put("content", system));
            messages.add(objectMapper.createObjectNode().put("role", "user").put("content", userPayload));
            body.set("messages", messages);

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .timeout(Duration.ofSeconds(120))
                .header("Authorization", "Bearer " + openAiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();
            HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                log.warn("OpenAI schema-mapper call failed: status {}", res.statusCode());
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(res.body());
            String text = root.path("choices").path(0).path("message").path("content").asText("");
            if (text.isEmpty()) return Optional.empty();
            JsonNode parsed = objectMapper.readTree(text);
            if (parsed.has("mappings") && parsed.get("mappings").isArray()) {
                return Optional.of(parsed);
            }
            return Optional.empty();
        } catch (Exception e) {
            log.warn("OpenAI schema-mapper call error: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
