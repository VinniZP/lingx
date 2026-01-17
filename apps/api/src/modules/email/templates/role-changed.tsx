/**
 * Role Changed Email
 *
 * Sent when a member's role in a project changes.
 */
import { Button, Heading, Hr, Text } from '@react-email/components';
import { BaseLayout, colors, styles } from './base-layout.js';

export interface RoleChangedEmailProps {
  memberName: string;
  memberEmail: string;
  projectName: string;
  projectSlug: string;
  oldRole: string;
  newRole: string;
  changerName: string;
  changerEmail: string;
  appUrl: string;
}

export function RoleChangedEmail({
  memberName,
  projectName,
  projectSlug,
  oldRole,
  newRole,
  changerName,
  changerEmail,
  appUrl,
}: RoleChangedEmailProps) {
  const projectUrl = `${appUrl}/projects/${projectSlug}`;
  const greeting = memberName ? `Hi ${memberName}` : 'Hi there';
  const changerDisplayName = changerName || changerEmail;
  const isPromotion = getRoleWeight(newRole) > getRoleWeight(oldRole);

  return (
    <BaseLayout preview={`Your role in ${projectName} has changed`}>
      <Heading style={styles.heading}>{greeting}</Heading>

      <Text style={styles.paragraph}>
        Your role in <span style={styles.strong}>{projectName}</span> has been{' '}
        {isPromotion ? 'upgraded' : 'changed'} by{' '}
        <span style={styles.strong}>{changerDisplayName}</span>.
      </Text>

      {/* Role transition display */}
      <table cellPadding="0" cellSpacing="0" style={roleTransition}>
        <tr>
          <td style={roleColumn}>
            <Text style={styles.roleLabel}>Previous</Text>
            <Text style={rolePrevious}>{formatRole(oldRole)}</Text>
          </td>
          <td style={arrowColumn}>
            <span style={arrow}>→</span>
          </td>
          <td style={roleColumn}>
            <Text style={styles.roleLabel}>New</Text>
            <Text style={roleNew}>{formatRole(newRole)}</Text>
          </td>
        </tr>
      </table>

      <Button style={styles.buttonPrimary} href={projectUrl}>
        View Project
      </Button>

      <Hr style={styles.hr} />

      <Text style={styles.footerNote}>
        If you have questions about this change, please contact the project owner.
      </Text>
    </BaseLayout>
  );
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function getRoleWeight(role: string): number {
  const weights: Record<string, number> = {
    OWNER: 3,
    MANAGER: 2,
    DEVELOPER: 1,
  };
  return weights[role.toUpperCase()] || 0;
}

const roleTransition = {
  width: '100%',
  backgroundColor: colors.mutedBg,
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const roleColumn = {
  textAlign: 'center' as const,
  width: '45%',
};

const arrowColumn = {
  textAlign: 'center' as const,
  width: '10%',
  verticalAlign: 'middle' as const,
};

const arrow = {
  color: colors.primary,
  fontSize: '20px',
};

const rolePrevious = {
  fontSize: '16px',
  color: colors.muted,
  fontWeight: '500' as const,
  margin: '4px 0 0 0',
  textDecoration: 'line-through' as const,
};

const roleNew = {
  fontSize: '16px',
  color: colors.foreground,
  fontWeight: '600' as const,
  margin: '4px 0 0 0',
};
