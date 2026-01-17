import { z } from 'zod';
import { emailSchema } from './common.schema.js';
import { memberRoleSchema } from './response.schema.js';

// Re-export the role schema for convenience
export { memberRoleSchema as projectRoleSchema };
export type ProjectRole = z.infer<typeof memberRoleSchema>;

/**
 * Invitable roles - MANAGER or DEVELOPER only (cannot invite as OWNER)
 */
export const invitableRoleSchema = z.enum(['MANAGER', 'DEVELOPER']);
export type InvitableRole = z.infer<typeof invitableRoleSchema>;

/**
 * Schema for inviting members to a project.
 * - emails: Array of valid email addresses (1-20)
 * - role: MANAGER or DEVELOPER only (cannot invite as OWNER)
 */
export const inviteMemberSchema = z.object({
  emails: z
    .array(emailSchema)
    .min(1, 'At least one email is required')
    .max(20, 'Maximum 20 emails per invitation'),
  role: invitableRoleSchema,
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/**
 * Assignable roles - MANAGER or DEVELOPER only (cannot assign OWNER via role change)
 * Use Transfer Ownership to make someone an owner.
 */
export const assignableRoleSchema = z.enum(['MANAGER', 'DEVELOPER']);
export type AssignableRole = z.infer<typeof assignableRoleSchema>;

/**
 * Schema for updating a member's role.
 * Note: Cannot promote to OWNER - use Transfer Ownership instead.
 */
export const updateMemberRoleSchema = z.object({
  role: assignableRoleSchema,
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/**
 * Schema for transferring project ownership.
 * - newOwnerId: User ID of the new owner (must be existing member)
 * - keepOwnership: If true, current owner remains as OWNER; if false, demotes to MANAGER
 */
export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, 'New owner ID is required'),
  keepOwnership: z.boolean().default(true),
});

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
