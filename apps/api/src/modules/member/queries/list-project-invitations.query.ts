import type { IQuery } from '../../../shared/cqrs/index.js';
import type { InvitationWithDetails } from '../repositories/invitation.repository.js';

/**
 * Query to list pending invitations for a project.
 * Requires the requester to have MANAGER+ role in the project.
 */
export class ListProjectInvitationsQuery implements IQuery<InvitationWithDetails[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: InvitationWithDetails[];

  constructor(
    /** Project ID to list invitations for */
    public readonly projectId: string,
    /** User ID making the request (for role verification) */
    public readonly requesterId: string
  ) {}
}
