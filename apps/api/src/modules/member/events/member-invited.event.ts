import type { IEvent } from '../../../shared/cqrs/index.js';
import type { InvitationWithDetails } from '../repositories/invitation.repository.js';

/**
 * Event emitted when a member is invited to a project.
 *
 * Side effects can include:
 * - Recording activity log
 * - Sending invitation email
 */
export class MemberInvitedEvent implements IEvent {
  readonly occurredAt: Date;

  constructor(
    /** The invitation that was created */
    public readonly invitation: InvitationWithDetails,
    /** User who sent the invitation */
    public readonly inviterId: string
  ) {
    this.occurredAt = new Date();
  }
}
