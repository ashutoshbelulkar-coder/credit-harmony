

## Approval Queue for Super Admin

### Problem
Currently, when a new institution is registered or a new schema mapping is created, it completes immediately without any approval gate. The system needs a Super Admin approval workflow for both flows.

### Where to Place It

**New sidebar sub-item under "User Management" or as a top-level item:**
Add an **"Approval Queue"** page accessible from the sidebar — ideally as a new top-level nav item (with a `ClipboardCheck` icon) placed between "Audit Logs" and "User Management", since it spans multiple modules.

### Proposed Flow

**1. Institution Registration Approval**
- When a user submits the Register Institution form (step 3), instead of immediately creating the institution, the status is set to `pending_approval`.
- The institution appears in the Institution List with a "Pending Approval" badge (not yet active).
- The item appears in the Approval Queue for Super Admins.

**2. Schema Mapping Approval**
- The existing Governance Actions step already has "Submit to Evolution Queue" — this naturally feeds into the approval queue.
- Submitted mappings appear in the Approval Queue with status "Pending".

**3. Approval Queue Page (new)**
- A filterable table showing all pending items across the system.
- Columns: Item Type (Institution / Schema Mapping), Name, Submitted By, Submitted Date, Status.
- Filters: Type (All / Institution / Mapping), Status (Pending / Approved / Rejected).
- Each row expands or opens a detail drawer showing the full submission details.
- Action buttons: **Approve**, **Reject** (with mandatory reason), **Request Changes**.
- On approval, institutions move to "Active" status; mappings move to "Approved" in governance.

### Technical Plan

**New files:**
- `src/pages/approval-queue/ApprovalQueuePage.tsx` — Main page with table, filters, and detail drawer
- `src/pages/approval-queue/ApprovalQueueLayout.tsx` — Layout wrapper with Outlet
- `src/data/approval-queue-mock.ts` — Mock data for pending approvals (institutions + mappings)
- `src/types/approval-queue.ts` — Types: `ApprovalItem`, `ApprovalType`, `ApprovalStatus`

**Modified files:**
- `src/components/layout/AppSidebar.tsx` — Add "Approval Queue" nav item with badge count for pending items
- `src/App.tsx` — Add route `/approval-queue`
- `src/pages/RegisterInstitution.tsx` — Change submit handler to show "Submitted for Approval" confirmation instead of direct creation
- `src/components/schema-mapper/wizard/GovernanceActionsStep.tsx` — Update submission confirmation text to reference the approval queue

**Approval Queue Page layout:**
- KPI row at top: Pending count, Approved today, Avg approval time
- Tab bar: All | Institutions | Mappings
- Data table with row actions (Approve/Reject)
- Reject action opens a reason dialog (reuse existing `ReasonInputDialog`)
- Detail drawer showing full submission data for review

