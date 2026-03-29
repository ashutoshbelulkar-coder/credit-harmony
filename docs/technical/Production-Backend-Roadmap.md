# Production backend roadmap (beyond the dev API)

**Date:** 2026-03-29 | **Audience:** Engineering / architecture

The Fastify app in `server/` is a **development surrogate**: in-memory state, seeded from `src/data/*.json`. The following tracks what a production-grade backend must add.

## Persistence

- Replace in-memory maps/arrays with a durable store (PostgreSQL recommended per existing BRD assumptions).
- Migrations (Flyway/Liquibase or equivalent) and idempotent seed for non-prod environments.
- Write-path **idempotency** for integrator POSTs (see [Idempotency-And-Retries.md](./Idempotency-And-Retries.md)).
- Align institution consortium memberships, product subscriptions, and consortium member rows with normalized tables and FK constraints.

## Security and compliance

- Enforce strong `JWT_SECRET` (no dev default in deployed environments).
- Rate limiting and brute-force protection on `POST /auth/login`.
- Optional: Argon2id or maintained password hashing policy for stored credentials.
- Field-level encryption for PII where required by policy (see Technical Decision Log).

## Authorization

- Map JWT claims to **per-route** permissions (today the dev API validates token presence only).
- Enforce role matrix from PRD (e.g. Viewer cannot mutate institutions).

## Observability

- Structured logging (JSON), request correlation IDs, metrics (RED/USE).
- Frontend: global error boundary and optional reporting sink (S3, OpenTelemetry, etc.).

## Files and async work

- Institution document uploads: virus scan, object storage (S3/Azure Blob), retention and legal hold.
- Report generation: async job queue, signed download URLs, progress webhooks.

## CI/CD

- Run `npm run test` with **both** Vitest projects (client + server integration).
- Optional: `VITE_USE_MOCK_FALLBACK=false` E2E against a disposable API instance.
