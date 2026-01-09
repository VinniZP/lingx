import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Health check result.
 */
export interface HealthResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  details?: {
    database: { status: 'up' | 'down'; latencyMs: number };
  };
}

/**
 * Query to check system health status.
 *
 * Result type is encoded in the interface for automatic type inference.
 */
export class GetHealthQuery implements IQuery<HealthResult> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: HealthResult;

  constructor(
    /** Include detailed status for each subsystem */
    public readonly includeDetails: boolean = false
  ) {}
}
