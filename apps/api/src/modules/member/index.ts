/**
 * Member Module
 *
 * CQRS-lite module for project member and invitation operations.
 * Provides commands for role management, invitations, and queries for listing.
 */

import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import type { Cradle } from '../../shared/container/index.js';
import {
  defineCommandHandler,
  defineEventHandler,
  defineQueryHandler,
  registerCommandHandlers,
  registerEventHandlers,
  registerQueryHandlers,
} from '../../shared/cqrs/index.js';

// Repositories
import { InvitationRepository } from './repositories/invitation.repository.js';
import { MemberRepository } from './repositories/member.repository.js';

// Command handlers
import { AcceptInvitationHandler } from './commands/accept-invitation.handler.js';
import { InviteMemberHandler } from './commands/invite-member.handler.js';
import { LeaveProjectHandler } from './commands/leave-project.handler.js';
import { RemoveMemberHandler } from './commands/remove-member.handler.js';
import { RevokeInvitationHandler } from './commands/revoke-invitation.handler.js';
import { TransferOwnershipHandler } from './commands/transfer-ownership.handler.js';
import { UpdateMemberRoleHandler } from './commands/update-member-role.handler.js';

// Query handlers
import { GetInvitationByTokenHandler } from './queries/get-invitation-by-token.handler.js';
import { ListProjectInvitationsHandler } from './queries/list-project-invitations.handler.js';
import { ListProjectMembersHandler } from './queries/list-project-members.handler.js';

// Commands
import { AcceptInvitationCommand } from './commands/accept-invitation.command.js';
import { InviteMemberCommand } from './commands/invite-member.command.js';
import { LeaveProjectCommand } from './commands/leave-project.command.js';
import { RemoveMemberCommand } from './commands/remove-member.command.js';
import { RevokeInvitationCommand } from './commands/revoke-invitation.command.js';
import { TransferOwnershipCommand } from './commands/transfer-ownership.command.js';
import { UpdateMemberRoleCommand } from './commands/update-member-role.command.js';

// Queries
import { GetInvitationByTokenQuery } from './queries/get-invitation-by-token.query.js';
import { ListProjectInvitationsQuery } from './queries/list-project-invitations.query.js';
import { ListProjectMembersQuery } from './queries/list-project-members.query.js';

// Event handlers
import { MemberActivityHandler } from './handlers/member-activity.handler.js';

// Events (for event handler registrations)
import { InvitationAcceptedEvent } from './events/invitation-accepted.event.js';
import { MemberInvitedEvent } from './events/member-invited.event.js';
import { MemberLeftEvent } from './events/member-left.event.js';
import { MemberRemovedEvent } from './events/member-removed.event.js';
import { MemberRoleChangedEvent } from './events/member-role-changed.event.js';
import { OwnershipTransferredEvent } from './events/ownership-transferred.event.js';

// Re-export commands for external use
export { AcceptInvitationCommand } from './commands/accept-invitation.command.js';
export { InviteMemberCommand, type InviteMemberResult } from './commands/invite-member.command.js';
export { LeaveProjectCommand } from './commands/leave-project.command.js';
export { RemoveMemberCommand } from './commands/remove-member.command.js';
export { RevokeInvitationCommand } from './commands/revoke-invitation.command.js';
export { TransferOwnershipCommand } from './commands/transfer-ownership.command.js';
export { UpdateMemberRoleCommand } from './commands/update-member-role.command.js';

// Re-export queries
export {
  GetInvitationByTokenQuery,
  type InvitationPublicDetails,
} from './queries/get-invitation-by-token.query.js';
export { ListProjectInvitationsQuery } from './queries/list-project-invitations.query.js';
export { ListProjectMembersQuery } from './queries/list-project-members.query.js';

// Re-export events
export { InvitationAcceptedEvent } from './events/invitation-accepted.event.js';
export { MemberInvitedEvent } from './events/member-invited.event.js';
export { MemberLeftEvent } from './events/member-left.event.js';
export { MemberRemovedEvent } from './events/member-removed.event.js';
export { MemberRoleChangedEvent } from './events/member-role-changed.event.js';
export { OwnershipTransferredEvent } from './events/ownership-transferred.event.js';

