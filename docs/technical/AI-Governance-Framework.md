# AI governance framework (agents, prompts, and human review)

**Version:** 1.0.0 | **Date:** 2026-03-29 | **Audience:** Product, compliance, ML/engineering

The HCB Admin Portal includes **AI-assisted** UX (e.g. schema mapping narrative, agent workspace mock). The **Schema Mapper** dev API can call **OpenAI** for structured field proposals when **`OPENAI_API_KEY`** is set; otherwise it uses deterministic heuristics and still requires **human review** and **approval queue** activation (see [Canonical-Backend.md](./Canonical-Backend.md)). Any production use of LLMs for **credit-adjacent** decisions must meet governance below. Today’s in-repo **Agents** surface is largely **demo** (see [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md)); this document defines the **enterprise target**.

---

## 1. Scope

| Capability | Risk tier | Minimum controls |
|------------|-----------|-------------------|
| Operator tooling (summaries, draft mappings) | Medium | Logging, PII ban in prompts, versioned prompts |
| Consumer-facing or underwriting recommendations | High | HITL, model cards, evaluation, bias review |

---

## 2. Prompt and model versioning

- Each deployed **system prompt** and **tooling schema** has `prompt_version` (semver or monotonic id) stored with outputs.
- **Model registry:** vendor, model id, release date, region, data processing agreement (DPA).
- **Rollback:** ability to revert to prior `prompt_version` without code deploy (config-driven).

---

## 3. Model fallback

- Primary model failure → **degraded mode**: template response, queue for human, or secondary model **only if** evaluation parity is documented.
- Never silently switch high-risk models without audit log entry.

---

## 4. Explainability and confidence

- Structured outputs should include **reason codes** or **citations** to bureau fields (not raw PII).
- **Confidence scores** must not be the sole automated decision trigger for regulated decisions without policy sign-off; use thresholds + HITL queues.

---

## 5. Bias and fairness

- Define **protected attributes** per jurisdiction; prohibit using them as direct model inputs unless legally required and documented.
- Periodic **evaluation** on holdout sets; track outcome metrics by segment; escalate regressions.

---

## 6. Human-in-the-loop (HITL)

- Queues for: low confidence, policy exceptions, escalations, and **consumer dispute** touchpoints.
- SLA for human review; full audit of reviewer id, decision, and time.

---

## 7. Data handling

- **No PII** in prompts sent to third-party LLMs unless contract and DPIA allow it; prefer hashed/pseudonymous identifiers internal to HCB.
- Retention: prompt/response logs TTL aligned with enterprise retention policy (see PRD compliance sections) once baselined; redact PII on ingest.

---

## 8. Product positioning vs implementation

- **Vision:** full agent workspace with tools (per PRD Module 6).
- **MVP in repo:** UI may be mock-first; engineering sources of truth remain [API-UI-Parity-Matrix.md](./API-UI-Parity-Matrix.md) and code.

---

## 9. Related documents

- [Multi-Tenant-Target-Architecture.md](./Multi-Tenant-Target-Architecture.md)
- [Global-API-Error-Dictionary.md](./Global-API-Error-Dictionary.md)
- [Data-Flow-Diagram.md](./Data-Flow-Diagram.md)
