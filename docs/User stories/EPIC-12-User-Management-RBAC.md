# EPIC-12 — User Management & RBAC

> **Epic Code:** USR | **Story Range:** USR-US-001–007
> **Owner:** Platform Engineering | **Priority:** P0–P1
> **Implementation Status:** ✅ Fully Implemented

---

## 1. Executive Summary

### Purpose
User Management covers the full lifecycle of portal users: invitation, role assignment, account management, and suspension. The RBAC (Role-Based Access Control) subsystem defines which actions each role can perform, enforced both in Spring (`@PreAuthorize`) and in the React SPA (conditional rendering). The Activity Log provides a complete, immutable audit trail of all user and system actions for compliance purposes.

### Business Value
- Controlled onboarding of bureau staff with specific access scopes
- Role-based access ensures no analyst can approve items or delete institutions
- Full activity log satisfies regulatory audit requirements (Basel III, IRDAI, CBK guidelines)
- User suspension without deletion preserves audit trail integrity
- Permissions matrix gives security team visibility into who can do what

### Key Capabilities
1. User list with status, role, and institution filters
2. User invitation workflow with role pre-assignment
3. User detail with role management
4. Account lifecycle: active → suspended → deactivated
5. Roles and permissions matrix view
6. Platform activity log with filters
7. VIEWER role denied audit log access

**Navigation catalogue vs matrix (SPA):** **`src/lib/nav-config.ts`** defines **`permissionSections`**—each section has an **`items[]`** list of human labels and paths (e.g. **Member Management** includes **Member Institutions**, **Register member**, **Consortiums**). The **Roles & Permissions** UI (`RolesPermissionsPage.tsx`) stores toggles per **section id** (e.g. **`members`**) × **View / Create / Edit / Delete / Export**; it does **not** add a separate matrix row per sub-route. Granting **Create** (or full access) on **Member Management** therefore covers registration (`/institutions/register`) alongside the list and consortium screens, consistent with Spring **`@PreAuthorize`** on institution APIs.

---

## 2. Scope

### In Scope
- `UserController` — list, get, invite, update, role assignment
- `RoleController` — list roles and permissions
- `UsersListPage.tsx`, `RolesPermissionsPage.tsx`, `ActivityLogPage.tsx`
- User lifecycle (active, suspended, deactivated)
- Role permission matrix display
- Activity log (wraps `GET /api/v1/audit-logs`)

### Out of Scope
- Social login integration
- Fine-grained permission customization per user (role-level only)
- Self-service profile editing (separate concern)
- User groups / teams

---

## 3. Personas

| Persona | Role | Needs |
|---------|------|-------|
| Bureau Administrator | SUPER_ADMIN / BUREAU_ADMIN | Invite users, manage roles, suspend/reactivate |
| Compliance Officer | BUREAU_ADMIN | View activity log, generate compliance reports |
| User being managed | Any | Know their current role, get invited by email |

---

## 4. Features Overview

| Feature | Description | Status |
|---------|-------------|--------|
| User List | Paginated, searchable user list | ✅ Implemented |
| Invite User | Email invitation with role pre-assignment | ✅ Implemented |
| User Detail & Role Assignment | View and update user's roles | ✅ Implemented |
| Suspend / Reactivate User | Toggle user account access | ✅ Implemented |
| Roles & Permissions Matrix | View all roles and their permissions | ✅ Implemented |
| Activity Log | Full platform action log with filters | ✅ Implemented |
| Filter Activity Log | By user, action type, date, entity | ✅ Implemented |

---

## 5. Epic-Level UI Requirements

### Screens

| Screen | Path | Description |
|--------|------|-------------|
| User List | `/user-management` | Paginated user table |
| Roles & Permissions | `/user-management/roles` | Role → permission matrix |
| Activity Log | `/user-management/activity-log` | Platform audit log |

### Component Behavior
- **User status badge:** `active`=green, `invited`=yellow, `suspended`=orange, `deactivated`=gray
- **Role badge:** Shows primary role assignment
- **Suspend button:** Visible for active users (admin only)
- **Reactivate button:** Visible for suspended users (admin only)
- **Activity log:** VIEWER role receives 403 — Activity Log menu item hidden

---

## 6. Epic-Level UI Test Cases

