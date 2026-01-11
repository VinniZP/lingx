import type { FastifyBaseLogger } from 'fastify';
import type { ActivityService } from '../../../services/activity.service.js';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';
import type { SpaceCreatedEvent } from '../events/space-created.event.js';
import type { SpaceDeletedEvent } from '../events/space-deleted.event.js';
import type { SpaceUpdatedEvent } from '../events/space-updated.event.js';

type SpaceEvent = SpaceCreatedEvent | SpaceUpdatedEvent | SpaceDeletedEvent;

/**
 * Event handler for space-related activity logging.
 *
 * Handles:
 * - SpaceCreatedEvent -> logs "space_create" activity
 * - SpaceUpdatedEvent -> logs "space_update" activity
 * - SpaceDeletedEvent -> logs "space_delete" activity
 *
 * NOTE: Activity logging failures are caught and logged but do not propagate.
 * This ensures primary operations (create/update/delete) succeed even if
 * activity logging fails (e.g., Redis unavailable).
 */
export class SpaceActivityHandler implements IEventHandler<SpaceEvent> {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: IEvent): Promise<void> {
    const eventName = event.constructor.name;

    switch (eventName) {
      case 'SpaceCreatedEvent':
        await this.handleSpaceCreated(event as SpaceCreatedEvent);
        break;
      case 'SpaceUpdatedEvent':
        await this.handleSpaceUpdated(event as SpaceUpdatedEvent);
        break;
      case 'SpaceDeletedEvent':
        await this.handleSpaceDeleted(event as SpaceDeletedEvent);
        break;
      default:
        this.logger.warn(
          { eventName, handler: 'SpaceActivityHandler' },
          `Received unknown event type: ${eventName}`
        );
    }
  }

  private async handleSpaceCreated(event: SpaceCreatedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'space_create',
        projectId: event.space.projectId,
        userId: event.userId,
        metadata: {
          spaceName: event.space.name,
          spaceSlug: event.space.slug,
        },
        changes: [
          {
            entityType: 'space',
            entityId: event.space.id,
            newValue: event.space.name,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'SpaceCreatedEvent', spaceId: event.space.id },
        'Failed to log space creation activity'
      );
    }
  }

  private async handleSpaceUpdated(event: SpaceUpdatedEvent): Promise<void> {
    try {
      const changedFields = Object.keys(event.changes).filter(
        (key) => event.changes[key as keyof typeof event.changes] !== undefined
      );

      await this.activityService.log({
        type: 'space_update',
        projectId: event.space.projectId,
        userId: event.userId,
        metadata: {
          spaceName: event.space.name,
          changedFields,
        },
        changes: changedFields.map((field) => ({
          entityType: 'space',
          entityId: event.space.id,
          keyName: field,
          newValue: String((event.space as unknown as Record<string, unknown>)[field] ?? ''),
        })),
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'SpaceUpdatedEvent', spaceId: event.space.id },
        'Failed to log space update activity'
      );
    }
  }

  private async handleSpaceDeleted(event: SpaceDeletedEvent): Promise<void> {
    try {
      await this.activityService.log({
        type: 'space_delete',
        projectId: event.projectId,
        userId: event.userId,
        metadata: {
          spaceId: event.spaceId,
        },
        changes: [
          {
            entityType: 'space',
            entityId: event.spaceId,
          },
        ],
      });
    } catch (error) {
      this.logger.error(
        { error, eventName: 'SpaceDeletedEvent', spaceId: event.spaceId },
        'Failed to log space deletion activity'
      );
    }
  }
}
