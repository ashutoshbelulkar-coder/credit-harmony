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
    list: (params?: Record<string, unknown>) => ["institutions", "list", params ?? {}] as const,
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
    list: (params?: Record<string, unknown>) => ["users", "list", params ?? {}] as const,
    detail: (id: string | number) => ["users", String(id)] as const,
  },

  // ── Roles ────────────────────────────────────────────────────────────────
  roles: {
    all: () => ["roles"] as const,
  },

  // ── Approvals ─────────────────────────────────────────────────────────────
  approvals: {
    all: () => ["approvals"] as const,
    list: (params?: Record<string, unknown>) => ["approvals", "list", params ?? {}] as const,
  },

  // ── Monitoring ────────────────────────────────────────────────────────────
  monitoring: {
    kpis: () => ["monitoring", "kpis"] as const,
    apiRequests: (params?: Record<string, unknown>) => ["monitoring", "api-requests", params ?? {}] as const,
    enquiries: (params?: Record<string, unknown>) => ["monitoring", "enquiries", params ?? {}] as const,
    batchJobs: (params?: Record<string, unknown>) => ["monitoring", "batch-jobs", params ?? {}] as const,
    batchJob: (id: string) => ["monitoring", "batch-jobs", id] as const,
    batchLogs: (id: string) => ["monitoring", "batch-jobs", id, "logs"] as const,
  },

  // ── Alerts ────────────────────────────────────────────────────────────────
  alerts: {
    rules: () => ["alerts", "rules"] as const,
    incidents: (params?: Record<string, unknown>) => ["alerts", "incidents", params ?? {}] as const,
    slaConfigs: () => ["alerts", "sla-configs"] as const,
    breachHistory: (params?: Record<string, unknown>) => ["alerts", "breach-history", params ?? {}] as const,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    all: () => ["reports"] as const,
    list: (params?: Record<string, unknown>) => ["reports", "list", params ?? {}] as const,
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
    list: (params?: Record<string, unknown>) => ["consortiums", "list", params ?? {}] as const,
    detail: (id: string) => ["consortiums", id] as const,
    members: (id: string) => ["consortiums", id, "members"] as const,
  },

  // ── Products ─────────────────────────────────────────────────────────────
  products: {
    all: () => ["products"] as const,
    list: (params?: Record<string, unknown>) => ["products", "list", params ?? {}] as const,
    detail: (id: string) => ["products", id] as const,
    packetCatalog: () => ["products", "packet-catalog"] as const,
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────
  auditLogs: {
    all: () => ["audit-logs"] as const,
    list: (params?: Record<string, unknown>) => ["audit-logs", "list", params ?? {}] as const,
  },

  // ── API Keys ─────────────────────────────────────────────────────────────
  apiKeys: {
    all: () => ["api-keys"] as const,
    byInstitution: (id: string | number) => ["api-keys", "institution", String(id)] as const,
  },

  // ── Data Ingestion (drift alerts for Data Quality Monitoring) ─────────────
  dataIngestion: {
    all: () => ["data-ingestion"] as const,
    driftAlerts: (params?: Record<string, unknown>) =>
      ["data-ingestion", "drift-alerts", params ?? {}] as const,
  },

  // ── Schema Mapper Agent ───────────────────────────────────────────────────
  schemaMapper: {
    all: () => ["schema-mapper"] as const,
    registry: (params?: Record<string, unknown>) => ["schema-mapper", "registry", params ?? {}] as const,
    schemaRegistrySourceTypes: () => ["schema-mapper", "schemas", "source-types"] as const,
    sourceTypeFields: (sourceType: string) => ["schema-mapper", "source-type-fields", sourceType] as const,
    mapping: (id: string) => ["schema-mapper", "mapping", id] as const,
    metrics: () => ["schema-mapper", "metrics"] as const,
    wizardMetadata: () => ["schema-mapper", "wizard-metadata"] as const,
  },
} as const;
