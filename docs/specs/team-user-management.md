# Team & User Management Specification

> Generated from interview session on 2026-01-13

## Overview

Implementation of project-level member management and admin user management for Lingx.

### Scope

- **Project member management** - invite, role management, removal
- **Admin panel** - user list, disable/enable, impersonation, audit logs
- **No team/organization hierarchy** - projects are standalone entities

---

## 1. Permission Model

### 1.1 Role Hierarchy

```
OWNER > MANAGER > DEVELOPER
```

| Role          | Capabilities                                                    |
| ------------- | --------------------------------------------------------------- |
| **DEVELOPER** | Read/write translations, keys, branches                         |
| **MANAGER**   | + Project settings, invite DEVELOPERs, revoke DEVELOPER invites |
| **OWNER**     | + Delete project, manage all roles, transfer ownership          |

### 1.2 Role Management Rules

| Actor     | Can Manage                            |
| --------- | ------------------------------------- |
| OWNER     | All roles (OWNER, MANAGER, DEVELOPER) |
| MANAGER   | DEVELOPER only                        |
| DEVELOPER | None                                  |

### 1.3 Ownership Constraints

- **Minimum one OWNER**: Block removal of last OWNER
- **Self-demotion blocked**: Sole OWNER cannot demote themselves
- **Explicit transfer**: Dedicated "Transfer Ownership" action (not just role change)
- **Multiple OWNERs allowed**: A project can have multiple owners

### 1.4 Global Admin Role

- Global `User.role = ADMIN` does **NOT** grant automatic project access
- ADMINs must be added to projects like any other user
- ADMIN role only grants access to admin panel features

---

## 2. Invitation System

### 2.1 Invitation Flow

```
MANAGER/OWNER sends invite
    → Email sent with token link
    → Recipient clicks link
    → If logged in with matching email → added to project
    → If not logged in → redirect to login, then add
    → If no account → redirect to register with email prefilled
```

### 2.2 Invitation Rules

| Rule                  | Value                                      |
| --------------------- | ------------------------------------------ |
| Token expiry          | 7 days                                     |
| Multi-project invites | Yes (separate tokens per project)          |
| Email validation      | Must accept with the invited email address |
| Existing users        | Auto-link on accept (no special flow)      |
| Re-invite             | Allowed after expiry or revocation         |

### 2.3 Rate Limits

| Limit Type        | Value                   |
| ----------------- | ----------------------- |
| Per project       | 20 invitations per hour |
| Per user (sender) | 50 invitations per day  |

### 2.4 Bulk Operations

- **Bulk invite**: Supported (multiple emails in one request)
- **Bulk role change**: Not supported
- **Bulk remove**: Not supported

---

## 3. Member Removal

### 3.1 Removal Behavior

- **Access revocation**: Immediate, complete removal from project
- **Data preservation**: User's past contributions remain in project
- **Activity attribution**: Contributions stay attributed to user (not anonymized)
- **Post-removal access**: None - removed user cannot see project at all

### 3.2 Confirmation UX

- Simple confirmation dialog: "Remove [name] from [project]?"
- No need to type username

---

## 4. Admin Panel

### 4.1 User Management Features

| Feature      | Description                                 |
| ------------ | ------------------------------------------- |
| List users   | Paginated, filterable by role/status        |
| View details | User profile, projects, recent activity     |
| Disable user | Block login, immediate session invalidation |
| Enable user  | Restore access                              |
| Impersonate  | Generate 1-hour token to act as user        |

### 4.2 Disable User Behavior

- **Session handling**: Immediate invalidation of all tokens
- **Data handling**: Anonymize user in activity logs ("Deleted User")
- **Reversible**: Enable restores access (but anonymized data stays anonymized)

### 4.3 Impersonation

- **Duration**: 1-hour time-limited token
- **Scope**: Full access as that user
- **Audit**: All impersonated actions logged with admin's identity
- **Use case**: Support debugging, user issue investigation

### 4.4 Audit Logging

Full audit log for admin actions:

```typescript
interface AuditLog {
  id: string;
  adminId: string;           // Who performed action
  action: AuditAction;       // What action
  targetType: 'USER' | 'PROJECT' | 'INVITATION';
  targetId: string;          // What was affected
  beforeState: JsonValue;    // State before change
  afterState: JsonValue;     // State after change
  metadata: JsonValue;       // Additional context
  ipAddress: string;
  userAgent: string;
  createdAt: DateTime;
}

enum AuditAction {
  USER_DISABLED
  USER_ENABLED
  USER_IMPERSONATED
  // ... other admin actions
}
```

---

## 5. Email Notifications

### 5.1 Member Events (all trigger emails)

