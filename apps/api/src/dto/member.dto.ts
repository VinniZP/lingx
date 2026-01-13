/**
 * Member DTOs
 *
 * Transform member and invitation data to API response format.
 */

import type { ProjectInvitationResponse, ProjectMemberResponse } from '@lingx/shared';
import type { InvitationWithDetails, ProjectMemberWithUser } from '../modules/member/index.js';

/**
 * Transform a project member to response format.
 */
export function toMemberDto(member: ProjectMemberWithUser): ProjectMemberResponse {
  return {
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    role: member.role,
    joinedAt: member.createdAt.toISOString(),
  };
}

/**
 * Transform an array of project members to response format.
 */
export function toMemberListDto(members: ProjectMemberWithUser[]): ProjectMemberResponse[] {
  return members.map(toMemberDto);
}

/**
 * Transform a project invitation to response format.
 */
export function toInvitationDto(invitation: InvitationWithDetails): ProjectInvitationResponse {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    invitedBy: {
      id: invitation.invitedBy.id,
      name: invitation.invitedBy.name,
      email: invitation.invitedBy.email,
    },
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}

/**
 * Transform an array of invitations to response format.
 */
export function toInvitationListDto(
  invitations: InvitationWithDetails[]
): ProjectInvitationResponse[] {
  return invitations.map(toInvitationDto);
}
