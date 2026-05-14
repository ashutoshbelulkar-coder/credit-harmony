/**
 * Schema Mapper Agent — Fastify dev API (in-memory NoSQL-shaped documents).
 * Async LLM mapping jobs with heuristic fallback when OPENAI_API_KEY is unset.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { FastifyInstance } from "fastify";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dataPath } from "./paths.js";
import type { AppState } from "./state.js";
import { appendIngestionDriftAlert } from "./ingestionDriftAlerts.js";
import {
  normaliseWizardLabeledOptions,
  FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS,
  FALLBACK_WIZARD_DATA_CATEGORY_OPTIONS,
  type WizardLabeledOption,
} from "../../src/lib/schema-mapper-wizard-metadata.ts";

/** Injected to avoid circular import with state.ts */
export type SchemaMapperAuditFn = (state: AppState, entry: Record<string, unknown>) => unknown;

const TENANT = "hcb-dev";
const SCHEMA_MAPPER_LLM = process.env.SCHEMA_MAPPER_LLM_ENABLED !== "false";

export interface SchemaMapperSlice {
  tenantId: string;
  rawDataStore: any[];
  schemaRegistry: any[];
  schemaVersions: any[];
  canonicalRegistry: any[];
  mappingRegistry: any[];
  validationRules: any[];
  driftLogs: any[];
  mappingFeedback: any[];
  masterSchemaTree: any[];
  masterSchemaVersions: any[];
  metrics: {
    mappingJobsCompleted: number;
    lastJobLatencyMs: number;
    llmCalls: number;
    llmFailures: number;
    overridesRecorded: number;
  };
  /** Step 1 wizard dropdowns — from `schema-mapper.json` `wizard*Options`, normalised at seed. */
  wizardSourceTypeOptions: WizardLabeledOption[];
  wizardDataCategoryOptions: WizardLabeledOption[];
}

function readSchemaMapperJson() {
  return JSON.parse(readFileSync(dataPath("schema-mapper.json"), "utf8"));
}

function flattenMasterFields(
  nodes: any[],
  acc: { path: string; id: string; name: string; dataType: string; description: string }[] = []
) {
  for (const n of nodes ?? []) {
    acc.push({
      path: n.path,
      id: n.id,
      name: n.name,
      dataType: n.dataType,
      description: n.description ?? "",
    });
    if (n.children?.length) flattenMasterFields(n.children, acc);
  }
  return acc;
}

/** Lexical / synonym heuristic when LLM is off or fails. */
const PATH_SYNONYMS: Record<string, { path: string; id: string }> = {
  subscriber_id: { path: "consumer_id", id: "ms-1" },
  customer_name: { path: "full_name", id: "ms-2" },
  name: { path: "full_name", id: "ms-2" },
  dob: { path: "date_of_birth", id: "ms-3" },
  date_of_birth: { path: "date_of_birth", id: "ms-3" },
  mobile_no: { path: "phone_number", id: "ms-5" },
  mobile: { path: "phone_number", id: "ms-5" },
  phone: { path: "phone_number", id: "ms-5" },
  utility_customer_id: { path: "consumer_id", id: "ms-1" },
  payment_delay_days: { path: "accounts.dpd", id: "ms-6-4" },
  last_payment_status: { path: "accounts.account_status", id: "ms-6-5" },
  payment_status: { path: "accounts.account_status", id: "ms-6-5" },
  avg_monthly_bill: { path: "accounts.current_balance", id: "ms-6-3" },
  monthly_bill_amount: { path: "accounts.current_balance", id: "ms-6-3" },
  outstanding_amount: { path: "accounts.current_balance", id: "ms-6-3" },
};

