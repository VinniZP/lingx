import type { PrismaClient } from '@prisma/client';
import type { IQueryHandler } from '../../../shared/cqrs/index.js';
import type { GetHealthQuery, HealthResult } from './get-health.query.js';

/**
 * Handler for GetHealthQuery.
 * Checks database connectivity and returns system health status.
 */
export class GetHealthHandler implements IQueryHandler<GetHealthQuery, HealthResult> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(query: GetHealthQuery): Promise<HealthResult> {
    const timestamp = new Date();

    if (!query.includeDetails) {
      // Quick health check without details
      return {
        status: 'healthy',
        timestamp,
      };
    }

    // Check database connectivity
    const dbStatus = await this.checkDatabase();

    const status = dbStatus.status === 'up' ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp,
      details: {
        database: dbStatus,
      },
    };
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; latencyMs?: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch {
      return { status: 'down' };
    }
  }
}
