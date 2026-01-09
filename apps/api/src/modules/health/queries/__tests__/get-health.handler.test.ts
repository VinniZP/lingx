/**
 * GetHealthHandler Unit Tests
 *
 * Tests for health check query handler.
 */

import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { GetHealthHandler } from '../get-health.handler.js';
import { GetHealthQuery } from '../get-health.query.js';

interface MockPrisma {
  $queryRaw: Mock;
}

function createMockPrisma(): MockPrisma {
  return {
    $queryRaw: vi.fn(),
  };
}

interface MockLogger {
  error: Mock;
  warn: Mock;
  info: Mock;
  debug: Mock;
}

function createMockLogger(): MockLogger {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
}

describe('GetHealthHandler', () => {
  let handler: GetHealthHandler;
  let mockPrisma: MockPrisma;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockLogger = createMockLogger();
    handler = new GetHealthHandler(
      mockPrisma as unknown as PrismaClient,
      mockLogger as unknown as FastifyBaseLogger
    );
  });

  describe('execute', () => {
    describe('without details (includeDetails=false)', () => {
      it('should return healthy status without checking database', async () => {
        // Arrange
        const query = new GetHealthQuery(false);

        // Act
        const result = await handler.execute(query);

        // Assert
        expect(result.status).toBe('healthy');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.details).toBeUndefined();
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
      });

      it('should return healthy status with default parameter', async () => {
        // Arrange
        const query = new GetHealthQuery();

        // Act
        const result = await handler.execute(query);

        // Assert
        expect(result.status).toBe('healthy');
        expect(result.details).toBeUndefined();
        expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
      });
    });

    describe('with details (includeDetails=true)', () => {
      it('should return healthy status when database is up', async () => {
        // Arrange
        mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
        const query = new GetHealthQuery(true);

        // Act
        const result = await handler.execute(query);

        // Assert
        expect(result.status).toBe('healthy');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.details).toBeDefined();
        expect(result.details!.database.status).toBe('up');
        expect(result.details!.database.latencyMs).toBeGreaterThanOrEqual(0);
        expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      });

      it('should return unhealthy status when database is down', async () => {
        // Arrange
        mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
        const query = new GetHealthQuery(true);

        // Act
        const result = await handler.execute(query);

        // Assert
        expect(result.status).toBe('unhealthy');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.details).toBeDefined();
        expect(result.details!.database.status).toBe('down');
        expect(result.details!.database.latencyMs).toBeGreaterThanOrEqual(0);
      });

      it('should log error when database check fails', async () => {
        // Arrange
        const dbError = new Error('Connection timeout');
        mockPrisma.$queryRaw.mockRejectedValue(dbError);
        const query = new GetHealthQuery(true);

        // Act
        await handler.execute(query);

        // Assert
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            err: dbError,
            latencyMs: expect.any(Number),
          }),
          'Database health check failed'
        );
      });

      it('should measure database latency', async () => {
        // Arrange
        mockPrisma.$queryRaw.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve([{ '?column?': 1 }]), 10))
        );
        const query = new GetHealthQuery(true);

        // Act
        const result = await handler.execute(query);

        // Assert
        expect(result.details!.database.latencyMs).toBeGreaterThanOrEqual(10);
      });
    });
  });
});
