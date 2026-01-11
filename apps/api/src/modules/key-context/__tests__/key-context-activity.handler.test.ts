import type { RelationshipType } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyContextUpdatedEvent } from '../events/key-context-updated.event.js';
import { RelationshipsAnalyzedEvent } from '../events/relationships-analyzed.event.js';
import { KeyContextActivityHandler } from '../handlers/key-context-activity.handler.js';

describe('KeyContextActivityHandler', () => {
  const mockLogger: { info: ReturnType<typeof vi.fn> } = {
    info: vi.fn(),
  };

  const createHandler = () =>
    new KeyContextActivityHandler(mockLogger as unknown as FastifyBaseLogger);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('KeyContextUpdatedEvent handling', () => {
    it('should log KeyContextUpdatedEvent with correct payload', async () => {
      const handler = createHandler();

      const event = new KeyContextUpdatedEvent('branch-1', 10, 2, 'user-1');

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          type: 'key_context_updated',
          branchId: 'branch-1',
          updated: 10,
          notFound: 2,
          userId: 'user-1',
        },
        '[Key Context Activity] Key context updated'
      );
    });

    it('should log zero updates correctly', async () => {
      const handler = createHandler();

      const event = new KeyContextUpdatedEvent('branch-1', 0, 5, 'user-1');

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'key_context_updated',
          updated: 0,
          notFound: 5,
        }),
        expect.any(String)
      );
    });
  });

  describe('RelationshipsAnalyzedEvent handling', () => {
    it('should log RelationshipsAnalyzedEvent with correct payload', async () => {
      const handler = createHandler();

      const event = new RelationshipsAnalyzedEvent(
        'branch-1',
        'job-123',
        ['SEMANTIC'] as RelationshipType[],
        'user-1'
      );

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          type: 'relationships_analyzed',
          branchId: 'branch-1',
          jobId: 'job-123',
          types: ['SEMANTIC'],
          userId: 'user-1',
        },
        '[Key Context Activity] Relationships analyzed'
      );
    });

    it('should log multiple relationship types', async () => {
      const handler = createHandler();

      const event = new RelationshipsAnalyzedEvent(
        'branch-1',
        'job-456',
        ['SEMANTIC', 'SAME_FILE', 'NEARBY'] as RelationshipType[],
        'user-1'
      );

      await handler.handle(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'relationships_analyzed',
          types: ['SEMANTIC', 'SAME_FILE', 'NEARBY'],
        }),
        expect.any(String)
      );
    });
  });

  describe('event type discrimination', () => {
    it('should correctly identify KeyContextUpdatedEvent by "updated" property', async () => {
      const handler = createHandler();

      // KeyContextUpdatedEvent has 'updated' property
      const updateEvent = new KeyContextUpdatedEvent('branch-1', 5, 0, 'user-1');
      await handler.handle(updateEvent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'key_context_updated' }),
        expect.any(String)
      );
    });

    it('should correctly identify RelationshipsAnalyzedEvent by absence of "updated" property', async () => {
      const handler = createHandler();

      // RelationshipsAnalyzedEvent does not have 'updated' property
      const analyzeEvent = new RelationshipsAnalyzedEvent(
        'branch-1',
        'job-789',
        ['SEMANTIC'] as RelationshipType[],
        'user-1'
      );
      await handler.handle(analyzeEvent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'relationships_analyzed' }),
        expect.any(String)
      );
    });

    it('should handle both event types in sequence', async () => {
      const handler = createHandler();

      const updateEvent = new KeyContextUpdatedEvent('branch-1', 3, 1, 'user-1');
      const analyzeEvent = new RelationshipsAnalyzedEvent(
        'branch-2',
        'job-abc',
        ['SAME_FILE'] as RelationshipType[],
        'user-2'
      );

      await handler.handle(updateEvent);
      await handler.handle(analyzeEvent);

      expect(mockLogger.info).toHaveBeenCalledTimes(2);

      // First call: KeyContextUpdatedEvent
      expect(mockLogger.info).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ type: 'key_context_updated', branchId: 'branch-1' }),
        expect.any(String)
      );

      // Second call: RelationshipsAnalyzedEvent
      expect(mockLogger.info).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ type: 'relationships_analyzed', branchId: 'branch-2' }),
        expect.any(String)
      );
    });
  });
});