function norm(s: string) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function heuristicFieldMappings(
  parsedFields: any[],
  flatMaster: { path: string; id: string; name: string; dataType: string; description: string }[]
): any[] {
  const byPath = new Map(flatMaster.map((f) => [f.path, f]));
  return (parsedFields ?? []).map((pf: any) => {
    const key = norm(pf.name ?? pf.path ?? "");
    const syn = PATH_SYNONYMS[pf.name ?? ""] ?? PATH_SYNONYMS[key];
    let canonicalPath: string | null = syn?.path ?? null;
    let canonicalFieldId: string | null = syn?.id ?? null;
    let matchType = syn ? "semantic" : "contextual";
    let confidence = syn ? 0.82 : 0.45;
    if (!canonicalPath) {
      const fuzzy = flatMaster.find(
        (f) => norm(f.name) === key || norm(f.path) === key || f.path.endsWith(`.${pf.name}`)
      );
      if (fuzzy) {
        canonicalPath = fuzzy.path;
        canonicalFieldId = fuzzy.id;
        matchType = "exact";
        confidence = 0.91;
      }
    }
    const master = canonicalPath ? byPath.get(canonicalPath) : undefined;
    const sp = String(pf.path ?? pf.name ?? "");
    return {
      sourcePath: sp,
      sourceFieldId: pf.id,
      canonicalPath,
      canonicalFieldId,
      matchType: canonicalPath ? matchType : "derived",
      confidence: canonicalPath ? confidence : null,
      reviewStatus: canonicalPath && (confidence ?? 0) >= 0.85 ? "pending" : "pending",
      llmRationale: canonicalPath
        ? `Heuristic alignment to ${canonicalPath}${master ? `: ${master.description}` : ""}`
        : "No confident match — needs human review",
      containsPii: false,
    };
  });
}

async function callOpenAiStructured(
  system: string,
  userPayload: string
): Promise<{ mappings: any[] } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !SCHEMA_MAPPER_LLM) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SCHEMA_MODEL ?? "gpt-4o-mini",
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPayload },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    const parsed = JSON.parse(text) as { mappings?: any[] };
    return parsed?.mappings ? { mappings: parsed.mappings } : null;
  } catch {
    return null;
  }
}

function pageSlice<T>(arr: T[], page = 0, size = 20) {
  const p = Math.max(0, Number(page) || 0);
  const s = Math.min(200, Math.max(1, Number(size) || 20));
  const slice = arr.slice(p * s, (p + 1) * s);
  return {
    content: slice,
    totalElements: arr.length,
    totalPages: Math.max(1, Math.ceil(arr.length / s)),
    page: p,
    size: s,
  };
}

