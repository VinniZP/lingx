# Team & User Management - Implementation Tasks

> Task breakdown for [team-user-management.md](./team-user-management.md)

## Dependency Graph

```
Epic 1 (Database) ─────────────────────────────────────┐
        │                                              │
        ▼                                              ▼
Epic 2 (Member Backend) ───────────────────► Epic 3 (Admin Backend)
        │                                              │
        ▼                                              ▼
Epic 4 (Member UI) ────────────────────────► Epic 5 (Admin UI)
        │                                              │
        ├──────────────► Epic 6 (Testing) ◄────────────┤
        │                                              │
        └──────► Epic 7 (RBAC Integration) ◄───────────┘
                        │
                        ▼
               (Verifies Epic 2 + Epic 4)
```

---

## Epic 1: Database Foundation ✅

### 1.1 Schema Updates `[prerequisite for all]`

- [x] Add `ProjectInvitation` model to schema.prisma
- [x] Update `User` model with disable fields (`isDisabled`, `disabledAt`, `disabledById`)
- [x] Add relations: `User.sentInvitations`, `User.disabledBy`
- [x] Run `prisma migrate dev` to create migration

### 1.2 Data Verification

- [x] Write script/query to verify all existing projects have at least one OWNER
- [x] Fix any orphan projects if found (none found)

---

## Epic 2: Member Management Backend ✅

### Phase 2A: Foundation ✅ `[depends on: 1.1]`

#### 2A.1 Shared Validation Schemas

- [x] Create `packages/shared/src/validation/member.schema.ts`:
  - `projectRoleSchema` - enum (OWNER, MANAGER, DEVELOPER)
  - `inviteMemberSchema` (emails array, role - excludes OWNER)
  - `updateMemberRoleSchema` (role)
  - `transferOwnershipSchema` (newOwnerId, keepOwnership)
- [x] Add to `packages/shared/src/validation/response.schema.ts`:
  - `projectMemberResponseSchema`
  - `projectMemberListResponseSchema`
  - `projectInvitationResponseSchema`
  - `projectInvitationListResponseSchema`
  - `invitationDetailsResponseSchema` (public view)

#### 2A.2 Repository Layer

- [x] Create `modules/member/repositories/member.repository.ts`
  - `findProjectMembers(projectId)` - list all members with user details
  - `findMemberByUserId(projectId, userId)` - get single member
  - `updateMemberRole(projectId, userId, role)` - change role
  - `removeMember(projectId, userId)` - delete membership
  - `countOwners(projectId)` - for ownership validation
  - `addMember(projectId, userId, role)` - create membership
- [x] Create `modules/member/repositories/invitation.repository.ts`
  - `findPendingByProject(projectId)` - list pending invitations
  - `findByToken(token)` - lookup by token with project/inviter details
  - `findPendingByEmail(projectId, email)` - check existing invite
  - `create(invitation)` - create new invitation
  - `markAccepted(id)` - set acceptedAt
  - `markRevoked(id)` - set revokedAt
  - `countRecentByProject(projectId, since)` - for rate limiting
  - `countRecentByUser(userId, since)` - for rate limiting
- [x] Write repository unit tests

---

### Phase 2B: Read Operations ✅ `[depends on: 2A]`

#### 2B.1 Member Queries

- [x] `ListProjectMembersQuery` + handler
  - Input: projectId, userId (requester)
  - Verify membership, return member list sorted alphabetically
- [x] `ListProjectInvitationsQuery` + handler
  - Input: projectId, userId
  - Verify MANAGER+ role, return pending invitations only
- [x] `GetInvitationByTokenQuery` + handler
  - Input: token (public, no auth)
  - Return: project name, slug, role, inviter name, expiry
  - Error if: expired, accepted, or revoked
- [x] Write query handler unit tests

---

### Phase 2C: Member Commands ✅ `[depends on: 2A]`

#### 2C.1 Role Management

