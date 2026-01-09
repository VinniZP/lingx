/**
 * Security Module
 *
 * CQRS-lite module for security operations.
 * Provides commands for password changes and session management,
 * and queries for session retrieval.
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

// Command handlers
import { ChangePasswordHandler } from './commands/change-password.handler.js';
import { RevokeAllSessionsHandler } from './commands/revoke-all-sessions.handler.js';
import { RevokeSessionHandler } from './commands/revoke-session.handler.js';

// Query handlers
import { GetSessionsHandler } from './queries/get-sessions.handler.js';

// Commands
import { ChangePasswordCommand } from './commands/change-password.command.js';
import { RevokeAllSessionsCommand } from './commands/revoke-all-sessions.command.js';
import { RevokeSessionCommand } from './commands/revoke-session.command.js';

// Queries
import { GetSessionsQuery } from './queries/get-sessions.query.js';

// Events
import { AllSessionsRevokedEvent } from './events/all-sessions-revoked.event.js';
import { PasswordChangedEvent } from './events/password-changed.event.js';
import { SessionRevokedEvent } from './events/session-revoked.event.js';

// Event handlers (activity logging)
import { SecurityActivityHandler } from './handlers/security-activity.handler.js';

// Re-export commands for external use
export { ChangePasswordCommand } from './commands/change-password.command.js';
export type { ChangePasswordResult } from './commands/change-password.command.js';
export { RevokeAllSessionsCommand } from './commands/revoke-all-sessions.command.js';
export type { RevokeAllSessionsResult } from './commands/revoke-all-sessions.command.js';
export { RevokeSessionCommand } from './commands/revoke-session.command.js';

// Re-export queries
export { GetSessionsQuery } from './queries/get-sessions.query.js';

// Re-export events
export { AllSessionsRevokedEvent } from './events/all-sessions-revoked.event.js';
export { PasswordChangedEvent } from './events/password-changed.event.js';
export { SessionRevokedEvent } from './events/session-revoked.event.js';

// Type-safe handler registrations
const commandRegistrations = [
  defineCommandHandler(ChangePasswordCommand, ChangePasswordHandler, 'changePasswordHandler'),
  defineCommandHandler(RevokeSessionCommand, RevokeSessionHandler, 'revokeSessionHandler'),
  defineCommandHandler(
    RevokeAllSessionsCommand,
    RevokeAllSessionsHandler,
    'revokeAllSessionsHandler'
  ),
];

const queryRegistrations = [
  defineQueryHandler(GetSessionsQuery, GetSessionsHandler, 'getSessionsHandler'),
];

const eventRegistrations = [
  defineEventHandler(PasswordChangedEvent, SecurityActivityHandler, 'securityActivityHandler'),
  defineEventHandler(SessionRevokedEvent, SecurityActivityHandler, 'securityActivityHandler'),
  defineEventHandler(AllSessionsRevokedEvent, SecurityActivityHandler, 'securityActivityHandler'),
];

/**
 * Register security module handlers with the container.
 */
export function registerSecurityModule(container: AwilixContainer<Cradle>): void {
  // Register command handlers
  container.register({
    changePasswordHandler: asClass(ChangePasswordHandler).singleton(),
    revokeSessionHandler: asClass(RevokeSessionHandler).singleton(),
    revokeAllSessionsHandler: asClass(RevokeAllSessionsHandler).singleton(),
  });

  // Register query handlers
  container.register({
    getSessionsHandler: asClass(GetSessionsHandler).singleton(),
  });

  // Register event handler for activity logging (single instance handles all security events)
  container.register({
    securityActivityHandler: asClass(SecurityActivityHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
