/**
 * DeleteCredentialCommand
 *
 * Deletes a WebAuthn credential (passkey).
 */
import type { ICommand } from '../../../../shared/cqrs/index.js';

export interface DeleteCredentialResult {
  remainingCount: number;
}

export class DeleteCredentialCommand implements ICommand<DeleteCredentialResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: DeleteCredentialResult;

  constructor(
    public readonly userId: string,
    public readonly credentialId: string
  ) {}
}