- [x] `UpdateMemberRoleCommand` + handler
  - Input: projectId, targetUserId, newRole, actorId
  - Validate: actor has permission (OWNER for all, MANAGER for DEV only)
  - Validate: not demoting last OWNER
  - Validate: OWNER self-demotion blocked if sole owner
  - Emit: `MemberRoleChangedEvent`

#### 2C.2 Member Removal

- [x] `RemoveMemberCommand` + handler
  - Input: projectId, targetUserId, actorId
  - Validate: actor is OWNER
  - Validate: not removing last OWNER
  - Emit: `MemberRemovedEvent`
- [x] `LeaveProjectCommand` + handler
  - Input: projectId, userId
  - Validate: user is member
  - Validate: if OWNER, cannot leave if sole OWNER
  - Emit: `MemberLeftEvent`

#### 2C.3 Ownership Transfer

- [x] `TransferOwnershipCommand` + handler
  - Input: projectId, newOwnerId, currentOwnerId, keepOwnership
  - Validate: actor is current OWNER
  - Validate: target is existing member
  - Set target to OWNER
  - If keepOwnership=false AND multiple owners, demote self to MANAGER
  - Emit: `OwnershipTransferredEvent`
- [x] Write command handler unit tests

---

### Phase 2D: Invitation Commands ✅ `[depends on: 2A]`

#### 2D.1 Invitation Management

- [x] `InviteMemberCommand` + handler
  - Input: projectId, emails[], role, inviterId
  - Validate: MANAGER+ role for inviter
  - Validate: MANAGER can only invite as DEVELOPER
  - Validate: rate limits (20/project/hr, 50/user/day)
  - Generate secure tokens (`crypto.randomBytes(32).toString('hex')`)
  - Set expiry (7 days)
  - Skip already-members, skip existing pending invites
  - Emit: `MemberInvitedEvent` for each
  - Return: `{ sent: string[], skipped: string[], errors: string[] }`
- [x] `AcceptInvitationCommand` + handler
  - Input: token, userId
  - Validate: token exists and not expired/accepted/revoked
  - Validate: user email matches invitation email
  - Create ProjectMember record
  - Mark invitation accepted
  - Emit: `InvitationAcceptedEvent`
- [x] `RevokeInvitationCommand` + handler
  - Input: invitationId, projectId, actorId
  - Validate: MANAGER+ role (MANAGER can revoke any DEVELOPER invite)
  - Mark invitation revoked
- [x] Write invitation command unit tests

---

### Phase 2E: Routes & Integration ✅ `[depends on: 2B, 2C, 2D]`

#### 2E.1 Member Routes

- [x] Create `routes/members.ts` (mounted under projects)
  - `GET /projects/:id/members` → ListProjectMembersQuery
  - `GET /projects/:id/invitations` → ListProjectInvitationsQuery
  - `POST /projects/:id/invitations` → InviteMemberCommand
  - `DELETE /projects/:id/invitations/:inviteId` → RevokeInvitationCommand
  - `PATCH /projects/:id/members/:userId/role` → UpdateMemberRoleCommand
  - `DELETE /projects/:id/members/:userId` → RemoveMemberCommand
  - `POST /projects/:id/leave` → LeaveProjectCommand
  - `POST /projects/:id/transfer-ownership` → TransferOwnershipCommand

#### 2E.2 Public Invitation Routes

- [x] Create `routes/invitations.ts` (public routes)
  - `GET /invitations/:token` → GetInvitationByTokenQuery
  - `POST /invitations/:token/accept` → AcceptInvitationCommand (requires auth)

#### 2E.3 Module Registration

- [x] Create `modules/member/index.ts` with all registrations
- [x] Register member module in `plugins/cqrs.ts`
- [x] Register routes in `app.ts`
- [x] Create `dto/member.dto.ts` for response transformation

---

### Phase 2F: Events & Activity ✅ `[depends on: 2C, 2D]`

#### 2F.1 Event Definitions ✅

- [x] Create event classes in `modules/member/events/`:
  - `MemberRoleChangedEvent(projectId, userId, oldRole, newRole, actorId)`
  - `MemberRemovedEvent(projectId, userId, actorId)`
  - `MemberLeftEvent(projectId, userId)`
  - `MemberInvitedEvent(invitation, inviterId)`
  - `InvitationAcceptedEvent(invitation, userId)`
  - `OwnershipTransferredEvent(projectId, newOwnerId, previousOwnerId)`

