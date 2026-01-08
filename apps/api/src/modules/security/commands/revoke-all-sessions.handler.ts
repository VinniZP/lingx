import type { SecurityService } from '../../../services/security.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { AllSessionsRevokedEvent } from '../events/all-sessions-revoked.event.js';
import type { RevokeAllSessionsCommand } from './revoke-all-sessions.command.js';

/**
 * Handler for RevokeAllSessionsCommand.
 * Revokes all sessions except current and publishes event.
 */
export class RevokeAllSessionsHandler implements ICommandHandler<RevokeAllSessionsCommand> {
  constructor(
    private readonly securityService: SecurityService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: RevokeAllSessionsCommand
  ): Promise<InferCommandResult<RevokeAllSessionsCommand>> {
    const revokedCount = await this.securityService.revokeAllOtherSessions(
      command.userId,
      command.currentSessionId
    );

    await this.eventBus.publish(
      new AllSessionsRevokedEvent(command.userId, revokedCount, command.currentSessionId)
    );

    return { revokedCount };
  }
}
