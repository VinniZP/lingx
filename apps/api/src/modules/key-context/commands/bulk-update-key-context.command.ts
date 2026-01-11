import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Input for a single key context update.
 */
export interface KeyContextInput {
  name: string;
  namespace: string | null;
  sourceFile?: string;
  sourceLine?: number;
  sourceComponent?: string;
}

/**
 * Result of bulk key context update.
 */
export interface BulkUpdateKeyContextResult {
  updated: number;
  notFound: number;
}

/**
 * Command to bulk update key source context metadata from CLI extraction.
 */
export class BulkUpdateKeyContextCommand implements ICommand<BulkUpdateKeyContextResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: BulkUpdateKeyContextResult;

  constructor(
    public readonly branchId: string,
    public readonly keys: KeyContextInput[],
    public readonly userId: string
  ) {}
}