/** Flatten ingested `parsedFields` trees (Schema Mapper) to unique paths for validation-rule UIs. */
function flattenParsedFieldsForSourceType(nodes: any[]): { id: string; path: string; name: string; dataType: string }[] {
  const out: { id: string; path: string; name: string; dataType: string }[] = [];
  const walk = (arr: any[]) => {
    for (const n of arr ?? []) {
      if (!n || typeof n !== "object") continue;
      const path = String(n.path ?? n.name ?? "").trim();
      const name = String(n.name ?? path).trim();
      const id = (String(n.id ?? "").trim() || path || name) as string;
      const dataType = String(n.dataType ?? "string");
      if (path) out.push({ id, path, name, dataType });
      if (Array.isArray(n.children) && n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Reference/sample `parsedFields` + `fieldStats` per Schema Mapper `sourceType` (JSON seed + ingest when body omits fields). */
function sampleParsedFieldsTemplate(
  data: Record<string, unknown>,
  sourceType: string
): { parsedFields: any[]; fieldStats: any } {
  const d = data as Record<string, any>;
  const telecomFields = d.telecomParsedFields ?? [];
  const telecomStats = d.telecomFieldStatistics ?? {};
  switch (String(sourceType)) {
    case "utility":
      return {
        parsedFields: d.utilityParsedFields ?? telecomFields,
        fieldStats: d.utilityFieldStatistics ?? telecomStats,
      };
    case "telecom":
      return { parsedFields: telecomFields, fieldStats: telecomStats };
    case "bank":
      return {
        parsedFields: d.bankParsedFields ?? telecomFields,
        fieldStats: d.bankFieldStatistics ?? telecomStats,
      };
    case "gst":
      return {
        parsedFields: d.gstParsedFields ?? telecomFields,
        fieldStats: d.gstFieldStatistics ?? telecomStats,
      };
    case "custom":
      return {
        parsedFields: d.customParsedFields ?? telecomFields,
        fieldStats: d.customFieldStatistics ?? telecomStats,
      };
    default:
      return { parsedFields: telecomFields, fieldStats: telecomStats };
  }
}

export function createSchemaMapperSlice(): SchemaMapperSlice {
  const data = readSchemaMapperJson() as Record<string, unknown>;
  const wizardSourceTypeOptions = normaliseWizardLabeledOptions(
    data.wizardSourceTypeOptions,
    FALLBACK_WIZARD_SOURCE_TYPE_OPTIONS
  );
  const wizardDataCategoryOptions = normaliseWizardLabeledOptions(
    data.wizardDataCategoryOptions,
    FALLBACK_WIZARD_DATA_CATEGORY_OPTIONS
  );

  const entries = [...(data.schemaRegistryEntries ?? [])];
  const masterTree = [...(data.masterSchemaTree ?? [])];
  const masterVersions = [...(data.masterSchemaVersions ?? [])];
  const flat = flattenMasterFields(masterTree);
  const canonicalId = "canon_v1_1";
  const canonicalRegistry = [
    {
      _id: canonicalId,
      tenantId: TENANT,
      version: "1.1.0",
      label: "HCB Master v1.1",
      effectiveFrom: "2025-12-15",
      fields: flat,
      hash: createHash("sha256").update(JSON.stringify(flat)).digest("hex"),
    },
  ];

  const schemaVersions: any[] = [];
  const schemaRegistry = entries.map((e: any) => {
    const verId = `ver_${e.id}_1`;
    const { parsedFields: fields, fieldStats } = sampleParsedFieldsTemplate(data, e.sourceType);
    const rawId = `raw_${e.id}_1`;
    schemaVersions.push({
      _id: verId,
      schemaRegistryId: e.id,
      rawDataId: rawId,
      versionLabel: e.version ?? "v1",
      status: e.status === "archived" ? "superseded" : "active",
      fieldTreeRef: "inline",
      parsedFields: fields,
      fieldStats,
      createdAt: e.createdAt,
    });
    return {
      ...e,
      tenantId: TENANT,
      currentVersionId: verId,
      institutionScope: [],
    };
  });

  const rawDataStore = schemaRegistry.map((e: any) => {
    const ver = schemaVersions.find((v: any) => v.schemaRegistryId === e.id);
    const fieldCount = Array.isArray(ver?.parsedFields) ? ver.parsedFields.length : 0;
    return {
      _id: `raw_${e.id}_1`,
      tenantId: TENANT,
      institutionId: null,
      sourceType: e.sourceType,
      contentType: "json_schema",
      storageUri: null,
      inlinePayload: null,
      parsedSummary: { fieldCount, maxDepth: 1 },
      piiFlagsDetected: [],
      checksumSha256: createHash("sha256").update(e.id).digest("hex"),
      ingestedBy: e.createdBy,
      ingestedAt: e.createdAt,
      schemaRegistryId: e.id,
    };
  });

  return {
    tenantId: TENANT,
    rawDataStore,
    schemaRegistry,
    schemaVersions,
    canonicalRegistry,
    mappingRegistry: [],
    validationRules: [],
    driftLogs: [],
    mappingFeedback: [],
    masterSchemaTree: masterTree,
    masterSchemaVersions: masterVersions,
    metrics: {
      mappingJobsCompleted: 0,
      lastJobLatencyMs: 0,
      llmCalls: 0,
      llmFailures: 0,
      overridesRecorded: 0,
    },
    wizardSourceTypeOptions,
    wizardDataCategoryOptions,
  };
}

function findVersion(sm: SchemaMapperSlice, id: string) {
  return sm.schemaVersions.find((v) => v._id === id);
}

function findMapping(sm: SchemaMapperSlice, id: string) {
  return sm.mappingRegistry.find((m) => m._id === id);
}

function updateRegistryFromMapping(sm: SchemaMapperSlice, mapping: any) {
  const reg = sm.schemaRegistry.find((r) => r.id === mapping.schemaRegistryId);
  if (!reg) return;
  const fields = mapping.fieldMappings ?? [];
  const mapped = fields.filter((f: any) => f.canonicalPath).length;
  const total = Math.max(1, fields.length);
  reg.mappingCoverage = Math.round((mapped / total) * 100);
  reg.unmappedFields = fields.filter((f: any) => !f.canonicalPath).length;
  reg.ruleCount = sm.validationRules.filter((r) => r.mappingId === mapping._id && r.enabled).length;
  reg.lastModifiedAt = new Date().toISOString();
}

export function scheduleMappingJob(state: AppState, mappingId: string, audit: SchemaMapperAuditFn) {
  const sm = state.schemaMapper;
  const started = Date.now();
  setTimeout(async () => {
    const mapping = findMapping(sm, mappingId);
    if (!mapping || mapping.status === "cancelled") return;
    mapping.status = "processing";
    const ver = findVersion(sm, mapping.schemaVersionId);
    const flat = flattenMasterFields(sm.masterSchemaTree);
    const parsed = ver?.parsedFields ?? [];
    let fieldMappings = heuristicFieldMappings(parsed, flat);

    const system = `You are a credit-bureau schema mapper. Reply with JSON: {"mappings":[{"sourcePath":"string","canonicalPath":"string|null","matchType":"exact|semantic|contextual|derived","confidence":0-1,"llmRationale":"short"}]}. Only use canonical paths from the provided list.`;
    const canonList = flat.map((f) => `${f.path} (${f.dataType})`).join("\n");
    const srcList = parsed.map((p: any) => `${p.path} (${p.dataType})`).join("\n");
    sm.metrics.llmCalls += 1;
    const llm = await callOpenAiStructured(
      system,
      `CANONICAL:\n${canonList}\n\nSOURCE:\n${srcList}`
    );
    const allowed = new Set(flat.map((f) => f.path));
    if (llm?.mappings?.length) {
      const bySource = new Map(fieldMappings.map((m: any) => [m.sourcePath, m]));
      for (const row of llm.mappings) {
        if (!row?.sourcePath) continue;
        const cp = row.canonicalPath && allowed.has(row.canonicalPath) ? row.canonicalPath : null;
        const base = bySource.get(row.sourcePath);
        const fid = cp ? flat.find((f) => f.path === cp)?.id : null;
        bySource.set(row.sourcePath, {
          sourcePath: row.sourcePath,
          sourceFieldId: base?.sourceFieldId,
          canonicalPath: cp,
          canonicalFieldId: fid ?? null,
          matchType: row.matchType ?? "semantic",
          confidence: typeof row.confidence === "number" ? row.confidence : 0.7,
          reviewStatus: "pending",
          llmRationale: String(row.llmRationale ?? "LLM proposal"),
          containsPii: Boolean(base?.containsPii),
        });
      }
      fieldMappings = Array.from(bySource.values());
    } else {
      sm.metrics.llmFailures += 1;
    }

    mapping.fieldMappings = fieldMappings;
    mapping.status = "needs_review";
    mapping.updatedAt = new Date().toISOString();
    updateRegistryFromMapping(sm, mapping);
    const elapsed = Date.now() - started;
    sm.metrics.lastJobLatencyMs = elapsed;
    sm.metrics.mappingJobsCompleted += 1;
    audit(state, {
      userEmail: "system@schema-mapper",
      actionType: "MAPPING_LLM_COMPLETED",
      entityType: "SCHEMA_MAPPING",
      entityId: mappingId,
      description: `Mapping job completed in ${elapsed}ms (${llm ? "llm+heuristic" : "heuristic"})`,
    });

    const reg = state.schemaMapper.schemaRegistry.find((r) => r.id === mapping.schemaRegistryId);
    const sourceName = reg?.sourceName ?? "Unknown source";
    const cov = Number(reg?.mappingCoverage ?? 0);
    appendIngestionDriftAlert(state, {
      type: "mapping",
      source: sourceName,
      message: `Mapping proposal ready for review (${cov}% coverage${llm ? ", LLM-assisted" : ", heuristic"})`,
      severity: cov < 70 ? "medium" : "low",
    });
  }, 400);
}

function err(reply: any, code: number, errorCode: string, message: string) {
  return reply.code(code).send({
    error: { code: errorCode, message, details: [] },
    requestId: randomUUID(),
  });
}

export function registerSchemaMapperRoutes(
  app: FastifyInstance,
  state: AppState,
  authPreHandler: (req: any, reply: any, done: (e?: Error) => void) => void,
  audit: SchemaMapperAuditFn
) {
  const base = "/api/v1/schema-mapper";

  app.get(`${base}/metrics`, { preHandler: authPreHandler }, async () => {
    return { ...state.schemaMapper.metrics, requestId: randomUUID() };
  });

  app.get(`${base}/canonical`, { preHandler: authPreHandler }, async () => {
    return {
      versions: state.schemaMapper.masterSchemaVersions,
      tree: state.schemaMapper.masterSchemaTree,
      requestId: randomUUID(),
    };
  });

  /** Wizard Step 1 — Source Type and Data Category dropdowns (tenant-configurable via seed JSON). */
  app.get(`${base}/wizard-metadata`, { preHandler: authPreHandler }, async () => {
    const sm = state.schemaMapper;
    return {
      sourceTypeOptions: sm.wizardSourceTypeOptions,
      dataCategoryOptions: sm.wizardDataCategoryOptions,
      requestId: randomUUID(),
    };
  });

  app.get(`${base}/schemas`, { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = [...state.schemaMapper.schemaRegistry];
    if (q.sourceType && q.sourceType !== "all") list = list.filter((r) => r.sourceType === q.sourceType);
    if (q.status && q.status !== "all") list = list.filter((r) => r.status === q.status);
    return { ...pageSlice(list, Number(q.page), Number(q.size)), requestId: randomUUID() };
  });

  /** Distinct `sourceType` values from the in-memory schema registry (same rows as GET …/schemas). */
  app.get(`${base}/schemas/source-types`, { preHandler: authPreHandler }, async () => {
    const types = new Set<string>();
    for (const r of state.schemaMapper.schemaRegistry) {
      const t = r?.sourceType;
      if (t != null && String(t).trim() !== "") types.add(String(t));
    }
    return { sourceTypes: [...types].sort(), requestId: randomUUID() };
  });

  /**
   * Union of parsed field paths across all registry schemas for a Schema Mapper `sourceType`
   * (current version per registry row). Used by Data Governance → Validation Rules field picker.
   */
  app.get(`${base}/schemas/source-type-fields`, { preHandler: authPreHandler }, async (req, reply) => {
    const q = req.query as { sourceType?: string };
    const sourceType = String(q.sourceType ?? "").trim();
    if (!sourceType || sourceType === "all") {
      return err(reply, 400, "ERR_VALIDATION", "sourceType query parameter is required");
    }
    const sm = state.schemaMapper;
    const byPath = new Map<string, { id: string; path: string; name: string; dataType: string }>();
    for (const reg of sm.schemaRegistry) {
      if (String(reg?.sourceType ?? "") !== sourceType) continue;
      const verId = reg?.currentVersionId;
      const ver = sm.schemaVersions.find((v: any) => v._id === verId);
      const parsed = Array.isArray(ver?.parsedFields) ? ver.parsedFields : [];
      for (const f of flattenParsedFieldsForSourceType(parsed)) {
        if (!byPath.has(f.path)) byPath.set(f.path, f);
      }
    }
    const fields = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
    return { sourceType, fields, requestId: randomUUID() };
  });

  app.post(`${base}/ingest`, { preHandler: authPreHandler }, async (req, reply) => {
    const body = (req.body ?? {}) as any;
    const sourceType = body.sourceType ?? "telecom";
    const sourceName = String(body.sourceName ?? "New Source").trim();
    if (!sourceName) return err(reply, 400, "ERR_VALIDATION", "sourceName is required");

    const sm = state.schemaMapper;
    let parsedFields = body.parsedFields;
    let fieldStats = body.fieldStats;
    if (!Array.isArray(parsedFields) || parsedFields.length === 0) {
      const data = readSchemaMapperJson();
      const tmpl = sampleParsedFieldsTemplate(data, sourceType);
      parsedFields = tmpl.parsedFields;
      fieldStats = tmpl.fieldStats;
    }

    const regId = `reg-${randomUUID().slice(0, 8)}`;
    const rawId = `raw_${randomUUID().slice(0, 12)}`;
    const verId = `ver_${randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const user = (req as any).user?.email ?? "unknown";

    sm.rawDataStore.unshift({
      _id: rawId,
      tenantId: TENANT,
      institutionId: body.institutionId ?? null,
      sourceType,
      contentType: body.contentType ?? "json_schema",
      storageUri: null,
      inlinePayload: body.inlineSchema ?? null,
      parsedSummary: { fieldCount: parsedFields.length, maxDepth: 1 },
      piiFlagsDetected: [],
      checksumSha256: createHash("sha256").update(JSON.stringify(parsedFields)).digest("hex"),
      ingestedBy: user,
      ingestedAt: now,
      schemaRegistryId: regId,
    });

    const dataCategory =
      body.dataCategory != null && String(body.dataCategory).trim() !== "" ?
        String(body.dataCategory).trim()
      : undefined;

    sm.schemaRegistry.unshift({
      id: regId,
      sourceName,
      sourceType,
      ...(dataCategory ? { dataCategory } : {}),
      masterSchemaVersion: "HCB Master v1.1",
      mappingCoverage: 0,
      unmappedFields: parsedFields.length,
      ruleCount: 0,
      status: "draft",
      version: body.versionNumber ?? "v0.1",
      createdBy: user,
      createdAt: now,
      lastModifiedBy: user,
      lastModifiedAt: now,
      tenantId: TENANT,
      currentVersionId: verId,
      institutionScope: Array.isArray(body.institutionScope) ? body.institutionScope : [],
    });

    sm.schemaVersions.push({
      _id: verId,
      schemaRegistryId: regId,
      rawDataId: rawId,
      versionLabel: body.versionNumber ?? "v0.1",
      status: "draft",
      fieldTreeRef: "inline",
      parsedFields,
      fieldStats,
      createdAt: now,
    });

    audit(state, {
      userEmail: user,
      actionType: "SCHEMA_INGEST",
      entityType: "SCHEMA_VERSION",
      entityId: verId,
      description: `Ingested schema ${sourceName} (${sourceType})`,
    });

    appendIngestionDriftAlert(state, {
      type: "schema",
      source: sourceName,
      message: `Ingest payload analyzed: ${parsedFields.length} fields detected (${sourceType})`,
      severity: "low",
    });

    return reply.code(201).send({
      rawDataId: rawId,
      schemaVersionId: verId,
      schemaRegistryId: regId,
      duplicate: false,
      parsedFields,
      fieldStats,
      requestId: randomUUID(),
    });
  });

  app.post(`${base}/mappings`, { preHandler: authPreHandler }, async (req, reply) => {
    const body = (req.body ?? {}) as any;
    const schemaVersionId = body.schemaVersionId;
    if (!schemaVersionId) return err(reply, 400, "ERR_VALIDATION", "schemaVersionId is required");
    const ver = findVersion(state.schemaMapper, schemaVersionId);
    if (!ver) return err(reply, 404, "SCHEMA_VERSION_NOT_FOUND", "Schema version not found");

    const inProgress = state.schemaMapper.mappingRegistry.some(
      (m) => m.schemaVersionId === schemaVersionId && ["queued", "processing"].includes(m.status)
    );
    if (inProgress) return err(reply, 409, "MAPPING_IN_PROGRESS", "Mapping already running for this version");

    const canon = state.schemaMapper.canonicalRegistry[0];
    const mapId = `map_${randomUUID().slice(0, 12)}`;
    const reg = state.schemaMapper.schemaRegistry.find((r) => r.id === ver.schemaRegistryId);
    const now = new Date().toISOString();
    const row = {
      _id: mapId,
      tenantId: TENANT,
      schemaRegistryId: ver.schemaRegistryId,
      schemaVersionId,
      canonicalVersionId: canon?._id ?? "canon_v1_1",
      status: "queued",
      fieldMappings: [],
      derivedFields: [],
      approvalRefId: null,
      jobId: `job_${randomUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    state.schemaMapper.mappingRegistry.unshift(row);
    scheduleMappingJob(state, mapId, audit);
    audit(state, {
      userEmail: (req as any).user?.email ?? "unknown",
      actionType: "MAPPING_JOB_QUEUED",
      entityType: "SCHEMA_MAPPING",
      entityId: mapId,
      description: `Queued mapping for version ${schemaVersionId}`,
    });
    return reply.code(202).send({
      mappingId: mapId,
      jobId: row.jobId,
      status: "queued",
      requestId: randomUUID(),
    });
  });

  app.get(`${base}/mappings/:id`, { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const m = findMapping(state.schemaMapper, id);
    if (!m) return err(reply, 404, "MAPPING_NOT_FOUND", "Mapping not found");
    return { ...m, requestId: randomUUID() };
  });

  app.patch(`${base}/mappings/:id`, { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const m = findMapping(state.schemaMapper, id);
    if (!m) return err(reply, 404, "MAPPING_NOT_FOUND", "Mapping not found");
    if (["under_review", "active"].includes(m.status)) {
      return err(reply, 422, "MAPPING_LOCKED", "Cannot edit mapping in this status");
    }
    const patch = (req.body ?? {}) as any;
    const flat = flattenMasterFields(state.schemaMapper.masterSchemaTree);
    const allowed = new Set(flat.map((f) => f.path));

    if (Array.isArray(patch.fieldMappings)) {
      for (const fm of patch.fieldMappings) {
        if (fm.canonicalPath && !allowed.has(fm.canonicalPath)) {
          return err(
            reply,
            422,
            "CANONICAL_PATH_INVALID",
            `Unknown canonical path: ${fm.canonicalPath}`
          );
        }
      }
      m.fieldMappings = patch.fieldMappings;
    }
    if (Array.isArray(patch.derivedFields)) m.derivedFields = patch.derivedFields;
    m.updatedAt = new Date().toISOString();
    updateRegistryFromMapping(state.schemaMapper, m);
    state.schemaMapper.metrics.overridesRecorded += 1;
    audit(state, {
      userEmail: (req as any).user?.email ?? "unknown",
      actionType: "MAPPING_EDIT",
      entityType: "SCHEMA_MAPPING",
      entityId: id,
      description: "Updated field mappings",
    });
    return { ...m, requestId: randomUUID() };
  });

  app.get(`${base}/mappings/:id/rules`, { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const m = findMapping(state.schemaMapper, id);
    if (!m) return err(reply, 404, "MAPPING_NOT_FOUND", "Mapping not found");
    const rules = state.schemaMapper.validationRules.filter((r) => r.mappingId === id);
    return { content: rules, requestId: randomUUID() };
  });

  app.post(`${base}/mappings/:id/rules`, { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const m = findMapping(state.schemaMapper, id);
    if (!m) return err(reply, 404, "MAPPING_NOT_FOUND", "Mapping not found");
    const body = (req.body ?? {}) as any;
    const rid = `vr_${randomUUID().slice(0, 10)}`;
    const row = {
      _id: rid,
      tenantId: TENANT,
      mappingId: id,
      targetPath: body.targetPath ?? "",
      ruleType: body.ruleType ?? "regex",
      severity: body.severity ?? "warning",
      config: body.config ?? {},
      enabled: body.enabled !== false,
    };
    state.schemaMapper.validationRules.push(row);
    updateRegistryFromMapping(state.schemaMapper, m);
    return reply.code(201).send({ ...row, requestId: randomUUID() });
  });

  app.patch(`${base}/mappings/:id/rules/:ruleId`, { preHandler: authPreHandler }, async (req, reply) => {
    const { id, ruleId } = req.params as { id: string; ruleId: string };
    const r = state.schemaMapper.validationRules.find((x) => x._id === ruleId && x.mappingId === id);
    if (!r) return err(reply, 404, "RULE_NOT_FOUND", "Rule not found");
    Object.assign(r, (req.body ?? {}) as object);
    return { ...r, requestId: randomUUID() };
  });

  app.delete(`${base}/mappings/:id/rules/:ruleId`, { preHandler: authPreHandler }, async (req, reply) => {
    const { id, ruleId } = req.params as { id: string; ruleId: string };
    const idx = state.schemaMapper.validationRules.findIndex((x) => x._id === ruleId && x.mappingId === id);
    if (idx === -1) return err(reply, 404, "RULE_NOT_FOUND", "Rule not found");
    state.schemaMapper.validationRules.splice(idx, 1);
    return reply.code(204).send();
  });

  app.post(`${base}/mappings/:id/submit-approval`, { preHandler: authPreHandler }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const m = findMapping(state.schemaMapper, id);
    if (!m) return err(reply, 404, "MAPPING_NOT_FOUND", "Mapping not found");
    if (m.status !== "needs_review" && m.status !== "draft") {
      return err(reply, 422, "MAPPING_INVALID_STATE", "Mapping must be in needs_review or draft to submit");
    }
    const reg = state.schemaMapper.schemaRegistry.find((r) => r.id === m.schemaRegistryId);
    const name = reg ? `${reg.sourceName} → HCB Master` : `Mapping ${id}`;
    const coverage = reg?.mappingCoverage ?? 0;
    const apId = `apq-${randomUUID().slice(0, 8)}`;
    m.status = "under_review";
    m.approvalRefId = apId;
    m.updatedAt = new Date().toISOString();
    if (reg) {
      reg.status = "under_review";
      reg.lastModifiedAt = m.updatedAt;
    }
    state.approvals.unshift({
      id: apId,
      type: "schema_mapping",
      name,
      description: `Schema mapping submission — coverage ${coverage}%`,
      submittedBy: (req as any).user?.email ?? "unknown",
      submittedAt: m.updatedAt,
      status: "pending",
      metadata: {
        mappingId: id,
        schemaRegistryId: m.schemaRegistryId,
        schemaVersionId: m.schemaVersionId,
        "Source Schema": reg?.sourceName ?? "",
        "Target Schema": "HCB Master v1.1",
        Coverage: `${coverage}%`,
      },
    });
    audit(state, {
      userEmail: (req as any).user?.email ?? "unknown",
      actionType: "MAPPING_SUBMIT_APPROVAL",
      entityType: "SCHEMA_MAPPING",
      entityId: id,
      description: `Submitted mapping for approval ${apId}`,
    });
    return reply.code(202).send({ approvalId: apId, requestId: randomUUID() });
  });

  app.post(`${base}/schemas/:versionId/drift-scan`, { preHandler: authPreHandler }, async (req, reply) => {
    const versionId = (req.params as { versionId: string }).versionId;
    const ver = findVersion(state.schemaMapper, versionId);
    if (!ver) return err(reply, 404, "SCHEMA_VERSION_NOT_FOUND", "Schema version not found");
    const driftId = `drift_${randomUUID().slice(0, 8)}`;
    state.schemaMapper.driftLogs.unshift({
      _id: driftId,
      tenantId: TENANT,
      schemaVersionId: versionId,
      previousVersionId: null,
      changes: [{ path: "_meta", changeType: "modified", detail: "Manual drift scan (dev stub)" }],
      severity: "low",
      detectedAt: new Date().toISOString(),
      remediationJobId: null,
    });
    return reply.code(202).send({ driftJobId: driftId, requestId: randomUUID() });
  });

  app.get(`${base}/drift`, { preHandler: authPreHandler }, async (req) => {
    const q = req.query as Record<string, string | undefined>;
    let list = [...state.schemaMapper.driftLogs];
    if (q.schemaVersionId) list = list.filter((d) => d.schemaVersionId === q.schemaVersionId);
    return { ...pageSlice(list, Number(q.page), Number(q.size)), requestId: randomUUID() };
  });
}

export function applySchemaMappingApprovalDecision(
  state: AppState,
  approval: any,
  decision: "approved" | "rejected" | "changes_requested"
) {
  const mid = approval?.metadata?.mappingId;
  if (approval?.type !== "schema_mapping" || !mid) return;
  const m = findMapping(state.schemaMapper, String(mid));
  if (!m) return;
  const reg = state.schemaMapper.schemaRegistry.find((r) => r.id === m.schemaRegistryId);
  if (decision === "approved") {
    m.status = "active";
    m.updatedAt = new Date().toISOString();
    if (reg) {
      reg.status = "active";
      reg.lastModifiedAt = m.updatedAt;
    }
  } else if (decision === "rejected") {
    m.status = "rejected";
    m.updatedAt = new Date().toISOString();
    if (reg) {
      reg.status = "draft";
      reg.lastModifiedAt = m.updatedAt;
    }
  } else {
    m.status = "needs_review";
    m.updatedAt = new Date().toISOString();
    if (reg) {
      reg.status = "draft";
      reg.lastModifiedAt = m.updatedAt;
    }
  }
}
