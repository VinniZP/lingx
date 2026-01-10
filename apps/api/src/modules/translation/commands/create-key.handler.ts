import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { KeyCreatedEvent } from '../events/key-created.event.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { CreateKeyCommand } from './create-key.command.js';

/**
 * Handler for CreateKeyCommand.
 * Creates a new translation key and emits KeyCreatedEvent.
 *
 * Authorization: Requires project membership via branch access.
 */
export class CreateKeyHandler implements ICommandHandler<CreateKeyCommand> {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateKeyCommand): Promise<InferCommandResult<CreateKeyCommand>> {
    const { branchId, name, namespace, description, userId } = command;

    // Verify user has access to the branch and get project info
    const projectInfo = await this.accessService.verifyBranchAccess(userId, branchId);

    // Create the key
    const key = await this.translationRepository.createKey({
      branchId,
      name,
      namespace,
      description: description ?? undefined,
    });

    // Emit event for side effects (activity logging, etc.)
    await this.eventBus.publish(new KeyCreatedEvent(key, userId, projectInfo.projectId, branchId));

    return key;
  }
}
