/**
 * Ownership Transferred Email
 *
 * Sent to both the new owner and previous owner when project ownership is transferred.
 */
import { Button, Heading, Hr, Text } from '@react-email/components';
import { BaseLayout, colors, styles } from './base-layout.js';

export interface OwnershipTransferredEmailProps {
  recipientName: string;
  recipientEmail: string;
  projectName: string;
  projectSlug: string;
  newOwnerName: string;
  newOwnerEmail: string;
  previousOwnerName: string;
  previousOwnerEmail: string;
  isNewOwner: boolean;
  appUrl: string;
}

export function OwnershipTransferredEmail({
  recipientName,
  projectName,
  projectSlug,
  newOwnerName,
  newOwnerEmail,
  previousOwnerName,
  previousOwnerEmail,
  isNewOwner,
  appUrl,
}: OwnershipTransferredEmailProps) {
  const projectUrl = `${appUrl}/projects/${projectSlug}`;
  const greeting = recipientName ? `Hi ${recipientName}` : 'Hi there';
  const newOwnerDisplayName = newOwnerName || newOwnerEmail;
  const previousOwnerDisplayName = previousOwnerName || previousOwnerEmail;

  return (
    <BaseLayout preview={`Ownership of ${projectName} has been transferred`}>
      <Heading style={styles.heading}>{greeting}</Heading>

      {isNewOwner ? (
        <>
          <Text style={styles.paragraph}>
            <span style={styles.strong}>{previousOwnerDisplayName}</span> has transferred ownership
            of <span style={styles.strong}>{projectName}</span> to you.
          </Text>

          <div style={highlightBox}>
            <Text style={highlightTitle}>You're now the owner</Text>
            <Text style={highlightText}>As owner, you have full control including:</Text>
            <ul style={capabilityList}>
              <li>Managing team members and roles</li>
              <li>Configuring project settings</li>
              <li>Deleting or transferring the project</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <Text style={styles.paragraph}>
            You have successfully transferred ownership of{' '}
            <span style={styles.strong}>{projectName}</span> to{' '}
            <span style={styles.strong}>{newOwnerDisplayName}</span>.
          </Text>

          <div style={styles.infoBox}>
            <Text style={infoText}>You may still have access depending on your assigned role.</Text>
          </div>
        </>
      )}

      <Button style={styles.buttonPrimary} href={projectUrl}>
        View Project
      </Button>

      <Hr style={styles.hr} />

      <Text style={styles.footerNote}>
        This transfer was initiated by {previousOwnerDisplayName}.
      </Text>
    </BaseLayout>
  );
}

const highlightBox = {
  backgroundColor: colors.mutedBg,
  borderLeft: `3px solid ${colors.primary}`,
  borderRadius: '0 8px 8px 0',
  padding: '16px 20px',
  margin: '20px 0',
};

const highlightTitle = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: colors.foreground,
  margin: '0 0 8px 0',
};

const highlightText = {
  fontSize: '14px',
  color: colors.secondary,
  margin: '0',
};

const capabilityList = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: colors.secondary,
  paddingLeft: '20px',
  margin: '8px 0 0 0',
};

const infoText = {
  fontSize: '14px',
  color: colors.secondary,
  margin: '0',
};
