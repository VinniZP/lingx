import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Query to check system health status.
 */
export class GetHealthQuery implements IQuery {
  readonly __brand = 'query' as const;

  constructor(
    /** Include detailed status for each subsystem */
    public readonly includeDetails: boolean = false
  ) {}
}

/**
 * Health check result.
 */
export interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  details?: {
    database: { status: 'up' | 'down'; latencyMs?: number };
  };
}