#### 2F.2 Activity Handler ✅

- [x] Create `MemberActivityHandler` to log all events
- [x] Register event handlers in module index
- [x] Write activity handler tests (18 tests)

#### 2F.3 Email Notifications (Deferred to Epic 7)

- [ ] Create email templates
- [ ] Add email event handlers

---

## Epic 3: Admin Panel Backend ✅

### Phase 3A: Foundation ✅ `[depends on: 1.1]`

#### 3A.1 Admin Shared Schemas

- [x] Create `packages/shared/src/validation/admin.schema.ts`:
  - `listUsersQuerySchema` (search, role, status, page, limit)
  - `adminUserResponseSchema` (list item with projectCount)
  - `adminUserDetailsResponseSchema` (full user + projects + stats + disabledBy)
  - `impersonationTokenResponseSchema` (token, expiresAt)
- [x] Export from `packages/shared/src/validation/index.ts`

#### 3A.2 Admin Repository

- [x] Create `modules/admin/repositories/admin.repository.ts`:
  - `findAllUsers(filters, pagination)` - paginated user list with project counts
  - `findUserById(id)` - user with projects and disabledBy relation
  - `findUserActivity(userId, limit)` - recent activity entries
  - `updateUserDisabled(userId, isDisabled, disabledById?)` - toggle disabled status
  - `anonymizeUserActivity(userId)` - replace name with "Deleted User" (GDPR)
- [x] Write repository unit tests (16 tests)

---

### Phase 3B: Read Operations ✅ `[depends on: 3A]`

#### 3B.1 Admin Queries

- [x] `ListUsersQuery` + handler
  - Input: filters (role, status, search), pagination, actorId
  - Validate: actor is ADMIN
  - Return: paginated users with project counts
- [x] `GetUserDetailsQuery` + handler
  - Input: userId, actorId
  - Validate: actor is ADMIN
  - Return: user + projects + stats + disabledBy info
- [x] `GetUserActivityQuery` + handler
  - Input: userId, limit (default 50), actorId
  - Validate: actor is ADMIN
  - Return: recent activity entries
- [x] Write query handler unit tests (18 tests)

---

### Phase 3C: Admin Commands ✅ `[depends on: 3A]`

#### 3C.1 Disable/Enable User

- [x] `DisableUserCommand` + handler
  - Input: targetUserId, actorId
  - Validate: actor is ADMIN
  - Validate: cannot disable self
  - Validate: cannot disable another ADMIN (safety protection)
  - Actions:
    1. Set isDisabled=true, disabledAt=now(), disabledById=actorId
    2. Delete all sessions for user (immediate logout)
    3. Anonymize user in activity logs (GDPR)
  - Emit: `UserDisabledEvent`
- [x] `EnableUserCommand` + handler
  - Input: targetUserId, actorId
  - Validate: actor is ADMIN
  - Actions: Set isDisabled=false, clear disabledAt/disabledById
  - Emit: `UserEnabledEvent`

#### 3C.2 Impersonation

- [x] `ImpersonateUserCommand` + handler
  - Input: targetUserId, actorId
  - Validate: actor is ADMIN
  - Validate: cannot impersonate self
  - Validate: target is not disabled
  - Actions:
    1. Generate 1-hour JWT with userId, impersonatedBy, purpose='impersonation'
  - Emit: `UserImpersonatedEvent` (audit trail)
  - Return: token, expiresAt
- [x] Write command handler unit tests (20 tests)

---

### Phase 3D: Session Invalidation ✅ `[depends on: 3C]`

> **Critical Security Fix**: `isDisabled` field was NOT validated anywhere - now fixed

#### 3D.1 Auth Middleware Update

- [x] Update `plugins/auth.ts` JWT validation:
  - After token verify, check `user.isDisabled`
  - If disabled, throw `ForbiddenError('Account is disabled')`