| Test ID | Screen | Scenario | Steps | Expected Result |
|---------|--------|----------|-------|----------------|
| USR-UI-TC-01 | User List | Load users | Navigate to /user-management | User rows with status and role badges |
| USR-UI-TC-02 | User List | Invite user | Click Invite, fill form | New user in list with invited status |
| USR-UI-TC-03 | User List | Suspend user | Click Suspend, confirm | User status → suspended |
| USR-UI-TC-04 | Roles | View permissions | Navigate to /user-management/roles | Role-permission matrix visible |
| USR-UI-TC-05 | Activity Log | View as viewer | Login as VIEWER, click Activity Log | 403 or menu item hidden |

---

## 7. Story-Centric Requirements

---

### USR-US-001 — View User List

#### 1. Description
> As a bureau administrator,
> I want to browse all platform users with their status and roles,
> So that I can manage access across the bureau.

#### 2. API Requirements

`GET /api/v1/users?status=&role=&institutionId=&page=0&size=20`

**Response:**
```json
{
  "content": [
    {
      "id": 1,
      "email": "admin@hcb.com",
      "displayName": "HCB Admin",
      "userAccountStatus": "active",
      "primaryRole": "Super Admin",
      "institutionId": null,
      "lastLoginAt": "2026-03-31T09:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "totalElements": 8
}
```

#### 3. Definition of Done
- [ ] User list loads with all users
- [ ] Filter by status, role, institution works
- [ ] Status badges correctly color-coded

---

### USR-US-002 — Invite a New User

#### 1. Description
> As a bureau administrator,
> I want to send an invitation to a new user with a pre-assigned role,
> So that they can access the portal with appropriate permissions.

#### 2. Acceptance Criteria

```gherkin
  Scenario: Invite new user
    Given I fill the invite form with email, name, and role
    When I click Send Invitation
    Then POST /api/v1/users/invite is called
    And the user is created with status "invited"
    And an invitation email is sent (future scope)

  Scenario: Duplicate email
    When I invite a user with an existing email
    Then I receive a 409 Conflict error
```

#### 3. API Requirements

`POST /api/v1/users/invite`

**Request:**
```json
{
  "email": "newanalyst@hcb.com",
  "displayName": "New Analyst",
  "roleId": 3,
  "institutionId": null
}
```

**Response (201):**
```json
{
  "id": 9,
  "email": "newanalyst@hcb.com",
  "userAccountStatus": "invited"
}
```

#### 4. Database

```sql
INSERT INTO users (email, display_name, user_account_status, is_system_user)
VALUES ('newanalyst@hcb.com', 'New Analyst', 'invited', 0);

INSERT INTO user_role_assignments (user_id, role_id, institution_id)
VALUES (9, 3, NULL);
```

#### 5. Status / State Management

| Status | Description | Trigger | Next States |
|--------|-------------|---------|-------------|
| `invited` | Invitation sent, user not yet activated | POST /invite | `active` |
| `active` | Fully active, can log in | User accepts invite / Admin activates | `suspended`, `deactivated` |
| `suspended` | Temporarily blocked | Admin suspend action | `active`, `deactivated` |
| `deactivated` | Permanently disabled | Admin deactivate | Terminal |

#### 6. Definition of Done
- [ ] POST /users/invite creates user with invited status and role assignment
- [ ] Duplicate email returns 409
- [ ] New user visible in user list with invited badge

---

### USR-US-003 — View User Detail and Assign Roles

#### 1. Description
> As a bureau administrator,
> I want to view a user's profile and manage their role assignments,
> So that access is correctly maintained as responsibilities change.

#### 2. API Requirements

**Get user:** `GET /api/v1/users/:id`
**Assign role:** `POST /api/v1/users/:id/roles`
**Remove role:** `DELETE /api/v1/users/:id/roles/:roleId`

**User detail response:**
```json
{
  "id": 3,
  "email": "analyst@hcb.com",
  "displayName": "Data Analyst",
  "userAccountStatus": "active",
  "institutionId": null,
  "roles": [
    {"roleId": 3, "roleName": "Analyst", "assignedAt": "2025-06-01T00:00:00Z"}
  ],
  "lastLoginAt": "2026-03-30T14:00:00Z"
}
```

