/**
 * Admin Module
 *
 * CQRS-lite module for admin user management operations.
 * Provides commands for user disable/enable/impersonation and queries for listing.
 * Includes audit logging for all admin actions.
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
import { AdminRepository } from './repositories/admin.repository.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';

// Command handlers
import { DisableUserHandler } from './commands/disable-user.handler.js';
import { EnableUserHandler } from './commands/enable-user.handler.js';
import { ImpersonateUserHandler } from './commands/impersonate-user.handler.js';

// Query handlers
import { GetAuditLogsHandler } from './queries/get-audit-logs.handler.js';
import { GetUserActivityHandler } from './queries/get-user-activity.handler.js';
import { GetUserDetailsHandler } from './queries/get-user-details.handler.js';
import { ListUsersHandler } from './queries/list-users.handler.js';

// Event handlers
import { AdminAuditHandler } from './handlers/admin-audit.handler.js';

// Commands
import { DisableUserCommand } from './commands/disable-user.command.js';
import { EnableUserCommand } from './commands/enable-user.command.js';
import { ImpersonateUserCommand } from './commands/impersonate-user.command.js';

// Queries
import { GetAuditLogsQuery } from './queries/get-audit-logs.query.js';
import { GetUserActivityQuery } from './queries/get-user-activity.query.js';
import { GetUserDetailsQuery } from './queries/get-user-details.query.js';
import { ListUsersQuery } from './queries/list-users.query.js';

// Events
import { UserDisabledEvent } from './events/user-disabled.event.js';
import { UserEnabledEvent } from './events/user-enabled.event.js';
import { UserImpersonatedEvent } from './events/user-impersonated.event.js';

// Re-export commands for external use
export { DisableUserCommand } from './commands/disable-user.command.js';
export { EnableUserCommand } from './commands/enable-user.command.js';
export {
  ImpersonateUserCommand,
  type ImpersonationResult,
} from './commands/impersonate-user.command.js';

// Re-export queries
export { GetAuditLogsQuery } from './queries/get-audit-logs.query.js';
export { GetUserActivityQuery } from './queries/get-user-activity.query.js';
export { GetUserDetailsQuery, type UserDetailsResult } from './queries/get-user-details.query.js';
export { ListUsersQuery } from './queries/list-users.query.js';

// Re-export events
export { UserDisabledEvent } from './events/user-disabled.event.js';
export { UserEnabledEvent } from './events/user-enabled.event.js';
export { UserImpersonatedEvent } from './events/user-impersonated.event.js';

// Re-export types
export type {
  AdminUserListItem,
  PaginatedUsers,
  Pagination,
  UserActivity,
  UserFilters,
  UserWithProjects,
} from './repositories/admin.repository.js';

export type {
  AuditLogAction,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  CreateAuditLogInput,
  PaginatedAuditLogs,
} from './repositories/audit-log.repository.js';

// Type-safe handler registrations
const commandRegistrations = [
  defineCommandHandler(DisableUserCommand, DisableUserHandler, 'disableUserHandler'),
  defineCommandHandler(EnableUserCommand, EnableUserHandler, 'enableUserHandler'),
  defineCommandHandler(ImpersonateUserCommand, ImpersonateUserHandler, 'impersonateUserHandler'),
];

const queryRegistrations = [
  defineQueryHandler(ListUsersQuery, ListUsersHandler, 'listUsersHandler'),
  defineQueryHandler(GetUserDetailsQuery, GetUserDetailsHandler, 'getUserDetailsHandler'),
  defineQueryHandler(GetUserActivityQuery, GetUserActivityHandler, 'getUserActivityHandler'),
  defineQueryHandler(GetAuditLogsQuery, GetAuditLogsHandler, 'getAuditLogsHandler'),
];

// Event registrations for audit logging
const eventRegistrations = [
  defineEventHandler(UserDisabledEvent, AdminAuditHandler, 'adminAuditHandler'),
  defineEventHandler(UserEnabledEvent, AdminAuditHandler, 'adminAuditHandler'),
  defineEventHandler(UserImpersonatedEvent, AdminAuditHandler, 'adminAuditHandler'),
];

/**
 * Register admin module handlers with the container.
 */
export function registerAdminModule(container: AwilixContainer<Cradle>): void {
  // Register repositories
  container.register({
    adminRepository: asClass(AdminRepository).singleton(),
    auditLogRepository: asClass(AuditLogRepository).singleton(),
  });

  // Register command handlers
  container.register({
    disableUserHandler: asClass(DisableUserHandler).singleton(),
    enableUserHandler: asClass(EnableUserHandler).singleton(),
    impersonateUserHandler: asClass(ImpersonateUserHandler).singleton(),
  });

  // Register query handlers
  container.register({
    listUsersHandler: asClass(ListUsersHandler).singleton(),
    getUserDetailsHandler: asClass(GetUserDetailsHandler).singleton(),
    getUserActivityHandler: asClass(GetUserActivityHandler).singleton(),
    getAuditLogsHandler: asClass(GetAuditLogsHandler).singleton(),
  });

  // Register event handlers
  container.register({
    adminAuditHandler: asClass(AdminAuditHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
