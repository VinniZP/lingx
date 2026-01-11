/**
 * Profile Module
 *
 * CQRS-lite module for user profile management.
 * Provides commands for profile updates, avatar management, preferences, and email changes.
 * Provides queries for retrieving user profiles.
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

// Repository
import { ProfileRepository } from './repositories/profile.repository.js';

// Query handlers
import { GetProfileHandler } from './queries/get-profile.handler.js';

// Command handlers
import { CancelEmailChangeHandler } from './commands/cancel-email-change.handler.js';
import { DeleteAvatarHandler } from './commands/delete-avatar.handler.js';
import { InitiateEmailChangeHandler } from './commands/initiate-email-change.handler.js';
import { UpdateAvatarHandler } from './commands/update-avatar.handler.js';
import { UpdatePreferencesHandler } from './commands/update-preferences.handler.js';
import { UpdateProfileHandler } from './commands/update-profile.handler.js';
import { VerifyEmailChangeHandler } from './commands/verify-email-change.handler.js';

// Queries
import { GetProfileQuery } from './queries/get-profile.query.js';

// Commands
import { CancelEmailChangeCommand } from './commands/cancel-email-change.command.js';
import { DeleteAvatarCommand } from './commands/delete-avatar.command.js';
import { InitiateEmailChangeCommand } from './commands/initiate-email-change.command.js';
import { UpdateAvatarCommand } from './commands/update-avatar.command.js';
import { UpdatePreferencesCommand } from './commands/update-preferences.command.js';
import { UpdateProfileCommand } from './commands/update-profile.command.js';
import { VerifyEmailChangeCommand } from './commands/verify-email-change.command.js';

// Events
import { AvatarDeletedEvent } from './events/avatar-deleted.event.js';
import { AvatarUpdatedEvent } from './events/avatar-updated.event.js';
import { EmailChangeCancelledEvent } from './events/email-change-cancelled.event.js';
import { EmailChangeInitiatedEvent } from './events/email-change-initiated.event.js';
import { EmailVerifiedEvent } from './events/email-verified.event.js';
import { PreferencesUpdatedEvent } from './events/preferences-updated.event.js';
import { ProfileUpdatedEvent } from './events/profile-updated.event.js';

// Event handlers
import { ProfileActivityHandler } from './handlers/profile-activity.handler.js';

// Re-export queries and commands for external use
export { GetProfileQuery } from './queries/get-profile.query.js';

export { CancelEmailChangeCommand } from './commands/cancel-email-change.command.js';
export { DeleteAvatarCommand } from './commands/delete-avatar.command.js';
export { InitiateEmailChangeCommand } from './commands/initiate-email-change.command.js';
export { UpdateAvatarCommand } from './commands/update-avatar.command.js';
export { UpdatePreferencesCommand } from './commands/update-preferences.command.js';
export { UpdateProfileCommand } from './commands/update-profile.command.js';
export { VerifyEmailChangeCommand } from './commands/verify-email-change.command.js';

// Re-export events
export { AvatarDeletedEvent } from './events/avatar-deleted.event.js';
export { AvatarUpdatedEvent } from './events/avatar-updated.event.js';
export { EmailChangeCancelledEvent } from './events/email-change-cancelled.event.js';
export { EmailChangeInitiatedEvent } from './events/email-change-initiated.event.js';
export { EmailVerifiedEvent } from './events/email-verified.event.js';
export { PreferencesUpdatedEvent } from './events/preferences-updated.event.js';
export { ProfileUpdatedEvent } from './events/profile-updated.event.js';

// Re-export types
export type {
  AvatarResult,
  ChangeEmailInput,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UserPreferences,
  UserProfile,
} from './types.js';

// Type-safe handler registrations
const queryRegistrations = [
  defineQueryHandler(GetProfileQuery, GetProfileHandler, 'getProfileHandler'),
];

const commandRegistrations = [
  defineCommandHandler(UpdateProfileCommand, UpdateProfileHandler, 'updateProfileHandler'),
  defineCommandHandler(
    UpdatePreferencesCommand,
    UpdatePreferencesHandler,
    'updatePreferencesHandler'
  ),
  defineCommandHandler(UpdateAvatarCommand, UpdateAvatarHandler, 'updateAvatarHandler'),
  defineCommandHandler(DeleteAvatarCommand, DeleteAvatarHandler, 'deleteAvatarHandler'),
  defineCommandHandler(
    InitiateEmailChangeCommand,
    InitiateEmailChangeHandler,
    'initiateEmailChangeHandler'
  ),
  defineCommandHandler(
    VerifyEmailChangeCommand,
    VerifyEmailChangeHandler,
    'verifyEmailChangeHandler'
  ),
  defineCommandHandler(
    CancelEmailChangeCommand,
    CancelEmailChangeHandler,
    'cancelEmailChangeHandler'
  ),
];

const eventRegistrations = [
  defineEventHandler(ProfileUpdatedEvent, ProfileActivityHandler, 'profileUpdatedActivityHandler'),
  defineEventHandler(
    PreferencesUpdatedEvent,
    ProfileActivityHandler,
    'preferencesUpdatedActivityHandler'
  ),
  defineEventHandler(AvatarUpdatedEvent, ProfileActivityHandler, 'avatarUpdatedActivityHandler'),
  defineEventHandler(AvatarDeletedEvent, ProfileActivityHandler, 'avatarDeletedActivityHandler'),
  defineEventHandler(
    EmailChangeInitiatedEvent,
    ProfileActivityHandler,
    'emailChangeInitiatedActivityHandler'
  ),
  defineEventHandler(EmailVerifiedEvent, ProfileActivityHandler, 'emailVerifiedActivityHandler'),
  defineEventHandler(
    EmailChangeCancelledEvent,
    ProfileActivityHandler,
    'emailChangeCancelledActivityHandler'
  ),
];

/**
 * Register profile module handlers with the container.
 */
