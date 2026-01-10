import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { KeysDeletedEvent } from '../events/key-deleted.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { BulkDeleteKeysCommand } from './bulk-delete-keys.command.js';

/**
 * Handler for BulkDeleteKeysCommand.
 * Deletes multiple translation keys in a transaction (all-or-nothing).
 *
 * Authorization: Requires project membership via branch access.
 */
export class BulkDeleteKeysHandler implements ICommandHandler<BulkDeleteKeysCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: BulkDeleteKeysCommand
  ): Promise<InferCommandResult<BulkDeleteKeysCommand>> {
    const { branchId, keyIds, userId } = command;

    // Verify user has access to the branch
    const projectInfo = await this.accessService.verifyBranchAccess(userId, branchId);

    // Delete keys (returns deleted keys for event)
    const { count, keys } = await this.translationRepository.bulkDeleteKeys(branchId, keyIds);

    // Emit event for side effects (activity logging, etc.)
    if (keys.length > 0) {
      await this.eventBus.publish(
        new KeysDeletedEvent(keys, userId, projectInfo.projectId, branchId)
      );
    }

    return count;
  }
}
