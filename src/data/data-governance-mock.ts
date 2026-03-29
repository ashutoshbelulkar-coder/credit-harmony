import data from "./data-governance.json";
import type {
  GovernanceKpi,
  MappingAccuracyPoint,
  ValidationFailureByInstitution,
  MatchConfidenceBucket,
  RejectionReasonSlice,
  DataQualityTrendPoint,
  SourceSchemaField,
  CanonicalField,
  MappingPair,
  MappingHistoryEntry,
  RuleSet,
  ValidationRule,
  MatchCluster,
  ReasonCode,
  QualityMetric,
  AnomalyPoint,
  DriftAlert,
  GovernanceAuditLogEntry,
  ApprovalEvent,
  ApprovalConfig,
} from "@/types/data-governance";

export const governanceKpis = data.governanceKpis as GovernanceKpi[];
export const mappingAccuracyTrend30 = data.mappingAccuracyTrend30 as MappingAccuracyPoint[];
export const mappingAccuracyTrend60 = data.mappingAccuracyTrend60 as MappingAccuracyPoint[];
export const mappingAccuracyTrend90 = data.mappingAccuracyTrend90 as MappingAccuracyPoint[];
export const validationFailureBySource = data.validationFailureBySource as ValidationFailureByInstitution[];
export const matchConfidenceDistribution = data.matchConfidenceDistribution as MatchConfidenceBucket[];
export const dataQualityScoreTrend30 = data.dataQualityScoreTrend30 as DataQualityTrendPoint[];
export const dataQualityScoreTrend60 = data.dataQualityScoreTrend60 as DataQualityTrendPoint[];
export const dataQualityScoreTrend90 = data.dataQualityScoreTrend90 as DataQualityTrendPoint[];
export const rejectionReasonsBreakdown = data.rejectionReasonsBreakdown as RejectionReasonSlice[];
export const dataSources = data.dataSources as { id: string; name: string }[];
export const schemaVersions = data.schemaVersions as { id: string; name: string }[];
export const sourceSchemaFields = data.sourceSchemaFields as SourceSchemaField[];
export const canonicalFields = data.canonicalFields as CanonicalField[];
export const mappingPairs = data.mappingPairs as MappingPair[];
export const mappingHistory = data.mappingHistory as MappingHistoryEntry[];
export const ruleSets = data.ruleSets as RuleSet[];
export const validationRules = data.validationRules as ValidationRule[];
export const reasonCodes = data.reasonCodes as ReasonCode[];
export const matchClusters = data.matchClusters as MatchCluster[];
export const dataQualityMetrics = data.dataQualityMetrics as QualityMetric[];
export const dataQualityTrendWithAnomaly = data.dataQualityTrendWithAnomaly as AnomalyPoint[];
export const driftAlerts = data.driftAlerts as DriftAlert[];
export const governanceAuditLogs = data.governanceAuditLogs as GovernanceAuditLogEntry[];
export const approvalEvents = data.approvalEvents as ApprovalEvent[];
export const approvalConfig = data.approvalConfig as ApprovalConfig;
export const filterInstitutions = data.filterInstitutions as string[];
export const filterDataSources = data.filterDataSources as string[];
