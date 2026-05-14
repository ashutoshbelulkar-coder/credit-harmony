package com.hcb.platform.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.hcb.platform.schemamapper.SchemaMapperStateService;
import com.hcb.platform.security.AuthUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/schema-mapper")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "hcb.schema-mapper", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SchemaMapperController {

    private final SchemaMapperStateService schemaMapper;

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> metrics() throws Exception {
        return ResponseEntity.ok(schemaMapper.metricsResponse());
    }

    @GetMapping("/canonical")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> canonical() {
        return ResponseEntity.ok(schemaMapper.canonicalResponse());
    }

    @GetMapping("/wizard-metadata")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> wizardMetadata() {
        return ResponseEntity.ok(schemaMapper.wizardMetadataResponse());
    }

    @GetMapping("/schemas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> schemas(
        @RequestParam(required = false) String sourceType,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") Integer page,
        @RequestParam(defaultValue = "20") Integer size
    ) {
        return ResponseEntity.ok(schemaMapper.listSchemas(page, size, sourceType, status));
    }

    @GetMapping("/schemas/source-types")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> sourceTypes() {
        return ResponseEntity.ok(schemaMapper.sourceTypesResponse());
    }

    @GetMapping("/schemas/source-type-fields")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> sourceTypeFields(@RequestParam(required = false) String sourceType) {
        return ResponseEntity.ok(schemaMapper.sourceTypeFields(sourceType));
    }

    @PostMapping("/ingest")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<JsonNode> ingest(
        @RequestBody JsonNode body,
        @AuthenticationPrincipal AuthUserPrincipal principal
    ) throws Exception {
        String email = principal != null ? principal.getEmail() : "unknown";
        return ResponseEntity.status(HttpStatus.CREATED).body(schemaMapper.ingest(body, email));
    }

    @PostMapping("/mappings")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<JsonNode> createMapping(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal AuthUserPrincipal principal
    ) throws Exception {
        String verId = body.get("schemaVersionId");
        if (verId == null || verId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String email = principal != null ? principal.getEmail() : "unknown";
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(schemaMapper.createMappingJob(verId, email));
    }

    @GetMapping("/mappings/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> getMapping(@PathVariable String id) throws Exception {
        return ResponseEntity.ok(schemaMapper.getMapping(id));
    }

    @PatchMapping("/mappings/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<JsonNode> patchMapping(@PathVariable String id, @RequestBody JsonNode body) throws Exception {
        return ResponseEntity.ok(schemaMapper.patchMapping(id, body));
    }

    @GetMapping("/mappings/{id}/rules")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> listRules(@PathVariable String id) {
        return ResponseEntity.ok(schemaMapper.listRules(id));
    }

    @PostMapping("/mappings/{id}/rules")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<JsonNode> createRule(@PathVariable String id, @RequestBody JsonNode body) throws Exception {
        return ResponseEntity.status(HttpStatus.CREATED).body(schemaMapper.createRule(id, body));
    }

    @PatchMapping("/mappings/{id}/rules/{ruleId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<JsonNode> patchRule(
        @PathVariable String id,
        @PathVariable String ruleId,
        @RequestBody JsonNode body
    ) throws Exception {
        return ResponseEntity.ok(schemaMapper.patchRule(id, ruleId, body));
    }

    @DeleteMapping("/mappings/{id}/rules/{ruleId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<Void> deleteRule(@PathVariable String id, @PathVariable String ruleId) throws Exception {
        schemaMapper.deleteRule(id, ruleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mappings/{id}/submit-approval")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<JsonNode> submitApproval(
        @PathVariable String id,
        @AuthenticationPrincipal AuthUserPrincipal principal
    ) throws Exception {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.status(HttpStatus.ACCEPTED)
            .body(schemaMapper.submitApproval(id, principal.getEmail(), principal.getId()));
    }

    @PostMapping("/schemas/{versionId}/drift-scan")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST')")
    public ResponseEntity<JsonNode> driftScan(@PathVariable String versionId) throws Exception {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(schemaMapper.driftScan(versionId));
    }

    @GetMapping("/drift")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','BUREAU_ADMIN','ANALYST','VIEWER')")
    public ResponseEntity<JsonNode> drift(
        @RequestParam(required = false) String schemaVersionId,
        @RequestParam(defaultValue = "0") Integer page,
        @RequestParam(defaultValue = "20") Integer size
    ) {
        return ResponseEntity.ok(schemaMapper.listDrift(page, size, schemaVersionId));
    }
}
