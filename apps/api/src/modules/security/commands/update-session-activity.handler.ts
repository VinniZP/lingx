import type { FastifyBaseLogger } from 'fastify';
import type { ICommandHandler } from '../../../shared/cqrs/index.js';
import type { SessionRepository } from '../session.repository.js';
import type { UpdateSessionActivityCommand } from './update-session-activity.command.js';

/**
 * Handler for UpdateSessionActivityCommand.
 * Updates session last activity timestamp.
 * Fire-and-forget - continues execution even on error, but logs for debugging.
 */
export class UpdateSessionActivityHandler implements ICommandHandler<UpdateSessionActivityCommand> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly logger: FastifyBaseLogger
  ) {}

  async execute(command: UpdateSessionActivityCommand): Promise<void> {
    try {
      await this.sessionRepository.updateLastActive(command.sessionId);
    } catch (err) {
      // Log unexpected errors for debugging (P2025 "not found" is expected if session deleted)
      const isPrismaNotFound =
        err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025';
      if (!isPrismaNotFound) {
        this.logger.warn(
          { err, sessionId: command.sessionId },
          'Failed to update session activity (fire-and-forget)'
        );
      }
    }
  }
}
