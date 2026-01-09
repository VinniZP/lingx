/**
 * MFA Module
 *
 * CQRS-lite module for Multi-Factor Authentication operations.
 * Includes TOTP, WebAuthn/Passkeys, and Device Trust functionality.
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

// ============================================
// Services & Repositories
// ============================================
import { TotpCryptoService } from './shared/totp-crypto.service.js';
import { WebAuthnConfigService } from './shared/webauthn-config.service.js';
import { TotpRepository } from './totp/totp.repository.js';
import { WebAuthnRepository } from './webauthn/webauthn.repository.js';

// ============================================
// TOTP Commands
// ============================================
import { CancelTotpSetupCommand } from './totp/commands/cancel-totp-setup.command.js';
import { CancelTotpSetupHandler } from './totp/commands/cancel-totp-setup.handler.js';
import { ConfirmTotpSetupCommand } from './totp/commands/confirm-totp-setup.command.js';
import { ConfirmTotpSetupHandler } from './totp/commands/confirm-totp-setup.handler.js';
import { DisableTotpCommand } from './totp/commands/disable-totp.command.js';
import { DisableTotpHandler } from './totp/commands/disable-totp.handler.js';
import { InitiateTotpSetupCommand } from './totp/commands/initiate-totp-setup.command.js';
import { InitiateTotpSetupHandler } from './totp/commands/initiate-totp-setup.handler.js';
import { RegenerateBackupCodesCommand } from './totp/commands/regenerate-backup-codes.command.js';
import { RegenerateBackupCodesHandler } from './totp/commands/regenerate-backup-codes.handler.js';
import { VerifyBackupCodeCommand } from './totp/commands/verify-backup-code.command.js';
import { VerifyBackupCodeHandler } from './totp/commands/verify-backup-code.handler.js';
import { VerifyTotpCommand } from './totp/commands/verify-totp.command.js';
import { VerifyTotpHandler } from './totp/commands/verify-totp.handler.js';

// ============================================
// TOTP Queries
// ============================================
import { GetTotpStatusHandler } from './totp/queries/get-totp-status.handler.js';
import { GetTotpStatusQuery } from './totp/queries/get-totp-status.query.js';
import { IsTotpEnabledHandler } from './totp/queries/is-totp-enabled.handler.js';
import { IsTotpEnabledQuery } from './totp/queries/is-totp-enabled.query.js';

// ============================================
// WebAuthn Commands
// ============================================
import { DeleteCredentialCommand } from './webauthn/commands/delete-credential.command.js';
import { DeleteCredentialHandler } from './webauthn/commands/delete-credential.handler.js';
import { GenerateAuthenticationOptionsCommand } from './webauthn/commands/generate-authentication-options.command.js';
import { GenerateAuthenticationOptionsHandler } from './webauthn/commands/generate-authentication-options.handler.js';
import { GenerateRegistrationOptionsCommand } from './webauthn/commands/generate-registration-options.command.js';
import { GenerateRegistrationOptionsHandler } from './webauthn/commands/generate-registration-options.handler.js';
import { GoPasswordlessCommand } from './webauthn/commands/go-passwordless.command.js';
import { GoPasswordlessHandler } from './webauthn/commands/go-passwordless.handler.js';
import { VerifyAuthenticationCommand } from './webauthn/commands/verify-authentication.command.js';
import { VerifyAuthenticationHandler } from './webauthn/commands/verify-authentication.handler.js';
import { VerifyRegistrationCommand } from './webauthn/commands/verify-registration.command.js';
import { VerifyRegistrationHandler } from './webauthn/commands/verify-registration.handler.js';

// ============================================
// WebAuthn Queries
// ============================================
import { GetWebAuthnCredentialsHandler } from './webauthn/queries/get-webauthn-credentials.handler.js';
import { GetWebAuthnCredentialsQuery } from './webauthn/queries/get-webauthn-credentials.query.js';
import { GetWebAuthnStatusHandler } from './webauthn/queries/get-webauthn-status.handler.js';
import { GetWebAuthnStatusQuery } from './webauthn/queries/get-webauthn-status.query.js';
import { HasPasskeysHandler } from './webauthn/queries/has-passkeys.handler.js';
import { HasPasskeysQuery } from './webauthn/queries/has-passkeys.query.js';
import { IsPasswordlessHandler } from './webauthn/queries/is-passwordless.handler.js';
import { IsPasswordlessQuery } from './webauthn/queries/is-passwordless.query.js';

// ============================================
// Device Trust Commands & Queries
// ============================================
import { RevokeTrustCommand } from './device-trust/commands/revoke-trust.command.js';
import { RevokeTrustHandler } from './device-trust/commands/revoke-trust.handler.js';
import { TrustDeviceCommand } from './device-trust/commands/trust-device.command.js';
import { TrustDeviceHandler } from './device-trust/commands/trust-device.handler.js';
import { IsDeviceTrustedHandler } from './device-trust/queries/is-device-trusted.handler.js';
import { IsDeviceTrustedQuery } from './device-trust/queries/is-device-trusted.query.js';

// ============================================
// Events
// ============================================
import { BackupCodeUsedEvent } from './events/backup-code-used.event.js';
import { BackupCodesRegeneratedEvent } from './events/backup-codes-regenerated.event.js';
import { DeviceTrustRevokedEvent } from './events/device-trust-revoked.event.js';
import { DeviceTrustedEvent } from './events/device-trusted.event.js';
import { PasskeyAuthenticatedEvent } from './events/passkey-authenticated.event.js';
import { PasskeyDeletedEvent } from './events/passkey-deleted.event.js';
import { PasskeyRegisteredEvent } from './events/passkey-registered.event.js';
import { TotpDisabledEvent } from './events/totp-disabled.event.js';
import { TotpEnabledEvent } from './events/totp-enabled.event.js';
import { TotpVerifiedEvent } from './events/totp-verified.event.js';
import { WentPasswordlessEvent } from './events/went-passwordless.event.js';

// Event handler
import { MfaActivityHandler } from './handlers/mfa-activity.handler.js';

// ============================================
// Re-exports for external use
// ============================================

// TOTP Commands
export { CancelTotpSetupCommand } from './totp/commands/cancel-totp-setup.command.js';
export { ConfirmTotpSetupCommand } from './totp/commands/confirm-totp-setup.command.js';
export { DisableTotpCommand } from './totp/commands/disable-totp.command.js';
export { InitiateTotpSetupCommand } from './totp/commands/initiate-totp-setup.command.js';
export { RegenerateBackupCodesCommand } from './totp/commands/regenerate-backup-codes.command.js';
export { VerifyBackupCodeCommand } from './totp/commands/verify-backup-code.command.js';
export { VerifyTotpCommand } from './totp/commands/verify-totp.command.js';

// TOTP Queries
export { GetTotpStatusQuery } from './totp/queries/get-totp-status.query.js';
export { IsTotpEnabledQuery } from './totp/queries/is-totp-enabled.query.js';

// WebAuthn Commands
export { DeleteCredentialCommand } from './webauthn/commands/delete-credential.command.js';
export { GenerateAuthenticationOptionsCommand } from './webauthn/commands/generate-authentication-options.command.js';
export { GenerateRegistrationOptionsCommand } from './webauthn/commands/generate-registration-options.command.js';
export { GoPasswordlessCommand } from './webauthn/commands/go-passwordless.command.js';
export { VerifyAuthenticationCommand } from './webauthn/commands/verify-authentication.command.js';
export { VerifyRegistrationCommand } from './webauthn/commands/verify-registration.command.js';

// WebAuthn Queries
export { GetWebAuthnCredentialsQuery } from './webauthn/queries/get-webauthn-credentials.query.js';
export { GetWebAuthnStatusQuery } from './webauthn/queries/get-webauthn-status.query.js';
export { HasPasskeysQuery } from './webauthn/queries/has-passkeys.query.js';
export { IsPasswordlessQuery } from './webauthn/queries/is-passwordless.query.js';

// Device Trust
export { RevokeTrustCommand } from './device-trust/commands/revoke-trust.command.js';
export { TrustDeviceCommand } from './device-trust/commands/trust-device.command.js';
export { IsDeviceTrustedQuery } from './device-trust/queries/is-device-trusted.query.js';

// Events
export { BackupCodeUsedEvent } from './events/backup-code-used.event.js';
export { BackupCodesRegeneratedEvent } from './events/backup-codes-regenerated.event.js';
export { DeviceTrustRevokedEvent } from './events/device-trust-revoked.event.js';
export { DeviceTrustedEvent } from './events/device-trusted.event.js';
export { PasskeyAuthenticatedEvent } from './events/passkey-authenticated.event.js';
export { PasskeyDeletedEvent } from './events/passkey-deleted.event.js';
export { PasskeyRegisteredEvent } from './events/passkey-registered.event.js';
export { TotpDisabledEvent } from './events/totp-disabled.event.js';
export { TotpEnabledEvent } from './events/totp-enabled.event.js';
export { TotpVerifiedEvent } from './events/totp-verified.event.js';
export { WentPasswordlessEvent } from './events/went-passwordless.event.js';

// ============================================
// Handler Registrations
// ============================================

const commandRegistrations = [
  // TOTP Commands
  defineCommandHandler(
    InitiateTotpSetupCommand,
    InitiateTotpSetupHandler,
    'initiateTotpSetupHandler'
  ),
  defineCommandHandler(ConfirmTotpSetupCommand, ConfirmTotpSetupHandler, 'confirmTotpSetupHandler'),
  defineCommandHandler(CancelTotpSetupCommand, CancelTotpSetupHandler, 'cancelTotpSetupHandler'),
  defineCommandHandler(VerifyTotpCommand, VerifyTotpHandler, 'verifyTotpHandler'),
  defineCommandHandler(VerifyBackupCodeCommand, VerifyBackupCodeHandler, 'verifyBackupCodeHandler'),
  defineCommandHandler(DisableTotpCommand, DisableTotpHandler, 'disableTotpHandler'),
  defineCommandHandler(
    RegenerateBackupCodesCommand,
    RegenerateBackupCodesHandler,
    'regenerateBackupCodesHandler'
  ),
  // WebAuthn Commands
  defineCommandHandler(
    GenerateRegistrationOptionsCommand,
    GenerateRegistrationOptionsHandler,
    'generateRegistrationOptionsHandler'
  ),
  defineCommandHandler(
    VerifyRegistrationCommand,
    VerifyRegistrationHandler,
    'verifyRegistrationHandler'
  ),
  defineCommandHandler(
    GenerateAuthenticationOptionsCommand,
    GenerateAuthenticationOptionsHandler,
    'generateAuthenticationOptionsHandler'
  ),
  defineCommandHandler(
    VerifyAuthenticationCommand,
    VerifyAuthenticationHandler,
    'verifyAuthenticationHandler'
  ),
  defineCommandHandler(DeleteCredentialCommand, DeleteCredentialHandler, 'deleteCredentialHandler'),
  defineCommandHandler(GoPasswordlessCommand, GoPasswordlessHandler, 'goPasswordlessHandler'),
  // Device Trust Commands
  defineCommandHandler(TrustDeviceCommand, TrustDeviceHandler, 'trustDeviceHandler'),
  defineCommandHandler(RevokeTrustCommand, RevokeTrustHandler, 'revokeTrustHandler'),
];

const queryRegistrations = [
  // TOTP Queries
  defineQueryHandler(GetTotpStatusQuery, GetTotpStatusHandler, 'getTotpStatusHandler'),
  defineQueryHandler(IsTotpEnabledQuery, IsTotpEnabledHandler, 'isTotpEnabledHandler'),
  // WebAuthn Queries
  defineQueryHandler(GetWebAuthnStatusQuery, GetWebAuthnStatusHandler, 'getWebAuthnStatusHandler'),
  defineQueryHandler(
    GetWebAuthnCredentialsQuery,
    GetWebAuthnCredentialsHandler,
    'getWebAuthnCredentialsHandler'
  ),
  defineQueryHandler(IsPasswordlessQuery, IsPasswordlessHandler, 'isPasswordlessHandler'),
  defineQueryHandler(HasPasskeysQuery, HasPasskeysHandler, 'hasPasskeysHandler'),
  // Device Trust Queries
  defineQueryHandler(IsDeviceTrustedQuery, IsDeviceTrustedHandler, 'isDeviceTrustedHandler'),
];

const eventRegistrations = [
  // All MFA events go to MfaActivityHandler for logging
  defineEventHandler(TotpEnabledEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(TotpDisabledEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(TotpVerifiedEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(BackupCodeUsedEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(BackupCodesRegeneratedEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(PasskeyRegisteredEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(PasskeyAuthenticatedEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(PasskeyDeletedEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(WentPasswordlessEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(DeviceTrustedEvent, MfaActivityHandler, 'mfaActivityHandler'),
  defineEventHandler(DeviceTrustRevokedEvent, MfaActivityHandler, 'mfaActivityHandler'),
];

/**
 * Register MFA module handlers with the container.
 */
