import type { ICommandHandler } from '../../../shared/cqrs/index.js';
import type { SessionRepository } from '../session.repository.js';
import type { CleanupExpiredSessionsCommand } from './cleanup-expired-sessions.command.js';

/**
 * Handler for CleanupExpiredSessionsCommand.
 * Deletes all expired sessions from the database.
 * Returns the count of deleted sessions.
 */
export class CleanupExpiredSessionsHandler implements ICommandHandler<CleanupExpiredSessionsCommand> {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(_command: CleanupExpiredSessionsCommand): Promise<number> {
    return this.sessionRepository.deleteExpired();
  }
}
