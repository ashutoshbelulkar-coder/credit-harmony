

# User Management Module — Implementation Plan

## Research Summary

Enterprise credit bureau platforms (Experian PowerCurve, CRIF BureauSuite, TransUnion TrueVision) share common user management patterns:
- **Role-based access** with hierarchical roles (Super Admin → Admin → Analyst → Viewer)
- **Institution-scoped users** — each user belongs to an institution with institution-level permissions
- **Activity audit trails** — login history, action logs
- **API key association** — users tied to API credentials
- **Bulk operations** — invite multiple users, bulk role changes
- **Status lifecycle** — Active, Invited, Suspended, Deactivated

## Architecture

Route: `/user-management` (replace current placeholder)

### Sub-navigation (sidebar sub-items under User Management):
- **Users** — `/user-management/users`
- **Roles & Permissions** — `/user-management/roles`
- **Activity Log** — `/user-management/activity`

### Files to create:
1. `src/data/user-management-mock.ts` — Mock data for users, roles, permissions, activity
2. `src/pages/user-management/UserManagementLayout.tsx` — Outlet-based layout (like MonitoringLayout)
3. `src/pages/user-management/UsersListPage.tsx` — Main user directory
4. `src/pages/user-management/RolesPermissionsPage.tsx` — Role definitions with permission matrix
5. `src/pages/user-management/ActivityLogPage.tsx` — User activity audit log
6. `src/components/user-management/InviteUserModal.tsx` — Invite/create user modal
7. `src/components/user-management/UserDetailDrawer.tsx` — Side drawer for user profile details

### Files to edit:
- `src/App.tsx` — Add nested routes under `/user-management`
- `src/components/layout/AppSidebar.tsx` — Add sub-items for User Management
- `src/pages/agents/AgentConfigurationPage.tsx` — Fix existing build error (lines 102-103 type cast)

## Screen Specifications

### 1. Users List Page (`/user-management/users`)

**Header**: "Users" + "Invite User" primary button

**Filter bar**: Search input, Role dropdown (All/Super Admin/Admin/Analyst/Viewer), Status dropdown (All/Active/Invited/Suspended/Deactivated), Institution dropdown

**Table columns**:
| Column | Detail |
|---|---|
| User | Avatar + Name + Email (stacked) |
| Role | Badge pill (color-coded) |
| Institution | Institution name |
| Status | Status badge (Active=green, Invited=blue, Suspended=yellow, Deactivated=red) |
| Last Active | Relative timestamp |
| MFA | Enabled/Disabled badge |
| Actions | Three-dot menu (View, Edit Role, Suspend, Deactivate) |

Sortable columns, paginated (10 per page).

**Row click** → Opens UserDetailDrawer.

### 2. Invite User Modal

Fields: Full Name, Email, Role (Select), Institution (Select), Send Welcome Email (checkbox). Cancel + Send Invite buttons.

### 3. User Detail Drawer

Side drawer showing: Avatar, name, email, role, institution, status, MFA status, created date, last login. Sections: Recent Activity (last 10 actions), Assigned API Keys, Permissions summary. Actions: Edit Role, Reset Password, Suspend/Activate, Deactivate.

### 4. Roles & Permissions Page (`/user-management/roles`)

**Predefined roles** displayed as cards:
- **Super Admin**: Full platform access
- **Bureau Admin**: Institution + data governance management
- **Analyst**: Read-only analytics, agent usage, report generation
- **Viewer**: Dashboard-only read access
- **API User**: Programmatic access only

**Permission matrix table**: Rows = permissions (Manage Institutions, View Dashboard, Use Agents, Manage Data Governance, View Monitoring, Generate Reports, Manage Users, Access API, View Audit Logs). Columns = roles. Cells = checkmark or dash.

### 5. Activity Log Page (`/user-management/activity`)

**Filter bar**: Search, User dropdown, Action Type dropdown (Login, Role Change, API Key Generated, User Invited, etc.), Date range

**Table**: Timestamp, User (avatar+name), Action, Details, IP Address, Status (Success/Failed badge)

Paginated, sortable by timestamp.

## Mock Data (12 users)

Mix across institutions (FNB, Metro Credit Union, Pacific Finance Corp, etc.), roles, statuses. Include realistic activity entries (logins, role changes, bureau queries, API key rotations).

## Build Error Fix

In `AgentConfigurationPage.tsx` lines 102-103, cast the spread to the correct type using `as any` to resolve the TS2345 error with `setSources` and `setCapabilities`.

## Patterns

- Reuse `DashboardLayout`, `tableHeaderClasses`, `badgeTextClasses` from existing code
- Use existing `DropdownMenu`, `Dialog`, `Sheet` (drawer), `Badge`, `Switch`, `Select` components
- Follow the same card/table styling as InstitutionList
- Sidebar sub-items pattern matches Data Governance and Monitoring sections

