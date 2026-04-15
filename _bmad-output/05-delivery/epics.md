# Epics — HCB Admin Portal

**Phase:** Delivery (Party Mode: Amelia lead, John)  
**Canonical epic library:** [../User stories/INDEX.md](../User%20stories/INDEX.md) — numbered EPICs **00–18** (and agents).

---

## Epic map (business-outcome grouping)

| Theme | Epics | Outcome |
|-------|-------|---------|
| **Foundation & access** | [EPIC-00](../User%20stories/EPIC-00-Design-System-Cross-Cutting.md), [EPIC-01](../User%20stories/EPIC-01-Authentication-Session.md) | Consistent UI + secure session/MFA |
| **Members & consortiums** | [EPIC-02](../User%20stories/EPIC-02-Institution-Member-Management.md), [EPIC-03](../User%20stories/EPIC-03-Consortium-Management.md) | Onboard and govern network participants |
| **Data products & enquiry** | [EPIC-04](../User%20stories/EPIC-04-Data-Products-Packet-Configurator-Enquiry-Simulation.md), [EPIC-16](../User%20stories/EPIC-16-Enquiry-API.md) | Catalogue-driven products + enquiry configuration |
| **Schema & governance** | [EPIC-05](../User%20stories/EPIC-05-Schema-Mapper-Agent.md), [EPIC-06](../User%20stories/EPIC-06-Data-Governance.md), [EPIC-07](../User%20stories/EPIC-07-Data-Validation.md) | Mappings, drift, validation |
| **Approvals & workflow** | [EPIC-08](../User%20stories/EPIC-08-Approval-Queue-Workflow.md) | Unified governance queue |
| **Operations** | [EPIC-09](../User%20stories/EPIC-09-Monitoring.md), [EPIC-14](../User%20stories/EPIC-14-Batch-Pipeline.md), [EPIC-15](../User%20stories/EPIC-15-Data-Submission-API.md) | Visibility + pipelines |
| **Reporting & alerts** | [EPIC-11](../User%20stories/EPIC-11-Reporting.md), [EPIC-10](../User%20stories/EPIC-10-Alert-Engine-SLA.md) | Scheduled ops + SLA |
| **Platform admin** | [EPIC-12](../User%20stories/EPIC-12-User-Management-RBAC.md), [EPIC-13](../User%20stories/EPIC-13-Dashboard-Command-Center.md) | Users, roles, executive dashboard |
| **Intelligence** | [EPIC-17](../User%20stories/EPIC-17-Agents.md), [EPIC-18](../User%20stories/EPIC-18-Identity-Resolution-Agent.md) | Agent surfaces |

---

## Priority guidance

- **P0:** Auth, institutions, approvals, Spring parity for core list APIs ([TDL-018](../technical/Technical-Decision-Log.md)).  
- **P1:** Schema mapper, products, monitoring, batch.  
- **P2+:** Roadmap items in [PRD-BRD](../PRD-BRD-HCB-Admin-Portal.md) (integrations, advanced features).

---

## How to use this doc

1. Pick a theme → open linked EPIC markdown.  
2. Derive **user stories** in [user-stories.md](./user-stories.md) or extend EPIC files directly.  
3. Map tests in [../06-quality/test-strategy.md](../06-quality/test-strategy.md).

---

## Cross-references

- [user-stories.md](./user-stories.md)  
- [PRD v1](../02-prd/prd-v1.md)
