import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import {
  AppError,
  FieldValidationError,
  NotFoundError,
  ValidationError,
} from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { BranchCreatedEvent } from '../events/branch-created.event.js';
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { CreateBranchCommand } from './create-branch.command.js';

/**
 * Handler for CreateBranchCommand.
 * Creates a new branch with copy-on-write from source branch.
 *
 * Per ADR-0002: When creating a branch, all TranslationKeys and Translations
 * are copied from the source branch to the new branch in a transaction.
 */
export class CreateBranchHandler implements ICommandHandler<CreateBranchCommand> {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateBranchCommand): Promise<InferCommandResult<CreateBranchCommand>> {
    const { name, spaceId, fromBranchId, userId } = command;

    // Get project ID from space for authorization
    const projectId = await this.branchRepository.getProjectIdBySpaceId(spaceId);
    if (!projectId) {
      throw new NotFoundError('Space');
    }

    // Verify user has access to the project
    await this.accessService.verifyProjectAccess(userId, projectId);

    // Verify source branch exists
    const sourceBranch = await this.branchRepository.findById(fromBranchId);
    if (!sourceBranch) {
      throw new NotFoundError('Source branch');
    }

    // Verify source branch belongs to the same space
    if (sourceBranch.spaceId !== spaceId) {
      throw new ValidationError('Source branch must belong to the same space');
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    // Check for duplicate slug within space
    const existing = await this.branchRepository.findBySpaceAndSlug(spaceId, slug);
    if (existing) {
      throw new FieldValidationError(
        [
          {
            field: 'name',
            message: 'A branch with this name already exists in this space',
            code: UNIQUE_VIOLATION_CODES.BRANCH_SLUG,
          },
        ],
        'Branch with this name already exists in the space'
      );
    }

    // Copy-on-write: Create branch and copy all keys/translations in a transaction
    let newBranchId: string | undefined;
    await this.branchRepository.transaction(async (tx) => {
      // Create the new branch within transaction
      const newBranch = await this.branchRepository.create(
        {
          name,
          slug,
          spaceId,
          sourceBranchId: fromBranchId,
          isDefault: false,
        },
        tx
      );
      newBranchId = newBranch.id;

      // Copy keys and translations from source branch
      await this.branchRepository.copyKeysAndTranslations(fromBranchId, newBranch.id, tx);
    });

    // Verify transaction completed successfully
    if (!newBranchId) {
      throw new AppError('Transaction completed but branch ID was not set', 500, 'INTERNAL_ERROR');
    }

    // Fetch the complete branch with details
    const branch = await this.branchRepository.findByIdWithKeyCount(newBranchId);
    if (!branch) {
      throw new AppError(
        'Branch was created but could not be retrieved',
        500,
        'BRANCH_RETRIEVAL_FAILED'
      );
    }

    // Emit event for side effects (activity logging, etc.)
    await this.eventBus.publish(
      new BranchCreatedEvent(branch, sourceBranch.name, fromBranchId, userId)
    );

    return branch;
  }
}
