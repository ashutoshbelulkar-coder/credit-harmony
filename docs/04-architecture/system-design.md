# System design — HCB Admin Portal

**Phase:** Architecture (Party Mode: Winston lead, Amelia)  
**Canonical references:** [Architecture-Diagram.md](../technical/Architecture-Diagram.md), [Canonical-Backend.md](../technical/Canonical-Backend.md), [Multi-Tenant-Target-Architecture.md](../technical/Multi-Tenant-Target-Architecture.md)

---

## 1. High-level architecture

```
[Browser SPA — Vite :8080]
        |  HTTPS (dev: proxy /api)
        v
[Spring Boot API — :8090] — JWT, MFA, JdbcTemplate/JPA, SQLite (dev) / PG (prod)
        |
        +-- SQLite/PostgreSQL (authoritative persistence)
        +-- Optional OpenAI (schema mapper LLM)
        +-- Actuator /health

[Legacy Fastify :8091] — in-memory, non-contract reference
```

**Rule:** New features and contract fixes **target Spring** unless explicitly legacy-scoped.

---

## 2. Logical components

| Component | Responsibility |
|-----------|----------------|
| **Auth** | Login, refresh, MFA challenge/verify, optional Turnstile |
| **Institutions** | Registration wizard metadata, CRUD, overview, API access |
| **Consortiums** | Create/list; approval when not immediately active |
| **Products** | Packet catalogue, product CRUD, packetConfigs |
| **Schema Mapper** | Ingest, async mapping jobs, registry, rules, submit-approval |
| **Approvals** | Unified queue; typed metadata; 204 actions |
| **Monitoring** | API requests, enquiries, KPIs, charts |
| **Dashboard** | Command center JDBC aggregates |
| **Governance** | Policies, drift alerts (ingestion) |
| **Reporting** | Report requests |
| **Users / Roles** | Directory, invitations, RBAC |
| **Alerts / SLA** | Rules, incidents, configs |
| **Batch** | Jobs, execution detail (phases when logged) |

---

## 3. Data flow (textual)

1. **Operator** configures artefact in SPA → **REST** JSON → **Spring** validates → **DB** + optional **approval_queue** row.  
2. **Approver** acts → **204** → SPA invalidates React Query caches → UI reflects new state.  
3. **Member traffic** (future/reserved routes) depends on **institution active** + policies — **403** with stable codes if gated.  
4. **Batch** execution writes phase/stage logs when enabled → **detail** endpoint returns tree for console.

---

## 4. Integration points

| Integration | Notes |
|-------------|--------|
| **Schema Mapper LLM** | `OPENAI_API_KEY`, model config; can disable |
| **Cloudflare Turnstile** | SPA site key + Spring secret when captcha enabled |
| **External bureau engine** | BRD references CRIF — integration boundaries in Production roadmap |

---

## 5. Scalability & reliability

- **API:** Stateless JWT; horizontal scale of Spring instances behind LB (prod).  
- **DB:** Dev SQLite; prod PostgreSQL; **Hikari** pool size tuned for JPA + JdbcTemplate coexistence (see AGENTS).  
- **SPA:** Static build; CDN-friendly.  
- **Long work:** Async mapping jobs (202); polling/UI patterns in SPA.

---

## 6. Security

- **JWT** secret rotation in prod; MFA for privileged users.  
- **RBAC** — e.g. `VIEWER` blocked from audit logs API (`SecurityConfig` in `backend/`).  
- **DELETE** semantics globally stricter for some paths — see OpenAPI description.

---

## 7. Known technical debt / drift surfaces

- **JdbcTemplate** list routes must match **DDL** ([TDL-018](../technical/Technical-Decision-Log.md)).  
- **Fastify vs Spring** parity — [SPA-Service-Contract-Drift.md](../technical/SPA-Service-Contract-Drift.md).  
- **Seed time windows** — dashboard KPIs may look empty off-window.

---

## 8. Cross-references

- [api-specs.yaml](./api-specs.yaml) — pointer to OpenAPI  
- [ERD-Schema-Map.md](../technical/ERD-Schema-Map.md)  
- [Data-Flow-Diagram.md](../technical/Data-Flow-Diagram.md)