export function registerMfaModule(container: AwilixContainer<Cradle>): void {
  // Register services
  container.register({
    totpCryptoService: asClass(TotpCryptoService).singleton(),
    webAuthnConfigService: asClass(WebAuthnConfigService).singleton(),
  });

  // Register repositories
  container.register({
    totpRepository: asClass(TotpRepository).singleton(),
    webAuthnRepository: asClass(WebAuthnRepository).singleton(),
  });

  // Register TOTP command handlers
  container.register({
    initiateTotpSetupHandler: asClass(InitiateTotpSetupHandler).singleton(),
    confirmTotpSetupHandler: asClass(ConfirmTotpSetupHandler).singleton(),
    cancelTotpSetupHandler: asClass(CancelTotpSetupHandler).singleton(),
    verifyTotpHandler: asClass(VerifyTotpHandler).singleton(),
    verifyBackupCodeHandler: asClass(VerifyBackupCodeHandler).singleton(),
    disableTotpHandler: asClass(DisableTotpHandler).singleton(),
    regenerateBackupCodesHandler: asClass(RegenerateBackupCodesHandler).singleton(),
  });

  // Register TOTP query handlers
  container.register({
    getTotpStatusHandler: asClass(GetTotpStatusHandler).singleton(),
    isTotpEnabledHandler: asClass(IsTotpEnabledHandler).singleton(),
  });

  // Register WebAuthn command handlers
  container.register({
    generateRegistrationOptionsHandler: asClass(GenerateRegistrationOptionsHandler).singleton(),
    verifyRegistrationHandler: asClass(VerifyRegistrationHandler).singleton(),
    generateAuthenticationOptionsHandler: asClass(GenerateAuthenticationOptionsHandler).singleton(),
    verifyAuthenticationHandler: asClass(VerifyAuthenticationHandler).singleton(),
    deleteCredentialHandler: asClass(DeleteCredentialHandler).singleton(),
    goPasswordlessHandler: asClass(GoPasswordlessHandler).singleton(),
  });

  // Register WebAuthn query handlers
  container.register({
    getWebAuthnStatusHandler: asClass(GetWebAuthnStatusHandler).singleton(),
    getWebAuthnCredentialsHandler: asClass(GetWebAuthnCredentialsHandler).singleton(),
    isPasswordlessHandler: asClass(IsPasswordlessHandler).singleton(),
    hasPasskeysHandler: asClass(HasPasskeysHandler).singleton(),
  });

  // Register Device Trust handlers
  container.register({
    trustDeviceHandler: asClass(TrustDeviceHandler).singleton(),
    revokeTrustHandler: asClass(RevokeTrustHandler).singleton(),
    isDeviceTrustedHandler: asClass(IsDeviceTrustedHandler).singleton(),
  });

  // Register event handler
  container.register({
    mfaActivityHandler: asClass(MfaActivityHandler).singleton(),
  });

  // Register with buses
  const commandBus = container.resolve('commandBus');
  registerCommandHandlers(commandBus, commandRegistrations);

  const queryBus = container.resolve('queryBus');
  registerQueryHandlers(queryBus, queryRegistrations);

  const eventBus = container.resolve('eventBus');
  registerEventHandlers(eventBus, eventRegistrations);
}
