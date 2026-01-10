import type { FastifyBaseLogger } from 'fastify';
import { translationMemoryQueue } from '../../../lib/queues.js';
import type { IEvent, IEventHandler } from '../../../shared/cqrs/index.js';
import type { TMJobData } from '../../../workers/translation-memory.worker.js';
import {
  TranslationApprovedEvent,
  TranslationsBatchApprovedEvent,
} from '../events/translation-approved.event.js';

type ApprovalEvent = TranslationApprovedEvent | TranslationsBatchApprovedEvent;

/**
 * Event handler for queueing translation memory indexing jobs.
 * Only approved translations are indexed.
 */
export class TranslationMemoryHandler implements IEventHandler<ApprovalEvent> {
  constructor(private readonly logger: FastifyBaseLogger) {}

  async handle(event: IEvent): Promise<void> {
    try {
      const eventName = event.constructor.name;

      switch (eventName) {
        case 'TranslationApprovedEvent':
          await this.handleTranslationApproved(event as TranslationApprovedEvent);
          break;
        case 'TranslationsBatchApprovedEvent':
          await this.handleTranslationsBatchApproved(event as TranslationsBatchApprovedEvent);
          break;
        default:
          // Ignore other events
          break;
      }
    } catch (error) {
      this.logger.error(
        { error, eventType: event.constructor.name },
        'Failed to queue TM indexing job'
      );
    }
  }

  private async handleTranslationApproved(event: TranslationApprovedEvent): Promise<void> {
    // Only index approved translations
    if (event.status !== 'APPROVED') return;

    const tmJob: TMJobData = {
      type: 'index-approved',
      projectId: event.projectId,
      translationId: event.translation.id,
    };

    await translationMemoryQueue.add('index-approved', tmJob);
  }

  private async handleTranslationsBatchApproved(
    event: TranslationsBatchApprovedEvent
  ): Promise<void> {
    // Only index approved translations
    if (event.status !== 'APPROVED') return;

    const tmJobs = event.translationIds.map((translationId) => ({
      name: 'index-approved',
      data: {
        type: 'index-approved' as const,
        projectId: event.projectId,
        translationId,
      },
    }));

    await translationMemoryQueue.addBulk(tmJobs);
  }
}