| Event                 | Recipient      | Email Content                           |
| --------------------- | -------------- | --------------------------------------- |
| Invitation sent       | Invitee        | Invite link, project name, inviter name |
| Invitation accepted   | Inviter        | "[Name] joined [project]"               |
| Role changed          | Affected user  | "Your role changed to [role]"           |
| Member removed        | Removed user   | "You were removed from [project]"       |
| Ownership transferred | New owner      | "You are now owner of [project]"        |
| Ownership transferred | Previous owner | "Ownership transferred to [name]"       |

### 5.2 Admin Events

| Event            | Recipient                            |
| ---------------- | ------------------------------------ |
| Account disabled | Affected user (if email still valid) |
| Account enabled  | Affected user                        |

---

## 6. Database Schema

### 6.1 New Models

```prisma
model ProjectInvitation {
  id          String      @id @default(cuid())
  projectId   String
  email       String
  role        ProjectRole @default(DEVELOPER)
  token       String      @unique
  invitedById String
  expiresAt   DateTime
  acceptedAt  DateTime?
  revokedAt   DateTime?
  createdAt   DateTime    @default(now())

  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  invitedBy   User        @relation("SentInvitations", fields: [invitedById], references: [id])

  @@unique([projectId, email])
  @@index([token])
  @@index([email])
  @@index([projectId])
}

model AuditLog {
  id          String      @id @default(cuid())
  adminId     String
  action      String
  targetType  String
  targetId    String
  beforeState Json?
  afterState  Json?
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())

  admin       User        @relation(fields: [adminId], references: [id])

  @@index([adminId])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

### 6.2 User Model Updates

```prisma
model User {
  // ... existing fields

  isDisabled    Boolean   @default(false)
  disabledAt    DateTime?
  disabledById  String?

  // Relations
  disabledBy    User?     @relation("DisabledUsers", fields: [disabledById], references: [id])
  disabledUsers User[]    @relation("DisabledUsers")
  sentInvitations    ProjectInvitation[] @relation("SentInvitations")
  auditLogs     AuditLog[]
}
```

### 6.3 Migration Notes

- Existing projects: Creator already set as OWNER (verify in current code)
- No data migration needed for existing users

---

## 7. API Endpoints

### 7.1 Member Management

| Method | Endpoint                              | Auth           | Description                |
| ------ | ------------------------------------- | -------------- | -------------------------- |
| GET    | `/projects/:id/members`               | Any member     | List members               |
| GET    | `/projects/:id/invitations`           | MANAGER+       | List pending invitations   |
| POST   | `/projects/:id/invitations`           | MANAGER+       | Send invitation(s)         |
| DELETE | `/projects/:id/invitations/:inviteId` | MANAGER+       | Revoke invitation          |
| PATCH  | `/projects/:id/members/:userId/role`  | Per role rules | Change role                |
| DELETE | `/projects/:id/members/:userId`       | OWNER          | Remove member              |
| POST   | `/projects/:id/transfer-ownership`    | OWNER          | Transfer to another member |

### 7.2 Invitation Acceptance

| Method | Endpoint                     | Auth          | Description            |
| ------ | ---------------------------- | ------------- | ---------------------- |
| GET    | `/invitations/:token`        | Public        | Get invitation details |
| POST   | `/invitations/:token/accept` | Authenticated | Accept invitation      |

### 7.3 Admin Panel

| Method | Endpoint                       | Auth  | Description             |
| ------ | ------------------------------ | ----- | ----------------------- |
| GET    | `/admin/users`                 | ADMIN | List users (paginated)  |
| GET    | `/admin/users/:id`             | ADMIN | User details            |
| GET    | `/admin/users/:id/activity`    | ADMIN | User activity           |
| POST   | `/admin/users/:id/disable`     | ADMIN | Disable account         |
| POST   | `/admin/users/:id/enable`      | ADMIN | Enable account          |
| POST   | `/admin/users/:id/impersonate` | ADMIN | Get impersonation token |
| GET    | `/admin/audit-logs`            | ADMIN | View audit logs         |

---

## 8. UI Components

### 8.1 Project Settings - Members Tab

```
┌─────────────────────────────────────────────────────┐
│ Members                              [Invite Member]│
├─────────────────────────────────────────────────────┤
│ Name              Email              Role    Actions│
│ ─────────────────────────────────────────────────── │
│ Alice Smith       alice@ex.com       OWNER   •••    │
│ Bob Jones         bob@ex.com         MANAGER [▼] ✕  │
│ Carol White       carol@ex.com       DEV     [▼] ✕  │
├─────────────────────────────────────────────────────┤
│ Pending Invitations                                 │
│ ─────────────────────────────────────────────────── │
│ david@ex.com      DEVELOPER   Expires in 5d    ✕   │
└─────────────────────────────────────────────────────┘
```

### 8.2 Invite Dialog

```
┌─────────────────────────────────────┐
│ Invite Members                   ✕  │
├─────────────────────────────────────┤
│ Email addresses (one per line)      │
│ ┌─────────────────────────────────┐ │
│ │ user1@example.com               │ │
│ │ user2@example.com               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Role: [DEVELOPER ▼]                 │
│                                     │
│           [Cancel] [Send Invites]   │
└─────────────────────────────────────┘
```

### 8.3 Admin Panel - Users

```
┌─────────────────────────────────────────────────────┐
│ Users                    [Search...] [Filter ▼]     │
├─────────────────────────────────────────────────────┤
│ User            Email           Role    Status  Act │
│ ─────────────────────────────────────────────────── │
│ Alice Smith     alice@ex.com    USER    Active  ••• │
│ Bob Jones       bob@ex.com      ADMIN   Active  ••• │
│ Carol White     carol@ex.com    USER    Disabled••• │
├─────────────────────────────────────────────────────┤
│ ← 1 2 3 ... 10 →                                    │
└─────────────────────────────────────────────────────┘
```

---

## 9. Implementation Checklist

### Phase 1: Database

- [ ] Add ProjectInvitation model
- [ ] Add AuditLog model
- [ ] Update User model (disable fields)
- [ ] Create migration
- [ ] Verify existing projects have OWNER

### Phase 2: Member Backend

- [ ] Create `modules/member/` CQRS module
- [ ] `ListProjectMembersQuery`
- [ ] `ListProjectInvitationsQuery`
- [ ] `InviteMemberCommand` (with bulk support)
- [ ] `AcceptInvitationCommand`
- [ ] `RevokeInvitationCommand`
- [ ] `UpdateMemberRoleCommand`
- [ ] `RemoveMemberCommand`
- [ ] `TransferOwnershipCommand`
- [ ] Rate limiting middleware
- [ ] Email notifications (all events)

### Phase 3: Member Routes

- [ ] `GET /projects/:id/members`
- [ ] `GET /projects/:id/invitations`
- [ ] `POST /projects/:id/invitations`
- [ ] `DELETE /projects/:id/invitations/:id`
- [ ] `PATCH /projects/:id/members/:userId/role`
- [ ] `DELETE /projects/:id/members/:userId`
- [ ] `POST /projects/:id/transfer-ownership`
- [ ] `GET /invitations/:token`
- [ ] `POST /invitations/:token/accept`

### Phase 4: Admin Backend

- [ ] Create `modules/admin/` CQRS module
- [ ] `ListUsersQuery`
- [ ] `GetUserDetailsQuery`
- [ ] `GetUserActivityQuery`
- [ ] `DisableUserCommand` (with session invalidation)
- [ ] `EnableUserCommand`
- [ ] `ImpersonateUserCommand`
- [ ] `GetAuditLogsQuery`
- [ ] User anonymization on disable

### Phase 5: Admin Routes

- [ ] `GET /admin/users`
- [ ] `GET /admin/users/:id`
- [ ] `GET /admin/users/:id/activity`
- [ ] `POST /admin/users/:id/disable`
- [ ] `POST /admin/users/:id/enable`
- [ ] `POST /admin/users/:id/impersonate`
- [ ] `GET /admin/audit-logs`

### Phase 6: Member UI

- [ ] Members tab in project settings
- [ ] Member list component
- [ ] Invite dialog (bulk support)
- [ ] Role dropdown component
- [ ] Remove confirmation dialog
- [ ] Transfer ownership dialog
- [ ] Pending invitations list
- [ ] Accept invitation page (`/invite/[token]`)

### Phase 7: Admin UI

- [ ] Admin layout with nav guard
- [ ] Users list page with filters
- [ ] User details page
- [ ] Disable/enable confirmation
- [ ] Impersonation flow
- [ ] Audit log viewer

---

## 10. Open Questions Resolved

| Question                   | Decision  | Rationale                       |
| -------------------------- | --------- | ------------------------------- |
| Team hierarchy?            | No        | Keep simple, project-level only |
| Multiple OWNERs?           | Yes       | Allows shared responsibility    |
| Email for existing users?  | Auto-link | Smooth UX                       |
| Activity feed for members? | No        | Keep focused on content         |
| Admin auto-access?         | No        | Maintain project isolation      |

---

## 11. Security Considerations

1. **Token generation**: Use `crypto.randomBytes(32).toString('hex')` for invite tokens
2. **Rate limiting**: Implement at route level before handler
3. **Session invalidation**: Add `isDisabled` check to auth middleware
4. **Audit logging**: Log before/after state for all admin actions
5. **Impersonation tracking**: All actions during impersonation logged with admin ID
6. **Email validation**: Verify email matches invitation on accept
