/**
 * Centralised React Query key registry.
 *
 * Using typed factory functions prevents cache key typos and makes
 * cache invalidation precise (invalidate a whole domain or a single entity).
 *
 * Convention:
 *   QK.domain.all()         → ['domain']
 *   QK.domain.list(params)  → ['domain', 'list', params]
 *   QK.domain.detail(id)    → ['domain', id]
 *   QK.domain.action(id)    → ['domain', id, 'action']
 */

export const QK = {
  // ── Auth ────────────────────────────────────────────────────────────────
  auth: {
    me: () => ["auth", "me"] as const,
  },

  // ── Institutions ─────────────────────────────────────────────────────────
  institutions: {
    all: () => ["institutions"] as const,
    formMetadata: (geography?: string) =>
      ["institutions", "form-metadata", geography ?? "default"] as const,
    list: (params?: object) => ["institutions", "list", params ?? {}] as const,
    detail: (id: string | number) => ["institutions", String(id)] as const,
    apiKeys: (id: string | number) => ["institutions", String(id), "api-keys"] as const,
    consortiumMemberships: (id: string | number) => ["institutions", String(id), "consortium-memberships"] as const,
    productSubscriptions: (id: string | number) => ["institutions", String(id), "product-subscriptions"] as const,
    billingSummary: (id: string | number) => ["institutions", String(id), "billing-summary"] as const,
    monitoringSummary: (id: string | number) => ["institutions", String(id), "monitoring-summary"] as const,
    overviewCharts: (id: string | number) => ["institutions", String(id), "overview-charts"] as const,
    apiAccess: (id: string | number) => ["institutions", String(id), "api-access"] as const,
    consent: (id: string | number) => ["institutions", String(id), "consent"] as const,
  },

  // ── Users ────────────────────────────────────────────────────────────────
  users: {
    all: () => ["users"] as const,
    list: (params?: object) => ["users", "list", params ?? {}] as const,
    detail: (id: string | number) => ["users", String(id)] as const,
  },

  // ── Roles ────────────────────────────────────────────────────────────────
  roles: {
    all: () => ["roles"] as const,
  },

  // ── Approvals ─────────────────────────────────────────────────────────────
  approvals: {
    all: () => ["approvals"] as const,
    list: (params?: object) => ["approvals", "list", params ?? {}] as const,
  },

  // ── Monitoring ────────────────────────────────────────────────────────────
  monitoring: {
    kpis: () => ["monitoring", "kpis"] as const,
    apiRequests: (params?: object) => ["monitoring", "api-requests", params ?? {}] as const,
    enquiries: (params?: object) => ["monitoring", "enquiries", params ?? {}] as const,
    batchJobs: (params?: object) => ["monitoring", "batch-jobs", params ?? {}] as const,
    batchJob: (id: string) => ["monitoring", "batch-jobs", id] as const,
    batchLogs: (id: string) => ["monitoring", "batch-jobs", id, "logs"] as const,
  },

  // ── Alerts ────────────────────────────────────────────────────────────────
  alerts: {
    rules: () => ["alerts", "rules"] as const,
    incidents: (params?: object) => ["alerts", "incidents", params ?? {}] as const,
    slaConfigs: () => ["alerts", "sla-configs"] as const,
    breachHistory: (params?: object) => ["alerts", "breach-history", params ?? {}] as const,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    all: () => ["reports"] as const,
    list: (params?: object) => ["reports", "list", params ?? {}] as const,
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    metrics: () => ["dashboard", "metrics"] as const,
    charts: (range: string) => ["dashboard", "charts", range] as const,
    activity: () => ["dashboard", "activity"] as const,
    commandCenter: () => ["dashboard", "command-center"] as const,
  },

  // ── Consortiums ───────────────────────────────────────────────────────────
  consortiums: {
    all: () => ["consortiums"] as const,
    list: (params?: object) => ["consortiums", "list", params ?? {}] as const,
    detail: (id: string) => ["consortiums", id] as const,
    members: (id: string) => ["consortiums", id, "members"] as const,
    cbsMembers: (id: string) => ["consortiums", id, "cbs-members"] as const,
  },

  cbsMemberCatalog: {
    all: () => ["cbs-member-catalog"] as const,
  },

  // ── Products ─────────────────────────────────────────────────────────────
  products: {
    all: () => ["products"] as const,
    list: (params?: object) => ["products", "list", params ?? {}] as const,
    detail: (id: string) => ["products", id] as const,
    packetCatalog: () => ["products", "packet-catalog"] as const,
  },

  // ── Data Policy ──────────────────────────────────────────────────────────
  dataPolicy: {
    all: () => ["data-policy"] as const,
    byProduct: (params: { institutionId: string; productId: string }) =>
      ["data-policy", params.institutionId, params.productId] as const,
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────
  auditLogs: {
    all: () => ["audit-logs"] as const,
    list: (params?: object) => ["audit-logs", "list", params ?? {}] as const,
  },

  // ── API Keys ─────────────────────────────────────────────────────────────
  apiKeys: {
    all: () => ["api-keys"] as const,
    byInstitution: (id: string | number) => ["api-keys", "institution", String(id)] as const,
  },

  // ── Data Ingestion (drift alerts for Data Quality Monitoring) ─────────────
  dataIngestion: {
    all: () => ["data-ingestion"] as const,
    driftAlerts: (params?: object) =>
      ["data-ingestion", "drift-alerts", params ?? {}] as const,
  },

  // ── Schema Mapper Agent ───────────────────────────────────────────────────
  schemaMapper: {
    all: () => ["schema-mapper"] as const,
    registry: (params?: object) => ["schema-mapper", "registry", params ?? {}] as const,
    schemaRegistrySourceTypes: () => ["schema-mapper", "schemas", "source-types"] as const,
    sourceTypeFields: (sourceType: string) => ["schema-mapper", "source-type-fields", sourceType] as const,
    mapping: (id: string) => ["schema-mapper", "mapping", id] as const,
    metrics: () => ["schema-mapper", "metrics"] as const,
    wizardMetadata: () => ["schema-mapper", "wizard-metadata"] as const,
  },

  // ── Data Management (subject-centric) ─────────────────────────────────────
  dataManagement: {
    all: () => ["data-management"] as const,
    subjects: (params?: object) =>
      ["data-management", "subjects", params ?? {}] as const,
    subject: (id: string) => ["data-management", "subject", id] as const,
    availableSources: (subjectId: string, query?: string) =>
      ["data-management", "subject", subjectId, "available-sources", query ?? ""] as const,
    audit: (subjectId: string) => ["data-management", "subject", subjectId, "audit"] as const,
  },

  // ── Master Schema Management ───────────────────────────────────────────────
  masterSchemas: {
    all: () => ["master-schemas"] as const,
    list: (params?: object) => ["master-schemas", "list", params ?? {}] as const,
    detail: (id: string) => ["master-schemas", String(id)] as const,
    versions: (id: string) => ["master-schemas", String(id), "versions"] as const,
    impact: (id: string) => ["master-schemas", String(id), "impact"] as const,
  },

  // ── Datasource Onboarding ──────────────────────────────────────────────────
  datasourceOnboarding: {
    all: () => ["datasource-onboarding"] as const,
    list: (params?: object) =>
      ["datasource-onboarding", "list", params ?? {}] as const,
    detail: (id: string) => ["datasource-onboarding", String(id)] as const,
    review: (id: string) => ["datasource-onboarding", String(id), "review"] as const,
  },

  // ── Master Path Catalog (union of all master schema trees) ────────────────
  masterPathCatalog: {
    all: () => ["master-path-catalog"] as const,
  },
} as const;
