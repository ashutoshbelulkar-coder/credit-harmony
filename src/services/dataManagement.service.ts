/**
 * Data Management service.
 *
 * Subject-centric CRUD + link/unlink management for the Data Governance
 * layer. The current backend does not expose persistence for "Subjects" yet,
 * so this service is implemented as a client-side in-memory store seeded
 * from `data-management.json` and persisted to `localStorage` so that
 * mutations (edits, links, comments, deletes) survive a page reload.
 *
 * When the backend is implemented, swap the bodies of these functions for
 * `get`/`post`/`patch`/`del` calls against `/v1/data-management/*` — the
 * signatures and contracts mirror the planned REST endpoints documented in
 * the feature spec.
 */

import seed from "@/data/data-management.json";
import {
  DataManagementValidationError,
  type AuditAction,
  type AuditEntry,
  type AuditFieldChange,
  type DataSource,
  type Subject,
  type SubjectListItem,
  type SubjectSourceLink,
  type SubjectStatus,
} from "@/types/data-management";

const STORAGE_KEY = "hcb_data_management_store_v1";

interface Store {
  subjects: Subject[];
  sources: DataSource[];
  links: SubjectSourceLink[];
  auditLog: AuditEntry[];
}

/**
 * Module-level mutable store. Loaded lazily on first call so SSR / tests
 * can monkey-patch `localStorage` if desired.
 */
let store: Store | null = null;

function loadStore(): Store {
  if (store) return store;

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Store;
        if (parsed && Array.isArray(parsed.subjects)) {
          store = parsed;
          return store;
        }
      }
    } catch {
      // Fall through to seed
    }
  }

  store = {
    subjects: structuredClone(seed.subjects) as Subject[],
    sources: structuredClone(seed.sources) as DataSource[],
    links: structuredClone(seed.links) as SubjectSourceLink[],
    auditLog: structuredClone(seed.auditLog) as AuditEntry[],
  };
  persist();
  return store;
}

function persist(): void {
  if (typeof window === "undefined" || !store) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage quota / private-mode: ignore — in-memory store still works.
  }
}

/** Test/dev helper – reset to seed state. */
export function __resetDataManagementStore(): void {
  store = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  loadStore();
}

// ─── ID + validation helpers ─────────────────────────────────────────────────

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateLogId(): string {
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9][\d\s\-()]{6,20}$/;

export function isValidSubjectId(value: string): boolean {
  if (!value) return false;
  if (UUID_RE.test(value)) return true;
  return /^[A-Z0-9-]{4,32}$/i.test(value);
}

export type SubjectInputFields = Omit<
  Subject,
  "subjectId" | "createdBy" | "createdAt" | "updatedBy" | "updatedAt" | "version"
>;

export function validateSubjectFields(
  input: Partial<SubjectInputFields>
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.firstName?.trim()) errors.firstName = "First name is required";
  if (!input.lastName?.trim()) errors.lastName = "Last name is required";
  if (!input.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth)) {
    errors.dateOfBirth = "Use YYYY-MM-DD";
  }
  if (!input.govIdType) errors.govIdType = "Government ID type is required";
  if (!input.govIdNumber?.trim()) {
    errors.govIdNumber = "Government ID is required";
  } else if (!/^[A-Z0-9]{4,20}$/i.test(input.govIdNumber.trim())) {
    errors.govIdNumber = "ID must be 4–20 alphanumeric characters";
  }
  if (!input.email?.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_RE.test(input.email.trim())) {
    errors.email = "Enter a valid email address";
  }
  if (input.phone && !PHONE_RE.test(input.phone.trim())) {
    errors.phone = "Enter a valid phone number";
  }
  if (!input.status) errors.status = "Status is required";
  return errors;
}

function throwIfInvalid(input: Partial<SubjectInputFields>): void {
  const errors = validateSubjectFields(input);
  if (Object.keys(errors).length > 0) {
    throw new DataManagementValidationError(errors);
  }
}

function ensureComment(comment: string | undefined): string {
  if (!comment || !comment.trim()) {
    throw new DataManagementValidationError(
      { comment: "A change comment is required" },
      "Change comment is required"
    );
  }
  return comment.trim();
}

function nowIso(): string {
  return new Date().toISOString();
}

function appendAudit(entry: Omit<AuditEntry, "logId" | "performedAt"> & { performedAt?: string }): AuditEntry {
  const s = loadStore();
  const log: AuditEntry = {
    logId: generateLogId(),
    performedAt: entry.performedAt ?? nowIso(),
    ...entry,
  };
  s.auditLog.unshift(log);
  return log;
}