// Re-export types
export type {
  CreateInvitationInput,
  InvitationWithDetails,
} from './repositories/invitation.repository.js';
export type { ProjectMemberWithUser, UserBasic } from './repositories/member.repository.js';

// Type-safe handler registrations
const commandRegistrations = [
  defineCommandHandler(UpdateMemberRoleCommand, UpdateMemberRoleHandler, 'updateMemberRoleHandler'),
  defineCommandHandler(RemoveMemberCommand, RemoveMemberHandler, 'removeMemberHandler'),
  defineCommandHandler(LeaveProjectCommand, LeaveProjectHandler, 'leaveProjectHandler'),
  defineCommandHandler(
    TransferOwnershipCommand,
    TransferOwnershipHandler,
    'transferOwnershipHandler'
  ),
  defineCommandHandler(InviteMemberCommand, InviteMemberHandler, 'inviteMemberHandler'),
  defineCommandHandler(AcceptInvitationCommand, AcceptInvitationHandler, 'acceptInvitationHandler'),
  defineCommandHandler(RevokeInvitationCommand, RevokeInvitationHandler, 'revokeInvitationHandler'),
];

const queryRegistrations = [
  defineQueryHandler(
    ListProjectMembersQuery,
    ListProjectMembersHandler,
    'listProjectMembersHandler'
  ),
  defineQueryHandler(
    ListProjectInvitationsQuery,
    ListProjectInvitationsHandler,
    'listProjectInvitationsHandler'
  ),
  defineQueryHandler(
    GetInvitationByTokenQuery,
    GetInvitationByTokenHandler,
    'getInvitationByTokenHandler'
  ),
];

// Event registrations for activity logging
const eventRegistrations: ReturnType<typeof defineEventHandler>[] = [
  defineEventHandler(MemberRoleChangedEvent, MemberActivityHandler, 'memberActivityHandler'),
  defineEventHandler(MemberRemovedEvent, MemberActivityHandler, 'memberActivityHandler'),
  defineEventHandler(MemberLeftEvent, MemberActivityHandler, 'memberActivityHandler'),
  defineEventHandler(MemberInvitedEvent, MemberActivityHandler, 'memberActivityHandler'),
  defineEventHandler(InvitationAcceptedEvent, MemberActivityHandler, 'memberActivityHandler'),
  defineEventHandler(OwnershipTransferredEvent, MemberActivityHandler, 'memberActivityHandler'),
];

/**
 * Register member module handlers with the container.
 */
export function registerMemberModule(container: AwilixContainer<Cradle>): void {
  // Register repositories
  container.register({
    memberRepository: asClass(MemberRepository).singleton(),
    invitationRepository: asClass(InvitationRepository).singleton(),
  });

  // Register command handlers
  container.register({
    updateMemberRoleHandler: asClass(UpdateMemberRoleHandler).singleton(),
    removeMemberHandler: asClass(RemoveMemberHandler).singleton(),
    leaveProjectHandler: asClass(LeaveProjectHandler).singleton(),
    transferOwnershipHandler: asClass(TransferOwnershipHandler).singleton(),
    inviteMemberHandler: asClass(InviteMemberHandler).singleton(),
    acceptInvitationHandler: asClass(AcceptInvitationHandler).singleton(),
    revokeInvitationHandler: asClass(RevokeInvitationHandler).singleton(),
  });

  // Register query handlers
  container.register({
    listProjectMembersHandler: asClass(ListProjectMembersHandler).singleton(),
    listProjectInvitationsHandler: asClass(ListProjectInvitationsHandler).singleton(),
    getInvitationByTokenHandler: asClass(GetInvitationByTokenHandler).singleton(),
  });

  // Register event handlers
  container.register({
    memberActivityHandler: asClass(MemberActivityHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
