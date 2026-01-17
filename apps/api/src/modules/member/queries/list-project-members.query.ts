import type { IQuery } from '../../../shared/cqrs/index.js';
import type { ProjectMemberWithUser } from '../repositories/member.repository.js';

/**
 * Query to list all members of a project.
 * Requires the requester to be a member of the project.
 */
export class ListProjectMembersQuery implements IQuery<ProjectMemberWithUser[]> {
  readonly __brand = 'query' as const;
  declare readonly __resultType: ProjectMemberWithUser[];

  constructor(
    /** Project ID to list members for */
    public readonly projectId: string,
    /** User ID making the request (for membership verification) */
    public readonly requesterId: string
  ) {}
}