export function registerProfileModule(container: AwilixContainer<Cradle>): void {
  // Register repository
  container.register({
    profileRepository: asClass(ProfileRepository).singleton(),
  });

  // Register query handlers
  container.register({
    getProfileHandler: asClass(GetProfileHandler).singleton(),
  });

  // Register command handlers
  container.register({
    updateProfileHandler: asClass(UpdateProfileHandler).singleton(),
    updatePreferencesHandler: asClass(UpdatePreferencesHandler).singleton(),
    updateAvatarHandler: asClass(UpdateAvatarHandler).singleton(),
    deleteAvatarHandler: asClass(DeleteAvatarHandler).singleton(),
    initiateEmailChangeHandler: asClass(InitiateEmailChangeHandler).singleton(),
    verifyEmailChangeHandler: asClass(VerifyEmailChangeHandler).singleton(),
    cancelEmailChangeHandler: asClass(CancelEmailChangeHandler).singleton(),
  });

  // Register event handlers for activity logging
  // Generic handler for resolving by name
  container.register({
    profileActivityHandler: asClass(ProfileActivityHandler).singleton(),
  });
  // Per-event handlers (used internally for event routing)
  container.register({
    profileUpdatedActivityHandler: asClass(ProfileActivityHandler).singleton(),
    preferencesUpdatedActivityHandler: asClass(ProfileActivityHandler).singleton(),
    avatarUpdatedActivityHandler: asClass(ProfileActivityHandler).singleton(),
    avatarDeletedActivityHandler: asClass(ProfileActivityHandler).singleton(),
    emailChangeInitiatedActivityHandler: asClass(ProfileActivityHandler).singleton(),
    emailVerifiedActivityHandler: asClass(ProfileActivityHandler).singleton(),
    emailChangeCancelledActivityHandler: asClass(ProfileActivityHandler).singleton(),
  });

  // Register with buses using type-safe registrations
  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
