import { UNIQUE_VIOLATION_CODES } from '@lingx/shared';
import { Prisma } from '@prisma/client';
import { FieldValidationError, ValidationError } from '../../../plugins/error-handler.js';
import type { ICommandHandler, IEventBus, InferCommandResult } from '../../../shared/cqrs/index.js';
import { ProjectCreatedEvent } from '../events/project-created.event.js';
import type { ProjectRepository } from '../project.repository.js';
import type { CreateProjectCommand } from './create-project.command.js';

/**
 * Handler for CreateProjectCommand.
 * Creates a new project with languages, owner membership, and default space+branch.
 */
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand> {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateProjectCommand): Promise<InferCommandResult<CreateProjectCommand>> {
    // Validate default language is in language codes
    if (!command.languageCodes.includes(command.defaultLanguage)) {
      throw new ValidationError('Default language must be included in language codes');
    }

    // Check for duplicate slug
    const slugExists = await this.projectRepository.existsBySlug(command.slug);
    if (slugExists) {
      throw new FieldValidationError(
        [
          {
            field: 'slug',
            message: 'A project with this slug already exists',
            code: UNIQUE_VIOLATION_CODES.PROJECT_SLUG,
          },
        ],
        'Project slug already exists'
      );
    }

    // Create project - handle race condition with unique constraint
    try {
      const project = await this.projectRepository.create({
        name: command.name,
        slug: command.slug,
        description: command.description ?? undefined,
        languageCodes: command.languageCodes,
        defaultLanguage: command.defaultLanguage,
        userId: command.userId,
      });

      // Emit event
      await this.eventBus.publish(new ProjectCreatedEvent(project, command.userId));

      return project;
    } catch (error) {
      // Handle race condition: another request created a project with the same slug
      // between our existence check and create
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new FieldValidationError(
          [
            {
              field: 'slug',
              message: 'A project with this slug already exists',
              code: UNIQUE_VIOLATION_CODES.PROJECT_SLUG,
            },
          ],
          'Project slug already exists'
        );
      }
      throw error;
    }
  }
}
