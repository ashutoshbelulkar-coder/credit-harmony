/**
 * Data Management Module – TypeScript interfaces
 *
 * Subject-centric data management: manage a Subject and the data sources
 * linked to it (Bank account, KYC, Telecom, etc.).
 *
 * All records mutated through the data-management service generate an
 * `AuditEntry` for traceability (create/update/delete/link/unlink).
 */

export type SubjectStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export type DataSourceType =
  | "BankAccount"
  | "Government"
  | "Telecom"
  | "Financial"
  | "KYC"
  | "CRM";

export type SubjectIdType =
  | "UUID"
  | "PAN"
  | "AADHAAR"
  | "SSN"
  | "PASSPORT"
  | "CUSTOM";

export interface Subject {
  /** Read-only system identifier (UUID v4). */
  subjectId: string;
  firstName: string;
  lastName: string;
  /** ISO-8601 date (yyyy-MM-dd). */
  dateOfBirth: string;
  govIdType: SubjectIdType;
  govIdNumber: string;
  email: string;
  phone: string;
  /** Free-form mailing/street address. */
  address: string;
  status: SubjectStatus;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  /** Optimistic-locking version. Server returns 409 if mismatched on PATCH. */
  version: number;
}

export interface DataSource {
  sourceId: string;
  name: string;
  type: DataSourceType;
  provider: string;
  lastUpdated: string;
  /** Type-specific metadata (e.g. account number, document number). */
  details: Record<string, string>;
  status: "ACTIVE" | "INACTIVE";
}

export interface SubjectSourceLink {
  subjectId: string;
  sourceId: string;
  linkedAt: string;
  linkedBy: string;
}

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LINK"
  | "UNLINK";

export interface AuditFieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface AuditEntry {
  logId: string;
  entityType: "Subject" | "SubjectSourceLink";
  /** subjectId of the affected subject (for "SubjectSourceLink" this is the parent subject). */
  entityId: string;
  action: AuditAction;
  /** For UPDATE actions: list of fields changed with old/new values. */
  changes?: AuditFieldChange[];
  /** For LINK/UNLINK: the source id. */
  relatedSourceId?: string;
  /** Mandatory user-supplied note describing the reason for the change. */
  comment: string;
  performedBy: string;
  performedAt: string;
}

export interface SubjectListItem {
  subjectId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: SubjectStatus;
  linkedSourceCount: number;
  /** Last update timestamp – used for sort by recency. */
  updatedAt: string;
}

export type SubjectSortKey = "name" | "status" | "updatedAt";
export type SortDirection = "asc" | "desc";

export interface SubjectListFilters {
  query: string;
  status: SubjectStatus | "ALL";
  sortKey: SubjectSortKey;
  sortDirection: SortDirection;
}

export interface SourceFilters {
  query: string;
  type: DataSourceType | "ALL";
  sortKey: "lastUpdated" | "name" | "type";
  sortDirection: SortDirection;
}

/** Validation error format returned by the mock service. */
export class DataManagementValidationError extends Error {
  fieldErrors: Record<string, string>;
  constructor(fieldErrors: Record<string, string>, message = "Validation failed") {
    super(message);
    this.name = "DataManagementValidationError";
    this.fieldErrors = fieldErrors;
  }
}
