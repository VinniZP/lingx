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
        └──────────────► Epic 6 (Testing) ◄────────────┘
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

## Epic 2: Member Management Backend

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

#### 2F.3 Email Notifications (Deferred)

- [ ] Create email templates (future task)
- [ ] Add email event handlers (future task)

---

## Epic 3: Admin Panel Backend

### 3.1 Admin Repository `[depends on: 1.1]`

- [ ] Create `modules/admin/admin.repository.ts`
  - `findAllUsers(filters, pagination)` - paginated user list
  - `findUserById(id)` - user with projects
  - `findUserActivity(userId, limit)` - recent activity
  - `updateUserDisabled(userId, isDisabled, disabledById)`
  - `anonymizeUserActivity(userId)` - replace name in activity

### 3.2 Admin Shared Schemas `[depends on: 1.1]`

- [ ] Add to `packages/shared/src/validation/admin.schema.ts`:
  - `listUsersQuerySchema` (filters, pagination)
  - `adminUserResponseSchema`
  - `adminUserDetailsResponseSchema`
  - `impersonationTokenResponseSchema`

### 3.3 Admin Queries `[depends on: 3.1, 3.2]`

- [ ] `ListUsersQuery` + handler
  - Input: filters (role, status, search), pagination
  - Requires: ADMIN role
- [ ] `GetUserDetailsQuery` + handler
  - Input: userId
  - Returns: user + projects + stats
- [ ] `GetUserActivityQuery` + handler
  - Input: userId, limit
  - Returns: recent activity entries

### 3.4 Admin Commands `[depends on: 3.1]`

- [ ] `DisableUserCommand` + handler
  - Set isDisabled = true
  - Invalidate all sessions (add to token blacklist or check on auth)
  - Anonymize user in activity logs
- [ ] `EnableUserCommand` + handler
  - Set isDisabled = false
- [ ] `ImpersonateUserCommand` + handler
  - Generate 1-hour JWT with impersonation claim

### 3.5 Session Invalidation `[depends on: 3.4]`

- [ ] Update auth middleware to check `isDisabled` on each request
- [ ] Optionally: Add token blacklist in Redis for immediate revocation

### 3.6 Admin Routes `[depends on: 3.3, 3.4]`

- [ ] Create `routes/admin.ts`
  - `GET /admin/users` → ListUsersQuery
  - `GET /admin/users/:id` → GetUserDetailsQuery
  - `GET /admin/users/:id/activity` → GetUserActivityQuery
  - `POST /admin/users/:id/disable` → DisableUserCommand
  - `POST /admin/users/:id/enable` → EnableUserCommand
  - `POST /admin/users/:id/impersonate` → ImpersonateUserCommand
- [ ] Add ADMIN role guard middleware

---

## Epic 4: Member Management UI

### 4.1 API Client & Types `[depends on: 2.7]`

- [ ] Add API client functions in `lib/api/`:
  - `getProjectMembers(projectId)`
  - `getProjectInvitations(projectId)`
  - `inviteMembers(projectId, emails, role)`
  - `revokeInvitation(projectId, invitationId)`
  - `updateMemberRole(projectId, userId, role)`
  - `removeMember(projectId, userId)`
  - `transferOwnership(projectId, userId)`
  - `getInvitationByToken(token)`
  - `acceptInvitation(token)`

### 4.2 Members Tab - List View `[depends on: 4.1]`

- [ ] Create `app/(dashboard)/projects/[slug]/settings/members/page.tsx`
- [ ] Create `members-list.tsx` component
  - Table with name, email, role, actions
  - Role dropdown (respects permission rules)
  - Remove button (OWNER only, with confirm dialog)
  - Sort alphabetically
- [ ] Create `role-select.tsx` component
  - Dropdown with OWNER/MANAGER/DEVELOPER
  - Disabled states based on actor permissions

### 4.3 Invitation Components `[depends on: 4.1]`

- [ ] Create `invitations-list.tsx` component
  - Pending invites table
  - Expiry countdown
  - Revoke button
- [ ] Create `invite-dialog.tsx` component
  - Textarea for multiple emails
  - Role selector (MANAGER can only select DEVELOPER)
  - Validation feedback
  - Bulk invite support

### 4.4 Ownership Transfer `[depends on: 4.1]`

- [ ] Create `transfer-ownership-dialog.tsx`
  - Select from existing members
  - Confirmation with project name
  - Option to remain as OWNER or demote

### 4.5 Accept Invitation Page `[depends on: 4.1]`

- [ ] Create `app/(auth)/invite/[token]/page.tsx`
  - Show project name, inviter, role
  - "Accept" button (requires login)
  - Handle expired/invalid tokens
  - Redirect to project after accept

### 4.6 Navigation & Layout `[depends on: 4.2]`

- [ ] Add "Members" tab to project settings navigation
- [ ] Show member count badge

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

## Recommended Execution Order

1. **Epic 1** ✅ → Database foundation
2. **Phase 2A** ✅ → Schemas + Repositories
3. **Phase 2B** ✅ → Member queries (read operations)
4. **Phase 2C** ✅ → Member commands (role, remove, leave, transfer)
5. **Phase 2D** ✅ → Invitation commands (invite, accept, revoke)
6. **Phase 2E** ✅ → Routes & module integration
7. **Phase 2F** 🔄 → Events & activity logging (event classes done, handlers pending)
8. **Epic 4** → Member UI (can demo at this point)
9. **Epic 3** → Admin backend
10. **Epic 5** → Admin UI
11. **Epic 6** → Testing (ongoing throughout)

---

## Estimates

| Phase/Epic          | Tasks  | Complexity | Status     |
| ------------------- | ------ | ---------- | ---------- |
| 1. Database         | 6      | Low        | ✅ Done    |
| 2A. Foundation      | 5      | Medium     | ✅ Done    |
| 2B. Read Ops        | 4      | Low        | ✅ Done    |
| 2C. Member Commands | 5      | High       | ✅ Done    |
| 2D. Invite Commands | 4      | High       | ✅ Done    |
| 2E. Routes          | 5      | Medium     | ✅ Done    |
| 2F. Events          | 4      | Low        | 🔄 Partial |
| 3. Admin Backend    | 14     | Medium     | Pending    |
| 4. Member UI        | 12     | Medium     | Pending    |
| 5. Admin UI         | 8      | Medium     | Pending    |
| 6. Testing          | 12     | Medium     | Ongoing    |
| **Total**           | **79** |            |            |

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
