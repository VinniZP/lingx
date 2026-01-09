/**
 * TrustDeviceCommand
 *
 * Marks a session as trusted for 2FA bypass.
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export class TrustDeviceCommand implements ICommand<void> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: void;

  constructor(
    public readonly sessionId: string,
    public readonly userId: string
  ) {}
}
