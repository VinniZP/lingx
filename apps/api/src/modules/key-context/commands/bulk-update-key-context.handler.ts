import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { KeyContextUpdatedEvent } from '../events/key-context-updated.event.js';
import type { KeyContextService } from '../key-context.service.js';
import type { BulkUpdateKeyContextCommand } from './bulk-update-key-context.command.js';

/**
 * Handler for BulkUpdateKeyContextCommand.
 * Updates key source context metadata and emits event.
 */
export class BulkUpdateKeyContextHandler implements ICommandHandler<BulkUpdateKeyContextCommand> {
  constructor(
    private readonly keyContextService: KeyContextService,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: BulkUpdateKeyContextCommand
  ): Promise<InferCommandResult<BulkUpdateKeyContextCommand>> {
    await this.accessService.verifyBranchAccess(command.userId, command.branchId);

    const result = await this.keyContextService.updateKeyContext(command.branchId, command.keys);

    await this.eventBus.publish(
      new KeyContextUpdatedEvent(command.branchId, result.updated, result.notFound, command.userId)
    );

    return result;
  }
}
