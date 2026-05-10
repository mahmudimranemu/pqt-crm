# PropertyFlow CRM — Roles & Permissions Reference

This document is the authoritative reference for all role-based access control (RBAC) in the PropertyFlow (PQT) CRM. It covers role definitions, the role hierarchy, sidebar navigation gating, page-level guards, server-action checks, and data-visibility scoping.

---

## 1. Role Definitions

Defined in `prisma/schema.prisma`:

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  SALES_MANAGER
  SALES_AGENT
  VIEWER
}
```

### Display Names (sidebar)

| Internal Role     | UI Label            |
| ----------------- | ------------------- |
| `SUPER_ADMIN`     | Super Admin         |
| `ADMIN`           | Admin               |
| `SALES_MANAGER`   | Senior Consultant   |
| `SALES_AGENT`     | Consultant          |
| `VIEWER`          | Junior Consultant   |

Source: `src/components/layout/sidebar.tsx`.

---

## 2. Role Hierarchy

Defined in `src/lib/auth.ts`:

```typescript
export const roleHierarchy: Record<UserRole, number> = {
  SUPER_ADMIN:   5,
  ADMIN:         4,
  SALES_MANAGER: 3,
  SALES_AGENT:   2,
  VIEWER:        1,
};
```

### Helpers

- `hasRole(userRole, requiredRoles[])` — exact-role match.
- `hasMinimumRole(userRole, minimumRole)` — hierarchy comparison.
- `canAccessOffice(userRole, userOffice, targetOffice)` — `SUPER_ADMIN` bypasses office scoping; everyone else is restricted to their assigned office.

---

## 3. Role Summary

| Role            | Scope               | Can Modify Data   | Can Manage Users   | Can View Analytics |
| --------------- | ------------------- | ----------------- | ------------------ | ------------------ |
| `SUPER_ADMIN`   | All offices, all data | Everything       | All roles          | All                |
| `ADMIN`         | All offices         | Everything except SUPER_ADMIN data | ADMIN / SALES_MANAGER / SALES_AGENT | All |
| `SALES_MANAGER` | Own data + team     | Own records + team-level | View only       | Team & own         |
| `SALES_AGENT`   | Own assigned data   | Own records only  | No                 | Own only           |
| `VIEWER`        | Read-only on assigned data | No (read-only) | No              | No                 |

---

## 4. Sidebar Navigation Access

Sidebar items are gated by `roles?: UserRole[]` on each `NavItem`. The filter rule (`src/components/layout/sidebar.tsx`):

```typescript
const visibleItems = section.items.filter((item) => {
  if (!item.roles) return true;
  return item.roles.includes(userRole) || userRole === "SUPER_ADMIN";
});
```

`SUPER_ADMIN` always sees every item regardless of the `roles` array.

| Section     | Item              | SUPER_ADMIN | ADMIN | SALES_MANAGER | SALES_AGENT | VIEWER |
| ----------- | ----------------- | :---------: | :---: | :-----------: | :---------: | :----: |
| Main        | Dashboard         | ✓           | ✓     | ✓             | ✓           | ✓      |
| Pipeline    | Leads             | ✓           | ✓     | ✓             | ✓           | ✗      |
| Pipeline    | Deals             | ✓           | ✓     | ✓             | ✓           | ✗      |
| Contacts    | Clients           | ✓           | ✓     | ✓             | ✓           | ✗      |
| Contacts    | Enquiries         | ✓           | ✓     | ✓             | ✓           | ✗      |
| Properties  | Properties        | ✓           | ✓     | ✓             | ✓           | ✓      |
| Properties  | Bookings          | ✓           | ✓     | ✓             | ✓           | ✓      |
| Finance     | Sales             | ✓           | ✓     | ✓             | ✓           | ✗      |
| Finance     | Payments          | ✓           | ✓     | ✓             | ✗           | ✗      |
| Finance     | Commissions       | ✓           | ✓     | ✓             | ✗           | ✗      |
| Citizenship | Applications      | ✓           | ✓     | ✓             | ✗           | ✗      |
| Activities  | Tasks             | ✓           | ✓     | ✓             | ✓           | ✓      |
| Activities  | Communications    | ✓           | ✓     | ✓             | ✗           | ✗      |
| Activities  | Chat              | ✓           | ✓     | ✓             | ✓           | ✗      |
| Activities  | Activity          | ✓           | ✓     | ✓             | ✓           | ✗      |
| Activities  | Documents         | ✓           | ✓     | ✓             | ✗           | ✗      |
| Analytics   | KPIs              | ✓           | ✓     | ✓             | ✗           | ✗      |
| Analytics   | Agent Performance | ✓           | ✓     | ✓             | ✗           | ✗      |
| Analytics   | Reports           | ✓           | ✓     | ✓             | ✗           | ✗      |
| Analytics   | Campaigns         | ✓           | ✓     | ✓             | ✗           | ✗      |
| Analytics   | Leaderboards      | ✓           | ✓     | ✓             | ✗           | ✗      |
| Admin       | Users             | ✓           | ✓     | ✓ (view)      | ✗           | ✗      |
| Admin       | Teams             | ✓           | ✓     | ✗             | ✗           | ✗      |
| Admin       | Audit Log         | ✓           | ✓     | ✗             | ✗           | ✗      |
| Admin       | Email Templates   | ✓           | ✓     | ✗             | ✗           | ✗      |
| Admin       | Automation        | ✓           | ✓     | ✗             | ✗           | ✗      |
| Admin       | Pipelines         | ✓           | ✓     | ✗             | ✗           | ✗      |
| Admin       | Commission Setup  | ✓           | ✓     | ✗             | ✗           | ✗      |
| Admin       | Lead Routing      | ✓           | ✓     | ✗             | ✗           | ✗      |
| Admin       | Import / Export   | ✓           | ✓     | ✗             | ✗           | ✗      |
| Admin       | AI                | ✓           | ✗     | ✗             | ✗           | ✗      |
| Admin       | Integrations      | ✓           | ✗     | ✗             | ✗           | ✗      |
| Admin       | CRM Settings      | ✓           | ✗     | ✗             | ✗           | ✗      |
| Admin       | Settings (profile)| ✓           | ✓     | ✓             | ✓           | ✓      |

The "Add Lead" quick-action button in the sidebar is hidden for `VIEWER`.

---

## 5. Page-Level Access Guards

Standard guard pattern at the top of every protected page:

```typescript
const session = (await auth()) as ExtendedSession | null;
if (!session?.user) return null;