- [x] Update `plugins/auth.ts` API key validation:
  - After key lookup, check owner's `isDisabled` status
  - If disabled, throw `ForbiddenError('Account is disabled')`
- [x] Auth middleware tests pass (25 tests)

---

### Phase 3E: Events & Audit ✅ `[depends on: 3C]`

#### 3E.1 Event Definitions

- [x] Create event classes in `modules/admin/events/`:
  - `UserDisabledEvent(userId, actorId, anonymized)`
  - `UserEnabledEvent(userId, actorId)`
  - `UserImpersonatedEvent(targetUserId, actorId, tokenExpiry)`

#### 3E.2 Audit Handler

- [x] Events are emitted by command handlers
- [x] Event handler registration placeholder for future audit logging
- [ ] Create `AdminAuditHandler` to log all admin events to activity (future work)

---

### Phase 3F: Routes & Integration ✅ `[depends on: 3B, 3C, 3D, 3E]`

#### 3F.1 Admin Guard Middleware

- [x] Admin authorization handled by query/command handlers
  - Each handler validates actor is ADMIN role
  - Throws `ForbiddenError` if not admin

#### 3F.2 Admin Routes

- [x] Create `routes/admin.ts`:
  - `GET /api/admin/users` → ListUsersQuery
  - `GET /api/admin/users/:id` → GetUserDetailsQuery
  - `GET /api/admin/users/:id/activity` → GetUserActivityQuery
  - `POST /api/admin/users/:id/disable` → DisableUserCommand
  - `POST /api/admin/users/:id/enable` → EnableUserCommand
  - `POST /api/admin/users/:id/impersonate` → ImpersonateUserCommand

#### 3F.3 Module Registration

- [x] Create `modules/admin/index.ts` with all registrations
- [x] Register admin module in `plugins/cqrs.ts`
- [x] Register routes in `app.ts`

**Total: 54 unit tests passing for admin module**

---

### Permission Matrix (Admin Backend)

| Action             | ADMIN  | MANAGER | DEVELOPER |
| ------------------ | ------ | ------- | --------- |
| List all users     | ✅     | ❌      | ❌        |
| View user details  | ✅     | ❌      | ❌        |
| View user activity | ✅     | ❌      | ❌        |
| Disable user       | ✅\*   | ❌      | ❌        |
| Enable user        | ✅     | ❌      | ❌        |
| Impersonate user   | ✅\*\* | ❌      | ❌        |

\*Cannot disable self or other ADMINs
\*\*Cannot impersonate self or disabled users

---

## Epic 4: Member Management UI ✅

### Phase 4A: API Client ✅ `[depends on: Epic 2]`

- [x] Create `apps/web/src/lib/api/members.ts`:
  - `memberApi.list(projectId)` - list project members
  - `memberApi.updateRole(projectId, userId, role)` - change member role
  - `memberApi.remove(projectId, userId)` - remove member
  - `memberApi.leave(projectId)` - leave project
  - `memberApi.transferOwnership(projectId, data)` - transfer ownership
  - `memberApi.listInvitations(projectId)` - list pending invitations
  - `memberApi.invite(projectId, data)` - send invitations
  - `memberApi.revokeInvitation(projectId, invitationId)` - revoke invitation
  - `invitationApi.getByToken(token)` - get invitation details (public)
  - `invitationApi.accept(token)` - accept invitation

---

### Phase 4B: Members List Page ✅ `[depends on: 4A]`

#### 4B.1 Members Page

- [x] Create `app/(project)/projects/[projectId]/settings/members/page.tsx`
  - Page header with "Team Members" title
  - Members list section (visible to all members)
  - Pending invitations section (visible to MANAGER+)
  - Invite button (visible to MANAGER+)
  - Use `useQuery` for data fetching
  - Premium styling with `.island` containers
  - Danger zone section with Transfer Ownership (OWNER only)

#### 4B.2 Member Row Component

