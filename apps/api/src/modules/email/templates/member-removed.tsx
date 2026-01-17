/**
 * Member Removed Email
 *
 * Sent when a member is removed from a project.
 */
import { Heading, Hr, Text } from '@react-email/components';
import { BaseLayout, styles } from './base-layout.js';

export interface MemberRemovedEmailProps {
  memberName: string;
  memberEmail: string;
  projectName: string;
  removerName: string;
  removerEmail: string;
}

export function MemberRemovedEmail({
  memberName,
  projectName,
  removerName,
  removerEmail,
}: MemberRemovedEmailProps) {
  const greeting = memberName ? `Hi ${memberName}` : 'Hi there';
  const removerDisplayName = removerName || removerEmail;

  return (
    <BaseLayout preview={`You've been removed from ${projectName}`}>
      <Heading style={styles.heading}>{greeting}</Heading>

      <Text style={styles.paragraph}>
        You have been removed from <span style={styles.strong}>{projectName}</span> by{' '}
        <span style={styles.strong}>{removerDisplayName}</span>.
      </Text>

      <Text style={styles.paragraph}>
        You no longer have access to this project's translations, keys, or settings.
      </Text>

      <Hr style={styles.hr} />

      <Text style={styles.footerNote}>
        If you believe this was a mistake, please contact the project owner.
      </Text>
    </BaseLayout>
  );
}
