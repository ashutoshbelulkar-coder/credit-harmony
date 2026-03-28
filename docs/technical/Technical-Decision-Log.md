# HCB Platform — Technical Decision Log

**Version:** 3.0.0 | **Date:** 2026-03-28

---

## TDL-001: Database Engine Selection — SQLite for Development, PostgreSQL for Production

| Field | Value |
|-------|-------|
| **Decision** | Use SQLite 3 (WAL mode) for development; PostgreSQL 15 for production |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Alternatives Considered** | H2 in-memory, MySQL, MongoDB |
| **Rationale** | SQLite provides zero-configuration local development with file-based portability. PostgreSQL is the industry standard for production OLTP workloads in financial systems. Hibernate community dialect bridges the gap. ANSI-compatible DDL ensures schema portability. |
| **Trade-offs** | SQLite lacks row-level locking (WAL mode partially mitigates); no native `TIMESTAMPTZ` (stored as DATETIME/TEXT). |
| **Migration Path** | Flyway for production schema migrations; seed scripts for dev. |

---

## TDL-002: Authentication — JWT Access + Refresh Token Architecture

| Field | Value |
|-------|-------|
| **Decision** | Short-lived JWT access tokens (15 min, HS256) + long-lived refresh tokens (7 days, rotation on use) |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Alternatives Considered** | Session-based auth, PASETO, opaque tokens only |
| **Rationale** | JWT enables stateless API authorization without DB lookup on every request (scales horizontally). Short access token lifetime limits breach window. Refresh tokens stored as SHA-256 hashes (never plain text) with rotation-on-use prevents token theft reuse. |
| **Trade-offs** | Cannot immediately revoke access tokens (15-min window); mitigated by refresh token revocation which prevents renewal. |
| **Security Note** | JWT secret minimum 256 bits enforced in code. Dev fallback key clearly marked for replacement. |

---

## TDL-003: Password Hashing — BCrypt Cost Factor 12

| Field | Value |
|-------|-------|
| **Decision** | BCrypt with cost factor 12 for all user passwords |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Alternatives Considered** | Argon2id (preferred for new systems), scrypt, PBKDF2 |
| **Rationale** | BCrypt is the Spring Security default, well-tested, and sufficient for the current threat model. Cost factor 12 provides adequate work factor (~300ms on modern hardware). |
| **Future Consideration** | Migrate to Argon2id when Spring Security adds native support. |

---

## TDL-004: PII Encryption Strategy

| Field | Value |
|-------|-------|
| **Decision** | AES-256-GCM for reversible PII fields (name, DOB); SHA-256/HMAC for irreversible identifiers (national ID hash, phone hash) |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | Reversible encryption required for name/DOB (authorized display); one-way hashing for matching (national ID lookup doesn't need plaintext). HMAC with server-side pepper prevents rainbow table attacks on hashed fields. |
| **Key Management** | Keys managed via environment variables (`HCB_PII_KEY`, `HCB_HMAC_PEPPER`). Key rotation requires data re-encryption (documented in operations guide). |

---

## TDL-005: Normalization Level — Strict 3NF

| Field | Value |
|-------|-------|
| **Decision** | Third Normal Form (3NF) strictly enforced; no denormalized shortcuts |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Alternatives Considered** | 2NF (too lax for credit bureau), 4NF/5NF (over-engineering) |
| **Rationale** | Credit bureau data requires single source of truth for regulatory compliance. Denormalized status caches caused 11 identified duplicate attribute issues in the original mock data. 3NF eliminates these without over-complicating the query model. |
| **Trade-offs** | More JOINs per query; mitigated by strategic indexing on all FK columns and frequently filtered fields. |

---

## TDL-006: Soft Delete Strategy

| Field | Value |
|-------|-------|
| **Decision** | Soft delete via `is_deleted` (BOOLEAN) + `deleted_at` (DATETIME) on all mutable entities |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | Financial regulatory requirements mandate data retention. Hard deletes remove audit trail. Soft delete preserves history while allowing logical exclusion via WHERE clause. |
| **Implementation** | All queries add `AND is_deleted = 0` filter via JPA. Cascade rules: `CASCADE` for child entities, `SET NULL` for optional references. |

---

## TDL-007: Audit Logging — Append-Only Mandatory Side-Effect

| Field | Value |
|-------|-------|
| **Decision** | Every business action generates an immutable audit_log row as a mandatory transaction side-effect |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | Basel, SOX, and local financial regulatory requirements mandate complete audit trails. Making it a mandatory service-layer side-effect (not optional) prevents logging gaps. |
| **Security** | IP addresses hashed (SHA-256) before storage. PII never in log descriptions. User referenced by ID (FK) only. |
| **Retention** | 2,555 days (7 years) minimum per financial services compliance standards. |

---

## TDL-008: API Error Response Design — Generic Codes Only

| Field | Value |
|-------|-------|
| **Decision** | All error responses use generic error codes (e.g., `ERR_AUTH_FAILED`); no stack traces, DB errors, or internal paths exposed |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | OWASP A05 (Security Misconfiguration) — exposing internal details aids attackers. Spring `include-message: never` and `include-stacktrace: never` enforced. |

---

## TDL-009: H2 Console — Development Only

| Field | Value |
|-------|-------|
| **Decision** | H2 console enabled only in `dev` profile; disabled via config in `prod` profile |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Rationale** | H2 console provides web-based DB inspection useful for development debugging. In production it would expose a direct database interface — an unacceptable security risk. Profile-based flag prevents accidental enablement. |

---

## TDL-010: Status Field Domain Scoping

| Field | Value |
|-------|-------|
| **Decision** | Status fields use domain-specific names (`institution_lifecycle_status`, `batch_job_status`, etc.) with domain-specific CHECK constraint enums |
| **Date** | 2026-03-28 |
| **Status** | Accepted |
| **Problem Solved** | Original mock data used generic `status` field across 8+ domains with incompatible enum sets, causing filter confusion and type safety violations. |
| **Rationale** | Domain-scoped names enable unambiguous filtering, prevent cross-domain status comparisons, and allow per-domain CHECK constraints. |