if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
  return (
    <div className="py-12 text-center">
      <p className="text-gray-500">You don't have permission to view this page.</p>
    </div>
  );
}
```

| Page Route                       | Allowed Roles                |
| -------------------------------- | ---------------------------- |
| `/settings/audit`                | `SUPER_ADMIN`, `ADMIN`       |
| `/settings/email-templates`      | `SUPER_ADMIN`, `ADMIN`       |
| `/settings/automation`           | `SUPER_ADMIN`, `ADMIN`       |
| `/settings/pipelines`            | `SUPER_ADMIN`, `ADMIN`       |
| `/settings/commission-setup`     | `SUPER_ADMIN`, `ADMIN`       |
| `/settings/teams`                | `SUPER_ADMIN`, `ADMIN`       |
| `/settings/ai`                   | `SUPER_ADMIN` only           |
| `/settings/integrations`         | `SUPER_ADMIN` only           |
| `/settings/crm`                  | `SUPER_ADMIN` only           |
| `/settings/import-export`        | `SUPER_ADMIN` only           |

---

## 6. Server Action Permissions

All server actions in `src/lib/actions/` follow this prelude:

```typescript
const session = (await auth()) as ExtendedSession | null;
if (!session?.user) throw new Error("Unauthorized");
```

The role-specific checks below are layered on top.

### 6.1 Users (`users.ts`)
- `getUsers`: `SUPER_ADMIN` and `ADMIN` only.
- `ADMIN` cannot see `SUPER_ADMIN` or `VIEWER` users in lists.
- `createUser` / `updateUser`: `ADMIN` may only create or assign roles in `{ADMIN, SALES_MANAGER, SALES_AGENT}`. Creating/promoting to `SUPER_ADMIN` or `VIEWER` requires `SUPER_ADMIN`.

### 6.2 Audit (`audit.ts`)
- `getAuditLogs`: `SUPER_ADMIN` and `ADMIN` only.

### 6.3 Teams (`teams.ts`)
- `createTeam` / `updateTeam` / `deleteTeam`: `SUPER_ADMIN` and `ADMIN` only.

### 6.4 Commissions (`commissions.ts`)
- `getCommissions`: `SUPER_ADMIN` sees all; everyone else is filtered by `agentId === session.user.id`.
- `createCommission` / `approveCommission`: `SUPER_ADMIN` and `ADMIN` only.

### 6.5 Payments (`payments.ts`)
- Non-`SUPER_ADMIN` users are filtered to payments on deals they own (`deal.ownerId === session.user.id`).

### 6.6 Leads (`leads.ts`)
- `VIEWER` is blocked from: `createLead`, `updateLead`, `deleteLead`, `changeStage`, `archive`, `addNote`, `changeScore`.
- `SALES_AGENT` and `SALES_MANAGER` are scoped to leads they own (`ownerId === session.user.id`).

### 6.7 Deals (`deals.ts`)
- Non-`SUPER_ADMIN` users see only deals where `ownerId === session.user.id`.

### 6.8 Clients (`clients.ts`)
- Non-`SUPER_ADMIN` users see only clients where `assignedAgentId === session.user.id`.
- Client deletion is `SUPER_ADMIN` only (also enforced in `clients-table.tsx`).

### 6.9 Tasks (`tasks.ts`)
- Non-`SUPER_ADMIN` users see only tasks where `assigneeId === session.user.id`.

### 6.10 Bookings (`bookings.ts`)
- `SALES_AGENT` is scoped to own bookings.
- `VIEWER` is blocked from: create, update, reschedule, complete.

### 6.11 Citizenship (`citizenship.ts`)
- `SALES_AGENT` has restricted write access.
- `VIEWER` is blocked from: create application, update application, add/update milestone, add/update family member, upload document.

### 6.12 KPIs / Agent Performance (`kpis.ts`, `agent-performance.ts`)
- `SUPER_ADMIN` and `ADMIN` see org-wide metrics.
- `SALES_MANAGER` sees team metrics.
- `SALES_AGENT` sees only their own metrics.
- `VIEWER` has no access.

---

## 7. Data Visibility Pattern

Recurring filter pattern for "scope to own data":

```typescript
if (session.user.role !== "SUPER_ADMIN") {
  where.assignedAgentId = session.user.id; // or ownerId / assigneeId / agentId
}
```

Applied to:

| Entity      | Scoping Field                  |
| ----------- | ------------------------------ |
| Clients     | `assignedAgentId`              |
| Leads       | `ownerId`                      |
| Deals       | `ownerId`                      |
| Tasks       | `assigneeId`                   |
| Commissions | `agentId`                      |
| Payments    | `deal.ownerId`                 |
| Bookings    | agent-scoped (`SALES_AGENT`)   |

---

## 8. Capability Matrix

Legend: ✓ All = sees all records. ✓ Own = sees only assigned/owned records. ✗ = blocked.

| Capability                  | SUPER_ADMIN | ADMIN       | SALES_MANAGER | SALES_AGENT | VIEWER |
| --------------------------- | :---------: | :---------: | :-----------: | :---------: | :----: |
| View Dashboard              | ✓           | ✓           | ✓             | ✓           | ✓      |
| View Leads                  | ✓ All       | ✓ All       | ✓ Own         | ✓ Own       | ✗      |
| Create Lead                 | ✓           | ✓           | ✓             | ✓           | ✗      |
| Edit Lead                   | ✓ All       | ✓ All       | ✓ Own         | ✓ Own       | ✗      |
| Delete Lead                 | ✓           | ✓           | ✓             | ✗           | ✗      |
| View Deals                  | ✓ All       | ✓ All       | ✓ Own         | ✓ Own       | ✗      |
| Create / Edit Deal          | ✓           | ✓           | ✓ Own         | ✓ Own       | ✗      |
| View Clients                | ✓ All       | ✓ All       | ✓ Own         | ✓ Own       | ✗      |
| Create Client               | ✓           | ✓           | ✓             | ✓           | ✗      |
| Delete Client               | ✓           | ✗           | ✗             | ✗           | ✗      |
| View Payments               | ✓ All       | ✓ All       | ✓ Own         | ✗           | ✗      |
| Create Payment              | ✓           | ✓           | ✓             | ✗           | ✗      |
| View Commissions            | ✓ All       | ✓ All       | ✓ Own         | ✗           | ✗      |
| Create Commission           | ✓           | ✓           | ✗             | ✗           | ✗      |
| Approve Commission          | ✓           | ✓           | ✗             | ✗           | ✗      |
| View Bookings               | ✓ All       | ✓ All       | ✓ Own         | ✓ Own       | ✓      |
| Create / Edit Booking       | ✓           | ✓           | ✓             | ✓ Own       | ✗      |
| View Citizenship            | ✓ All       | ✓ All       | ✓ Own         | ✓ Own       | ✓      |
| Create Citizenship          | ✓           | ✓           | ✓             | ✓           | ✗      |
| View Communications         | ✓ All       | ✓ All       | ✓ Own         | ✗           | ✗      |
| View Documents              | ✓ All       | ✓ All       | ✓ Own         | ✗           | ✗      |
| View Tasks                  | ✓ All       | ✓ All       | ✓ Own         | ✓ Own       | ✓ Own  |
| View KPIs                   | ✓ All       | ✓ All       | ✓ Team        | ✗           | ✗      |
| View Agent Performance      | ✓ All       | ✓ All       | ✓ Team        | ✗           | ✗      |
| View Reports / Leaderboards | ✓           | ✓           | ✓             | ✗           | ✗      |
| View Audit Log              | ✓           | ✓           | ✗             | ✗           | ✗      |
| Manage Users                | ✓ All roles | ✓ Limited   | ✗             | ✗           | ✗      |
| Manage Teams                | ✓           | ✓           | ✗             | ✗           | ✗      |
| Manage Email Templates      | ✓           | ✓           | ✗             | ✗           | ✗      |
| Manage Automation           | ✓           | ✓           | ✗             | ✗           | ✗      |
| Manage Pipelines            | ✓           | ✓           | ✗             | ✗           | ✗      |
| Manage Lead Routing         | ✓           | ✓           | ✗             | ✗           | ✗      |
| Import / Export             | ✓           | ✓           | ✗             | ✗           | ✗      |
| Manage AI Settings          | ✓           | ✗           | ✗             | ✗           | ✗      |
| Manage Integrations         | ✓           | ✗           | ✗             | ✗           | ✗      |
| Manage CRM Settings         | ✓           | ✗           | ✗             | ✗           | ✗      |

---

## 9. Edge Cases & Important Notes

1. **`ADMIN` cannot manage `SUPER_ADMIN` users** — `users.ts` filters `SUPER_ADMIN` out of the user list and blocks role assignment to `SUPER_ADMIN`.
2. **`ADMIN` cannot see or manage `VIEWER` users** in user-management lists.
3. **`VIEWER` is read-only across the app** — every create/update/delete server action throws `Unauthorized` for this role.
4. **Office scoping** — `canAccessOffice` further restricts non-`SUPER_ADMIN` users to data in their own `office`. `SUPER_ADMIN` bypasses this.
5. **"Add Lead" quick-action** in sidebar is hidden for `VIEWER` (`sidebar.tsx`).
6. **Client delete button** in `clients-table.tsx` is gated by `userRole === "SUPER_ADMIN"`.
7. **Enquiries consultant filter** is `SUPER_ADMIN`-only on the enquiries page.
8. **Reports / Leaderboards / Campaigns** require `SALES_MANAGER` minimum.
9. **AI / Integrations / CRM Settings** are `SUPER_ADMIN`-only — even `ADMIN` is excluded.

---

## 10. Source File Reference

| Concern                         | File                                            |
| ------------------------------- | ----------------------------------------------- |
| Role enum                       | `prisma/schema.prisma`                          |
| Auth + role helpers + hierarchy | `src/lib/auth.ts`                               |
| Sidebar gating                  | `src/components/layout/sidebar.tsx`             |
| Server actions (RBAC)           | `src/lib/actions/*.ts`                          |
| Page guards                     | `src/app/(dashboard)/settings/**/page.tsx`      |
| Client UI gating                | `src/app/(dashboard)/clients/clients-table.tsx` |
