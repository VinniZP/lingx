/**
 * Member Left Email
 *
 * Sent to project owners when a member voluntarily leaves the project.
 */
import { Button, Heading, Hr, Text } from '@react-email/components';
import { BaseLayout, colors, styles } from './base-layout.js';

export interface MemberLeftEmailProps {
  ownerName: string;
  ownerEmail: string;
  memberName: string;
  memberEmail: string;
  projectName: string;
  projectSlug: string;
  memberRole: string;
  appUrl: string;
}

export function MemberLeftEmail({
  ownerName,
  memberName,
  memberEmail,
  projectName,
  projectSlug,
  memberRole,
  appUrl,
}: MemberLeftEmailProps) {
  const projectUrl = `${appUrl}/projects/${projectSlug}/settings/members`;
  const greeting = ownerName ? `Hi ${ownerName}` : 'Hi there';
  const memberDisplayName = memberName || memberEmail;

  return (
    <BaseLayout preview={`${memberDisplayName} left ${projectName}`}>
      <Heading style={styles.heading}>{greeting}</Heading>

      <Text style={styles.paragraph}>
        <span style={styles.strong}>{memberDisplayName}</span> has left{' '}
        <span style={styles.strong}>{projectName}</span>.
      </Text>

      <div style={detailBox}>
        <table cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
          <tr>
            <td style={detailLabel}>Member</td>
            <td style={detailValue}>{memberDisplayName}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Previous role</td>
            <td style={detailValue}>{formatRole(memberRole)}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Status</td>
            <td style={detailValue}>
              <span style={statusBadge}>No longer has access</span>
            </td>
          </tr>
        </table>
      </div>

      <Button style={styles.buttonPrimary} href={projectUrl}>
        Manage Team
      </Button>

      <Hr style={styles.hr} />

      <Text style={styles.footerNote}>
        You received this because you're an owner of {projectName}.
      </Text>
    </BaseLayout>
  );
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

const detailBox = {
  backgroundColor: colors.mutedBg,
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
};

const detailLabel = {
  fontSize: '13px',
  color: colors.muted,
  padding: '4px 16px 4px 0',
  verticalAlign: 'top' as const,
};

const detailValue = {
  fontSize: '14px',
  color: colors.foreground,
  fontWeight: '500' as const,
  padding: '4px 0',
};

const statusBadge = {
  display: 'inline-block',
  backgroundColor: colors.warningBg,
  color: colors.warning,
  fontSize: '12px',
  fontWeight: '500' as const,
  padding: '2px 8px',
  borderRadius: '10px',
};
