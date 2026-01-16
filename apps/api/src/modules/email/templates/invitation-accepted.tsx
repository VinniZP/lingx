/**
 * Invitation Accepted Email
 *
 * Sent to the inviter when someone accepts their invitation.
 */
import { Button, Heading, Hr, Text } from '@react-email/components';
import { BaseLayout, colors, styles } from './base-layout.js';

export interface InvitationAcceptedEmailProps {
  inviterName: string;
  newMemberName: string;
  newMemberEmail: string;
  projectName: string;
  projectSlug: string;
  role: string;
  appUrl: string;
}

export function InvitationAcceptedEmail({
  inviterName,
  newMemberName,
  newMemberEmail,
  projectName,
  projectSlug,
  role,
  appUrl,
}: InvitationAcceptedEmailProps) {
  const projectUrl = `${appUrl}/projects/${projectSlug}`;
  const displayName = newMemberName || newMemberEmail;
  const greeting = inviterName ? `Hi ${inviterName}` : 'Hi there';

  return (
    <BaseLayout preview={`${displayName} joined ${projectName}`}>
      <Heading style={styles.heading}>{greeting}</Heading>

      <Text style={styles.paragraph}>
        <span style={styles.strong}>{displayName}</span> accepted your invitation and joined{' '}
        <span style={styles.strong}>{projectName}</span> as a{' '}
        <span style={styles.strong}>{formatRole(role)}</span>.
      </Text>

      <div style={successBox}>
        <Text style={successText}>They now have access and can start collaborating.</Text>
      </div>

      <Button style={styles.buttonPrimary} href={projectUrl}>
        View Project
      </Button>

      <Hr style={styles.hr} />

      <Text style={styles.footerNote}>
        You received this because you invited {displayName} to {projectName}.
      </Text>
    </BaseLayout>
  );
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

const successBox = {
  backgroundColor: colors.successBg,
  borderRadius: '8px',
  padding: '14px 20px',
  margin: '20px 0',
};

const successText = {
  fontSize: '14px',
  color: colors.success,
  margin: '0',
};