function diffSubject(prev: Subject, next: Partial<SubjectInputFields>): AuditFieldChange[] {
  const changes: AuditFieldChange[] = [];
  const tracked: (keyof SubjectInputFields)[] = [
    "firstName",
    "lastName",
    "dateOfBirth",
    "govIdType",
    "govIdNumber",
    "email",
    "phone",
    "address",
    "status",
  ];
  for (const key of tracked) {
    const newVal = next[key];
    if (newVal === undefined) continue;
    const oldVal = prev[key];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      changes.push({
        field: key,
        oldValue: oldVal == null ? null : String(oldVal),
        newValue: newVal == null ? null : String(newVal),
      });
    }
  }
  return changes;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ListSubjectsParams {
  query?: string;
  status?: SubjectStatus | "ALL";
  sortKey?: "name" | "status" | "updatedAt";
  sortDirection?: "asc" | "desc";
}

export async function listSubjects(
  params: ListSubjectsParams = {}
): Promise<SubjectListItem[]> {
  const s = loadStore();
  const q = params.query?.trim().toLowerCase() ?? "";
  let rows: SubjectListItem[] = s.subjects.map((subject) => ({
    subjectId: subject.subjectId,
    firstName: subject.firstName,
    lastName: subject.lastName,
    email: subject.email,
    status: subject.status,
    linkedSourceCount: s.links.filter((l) => l.subjectId === subject.subjectId).length,
    updatedAt: subject.updatedAt,
  }));
  if (q) {
    rows = rows.filter((row) =>
      [row.subjectId, row.firstName, row.lastName, row.email]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }
  if (params.status && params.status !== "ALL") {
    rows = rows.filter((row) => row.status === params.status);
  }
  const sortKey = params.sortKey ?? "updatedAt";
  const dir = params.sortDirection === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    if (sortKey === "name") {
      av = `${a.firstName} ${a.lastName}`.toLowerCase();
      bv = `${b.firstName} ${b.lastName}`.toLowerCase();
    } else if (sortKey === "status") {
      av = a.status;
      bv = b.status;
    } else {
      av = a.updatedAt;
      bv = b.updatedAt;
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return rows;
}

export interface SubjectDetail {
  subject: Subject;
  linkedSources: DataSource[];
}

export async function getSubject(subjectId: string): Promise<SubjectDetail | null> {
  const s = loadStore();
  const subject = s.subjects.find((x) => x.subjectId === subjectId);
  if (!subject) return null;
  const linkedIds = new Set(
    s.links.filter((l) => l.subjectId === subjectId).map((l) => l.sourceId)
  );
  const linkedSources = s.sources.filter((src) => linkedIds.has(src.sourceId));
  return { subject, linkedSources };
}

export interface CreateSubjectInput extends SubjectInputFields {
  comment: string;
}

export async function createSubject(
  input: CreateSubjectInput,
  performedBy: string
): Promise<Subject> {
  throwIfInvalid(input);
  const comment = ensureComment(input.comment);
  const s = loadStore();
  if (
    s.subjects.some(
      (existing) =>
        existing.govIdNumber.toLowerCase() === input.govIdNumber.toLowerCase() &&
        existing.govIdType === input.govIdType
    )
  ) {
    throw new DataManagementValidationError({
      govIdNumber: "A subject with this Government ID already exists",
    });
  }
  const now = nowIso();
  const subject: Subject = {
    subjectId: generateUuid(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    dateOfBirth: input.dateOfBirth,
    govIdType: input.govIdType,
    govIdNumber: input.govIdNumber.trim().toUpperCase(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() ?? "",
    address: input.address?.trim() ?? "",
    status: input.status,
    createdBy: performedBy,
    createdAt: now,
    updatedBy: performedBy,
    updatedAt: now,
    version: 1,
  };
  s.subjects.unshift(subject);
  appendAudit({
    entityType: "Subject",
    entityId: subject.subjectId,
    action: "CREATE",
    comment,
    performedBy,
  });
  persist();
  return subject;
}

export interface UpdateSubjectInput extends Partial<SubjectInputFields> {
  comment: string;
  /** Optimistic-locking version that the caller saw. */
  expectedVersion: number;
}

export async function updateSubject(
  subjectId: string,
  input: UpdateSubjectInput,
  performedBy: string
): Promise<Subject> {
  const s = loadStore();
  const subject = s.subjects.find((x) => x.subjectId === subjectId);
  if (!subject) {
    throw new DataManagementValidationError(
      { subjectId: "Subject not found" },
      "Subject not found"
    );
  }
  if (subject.version !== input.expectedVersion) {
    throw new DataManagementValidationError(
      {
        _: "This subject was updated by another user. Reload to see the latest version.",
      },
      "Version conflict"
    );
  }
  const merged: SubjectInputFields = {
    firstName: input.firstName ?? subject.firstName,
    lastName: input.lastName ?? subject.lastName,
    dateOfBirth: input.dateOfBirth ?? subject.dateOfBirth,
    govIdType: input.govIdType ?? subject.govIdType,
    govIdNumber: input.govIdNumber ?? subject.govIdNumber,
    email: input.email ?? subject.email,
    phone: input.phone ?? subject.phone,
    address: input.address ?? subject.address,
    status: input.status ?? subject.status,
  };
  throwIfInvalid(merged);
  const comment = ensureComment(input.comment);
  const changes = diffSubject(subject, merged);
  if (changes.length === 0) {
    throw new DataManagementValidationError(
      { _: "No changes to save" },
      "No changes detected"
    );
  }
  Object.assign(subject, merged);
  subject.updatedBy = performedBy;
  subject.updatedAt = nowIso();
  subject.version += 1;
  appendAudit({
    entityType: "Subject",
    entityId: subject.subjectId,
    action: "UPDATE",
    changes,
    comment,
    performedBy,
  });
  persist();
  return { ...subject };
}

export async function deleteSubject(
  subjectId: string,
  comment: string,
  performedBy: string
): Promise<void> {
  const c = ensureComment(comment);
  const s = loadStore();
  const idx = s.subjects.findIndex((x) => x.subjectId === subjectId);
  if (idx < 0) {
    throw new DataManagementValidationError(
      { subjectId: "Subject not found" },
      "Subject not found"
    );
  }
  // Cascade unlink — record an UNLINK audit for each, then delete the subject.
  const links = s.links.filter((l) => l.subjectId === subjectId);
  for (const link of links) {
    appendAudit({
      entityType: "SubjectSourceLink",
      entityId: subjectId,
      relatedSourceId: link.sourceId,
      action: "UNLINK",
      comment: "Cascade unlink due to subject deletion",
      performedBy,
    });
  }
  s.links = s.links.filter((l) => l.subjectId !== subjectId);
  s.subjects.splice(idx, 1);
  appendAudit({
    entityType: "Subject",
    entityId: subjectId,
    action: "DELETE",
    comment: c,
    performedBy,
  });
  persist();
}

export async function listAvailableSources(
  subjectId: string,
  query?: string
): Promise<DataSource[]> {
  const s = loadStore();
  const linked = new Set(
    s.links.filter((l) => l.subjectId === subjectId).map((l) => l.sourceId)
  );
  const q = query?.trim().toLowerCase() ?? "";
  return s.sources.filter((src) => {
    if (linked.has(src.sourceId)) return false;
    if (src.status !== "ACTIVE") return false;
    if (!q) return true;
    return (
      src.sourceId.toLowerCase().includes(q) ||
      src.name.toLowerCase().includes(q) ||
      src.provider.toLowerCase().includes(q) ||
      src.type.toLowerCase().includes(q)
    );
  });
}

export async function linkSources(
  subjectId: string,
  sourceIds: string[],
  comment: string,
  performedBy: string
): Promise<DataSource[]> {
  const c = ensureComment(comment);
  if (sourceIds.length === 0) {
    throw new DataManagementValidationError(
      { sources: "Pick at least one source to link" },
      "No sources selected"
    );
  }
  const s = loadStore();
  if (!s.subjects.some((x) => x.subjectId === subjectId)) {
    throw new DataManagementValidationError(
      { subjectId: "Subject not found" },
      "Subject not found"
    );
  }
  const added: DataSource[] = [];
  for (const sourceId of sourceIds) {
    const source = s.sources.find((x) => x.sourceId === sourceId);
    if (!source) continue;
    if (
      s.links.some((l) => l.subjectId === subjectId && l.sourceId === sourceId)
    ) {
      continue;
    }
    s.links.push({
      subjectId,
      sourceId,
      linkedAt: nowIso(),
      linkedBy: performedBy,
    });
    appendAudit({
      entityType: "SubjectSourceLink",
      entityId: subjectId,
      relatedSourceId: sourceId,
      action: "LINK",
      comment: c,
      performedBy,
    });
    added.push(source);
  }
  persist();
  return added;
}

export async function unlinkSource(
  subjectId: string,
  sourceId: string,
  comment: string,
  performedBy: string
): Promise<void> {
  const c = ensureComment(comment);
  const s = loadStore();
  const before = s.links.length;
  s.links = s.links.filter(
    (l) => !(l.subjectId === subjectId && l.sourceId === sourceId)
  );
  if (s.links.length === before) {
    throw new DataManagementValidationError(
      { sourceId: "Link not found" },
      "Link not found"
    );
  }
  appendAudit({
    entityType: "SubjectSourceLink",
    entityId: subjectId,
    relatedSourceId: sourceId,
    action: "UNLINK",
    comment: c,
    performedBy,
  });
  persist();
}

export async function listAuditLogForSubject(subjectId: string): Promise<AuditEntry[]> {
  const s = loadStore();
  return s.auditLog
    .filter((entry) => entry.entityId === subjectId)
    .sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1));
}

export type { AuditAction };
