import type { RequestMetadata } from '../../../services/security.service.js';
import type { ICommand } from '../../../shared/cqrs/index.js';

export interface ChangePasswordResult {
  newSessionId: string;
}

/**
 * Command to change a user's password.
 * Invalidates all other sessions after password change.
 */
export class ChangePasswordCommand implements ICommand<ChangePasswordResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: ChangePasswordResult;

  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
    public readonly requestMetadata: RequestMetadata
  ) {}
}