#### 3. Business Logic
- A user can have multiple roles (one primary role for display)
- `institution_id` in `user_role_assignments` scopes a role to a specific institution (for institution-scoped users)
- Removing all roles makes user functionally read-only (no permissions)

#### 4. Definition of Done
- [ ] User detail shows all profile fields and current roles
- [ ] Role can be added via POST
- [ ] Role can be removed via DELETE
- [ ] Audit log written on every role change

---

### USR-US-004 — Suspend or Reactivate a User

#### 1. Description
> As a bureau administrator,
> I want to suspend or reactivate a user account,
> So that access is revoked immediately or restored when appropriate.

#### 2. API Requirements

`PATCH /api/v1/users/:id/status`

**Request:**
```json
{ "status": "suspended" }
```

#### 3. Business Logic
- Suspended users cannot log in (401 on next login attempt)
- Existing access tokens are invalidated on next use (401)
- Soft delete for deactivation: `is_deleted=1` — user remains in DB for audit trail

#### 4. Definition of Done
- [ ] PATCH /users/:id/status updates status correctly
- [ ] Suspended users receive 401 on login
- [ ] Audit log written on status change

---

### USR-US-005 — View Roles and Permissions Matrix

#### 1. Description
> As a bureau administrator,
> I want to see all roles and their permission assignments,
> So that I understand what each role can and cannot do.

#### 2. API Requirements

`GET /api/v1/roles`

**Response:**
```json
[
  {
    "id": 1,
    "roleName": "Super Admin",
    "roleCode": "ROLE_SUPER_ADMIN",
    "description": "Full system access",
    "permissions": [
      {"permissionKey": "INSTITUTION_CREATE", "description": "Create member institutions"},
      {"permissionKey": "APPROVAL_APPROVE", "description": "Approve queue items"}
    ]
  }
]
```

#### 3. Permissions Matrix

**Implementation note:** The live portal matrix is **section × action** (aligned with **`permissionSections`** in **`nav-config.ts`**). The table below documents **server-style permission keys** for reference; subsection routes such as **`/institutions/register`** are catalogued under **Member Management** in **`nav-config`** but are not separate rows in the SPA matrix.

| Permission | SUPER_ADMIN | BUREAU_ADMIN | ANALYST | VIEWER |
|-----------|:-----------:|:------------:|:-------:|:------:|
| INSTITUTION_CREATE | ✅ | ✅ | ❌ | ❌ |
| INSTITUTION_READ | ✅ | ✅ | ✅ | ✅ |
| APPROVAL_APPROVE | ✅ | ✅ | ❌ | ❌ |
| AUDIT_LOG_READ | ✅ | ✅ | ✅ | ❌ |
| USER_INVITE | ✅ | ✅ | ❌ | ❌ |
| REPORT_REQUEST | ✅ | ✅ | ✅ | ❌ |
| SCHEMA_MAPPER_SUBMIT | ✅ | ✅ | ✅ | ❌ |

#### 4. Definition of Done
- [ ] All roles listed with their permissions
- [ ] Permission matrix displayed in a readable format
- [ ] UI uses this data to conditionally render controls

---

### USR-US-006 — View Platform Activity Log

#### 1. Description
> As a compliance officer,
> I want to see all user and system actions with timestamps,
> So that I have a complete, immutable audit trail for regulatory purposes.

#### 2. API Requirements

`GET /api/v1/audit-logs?actionType=&entityType=&userId=&dateFrom=&dateTo=&page=0&size=20`

**Response:**
```json
{
  "content": [
    {
      "id": 245,
      "userId": 1,
      "userDisplayName": "HCB Admin",
      "actionType": "INSTITUTION_APPROVED",
      "entityType": "institution",
      "entityId": "6",
      "description": "Approved institution: First National Bank",
      "auditOutcome": "success",
      "occurredAt": "2026-03-31T10:30:00Z"
    }
  ]
}
```

#### 3. Role Restriction

**VIEWER role receives 403 on `GET /api/v1/audit-logs`.**

Activity Log menu item is hidden in sidebar for VIEWER.

#### 4. Compliance Requirements
- Table is **append-only** — no updates or deletes permitted
- IP address stored as SHA-256 hash
- Raw passwords, tokens, or PII must never appear in `description` field
- `audit_outcome`: `success` | `failure` | `partial`

