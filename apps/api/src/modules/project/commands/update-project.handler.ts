import { NotFoundError, ValidationError } from '../../../plugins/error-handler.js';
import type { AccessService } from '../../../services/access.service.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ProjectUpdatedEvent } from '../events/project-updated.event.js';
import type { ProjectRepository } from '../project.repository.js';
import type { UpdateProjectCommand } from './update-project.command.js';

/**
 * Handler for UpdateProjectCommand.
 * Updates a project and emits ProjectUpdatedEvent.
 */
export class UpdateProjectHandler implements ICommandHandler<UpdateProjectCommand> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly accessService: AccessService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: UpdateProjectCommand): Promise<InferCommandResult<UpdateProjectCommand>> {
    // Find project by ID or slug
    const project = await this.projectRepository.findByIdOrSlug(command.projectIdOrSlug);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user has MANAGER or OWNER role
    await this.accessService.verifyProjectAccess(command.userId, project.id, ['MANAGER', 'OWNER']);

    const { updates } = command;

    // Validate default language is in language codes if both are being updated
    if (updates.languageCodes && updates.defaultLanguage) {
      if (!updates.languageCodes.includes(updates.defaultLanguage)) {
        throw new ValidationError('Default language must be included in language codes');
      }
    }

    // Track changed fields
    const changedFields: string[] = [];
    const previousValues: Record<string, unknown> = {};

    if (updates.name !== undefined && updates.name !== project.name) {
      changedFields.push('name');
      previousValues.name = project.name;
    }
    if (updates.description !== undefined && updates.description !== project.description) {
      changedFields.push('description');
      previousValues.description = project.description;
    }
    if (updates.languageCodes !== undefined) {
      changedFields.push('languageCodes');
      previousValues.languageCodes = project.languages.map((l) => l.code);
    }
    if (
      updates.defaultLanguage !== undefined &&
      updates.defaultLanguage !== project.defaultLanguage
    ) {
      changedFields.push('defaultLanguage');
      previousValues.defaultLanguage = project.defaultLanguage;
    }

    // Update project
    const updated = await this.projectRepository.update(project.id, updates);

    // Emit event only if there were actual changes
    if (changedFields.length > 0) {
      await this.eventBus.publish(
        new ProjectUpdatedEvent(updated, command.userId, changedFields, previousValues)
      );
    }

    return updated;
  }
}