- [x] Create `_components/member-row.tsx`
  - Avatar with fallback initials (using shared `getInitials` utility)
  - Name + email display with "(You)" indicator for current user
  - Role selector (conditional based on permissions)
  - Remove button (OWNER only)
  - Leave button (for current user, if not sole OWNER)
  - "Joined X ago" timestamp

---

### Phase 4C: Invitation Components ✅ `[depends on: 4A]`

#### 4C.1 Invitation Row Component

- [x] Create `_components/invitation-row.tsx`
  - Show pending invitations with email, role, inviter, expiry
  - Expiry status with visual indicators (expired/expiring soon/normal)
  - Revoke button with loading state
  - Role badge with consistent styling

#### 4C.2 Invite Dialog

- [x] Create `_components/invite-dialog.tsx`
  - Textarea for multiple emails (one per line or comma-separated)
  - Role selector (MANAGER can only select DEVELOPER)
  - Validation with email format checking
  - Submit with `useMutation`
  - Show results: sent, skipped, errors with visual breakdown
  - Info callout about 7-day expiry
  - Rate limit error handling

---

### Phase 4D: Member Actions ✅ `[depends on: 4B]`

#### 4D.1 Role Selector

- [x] Create `_components/role-selector.tsx`
  - OWNER can select MANAGER or DEVELOPER
  - MANAGER can only select DEVELOPER
  - OWNER role excluded (use Transfer Ownership instead)
  - Visual role badges with color coding (OWNER=primary, MANAGER=info, DEVELOPER=success)
  - Dropdown with role descriptions
  - Loading state during role change

#### 4D.2 Remove Member Dialog

- [x] Create `_components/remove-member-dialog.tsx`
  - Confirmation dialog with member name
  - Warning about permanent action and immediate access loss
  - Handle API errors (e.g., last OWNER)

#### 4D.3 Leave Project Dialog

- [x] Create `_components/leave-project-dialog.tsx`
  - Confirmation dialog for leaving project
  - Warning about losing access
  - Redirects to projects list on success

#### 4D.4 Transfer Ownership Dialog

- [x] Create `_components/transfer-ownership-dialog.tsx`
  - Two-step wizard flow (select → confirm)
  - Select from current project members (exclude self)
  - Checkbox: "Keep me as owner" (default: true)
  - Warning callout about implications
  - Confirmation step with project name typing
  - Uses React `Activity` component to preserve form state between steps

---

### Phase 4E: Accept Invitation Page ✅ `[depends on: 4A]`

- [x] Create `app/invite/[token]/page.tsx`
  - Fetch invitation details using token (public)
  - Show: project name/slug, role badge, inviter name, expiry date
  - States handled:
    - Loading: spinner with message
    - Error (network): retry button
    - Error (invalid/expired/revoked): error message with dashboard link
    - Declined: confirmation with dashboard link
    - Valid (not logged in): invitation details + login/register CTAs
    - Valid (logged in, email matches): accept/decline buttons
    - Valid (logged in, email mismatch): warning about wrong account
  - On accept: toast notification + redirect to project
- [x] Extract `AuthSection` component for auth state handling
- [x] Add reusable `StatusIcon`, `PageContainer`, `DashboardLink` components

---

### Phase 4F: Navigation & Polish ✅ `[depends on: 4B, 4C, 4D, 4E]`

#### 4F.1 Enable Members Tab

- [x] Update `app/(project)/projects/[projectId]/settings/layout.tsx`
  - Move "Team" from "Coming Soon" to active navigation
  - Update href to `/projects/[projectId]/settings/members`

#### 4F.2 Add i18n Keys

- [x] Add translation keys to `public/locales/en.json`:
  - `members.*` - Team members section (roles, actions, dialogs)
  - `members.transfer.*` - Transfer ownership dialog
  - `invitation.*` - Accept invitation page
  - Common keys for errors and actions

#### 4F.3 Polish & Accessibility

- [x] Loading states for all mutations with spinner icons
- [x] Error handling with toast notifications (sonner)
- [x] Responsive design with flex layouts
- [x] Keyboard-accessible role selector dropdown
- [x] Focus management in dialogs (via Radix UI)

### Permission Matrix (Frontend) - Implemented

