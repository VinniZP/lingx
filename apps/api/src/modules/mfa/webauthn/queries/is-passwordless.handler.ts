/**
 * IsPasswordlessHandler
 *
 * Simple check for passwordless status.
 */
import type { IQueryHandler } from '../../../../shared/cqrs/index.js';
import type { WebAuthnRepository } from '../webauthn.repository.js';
import { IsPasswordlessQuery } from './is-passwordless.query.js';

export class IsPasswordlessHandler implements IQueryHandler<IsPasswordlessQuery> {
  constructor(private readonly repository: WebAuthnRepository) {}

  async execute(query: IsPasswordlessQuery): Promise<boolean> {
    return this.repository.isPasswordless(query.userId);
  }
}
