/**
 * Email Templates Index
 *
 * Re-exports all email template components.
 */
export { BaseLayout } from './base-layout.js';
export {
  InvitationAcceptedEmail,
  type InvitationAcceptedEmailProps,
} from './invitation-accepted.js';
export { InvitationEmail, type InvitationEmailProps } from './invitation.js';
export { MemberLeftEmail, type MemberLeftEmailProps } from './member-left.js';
export { MemberRemovedEmail, type MemberRemovedEmailProps } from './member-removed.js';
export {
  OwnershipTransferredEmail,
  type OwnershipTransferredEmailProps,
} from './ownership-transferred.js';
export { RoleChangedEmail, type RoleChangedEmailProps } from './role-changed.js';
