/**
 * Project Invitation Email
 *
 * Sent when a user is invited to join a project.
 */
import { Button, Heading, Hr, Link, Text } from '@react-email/components';
import { BaseLayout, styles } from './base-layout.js';

export interface InvitationEmailProps {
  inviteeEmail: string;
  projectName: string;
  projectSlug: string;
  role: string;
  inviterName: string;
  inviterEmail: string;
  token: string;
  expiresAt: Date;
  appUrl: string;
}

export function InvitationEmail({
  projectName,
  role,
  inviterName,
  inviterEmail,
  token,
  expiresAt,
  appUrl,
}: InvitationEmailProps) {
  const acceptUrl = `${appUrl}/invite/${token}`;
  const expiresIn = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const displayName = inviterName || inviterEmail;

  return (
    <BaseLayout preview={`You've been invited to join ${projectName}`}>
      <Heading style={styles.heading}>You're invited</Heading>

      <Text style={styles.paragraph}>
        <span style={styles.strong}>{displayName}</span> has invited you to collaborate on{' '}
        <span style={styles.strong}>{projectName}</span>.
      </Text>

      <div style={styles.roleBox}>
        <Text style={styles.roleLabel}>Your role</Text>
        <Text style={styles.roleValue}>{formatRole(role)}</Text>
      </div>

      <Button style={styles.buttonPrimary} href={acceptUrl}>
        Accept Invitation
      </Button>

      <Hr style={styles.hr} />

      <Text style={styles.footerNote}>
        This invitation expires in {expiresIn} day{expiresIn !== 1 ? 's' : ''}. If you didn't expect
        this email, you can safely ignore it.
      </Text>

      <Text style={{ ...styles.mutedText, marginTop: '12px', wordBreak: 'break-all' as const }}>
        Or copy this link:{' '}
        <Link href={acceptUrl} style={styles.link}>
          {acceptUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}
