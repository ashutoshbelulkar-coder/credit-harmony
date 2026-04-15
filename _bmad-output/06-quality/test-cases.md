# Test cases & traceability — HCB Admin Portal

**Phase:** Quality  
**Source of truth:** [../technical/Testing-Plan.md](../technical/Testing-Plan.md) — contains **full** traceability tables (e.g. FM-REG-*, SM-STF-*, AUTH-*).

This file maps **user stories** in [../05-delivery/user-stories.md](../05-delivery/user-stories.md) to **documented test IDs** and suites.

---

## Traceability matrix (summary)

| User story | Test IDs / suite | Layer |
|------------|-------------------|--------|
| **US-01** Approve institution | Approval queue Spring tests (`ApprovalQueueSqliteIntegrationTest`); api-client 204 handling | Integration + unit |
| **US-02** Register geography | FM-REG-INT-001–007, FM-REG-UNIT-*, FM-REG-CLI-* | Integration + unit |
| **US-03** Packet configure | EPIC-04 manual + component tests for `PacketConfigModal` patterns | Component |
| **US-04** Schema submit approval | Schema mapper integration; approval queue metadata | Integration |
| **US-05** Batch phases | Batch detail resolution tests; `resolveBatchConsoleData` | Unit + API |

---

## Example Gherkin → automation mapping

**Story:** US-02 (registration metadata)

| Gherkin step | Automated trace |
|--------------|------------------|
| Form loads from `form-metadata` | FM-REG-INT-001, FM-REG-INT-002 |
| Kenya jurisdiction enum enforced | FM-REG-INT-003, FM-REG-INT-004 |
| Institution type allowlist | FM-REG-INT-005 |
| Consortium rules when subscriber | FM-REG-INT-006, FM-REG-INT-007 |

---

## Edge & failure scenarios (checklist)

- [ ] **403** institution traffic — `ERR_INSTITUTION_*` codes ([Global-API-Error-Dictionary](../technical/Global-API-Error-Dictionary.md))  
- [ ] **204** approval — no response body; React Query invalidation  
- [ ] **VIEWER** denied audit logs  
- [ ] **Empty** dashboard KPIs when clock outside seed window  
- [ ] **Mock fallback** — document which flows are not API-backed  

---

## Cross-references

- [test-strategy.md](./test-strategy.md)  
- [Testing-Plan.md](../technical/Testing-Plan.md)
