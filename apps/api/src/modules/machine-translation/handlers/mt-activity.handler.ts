import type { IEventHandler } from '../../../shared/cqrs/index.js';
import type { ConfigDeletedEvent } from '../events/config-deleted.event.js';
import type { ConfigSavedEvent } from '../events/config-saved.event.js';

/**
 * Event handler for MT configuration changes.
 * Handles activity logging for MT config create/update/delete events.
 */
export class MTActivityHandler
  implements IEventHandler<ConfigSavedEvent>, IEventHandler<ConfigDeletedEvent>
{
  async handle(_event: ConfigSavedEvent | ConfigDeletedEvent): Promise<void> {
    // TODO(audit-logging): Implement activity logging when ActivityService is available.
    // This handler captures MT config create/update/delete events for future audit trail.
    // Implementation should record: eventId, userId, projectId, action type, timestamp.
  }
}
