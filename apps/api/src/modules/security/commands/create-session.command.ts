import type { Session } from '@prisma/client';
import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Command to create a new session.
 * Used during login, 2FA verification, WebAuthn, etc.
 */
export class CreateSessionCommand implements ICommand<Session> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: Session;

  constructor(
    public readonly userId: string,
    public readonly userAgent: string | null,
    public readonly ipAddress: string | null
  ) {}
}
