import { AppError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import type { AccessService } from '../../access/access.service.js';
import { GlossaryImportedEvent } from '../events/glossary-imported.event.js';
import type { GlossaryRepository, ImportResult } from '../repositories/glossary.repository.js';
import type { ImportGlossaryCommand } from './import-glossary.command.js';

/**
 * Handler for ImportGlossaryCommand.
 * Imports glossary entries from CSV or TBX.
 * Requires MANAGER or OWNER role.
 *
 * Distinguishes between:
 * - Validation errors: Returned in result.errors array (e.g., missing columns, invalid values)
 * - System errors: Thrown as exceptions (e.g., database failures, malformed content)
 */
export class ImportGlossaryHandler implements ICommandHandler<ImportGlossaryCommand> {
  constructor(
    private readonly glossaryRepository: GlossaryRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    command: ImportGlossaryCommand
  ): Promise<InferCommandResult<ImportGlossaryCommand>> {
    await this.accessService.verifyProjectAccess(command.userId, command.projectId, [
      'MANAGER',
      'OWNER',
    ]);

    if (!command.content.trim()) {
      return { imported: 0, skipped: 0, errors: ['No content provided'] };
    }

    let result: ImportResult;
    try {
      result =
        command.format === 'csv'
          ? await this.glossaryRepository.importFromCSV(
              command.projectId,
              command.content,
              command.overwrite,
              command.userId
            )
          : await this.glossaryRepository.importFromTBX(
              command.projectId,
              command.content,
              command.overwrite,
              command.userId
            );
    } catch (error) {
      // System errors (database failures, malformed content) are re-thrown
      // with a clear message indicating this is not a validation error
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(`Import failed due to system error: ${message}`, 500);
    }

    await this.eventBus.publish(
      new GlossaryImportedEvent(command.projectId, command.format, result, command.userId)
    );

    return result;
  }
}
