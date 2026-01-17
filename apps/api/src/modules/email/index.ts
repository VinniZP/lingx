/**
 * Email Module
 *
 * Handles email notifications for team/member management events.
 * Uses React Email for templates and BullMQ for async delivery.
 */
import type { AwilixContainer } from 'awilix';
import { asClass } from 'awilix';
import { defineEventHandler, registerEventHandlers } from '../../shared/cqrs/index.js';

// Import events
import { InvitationAcceptedEvent } from '../member/events/invitation-accepted.event.js';
import { MemberInvitedEvent } from '../member/events/member-invited.event.js';
import { MemberLeftEvent } from '../member/events/member-left.event.js';
import { MemberRemovedEvent } from '../member/events/member-removed.event.js';
import { MemberRoleChangedEvent } from '../member/events/member-role-changed.event.js';
import { OwnershipTransferredEvent } from '../member/events/ownership-transferred.event.js';

// Import handlers and services
import { EmailService } from './email.service.js';
import { MemberEmailHandler } from './handlers/member-email.handler.js';

// Event handler registrations
const eventRegistrations = [
  defineEventHandler(MemberInvitedEvent, MemberEmailHandler, 'memberEmailHandler'),
  defineEventHandler(InvitationAcceptedEvent, MemberEmailHandler, 'memberEmailHandler'),
  defineEventHandler(MemberRemovedEvent, MemberEmailHandler, 'memberEmailHandler'),
  defineEventHandler(MemberRoleChangedEvent, MemberEmailHandler, 'memberEmailHandler'),
  defineEventHandler(OwnershipTransferredEvent, MemberEmailHandler, 'memberEmailHandler'),
  defineEventHandler(MemberLeftEvent, MemberEmailHandler, 'memberEmailHandler'),
];

/**
 * Register email module components in the DI container.
 */
export function registerEmailModule(container: AwilixContainer): void {
  // Register services
  container.register({
    emailService: asClass(EmailService).singleton(),
    memberEmailHandler: asClass(MemberEmailHandler).singleton(),
  });

  // Register event handlers
  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}

// Re-export for convenience
export { EmailService } from './email.service.js';
export { MemberEmailHandler } from './handlers/member-email.handler.js';