| Action                | OWNER    | MANAGER       | DEVELOPER |
| --------------------- | -------- | ------------- | --------- |
| View members list     | ✅       | ✅            | ✅        |
| View invitations      | ✅       | ✅            | ❌        |
| Invite button visible | ✅       | ✅            | ❌        |
| Can invite DEVELOPER  | ✅       | ✅            | ❌        |
| Can invite MANAGER    | ✅       | ❌            | ❌        |
| Change role dropdown  | ✅ (M/D) | ✅ (DEV only) | ❌        |
| Remove member button  | ✅       | ❌            | ❌        |
| Transfer ownership    | ✅       | ❌            | ❌        |
| Leave project         | ✅\*     | ✅            | ✅        |

\*OWNER can only leave if not sole OWNER
\*\*Note: OWNER role can only be assigned via Transfer Ownership, not role selector

---

## Epic 5: Admin Panel UI

### 5.1 Admin API Client `[depends on: 3.6]`

- [ ] Add admin API functions:
  - `getUsers(filters, pagination)`
  - `getUserDetails(userId)`
  - `getUserActivity(userId)`
  - `disableUser(userId)`
  - `enableUser(userId)`
  - `impersonateUser(userId)`

### 5.2 Admin Layout `[depends on: 5.1]`

- [ ] Create `app/(dashboard)/admin/layout.tsx`
  - ADMIN role guard (redirect if not admin)
  - Admin navigation sidebar
- [ ] Add "Admin" link to main nav (visible to ADMINs only)

### 5.3 Users List Page `[depends on: 5.1, 5.2]`

- [ ] Create `app/(dashboard)/admin/users/page.tsx`
  - Paginated table
  - Search by name/email
  - Filter by role, status
  - Quick actions (disable/enable)

### 5.4 User Details Page `[depends on: 5.1, 5.2]`

- [ ] Create `app/(dashboard)/admin/users/[id]/page.tsx`
  - User profile info
  - Projects list
  - Recent activity
  - Disable/Enable button
  - Impersonate button

### 5.5 Impersonation Flow `[depends on: 5.4]`

- [ ] Impersonation banner component (shown when impersonating)
- [ ] "Exit impersonation" button

---

## Epic 6: Testing & Polish

### 6.1 Backend Unit Tests

- [ ] Member repository tests
- [ ] Invitation repository tests
- [ ] Member command handler tests
- [ ] Admin command handler tests
- [ ] Permission validation tests

### 6.2 Backend Integration Tests

- [ ] Member API endpoint tests
- [ ] Invitation flow tests
- [ ] Admin API endpoint tests
- [ ] Rate limiting tests

### 6.3 Frontend Tests

- [ ] Member list component tests
- [ ] Invite dialog tests
- [ ] Admin pages tests

### 6.4 E2E Tests

- [ ] Full invitation flow (send → accept → member visible)
- [ ] Role change flow
- [ ] Admin disable/enable flow

---

## Epic 7: RBAC Integration `[depends on: Epic 2, Epic 4]`

### 7.1 Frontend Permission Checks `[depends on: Epic 4]`

#### 7.1.1 Project Settings Pages Audit

- [ ] Audit `settings/general/page.tsx` - verify role-based visibility
- [ ] Audit `settings/languages/page.tsx` - verify role-based visibility
- [ ] Audit `settings/members/page.tsx` - verify permission checks (already implemented)
- [ ] Audit `settings/api-keys/page.tsx` - verify MANAGER+ restriction
- [ ] Audit `settings/danger-zone/page.tsx` - verify OWNER only access

#### 7.1.2 Project Core Pages Audit

- [ ] Audit `projects/[projectId]/page.tsx` (dashboard) - verify member access
- [ ] Audit `projects/[projectId]/keys/page.tsx` - verify role-based actions
- [ ] Audit `projects/[projectId]/activity/page.tsx` - verify read access

#### 7.1.3 Permission Hook Implementation

