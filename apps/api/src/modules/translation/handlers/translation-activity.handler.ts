import type { FastifyBaseLogger } from 'fastify';
import type { ActivityService } from '../../../services/activity.service.js';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';
import { KeyCreatedEvent } from '../events/key-created.event.js';
import { KeyDeletedEvent, KeysDeletedEvent } from '../events/key-deleted.event.js';
import { KeyUpdatedEvent } from '../events/key-updated.event.js';
import {
  TranslationApprovedEvent,
  TranslationsBatchApprovedEvent,
} from '../events/translation-approved.event.js';
import {
  KeyTranslationsUpdatedEvent,
  TranslationUpdatedEvent,
} from '../events/translation-updated.event.js';
import { TranslationsImportedEvent } from '../events/translations-imported.event.js';

type TranslationEvent =
  | KeyCreatedEvent
  | KeyUpdatedEvent
  | KeyDeletedEvent
  | KeysDeletedEvent
  | TranslationUpdatedEvent
  | KeyTranslationsUpdatedEvent
  | TranslationApprovedEvent
  | TranslationsBatchApprovedEvent
  | TranslationsImportedEvent;

/**
 * Event handler for logging translation-related activities.
 */
export class TranslationActivityHandler implements IEventHandler<TranslationEvent> {
  constructor(
    private readonly activityService: ActivityService,
    private readonly logger: FastifyBaseLogger
  ) {}

  async handle(event: IEvent): Promise<void> {
    try {
      const eventName = event.constructor.name;

      switch (eventName) {
        case 'KeyCreatedEvent':
          await this.handleKeyCreated(event as KeyCreatedEvent);
          break;
        case 'KeyUpdatedEvent':
          // Key updates are not logged as separate activities
          // (translation changes are logged separately)
          break;
        case 'KeyDeletedEvent':
          await this.handleKeyDeleted(event as KeyDeletedEvent);
          break;
        case 'KeysDeletedEvent':
          await this.handleKeysDeleted(event as KeysDeletedEvent);
          break;
        case 'TranslationUpdatedEvent':
          await this.handleTranslationUpdated(event as TranslationUpdatedEvent);
          break;
        case 'KeyTranslationsUpdatedEvent':
          await this.handleKeyTranslationsUpdated(event as KeyTranslationsUpdatedEvent);
          break;
        case 'TranslationApprovedEvent':
          await this.handleTranslationApproved(event as TranslationApprovedEvent);
          break;
        case 'TranslationsBatchApprovedEvent':
          await this.handleTranslationsBatchApproved(event as TranslationsBatchApprovedEvent);
          break;
        case 'TranslationsImportedEvent':
          await this.handleTranslationsImported(event as TranslationsImportedEvent);
          break;
        default:
          this.logger.error({ eventName }, 'Unknown event type in TranslationActivityHandler');
      }
    } catch (error) {
      this.logger.error(
        { error, eventType: event.constructor.name },
        'Failed to log translation activity'
      );
    }
  }

  private async handleKeyCreated(event: KeyCreatedEvent): Promise<void> {
    await this.activityService.log({
      type: 'key_add',
      projectId: event.projectId,
      branchId: event.branchId,
      userId: event.userId,
      metadata: {},
      changes: [
        {
          entityType: 'key',
          entityId: event.key.id,
          keyName: event.key.name,
        },
      ],
    });
  }

  private async handleKeyDeleted(event: KeyDeletedEvent): Promise<void> {
    await this.activityService.log({
      type: 'key_delete',
      projectId: event.projectId,
      branchId: event.branchId,
      userId: event.userId,
      metadata: {},
      changes: [
        {
          entityType: 'key',
          entityId: event.key.id,
          keyName: event.key.name,
        },
      ],
    });
  }

  private async handleKeysDeleted(event: KeysDeletedEvent): Promise<void> {
    await this.activityService.log({
      type: 'key_delete',
      projectId: event.projectId,
      branchId: event.branchId,
      userId: event.userId,
      metadata: {},
      changes: event.keys.map((key) => ({
        entityType: 'key',
        entityId: key.id,
        keyName: key.name,
      })),
    });
  }

  private async handleTranslationUpdated(event: TranslationUpdatedEvent): Promise<void> {
    await this.activityService.log({
      type: 'translation',
      projectId: event.projectId,
      branchId: event.branchId,
      userId: event.userId,
      metadata: {
        languages: [event.translation.language],
      },
      changes: [
        {
          entityType: 'translation',
          entityId: event.translation.id,
          keyName: event.keyName,
          language: event.translation.language,
          oldValue: event.oldValue,
          newValue: event.translation.value,
        },
      ],
    });
  }

  private async handleKeyTranslationsUpdated(event: KeyTranslationsUpdatedEvent): Promise<void> {
    await this.activityService.log({
      type: 'translation',
      projectId: event.projectId,
      branchId: event.branchId,
      userId: event.userId,
      metadata: {
        languages: event.changedLanguages,
      },
      changes: event.changedLanguages.map((lang) => ({
        entityType: 'translation',
        entityId: event.keyId,
        keyName: event.keyName,
        language: lang,
      })),
    });
  }

  private async handleTranslationApproved(event: TranslationApprovedEvent): Promise<void> {
    await this.activityService.log({
      type: event.status === 'APPROVED' ? 'translation_approve' : 'translation_reject',
      projectId: event.projectId,
      branchId: event.branchId,
      userId: event.userId,
      metadata: {
        languages: [event.translation.language],
      },
      changes: [
        {
          entityType: 'translation',
          entityId: event.translation.id,
          keyName: event.keyName,
          language: event.translation.language,
        },
      ],
    });
  }

  private async handleTranslationsBatchApproved(
    event: TranslationsBatchApprovedEvent
  ): Promise<void> {
    await this.activityService.log({
      type: event.status === 'APPROVED' ? 'translation_approve' : 'translation_reject',
      projectId: event.projectId,
      branchId: event.branchId,
      userId: event.userId,
      metadata: {
        keyCount: event.translationIds.length,
      },
      changes: [],
    });
  }

  private async handleTranslationsImported(event: TranslationsImportedEvent): Promise<void> {
    await this.activityService.log({
      type: 'import',
      projectId: event.projectId,
      branchId: event.branchId,
      userId: event.userId,
      metadata: {
        keyCount: event.keyCount,
        languages: event.languages,
        format: 'cli_push',
      },
      changes: [],
    });
  }
}
