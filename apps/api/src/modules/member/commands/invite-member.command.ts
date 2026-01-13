import type { ICommand } from '../../../shared/cqrs/index.js';

/**
 * Result of invitation command.
 */
export interface InviteMemberResult {
  /** Emails that were successfully invited */
  sent: string[];
  /** Emails that were skipped (already member or pending invite) */
  skipped: string[];
  /** Emails that had errors */
  errors: string[];
}

/**
 * Command to invite members to a project.
 *
 * Permission rules:
 * - MANAGER+ role required to invite
 * - MANAGER can only invite as DEVELOPER
 * - OWNER can invite as DEVELOPER or MANAGER
 *
 * Rate limits:
 * - 20 invites per project per hour
 * - 50 invites per user per day
 */
export class InviteMemberCommand implements ICommand<InviteMemberResult> {
  readonly __brand = 'command' as const;
  declare readonly __resultType: InviteMemberResult;

  constructor(
    /** Project ID */
    public readonly projectId: string,
    /** Email addresses to invite */
    public readonly emails: string[],
    /** Role to assign to invitees */
    public readonly role: 'MANAGER' | 'DEVELOPER',
    /** User ID of the inviter */
    public readonly inviterId: string
  ) {}
}
