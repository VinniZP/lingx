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
import { CleanupExpiredSessionsHandler } from './commands/cleanup-expired-sessions.handler.js';
import { CreateSessionHandler } from './commands/create-session.handler.js';
import { DeleteSessionHandler } from './commands/delete-session.handler.js';
import { RevokeAllSessionsHandler } from './commands/revoke-all-sessions.handler.js';
import { RevokeSessionHandler } from './commands/revoke-session.handler.js';
import { UpdateSessionActivityHandler } from './commands/update-session-activity.handler.js';

// Query handlers
import { GetSessionsHandler } from './queries/get-sessions.handler.js';
import { ValidateSessionHandler } from './queries/validate-session.handler.js';

// Commands
import { ChangePasswordCommand } from './commands/change-password.command.js';
import { CleanupExpiredSessionsCommand } from './commands/cleanup-expired-sessions.command.js';
import { CreateSessionCommand } from './commands/create-session.command.js';
import { DeleteSessionCommand } from './commands/delete-session.command.js';
import { RevokeAllSessionsCommand } from './commands/revoke-all-sessions.command.js';
import { RevokeSessionCommand } from './commands/revoke-session.command.js';
import { UpdateSessionActivityCommand } from './commands/update-session-activity.command.js';

// Queries
import { GetSessionsQuery } from './queries/get-sessions.query.js';
import { ValidateSessionQuery } from './queries/validate-session.query.js';

// Events
import { AllSessionsRevokedEvent } from './events/all-sessions-revoked.event.js';
import { PasswordChangedEvent } from './events/password-changed.event.js';
import { SessionCreatedEvent } from './events/session-created.event.js';
import { SessionDeletedEvent } from './events/session-deleted.event.js';
import { SessionRevokedEvent } from './events/session-revoked.event.js';

// Event handlers (activity logging)
import { SecurityActivityHandler } from './handlers/security-activity.handler.js';

// Re-export commands for external use
export { ChangePasswordCommand } from './commands/change-password.command.js';
export type { ChangePasswordResult } from './commands/change-password.command.js';
export { CleanupExpiredSessionsCommand } from './commands/cleanup-expired-sessions.command.js';
export { CreateSessionCommand } from './commands/create-session.command.js';
export { DeleteSessionCommand } from './commands/delete-session.command.js';
export { RevokeAllSessionsCommand } from './commands/revoke-all-sessions.command.js';
export type { RevokeAllSessionsResult } from './commands/revoke-all-sessions.command.js';
export { RevokeSessionCommand } from './commands/revoke-session.command.js';
export { UpdateSessionActivityCommand } from './commands/update-session-activity.command.js';

// Re-export queries
export { GetSessionsQuery } from './queries/get-sessions.query.js';
export { ValidateSessionQuery } from './queries/validate-session.query.js';

// Re-export events
export { AllSessionsRevokedEvent } from './events/all-sessions-revoked.event.js';
export { PasswordChangedEvent } from './events/password-changed.event.js';
export { SessionCreatedEvent } from './events/session-created.event.js';
export { SessionDeletedEvent } from './events/session-deleted.event.js';
export { SessionRevokedEvent } from './events/session-revoked.event.js';

// Re-export utilities
export { extractRequestMetadata } from './utils.js';
export type { RequestMetadata } from './utils.js';

// Type-safe handler registrations
const commandRegistrations = [
  defineCommandHandler(ChangePasswordCommand, ChangePasswordHandler, 'changePasswordHandler'),
  defineCommandHandler(
    CleanupExpiredSessionsCommand,
    CleanupExpiredSessionsHandler,
    'cleanupExpiredSessionsHandler'
  ),
  defineCommandHandler(CreateSessionCommand, CreateSessionHandler, 'createSessionHandler'),
  defineCommandHandler(DeleteSessionCommand, DeleteSessionHandler, 'deleteSessionHandler'),
  defineCommandHandler(RevokeSessionCommand, RevokeSessionHandler, 'revokeSessionHandler'),
  defineCommandHandler(
    RevokeAllSessionsCommand,
    RevokeAllSessionsHandler,
    'revokeAllSessionsHandler'
  ),
  defineCommandHandler(
    UpdateSessionActivityCommand,
    UpdateSessionActivityHandler,
    'updateSessionActivityHandler'
  ),
];

const queryRegistrations = [
  defineQueryHandler(GetSessionsQuery, GetSessionsHandler, 'getSessionsHandler'),
  defineQueryHandler(ValidateSessionQuery, ValidateSessionHandler, 'validateSessionHandler'),
];

const eventRegistrations = [
  defineEventHandler(PasswordChangedEvent, SecurityActivityHandler, 'securityActivityHandler'),
  defineEventHandler(SessionCreatedEvent, SecurityActivityHandler, 'securityActivityHandler'),
  defineEventHandler(SessionDeletedEvent, SecurityActivityHandler, 'securityActivityHandler'),
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
    cleanupExpiredSessionsHandler: asClass(CleanupExpiredSessionsHandler).singleton(),
    createSessionHandler: asClass(CreateSessionHandler).singleton(),
    deleteSessionHandler: asClass(DeleteSessionHandler).singleton(),
    revokeSessionHandler: asClass(RevokeSessionHandler).singleton(),
    revokeAllSessionsHandler: asClass(RevokeAllSessionsHandler).singleton(),
    updateSessionActivityHandler: asClass(UpdateSessionActivityHandler).singleton(),
  });

  // Register query handlers
  container.register({
    getSessionsHandler: asClass(GetSessionsHandler).singleton(),
    validateSessionHandler: asClass(ValidateSessionHandler).singleton(),
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
