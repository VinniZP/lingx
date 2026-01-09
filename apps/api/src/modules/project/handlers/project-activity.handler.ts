import type { FastifyBaseLogger } from 'fastify';
import type { ActivityService } from '../../../services/activity.service.js';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';
import type { ProjectCreatedEvent } from '../events/project-created.event.js';
import type { ProjectDeletedEvent } from '../events/project-deleted.event.js';
import type { ProjectUpdatedEvent } from '../events/project-updated.event.js';

type ProjectEvent = ProjectCreatedEvent | ProjectUpdatedEvent | ProjectDeletedEvent;

/**
 * Event handler for project-related activity logging.
 *
 * Handles:
 * - ProjectCreatedEvent -> logs "project_create" activity
 * - ProjectUpdatedEvent -> logs "project_settings" activity
 * - ProjectDeletedEvent -> logs "project_delete" activity
 *
 * NOTE: Activity logging failures are caught and logged but do not propagate.
 * This ensures primary operations (create/update/delete) succeed even if
 * activity logging fails (e.g., Redis unavailable).
 */
export class ProjectActivityHandler implements IEventHandler<ProjectEvent> {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: IEvent): Promise<void> {
    const eventName = event.constructor.name;

    switch (eventName) {
      case 'ProjectCreatedEvent':
        await this.handleProjectCreated(event as ProjectCreatedEvent);
        break;
      case 'ProjectUpdatedEvent':
        await this.handleProjectUpdated(event as ProjectUpdatedEvent);
        break;
      case 'ProjectDeletedEvent':
        await this.handleProjectDeleted(event as ProjectDeletedEvent);
        break;
      default:
        // Unknown event type - log warning but don't fail
        // This could happen if new events are added but handler not updated
        this.logger.warn(
          { eventName, handler: 'ProjectActivityHandler' },
          `Received unknown event type: ${eventName}`
        );
    }
  }

  private async handleProjectCreated(event: ProjectCreatedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'project_create',
        projectId: event.project.id,
        userId: event.userId,
        metadata: {
          projectName: event.project.name,
          languages: event.project.languages.map((l) => l.code),
        },
        changes: [
          {
            entityType: 'project',
            entityId: event.project.id,
            newValue: event.project.name,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'ProjectCreatedEvent', projectId: event.project.id },
        'Failed to log project creation activity'
      );
    }
  }

  private async handleProjectUpdated(event: ProjectUpdatedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'project_settings',
        projectId: event.project.id,
        userId: event.userId,
        metadata: {
          changedFields: event.changedFields,
        },
        changes: event.changedFields.map((field) => ({
          entityType: 'project',
          entityId: event.project.id,
          keyName: field,
          oldValue: String(event.previousValues[field] ?? ''),
          newValue: String((event.project as unknown as Record<string, unknown>)[field] ?? ''),
        })),
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'ProjectUpdatedEvent', projectId: event.project.id },
        'Failed to log project update activity'
      );
    }
  }

  private async handleProjectDeleted(event: ProjectDeletedEvent): Promise<void> {
    // Note: The project no longer exists at this point, so we log with minimal data
    // The activity record itself may be orphaned but provides audit trail
    try {
      await this.activityService.log({
        type: 'project_delete',
        projectId: event.projectId,
        userId: event.userId,
        metadata: {
          projectName: event.projectName,
        },
        changes: [
          {
            entityType: 'project',
            entityId: event.projectId,
            oldValue: event.projectName,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'ProjectDeletedEvent', projectId: event.projectId },
        'Failed to log project deletion activity'
      );
    }
  }
}
