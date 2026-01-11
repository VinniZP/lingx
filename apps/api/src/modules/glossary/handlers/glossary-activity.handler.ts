import type { IEventHandler } from '../../../shared/cqrs/index.js';
import type { GlossaryEntryCreatedEvent } from '../events/glossary-entry-created.event.js';
import type { GlossaryEntryDeletedEvent } from '../events/glossary-entry-deleted.event.js';
import type { GlossaryEntryUpdatedEvent } from '../events/glossary-entry-updated.event.js';
import type { GlossaryImportedEvent } from '../events/glossary-imported.event.js';
import type { GlossaryTagCreatedEvent } from '../events/glossary-tag-created.event.js';
import type { GlossaryTagDeletedEvent } from '../events/glossary-tag-deleted.event.js';
import type { GlossaryTagUpdatedEvent } from '../events/glossary-tag-updated.event.js';
import type { GlossaryTranslationDeletedEvent } from '../events/glossary-translation-deleted.event.js';
import type { GlossaryTranslationUpdatedEvent } from '../events/glossary-translation-updated.event.js';

/**
 * Event handler for glossary activity logging.
 * Logs all glossary-related events for audit purposes.
 */
export class GlossaryActivityHandler
  implements
    IEventHandler<GlossaryEntryCreatedEvent>,
    IEventHandler<GlossaryEntryUpdatedEvent>,
    IEventHandler<GlossaryEntryDeletedEvent>,
    IEventHandler<GlossaryTranslationUpdatedEvent>,
    IEventHandler<GlossaryTranslationDeletedEvent>,
    IEventHandler<GlossaryTagCreatedEvent>,
    IEventHandler<GlossaryTagUpdatedEvent>,
    IEventHandler<GlossaryTagDeletedEvent>,
    IEventHandler<GlossaryImportedEvent>
{
  async handle(
    _event:
      | GlossaryEntryCreatedEvent
      | GlossaryEntryUpdatedEvent
      | GlossaryEntryDeletedEvent
      | GlossaryTranslationUpdatedEvent
      | GlossaryTranslationDeletedEvent
      | GlossaryTagCreatedEvent
      | GlossaryTagUpdatedEvent
      | GlossaryTagDeletedEvent
      | GlossaryImportedEvent
  ): Promise<void> {
    // TODO: Implement activity logging when ActivityService is available
    // For now, this is a placeholder for future audit logging functionality
    // Example: await this.activityService.log(event);
  }
}
