import type { MTProviderType } from '../../../services/providers/index.js';
import type { ICommand } from '../../../shared/cqrs/index.js';

/** Discriminated union for test connection result - makes illegal states unrepresentable */
export type TestConnectionResult = { success: true } | { success: false; error: string };

/**
 * Command to test MT provider connection.
 */
export class TestConnectionCommand implements ICommand<TestConnectionResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: TestConnectionResult;

  constructor(
    public readonly projectId: string,
    public readonly userId: string,
    public readonly provider: MTProviderType
  ) {}
}
