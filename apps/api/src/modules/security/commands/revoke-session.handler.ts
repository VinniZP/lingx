import type { SecurityService } from '../../../services/security.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { SessionRevokedEvent } from '../events/session-revoked.event.js';
import type { RevokeSessionCommand } from './revoke-session.command.js';

/**
 * Handler for RevokeSessionCommand.
 * Revokes a specific session and publishes event.
 */
export class RevokeSessionHandler implements ICommandHandler<RevokeSessionCommand> {
  constructor(
    private readonly securityService: SecurityService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: RevokeSessionCommand): Promise<InferCommandResult<RevokeSessionCommand>> {
    await this.securityService.revokeSession(
      command.userId,
      command.targetSessionId,
      command.currentSessionId
    );

    await this.eventBus.publish(new SessionRevokedEvent(command.userId, command.targetSessionId));
  }
}
