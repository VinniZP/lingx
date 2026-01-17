import type { IQuery } from '../../../shared/cqrs/index.js';

/**
 * Public invitation details (for accept page).
 */
export interface InvitationPublicDetails {
  projectName: string;
  projectSlug: string;
  role: 'OWNER' | 'MANAGER' | 'DEVELOPER';
  inviterName: string | null;
  email: string;
  expiresAt: string;
}

/**
 * Query to get invitation details by token (public endpoint).
 * Used for the invitation accept page.
 */
export class GetInvitationByTokenQuery implements IQuery<InvitationPublicDetails> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: InvitationPublicDetails;

  constructor(
    /** Invitation token */
    public readonly token: string
  ) {}
}