- [ ] Create `hooks/useProjectPermission.ts` if not exists
  - `canManageMembers` - MANAGER+
  - `canInviteMembers` - MANAGER+
  - `canManageApiKeys` - MANAGER+
  - `canDeleteProject` - OWNER only
  - `canTransferOwnership` - OWNER only
- [ ] Ensure consistent permission checking across all pages

---

### 7.2 Backend RBAC Verification `[depends on: Epic 2]`

#### 7.2.1 Member Endpoints Verification

- [ ] Verify `GET /projects/:id/members` - requires membership
- [ ] Verify `GET /projects/:id/invitations` - requires MANAGER+
- [ ] Verify `POST /projects/:id/invitations` - requires MANAGER+
- [ ] Verify `DELETE /projects/:id/invitations/:id` - requires MANAGER+
- [ ] Verify `PATCH /projects/:id/members/:userId/role` - requires OWNER (or MANAGER for DEV)
- [ ] Verify `DELETE /projects/:id/members/:userId` - requires OWNER
- [ ] Verify `POST /projects/:id/leave` - requires membership
- [ ] Verify `POST /projects/:id/transfer-ownership` - requires OWNER

#### 7.2.2 Project Settings Endpoints Verification

- [ ] Verify `PATCH /projects/:id` (update settings) - requires MANAGER+
- [ ] Verify `DELETE /projects/:id` (delete project) - requires OWNER
- [ ] Verify API key endpoints - require MANAGER+
- [ ] Verify language settings endpoints - require MANAGER+

#### 7.2.3 AccessService Integration

- [ ] Audit `AccessService` methods for complete coverage
- [ ] Ensure `verifyProjectAccess` checks `isDisabled` status
- [ ] Add missing permission methods if needed

---

### 7.3 Role-Based UI Components `[depends on: 7.1]`

- [ ] Create `<RequireRole>` wrapper component for conditional rendering
- [ ] Create `<OwnerOnly>` shorthand component
- [ ] Create `<ManagerPlus>` shorthand component
- [ ] Document role hierarchy and permissions matrix

---

## Recommended Execution Order

1. **Epic 1** ✅ → Database foundation
2. **Epic 2** ✅ → Member Management Backend (all phases complete)
   - Phase 2A ✅ → Schemas + Repositories
   - Phase 2B ✅ → Member queries (read operations)
   - Phase 2C ✅ → Member commands (role, remove, leave, transfer)
   - Phase 2D ✅ → Invitation commands (invite, accept, revoke)
   - Phase 2E ✅ → Routes & module integration
   - Phase 2F ✅ → Events & activity logging
3. **Epic 4** ✅ → Member UI (complete)
4. **Epic 3** 🔄 → Admin backend (current)
   - Phase 3A → Foundation (schemas + repository)
   - Phase 3B → Read operations (queries)
   - Phase 3C → Admin commands (disable, enable, impersonate)
   - Phase 3D → Session invalidation (critical security fix)
   - Phase 3E → Events & audit logging
   - Phase 3F → Routes & integration
5. **Epic 5** → Admin UI
6. **Epic 7** → RBAC Integration
7. **Epic 6** → Testing (ongoing throughout)

---

## Estimates

| Phase/Epic          | Tasks   | Complexity | Status  |
| ------------------- | ------- | ---------- | ------- |
| 1. Database         | 6       | Low        | ✅ Done |
| 2. Member Backend   | 27      | High       | ✅ Done |
| 3. Admin Backend    | 24      | Medium     | ✅ Done |
| 4. Member UI        | 13      | Medium     | ✅ Done |
| 5. Admin UI         | 8       | Medium     | Pending |
| 6. Testing          | 12      | Medium     | Ongoing |
| 7. RBAC Integration | 12      | Medium     | Pending |
| **Total**           | **102** |            |         |

---

## Deferred: Audit Logging

The following features are deferred to a separate future epic:

- `AuditLog` database model
- Audit repository and service
- `GetAuditLogsQuery` endpoint
- Audit log viewer UI
- Before/after state capture for admin actions
- Full audit trail for: disable, enable, impersonate, role changes

Will be designed and implemented as a separate feature after core team/user management is complete.