#### 5. Definition of Done
- [ ] Audit log loads with all entries
- [ ] VIEWER receives 403 (menu item hidden)
- [ ] IP address shown only as hash
- [ ] Table is read-only (no edit buttons)

---

### USR-US-007 — Filter and Search Activity Log

#### 1. Description
> As a compliance officer,
> I want to filter activity logs by user, action type, entity, and date,
> So that I can investigate specific events efficiently.

#### 2. Filter Options

| Filter | Options |
|--------|---------|
| Action Type | LOGIN, LOGOUT, INSTITUTION_CREATED, INSTITUTION_APPROVED, PRODUCT_APPROVED, APPROVAL_APPROVED, APPROVAL_REJECTED, SCHEMA_MAPPING_APPROVED, USER_INVITED, USER_SUSPENDED, ROLE_ASSIGNED, REPORT_REQUESTED, BATCH_JOB_RETRIED, etc. |
| Entity Type | user, institution, product, consortium, schema_mapping, alert_rule, report, batch_job |
| User | Institution-specific filter |
| Date Range | From / To date pickers |

#### 3. Definition of Done
- [ ] All filter combinations return correct results
- [ ] Action type filter covers all key platform actions
- [ ] Results sortable by occurred_at

---

## 8. Epic API Summary

| Endpoint | Method | Auth | Description | Status |
|----------|--------|------|-------------|--------|
| `GET /api/v1/users` | GET | Bearer (Admin) | List users | ✅ |
| `POST /api/v1/users/invite` | POST | Bearer (Admin) | Invite new user | ✅ |
| `GET /api/v1/users/:id` | GET | Bearer (Admin) | User detail | ✅ |
| `PATCH /api/v1/users/:id/status` | PATCH | Bearer (Admin) | Update user status | ✅ |
| `POST /api/v1/users/:id/roles` | POST | Bearer (Admin) | Assign role | ✅ |
| `DELETE /api/v1/users/:id/roles/:roleId` | DELETE | Bearer (Admin) | Remove role | ✅ |
| `GET /api/v1/roles` | GET | Bearer (Admin) | List roles with permissions | ✅ |
| `GET /api/v1/audit-logs` | GET | Bearer (not Viewer) | Activity log | ✅ |

---

## 9. Database Summary

| Table | Key Fields | Notes |
|-------|------------|-------|
| `users` | `id`, `email`, `display_name`, `password_hash`, `user_account_status`, `institution_id` | User accounts |
| `roles` | `id`, `role_name`, `role_code` | Role definitions |
| `permissions` | `id`, `permission_key`, `description` | Fine-grained permissions |
| `role_permissions` | `role_id`, `permission_id` | Role → permission mapping |
| `user_role_assignments` | `user_id`, `role_id`, `institution_id` | User → role (optionally scoped to institution) |
| `audit_logs` | `user_id`, `action_type`, `entity_type`, `entity_id`, `audit_outcome` | Immutable audit trail |

---

## 10. Epic Workflows

### Workflow: New Staff Onboarding
```
Bureau admin invites new analyst →
  POST /users/invite {email, roleId: ANALYST} →
  User created with status: invited →
  User accepts invitation (future: email link) →
  User logs in: status → active →
  User can access analyst-scoped pages
```

---

## 11. KPIs

| KPI | Target |
|-----|--------|
| Time to revoke access (suspend to 401) | < 1 minute |
| Role assignment accuracy | 100% (no over-privileged users) |
| Audit log completeness | 100% of actions logged |

---

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Admin locked out (all admins suspended) | Critical | Minimum 1 SUPER_ADMIN required check |
| VIEWER accesses audit log via direct URL | Data exposure | Server-side 403 enforced |

---

## 13. Gap Analysis

No critical gaps. All user management endpoints implemented in Spring.
Minor: Email invitation delivery (SMTP) not implemented — invited users must be manually activated.

---

## 14. Execution Roadmap

| Phase | Stories | Description |
|-------|---------|-------------|
| Phase 1 | USR-US-001–007 | All implemented — production-ready |
| Phase 2 | — | Email invitation delivery (SMTP integration) |
| Phase 3 | — | Self-service password change |
| Phase 4 | — | Access certification review (quarterly role audit workflow) |
