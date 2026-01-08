/**
 * Auth Module
 *
 * CQRS-lite module for authentication operations.
 * Provides commands for register/login/logout and API key management,
 * and queries for user and API key retrieval.
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
import { CreateApiKeyHandler } from './commands/create-api-key.handler.js';
import { LoginUserHandler } from './commands/login-user.handler.js';
import { LogoutUserHandler } from './commands/logout-user.handler.js';
import { RegisterUserHandler } from './commands/register-user.handler.js';
import { RevokeApiKeyHandler } from './commands/revoke-api-key.handler.js';

// Query handlers
import { GetCurrentUserHandler } from './queries/get-current-user.handler.js';
import { ListApiKeysHandler } from './queries/list-api-keys.handler.js';

// Commands
import { CreateApiKeyCommand } from './commands/create-api-key.command.js';
import { LoginUserCommand } from './commands/login-user.command.js';
import { LogoutUserCommand } from './commands/logout-user.command.js';
import { RegisterUserCommand } from './commands/register-user.command.js';
import { RevokeApiKeyCommand } from './commands/revoke-api-key.command.js';

// Queries
import { GetCurrentUserQuery } from './queries/get-current-user.query.js';
import { ListApiKeysQuery } from './queries/list-api-keys.query.js';

// Events
import { ApiKeyCreatedEvent } from './events/api-key-created.event.js';
import { ApiKeyRevokedEvent } from './events/api-key-revoked.event.js';
import { UserLoggedInEvent } from './events/user-logged-in.event.js';
import { UserLoggedOutEvent } from './events/user-logged-out.event.js';
import { UserRegisteredEvent } from './events/user-registered.event.js';

// Event handlers (activity logging)
import { AuthActivityHandler } from './handlers/auth-activity.handler.js';

// Re-export commands for external use
export { CreateApiKeyCommand } from './commands/create-api-key.command.js';
export { LoginUserCommand } from './commands/login-user.command.js';
export type {
  LoginResult,
  LoginSuccessResult,
  TwoFactorRequiredResult,
} from './commands/login-user.command.js';
export { LogoutUserCommand } from './commands/logout-user.command.js';
export { RegisterUserCommand } from './commands/register-user.command.js';
export { RevokeApiKeyCommand } from './commands/revoke-api-key.command.js';

// Re-export queries
export { GetCurrentUserQuery } from './queries/get-current-user.query.js';
export { ListApiKeysQuery } from './queries/list-api-keys.query.js';

// Re-export events
export { ApiKeyCreatedEvent } from './events/api-key-created.event.js';
export { ApiKeyRevokedEvent } from './events/api-key-revoked.event.js';
export { UserLoggedInEvent } from './events/user-logged-in.event.js';
export { UserLoggedOutEvent } from './events/user-logged-out.event.js';
export { UserRegisteredEvent } from './events/user-registered.event.js';

// Re-export types
export type { UserWithoutPassword } from './commands/register-user.command.js';
export type { ApiKeyWithoutHash } from './queries/list-api-keys.query.js';

// Type-safe handler registrations
const commandRegistrations = [
  defineCommandHandler(RegisterUserCommand, RegisterUserHandler, 'registerUserHandler'),
  defineCommandHandler(LoginUserCommand, LoginUserHandler, 'loginUserHandler'),
  defineCommandHandler(LogoutUserCommand, LogoutUserHandler, 'logoutUserHandler'),
  defineCommandHandler(CreateApiKeyCommand, CreateApiKeyHandler, 'createApiKeyHandler'),
  defineCommandHandler(RevokeApiKeyCommand, RevokeApiKeyHandler, 'revokeApiKeyHandler'),
];

const queryRegistrations = [
  defineQueryHandler(GetCurrentUserQuery, GetCurrentUserHandler, 'getCurrentUserHandler'),
  defineQueryHandler(ListApiKeysQuery, ListApiKeysHandler, 'listApiKeysHandler'),
];

const eventRegistrations = [
  defineEventHandler(UserRegisteredEvent, AuthActivityHandler, 'authActivityHandler'),
  defineEventHandler(UserLoggedInEvent, AuthActivityHandler, 'authActivityHandler'),
  defineEventHandler(UserLoggedOutEvent, AuthActivityHandler, 'authActivityHandler'),
  defineEventHandler(ApiKeyCreatedEvent, AuthActivityHandler, 'authActivityHandler'),
  defineEventHandler(ApiKeyRevokedEvent, AuthActivityHandler, 'authActivityHandler'),
];

/**
 * Register auth module handlers with the container.
 */
export function registerAuthModule(container: AwilixContainer<Cradle>): void {
  // Register command handlers
  container.register({
    registerUserHandler: asClass(RegisterUserHandler).singleton(),
    loginUserHandler: asClass(LoginUserHandler).singleton(),
    logoutUserHandler: asClass(LogoutUserHandler).singleton(),
    createApiKeyHandler: asClass(CreateApiKeyHandler).singleton(),
    revokeApiKeyHandler: asClass(RevokeApiKeyHandler).singleton(),
  });

  // Register query handlers
  container.register({
    getCurrentUserHandler: asClass(GetCurrentUserHandler).singleton(),
    listApiKeysHandler: asClass(ListApiKeysHandler).singleton(),
  });

  // Register event handler for activity logging (single instance handles all auth events)
  container.register({
    authActivityHandler: asClass(AuthActivityHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
